import { useState, useEffect } from 'react';
import { PageContainer, PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Rocket,
  Package,
  Store,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronRight,
  ChevronLeft,
  Shield,
  DollarSign,
  Clock,
  Loader2,
} from 'lucide-react';

interface Product {
  id: string;
  title: string;
  sku: string | null;
  variants_count: number;
}

interface StoreData {
  id: string;
  name: string;
  platform: string;
  is_active: boolean;
}

interface PlatformCheck {
  requires_approval: boolean;
  reason?: string;
}

type WizardStep = 'products' | 'stores' | 'review' | 'confirm';

export default function PublishPage() {
  const { currentOrg, canOperate } = useAuthContext();
  const [currentStep, setCurrentStep] = useState<WizardStep>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<StoreData[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [selectedStores, setSelectedStores] = useState<Set<string>>(new Set());
  const [platformChecks, setPlatformChecks] = useState<Record<string, PlatformCheck>>({});
  const [budgetStatus, setBudgetStatus] = useState<{
    allowed: boolean;
    message: string;
    percentage?: number;
    remaining?: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{
    status: string;
    message: string;
    approval_id?: string;
    jobs_created?: number;
  } | null>(null);

  const steps: { key: WizardStep; label: string; icon: React.ReactNode }[] = [
    { key: 'products', label: 'Select Products', icon: <Package className="w-4 h-4" /> },
    { key: 'stores', label: 'Choose Stores', icon: <Store className="w-4 h-4" /> },
    { key: 'review', label: 'Review & Checks', icon: <Shield className="w-4 h-4" /> },
    { key: 'confirm', label: 'Confirm', icon: <Rocket className="w-4 h-4" /> },
  ];

  useEffect(() => {
    if (currentOrg) {
      fetchData();
    }
  }, [currentOrg]);

  const fetchData = async () => {
    if (!currentOrg) return;
    setIsLoading(true);

    const [productsRes, storesRes] = await Promise.all([
      supabase.from('products').select('id, title, sku').eq('org_id', currentOrg.id),
      supabase.from('stores').select('id, name, platform, is_active').eq('org_id', currentOrg.id).eq('is_active', true),
    ]);

    // Get variant counts
    const productIds = productsRes.data?.map(p => p.id) || [];
    const { data: variants } = await supabase
      .from('variants')
      .select('product_id')
      .in('product_id', productIds);

    const variantCounts: Record<string, number> = {};
    variants?.forEach(v => {
      variantCounts[v.product_id] = (variantCounts[v.product_id] || 0) + 1;
    });

    setProducts(productsRes.data?.map(p => ({
      ...p,
      variants_count: variantCounts[p.id] || 0,
    })) || []);
    setStores(storesRes.data || []);
    setIsLoading(false);
  };

  const checkBudget = async () => {
    if (!currentOrg) return;

    const operationCount = selectedProducts.size * selectedStores.size;
    
    try {
      const { data: session } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/budgets-check`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.session?.access_token}`,
          },
          body: JSON.stringify({
            org_id: currentOrg.id,
            budget_type: 'publish_operations',
            amount: operationCount,
          }),
        }
      );

      const data = await response.json();
      setBudgetStatus({
        allowed: data.allowed,
        message: data.message,
        percentage: data.budget?.percentage,
        remaining: data.budget?.remaining,
      });
    } catch (error) {
      console.error('Budget check failed:', error);
      setBudgetStatus({
        allowed: true,
        message: 'Budget check unavailable - proceeding without limit',
      });
    }
  };

  const checkPlatforms = async () => {
    const checks: Record<string, PlatformCheck> = {};
    
    for (const storeId of selectedStores) {
      const store = stores.find(s => s.id === storeId);
      if (!store) continue;

      // Get plugin capabilities
      const { data: plugin } = await supabase
        .from('plugins')
        .select('id, plugin_contracts(*)')
        .eq('slug', store.platform)
        .single();

      const contracts = plugin?.plugin_contracts || [];
      const publishCapability = contracts.find((c: any) => c.capability === 'publish_product');

      if (!publishCapability || publishCapability.level === 'unsupported') {
        checks[store.platform] = {
          requires_approval: false,
          reason: `Publishing not supported for ${store.platform}. Manual upload required.`,
        };
      } else if (publishCapability.level === 'workaround') {
        checks[store.platform] = {
          requires_approval: true,
          reason: `${store.platform} requires manual verification before publishing`,
        };
      } else {
        checks[store.platform] = { requires_approval: false };
      }
    }

    setPlatformChecks(checks);
  };

  const goToStep = async (step: WizardStep) => {
    if (step === 'review') {
      await Promise.all([checkBudget(), checkPlatforms()]);
    }
    setCurrentStep(step);
  };

  const handlePublish = async () => {
    if (!currentOrg) return;
    setIsPublishing(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/publish-request`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.session?.access_token}`,
          },
          body: JSON.stringify({
            org_id: currentOrg.id,
            product_ids: Array.from(selectedProducts),
            store_ids: Array.from(selectedStores),
            action: 'publish',
          }),
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Publishing failed');
      }

      setPublishResult({
        status: data.status,
        message: data.message,
        approval_id: data.approval_id,
        jobs_created: data.jobs_created,
      });
      setCurrentStep('confirm');
    } catch (error: any) {
      toast.error(error.message || 'Publishing failed');
    } finally {
      setIsPublishing(false);
    }
  };

  const toggleProduct = (productId: string) => {
    const updated = new Set(selectedProducts);
    if (updated.has(productId)) {
      updated.delete(productId);
    } else {
      updated.add(productId);
    }
    setSelectedProducts(updated);
  };

  const toggleStore = (storeId: string) => {
    const updated = new Set(selectedStores);
    if (updated.has(storeId)) {
      updated.delete(storeId);
    } else {
      updated.add(storeId);
    }
    setSelectedStores(updated);
  };

  const selectAllProducts = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map(p => p.id)));
    }
  };

  const getStepNumber = (step: WizardStep) => steps.findIndex(s => s.key === step) + 1;
  const currentStepIndex = steps.findIndex(s => s.key === currentStep);

  const canProceed = () => {
    switch (currentStep) {
      case 'products':
        return selectedProducts.size > 0;
      case 'stores':
        return selectedStores.size > 0;
      case 'review':
        return budgetStatus?.allowed !== false;
      default:
        return true;
    }
  };

  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, string> = {
      shopify: '🛒',
      etsy: '🧶',
      printify: '🖨️',
      gumroad: '💰',
      amazon_sp: '📦',
      amazon_kdp: '📚',
    };
    return icons[platform] || '🏪';
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Publish to Stores"
        description="Staged publishing wizard with approval gates and budget checks"
      />

      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center gap-2">
          {steps.map((step, index) => (
            <div key={step.key} className="flex items-center">
              <button
                onClick={() => index <= currentStepIndex && goToStep(step.key)}
                disabled={index > currentStepIndex}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  currentStep === step.key
                    ? 'bg-primary text-primary-foreground'
                    : index < currentStepIndex
                    ? 'bg-success/20 text-success cursor-pointer'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                }`}
              >
                {index < currentStepIndex ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  step.icon
                )}
                <span className="hidden sm:inline">{step.label}</span>
              </button>
              {index < steps.length - 1 && (
                <ChevronRight className="w-4 h-4 text-muted-foreground mx-1" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card className="mb-6">
        <CardContent className="p-6">
          {currentStep === 'products' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Select Products</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose the products you want to publish
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={selectAllProducts}>
                  {selectedProducts.size === products.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>

              {products.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No products found. Create products first.
                </div>
              ) : (
                <div className="grid gap-2 max-h-[400px] overflow-y-auto">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                        selectedProducts.has(product.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => toggleProduct(product.id)}
                    >
                      <Checkbox checked={selectedProducts.has(product.id)} />
                      <div className="flex-1">
                        <p className="font-medium">{product.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {product.variants_count} variants
                          {product.sku && ` · ${product.sku}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="text-sm text-muted-foreground">
                {selectedProducts.size} of {products.length} products selected
              </div>
            </div>
          )}

          {currentStep === 'stores' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Choose Destination Stores</h3>
                <p className="text-sm text-muted-foreground">
                  Select stores to publish your products to
                </p>
              </div>

              {stores.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No stores connected. Connect stores first.
                </div>
              ) : (
                <div className="grid gap-2 max-h-[400px] overflow-y-auto">
                  {stores.map((store) => (
                    <div
                      key={store.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                        selectedStores.has(store.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => toggleStore(store.id)}
                    >
                      <Checkbox checked={selectedStores.has(store.id)} />
                      <span className="text-xl">{getPlatformIcon(store.platform)}</span>
                      <div className="flex-1">
                        <p className="font-medium">{store.name}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {store.platform.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="text-sm text-muted-foreground">
                {selectedStores.size} of {stores.length} stores selected
              </div>
            </div>
          )}

          {currentStep === 'review' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold">Review & Pre-flight Checks</h3>
                <p className="text-sm text-muted-foreground">
                  Verify all checks pass before publishing
                </p>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-secondary/30">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Package className="w-4 h-4" />
                    Products
                  </div>
                  <p className="text-2xl font-bold">{selectedProducts.size}</p>
                </div>
                <div className="p-4 rounded-lg bg-secondary/30">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Store className="w-4 h-4" />
                    Stores
                  </div>
                  <p className="text-2xl font-bold">{selectedStores.size}</p>
                </div>
              </div>

              {/* Budget Check */}
              <div className={`p-4 rounded-lg border ${
                budgetStatus?.allowed === false
                  ? 'border-destructive bg-destructive/10'
                  : 'border-success bg-success/10'
              }`}>
                <div className="flex items-start gap-3">
                  {budgetStatus?.allowed === false ? (
                    <XCircle className="w-5 h-5 text-destructive shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      <span className="font-medium">Budget Check</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {budgetStatus?.message || 'Checking budget...'}
                    </p>
                    {budgetStatus?.percentage !== undefined && (
                      <div className="mt-2">
                        <Progress value={budgetStatus.percentage} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">
                          {budgetStatus.percentage}% used ({budgetStatus.remaining} remaining)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Platform Checks */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Platform Compatibility
                </h4>
                {Object.entries(platformChecks).map(([platform, check]) => (
                  <div
                    key={platform}
                    className={`p-3 rounded-lg border ${
                      check.reason?.includes('not supported')
                        ? 'border-destructive/50 bg-destructive/5'
                        : check.requires_approval
                        ? 'border-warning/50 bg-warning/5'
                        : 'border-success/50 bg-success/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{getPlatformIcon(platform)}</span>
                      <span className="font-medium capitalize">{platform.replace('_', ' ')}</span>
                      {check.reason?.includes('not supported') ? (
                        <Badge variant="destructive">Unsupported</Badge>
                      ) : check.requires_approval ? (
                        <Badge variant="warning">Needs Approval</Badge>
                      ) : (
                        <Badge variant="success">Ready</Badge>
                      )}
                    </div>
                    {check.reason && (
                      <p className="text-sm text-muted-foreground mt-1">{check.reason}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Estimated Operations */}
              <div className="p-4 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Clock className="w-4 h-4" />
                  Estimated Operations
                </div>
                <p className="text-2xl font-bold">{selectedProducts.size * selectedStores.size}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedProducts.size} products × {selectedStores.size} stores
                </p>
              </div>
            </div>
          )}

          {currentStep === 'confirm' && publishResult && (
            <div className="space-y-6 text-center py-8">
              {publishResult.status === 'pending_approval' ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center mx-auto">
                    <Clock className="w-8 h-8 text-warning" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Approval Required</h3>
                    <p className="text-muted-foreground mt-1">{publishResult.message}</p>
                  </div>
                  <Badge variant="warning" className="text-lg px-4 py-1">
                    Approval ID: {publishResult.approval_id?.slice(0, 8)}...
                  </Badge>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto">
                    <Rocket className="w-8 h-8 text-success" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Publishing Started!</h3>
                    <p className="text-muted-foreground mt-1">{publishResult.message}</p>
                  </div>
                  {publishResult.jobs_created && (
                    <Badge variant="success" className="text-lg px-4 py-1">
                      {publishResult.jobs_created} jobs created
                    </Badge>
                  )}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => {
            const prevIndex = currentStepIndex - 1;
            if (prevIndex >= 0) {
              setCurrentStep(steps[prevIndex].key);
            }
          }}
          disabled={currentStepIndex === 0 || currentStep === 'confirm'}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {currentStep !== 'confirm' && (
          <Button
            variant="glow"
            onClick={() => {
              if (currentStep === 'review') {
                handlePublish();
              } else {
                const nextIndex = currentStepIndex + 1;
                if (nextIndex < steps.length) {
                  goToStep(steps[nextIndex].key);
                }
              }
            }}
            disabled={!canProceed() || isPublishing}
          >
            {isPublishing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Publishing...
              </>
            ) : currentStep === 'review' ? (
              <>
                <Rocket className="w-4 h-4 mr-2" />
                Publish Now
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        )}

        {currentStep === 'confirm' && (
          <Button
            variant="glow"
            onClick={() => {
              setSelectedProducts(new Set());
              setSelectedStores(new Set());
              setPublishResult(null);
              setCurrentStep('products');
            }}
          >
            Start New Publish
          </Button>
        )}
      </div>
    </PageContainer>
  );
}
