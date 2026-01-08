import { useState, useEffect } from 'react';
import { PageContainer, PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Image,
  Tag,
  ChevronDown,
  ChevronRight,
  Search,
} from 'lucide-react';

interface Variant {
  id: string;
  title: string;
  sku: string | null;
  price: number | null;
  inventory_quantity: number;
  attributes: Record<string, unknown>;
}

interface Product {
  id: string;
  title: string;
  description: string | null;
  sku: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  variants?: Variant[];
}

export default function ProductsPage() {
  const { currentOrg, canOperate } = useAuthContext();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    sku: '',
  });
  const [variants, setVariants] = useState<Partial<Variant>[]>([
    { title: 'Default', sku: '', price: null, inventory_quantity: 0 }
  ]);

  useEffect(() => {
    if (currentOrg) {
      fetchProducts();
    }
  }, [currentOrg]);

  const fetchProducts = async () => {
    if (!currentOrg) return;
    setIsLoading(true);
    
    const { data: productsData, error } = await supabase
      .from('products')
      .select('*')
      .eq('org_id', currentOrg.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch products');
      setIsLoading(false);
      return;
    }

    // Fetch variants for all products
    const productIds = productsData?.map(p => p.id) || [];
    const { data: variantsData } = await supabase
      .from('variants')
      .select('*')
      .in('product_id', productIds);

    const productsWithVariants = productsData?.map(product => ({
      ...product,
      variants: variantsData?.filter(v => v.product_id === product.id) || [],
    })) || [];

    setProducts(productsWithVariants);
    setIsLoading(false);
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', sku: '' });
    setVariants([{ title: 'Default', sku: '', price: null, inventory_quantity: 0 }]);
    setEditingProduct(null);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      title: product.title,
      description: product.description || '',
      sku: product.sku || '',
    });
    setVariants(product.variants?.length ? product.variants.map(v => ({
      id: v.id,
      title: v.title,
      sku: v.sku || '',
      price: v.price,
      inventory_quantity: v.inventory_quantity,
    })) : [{ title: 'Default', sku: '', price: null, inventory_quantity: 0 }]);
    setDialogOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!currentOrg || !formData.title.trim()) {
      toast.error('Product title is required');
      return;
    }

    setIsSaving(true);

    try {
      if (editingProduct) {
        // Update existing product
        const { error: productError } = await supabase
          .from('products')
          .update({
            title: formData.title,
            description: formData.description || null,
            sku: formData.sku || null,
          })
          .eq('id', editingProduct.id);

        if (productError) throw productError;

        // Update variants
        for (const variant of variants) {
          if (variant.id) {
            await supabase.from('variants').update({
              title: variant.title,
              sku: variant.sku || null,
              price: variant.price,
              inventory_quantity: variant.inventory_quantity || 0,
            }).eq('id', variant.id);
          } else {
            await supabase.from('variants').insert({
              product_id: editingProduct.id,
              title: variant.title || 'Default',
              sku: variant.sku || null,
              price: variant.price,
              inventory_quantity: variant.inventory_quantity || 0,
            });
          }
        }

        toast.success('Product updated!');
      } else {
        // Create new product
        const { data: product, error: productError } = await supabase
          .from('products')
          .insert({
            org_id: currentOrg.id,
            title: formData.title,
            description: formData.description || null,
            sku: formData.sku || null,
          })
          .select()
          .single();

        if (productError) throw productError;

        // Create variants
        const variantsToInsert = variants.map(v => ({
          product_id: product.id,
          title: v.title || 'Default',
          sku: v.sku || null,
          price: v.price,
          inventory_quantity: v.inventory_quantity || 0,
        }));

        const { error: variantError } = await supabase.from('variants').insert(variantsToInsert);
        if (variantError) throw variantError;

        toast.success('Product created!');
      }

      setDialogOpen(false);
      resetForm();
      fetchProducts();
    } catch (error: any) {
      toast.error('Failed to save product: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteProduct = async (product: Product) => {
    if (!confirm(`Are you sure you want to delete "${product.title}"?`)) return;

    // Delete variants first
    await supabase.from('variants').delete().eq('product_id', product.id);
    
    const { error } = await supabase.from('products').delete().eq('id', product.id);

    if (error) {
      toast.error('Failed to delete product');
    } else {
      toast.success('Product deleted');
      fetchProducts();
    }
  };

  const addVariant = () => {
    setVariants([...variants, { title: '', sku: '', price: null, inventory_quantity: 0 }]);
  };

  const updateVariant = (index: number, field: keyof Variant, value: any) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  };

  const removeVariant = (index: number) => {
    if (variants.length <= 1) return;
    setVariants(variants.filter((_, i) => i !== index));
  };

  const toggleExpanded = (productId: string) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedProducts(newExpanded);
  };

  const filteredProducts = products.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalInventory = products.reduce(
    (sum, p) => sum + (p.variants?.reduce((vs, v) => vs + v.inventory_quantity, 0) || 0),
    0
  );

  return (
    <PageContainer>
      <PageHeader
        title="Products"
        description="Manage your product catalog and variants"
        actions={
          canOperate && (
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button variant="glow">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingProduct ? 'Edit Product' : 'Add New Product'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingProduct 
                      ? 'Update product details and variants' 
                      : 'Create a new product with variants'}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6 py-4">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Product Title *</Label>
                      <Input
                        id="title"
                        placeholder="Premium T-Shirt"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe your product..."
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sku">SKU</Label>
                      <Input
                        id="sku"
                        placeholder="PROD-001"
                        value={formData.sku}
                        onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Variants */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Variants</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                        <Plus className="w-3 h-3 mr-1" />
                        Add Variant
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {variants.map((variant, index) => (
                        <div key={index} className="p-3 rounded-lg bg-secondary/30 border border-border">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Title</Label>
                              <Input
                                placeholder="Size/Color"
                                value={variant.title || ''}
                                onChange={(e) => updateVariant(index, 'title', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">SKU</Label>
                              <Input
                                placeholder="VAR-001"
                                value={variant.sku || ''}
                                onChange={(e) => updateVariant(index, 'sku', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Price</Label>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={variant.price ?? ''}
                                onChange={(e) => updateVariant(index, 'price', parseFloat(e.target.value) || null)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Inventory</Label>
                              <div className="flex gap-2">
                                <Input
                                  type="number"
                                  placeholder="0"
                                  value={variant.inventory_quantity || 0}
                                  onChange={(e) => updateVariant(index, 'inventory_quantity', parseInt(e.target.value) || 0)}
                                />
                                {variants.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeVariant(index)}
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    variant="glow"
                    className="w-full"
                    onClick={handleSaveProduct}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{products.length}</p>
                <p className="text-sm text-muted-foreground">Total Products</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Tag className="w-8 h-8 text-info" />
              <div>
                <p className="text-2xl font-bold">
                  {products.reduce((sum, p) => sum + (p.variants?.length || 0), 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Variants</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Image className="w-8 h-8 text-success" />
              <div>
                <p className="text-2xl font-bold">{totalInventory}</p>
                <p className="text-sm text-muted-foreground">Total Inventory</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Products Table */}
      {isLoading ? (
        <Card>
          <CardContent className="py-8">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : filteredProducts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {searchQuery ? 'No products found' : 'No products yet'}
            </h3>
            <p className="text-muted-foreground text-center mb-4 max-w-md">
              {searchQuery 
                ? 'Try adjusting your search query' 
                : 'Add your first product to start building your catalog'}
            </p>
            {canOperate && !searchQuery && (
              <Button variant="glow" onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Product
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Variants</TableHead>
                <TableHead>Inventory</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <>
                  <TableRow key={product.id} className="cursor-pointer" onClick={() => toggleExpanded(product.id)}>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        {expandedProducts.has(product.id) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{product.title}</p>
                        {product.description && (
                          <p className="text-sm text-muted-foreground truncate max-w-xs">
                            {product.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {product.sku ? (
                        <Badge variant="outline" className="font-mono">
                          {product.sku}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{product.variants?.length || 0}</TableCell>
                    <TableCell>
                      {product.variants?.reduce((sum, v) => sum + v.inventory_quantity, 0) || 0}
                    </TableCell>
                    <TableCell className="text-right">
                      {canOperate && (
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditDialog(product);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteProduct(product);
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                  {expandedProducts.has(product.id) && product.variants?.map((variant) => (
                    <TableRow key={variant.id} className="bg-secondary/10">
                      <TableCell></TableCell>
                      <TableCell className="pl-10">
                        <span className="text-muted-foreground">↳</span> {variant.title}
                      </TableCell>
                      <TableCell>
                        {variant.sku ? (
                          <Badge variant="outline" className="font-mono text-xs">
                            {variant.sku}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {variant.price !== null ? `$${variant.price.toFixed(2)}` : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={variant.inventory_quantity > 0 ? 'success' : 'destructive'}>
                          {variant.inventory_quantity}
                        </Badge>
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  ))}
                </>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </PageContainer>
  );
}
