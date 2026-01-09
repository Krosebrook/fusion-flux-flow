import { useState, useEffect } from 'react';
import { PageContainer, PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Store,
  Plus,
  Settings,
  Trash2,
  ExternalLink,
  ShoppingBag,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

interface StoreData {
  id: string;
  name: string;
  platform: string;
  external_id: string | null;
  is_active: boolean;
  created_at: string;
  metadata: Record<string, unknown>;
}

const PLATFORM_INFO: Record<string, { 
  name: string; 
  icon: string; 
  color: string;
  fields: { key: string; label: string; type: string; required: boolean }[];
}> = {
  shopify: {
    name: 'Shopify',
    icon: '🛒',
    color: 'bg-green-500/20 text-green-400',
    fields: [
      { key: 'shop_domain', label: 'Shop Domain', type: 'text', required: true },
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
      { key: 'api_secret', label: 'API Secret', type: 'password', required: true },
      { key: 'access_token', label: 'Access Token', type: 'password', required: true },
      { key: 'webhook_secret', label: 'Webhook Secret', type: 'password', required: false },
    ],
  },
  etsy: {
    name: 'Etsy',
    icon: '🧶',
    color: 'bg-orange-500/20 text-orange-400',
    fields: [
      { key: 'shop_id', label: 'Shop ID', type: 'text', required: true },
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
      { key: 'api_secret', label: 'API Secret', type: 'password', required: true },
      { key: 'access_token', label: 'Access Token', type: 'password', required: true },
      { key: 'refresh_token', label: 'Refresh Token', type: 'password', required: false },
      { key: 'webhook_secret', label: 'Webhook Secret', type: 'password', required: false },
    ],
  },
  printify: {
    name: 'Printify',
    icon: '🖨️',
    color: 'bg-blue-500/20 text-blue-400',
    fields: [
      { key: 'shop_id', label: 'Shop ID', type: 'text', required: true },
      { key: 'api_token', label: 'API Token', type: 'password', required: true },
      { key: 'webhook_secret', label: 'Webhook Secret', type: 'password', required: false },
    ],
  },
  gumroad: {
    name: 'Gumroad',
    icon: '💰',
    color: 'bg-pink-500/20 text-pink-400',
    fields: [
      { key: 'access_token', label: 'Access Token', type: 'password', required: true },
      { key: 'webhook_secret', label: 'Webhook Secret', type: 'password', required: false },
    ],
  },
  amazon_sp: {
    name: 'Amazon Seller Central',
    icon: '📦',
    color: 'bg-yellow-500/20 text-yellow-400',
    fields: [
      { key: 'seller_id', label: 'Seller ID', type: 'text', required: true },
      { key: 'marketplace_id', label: 'Marketplace ID', type: 'text', required: true },
      { key: 'refresh_token', label: 'Refresh Token', type: 'password', required: true },
      { key: 'client_id', label: 'Client ID', type: 'password', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', required: true },
    ],
  },
  amazon_kdp: {
    name: 'Amazon KDP',
    icon: '📚',
    color: 'bg-amber-500/20 text-amber-400',
    fields: [
      { key: 'account_email', label: 'Account Email', type: 'email', required: true },
      { key: 'notes', label: 'Notes (Manual Integration)', type: 'text', required: false },
    ],
  },
};

export default function StoresPage() {
  const { currentOrg, canOperate } = useAuthContext();
  const [stores, setStores] = useState<StoreData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [formData, setFormData] = useState<Record<string, string>>({ name: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentOrg) {
      fetchStores();
    }
  }, [currentOrg]);

  const fetchStores = async () => {
    if (!currentOrg) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('org_id', currentOrg.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch stores');
    } else {
      setStores((data || []).map(store => ({
        ...store,
        metadata: (store.metadata || {}) as Record<string, unknown>,
      })));
    }
    setIsLoading(false);
  };

  const handlePlatformChange = (platform: string) => {
    setSelectedPlatform(platform);
    setFormData({ name: PLATFORM_INFO[platform]?.name || '' });
  };

  const handleSaveStore = async () => {
    if (!currentOrg || !selectedPlatform) return;
    
    const platformInfo = PLATFORM_INFO[selectedPlatform];
    const requiredFields = platformInfo.fields.filter(f => f.required);
    const missingFields = requiredFields.filter(f => !formData[f.key]);
    
    if (!formData.name || missingFields.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFields.map(f => f.label).join(', ')}`);
      return;
    }

    setIsSaving(true);

    // Extract credentials from form data
    const credentials: Record<string, string> = {};
    platformInfo.fields.forEach(field => {
      if (formData[field.key]) {
        credentials[field.key] = formData[field.key];
      }
    });

    const { error } = await supabase.from('stores').insert({
      org_id: currentOrg.id,
      name: formData.name,
      platform: selectedPlatform,
      external_id: formData.shop_id || formData.shop_domain || formData.seller_id || null,
      credentials,
      metadata: {},
      is_active: true,
    });

    setIsSaving(false);

    if (error) {
      toast.error('Failed to create store: ' + error.message);
    } else {
      toast.success('Store connected successfully!');
      setDialogOpen(false);
      setSelectedPlatform('');
      setFormData({ name: '' });
      fetchStores();
    }
  };

  const toggleStoreActive = async (store: StoreData) => {
    const { error } = await supabase
      .from('stores')
      .update({ is_active: !store.is_active })
      .eq('id', store.id);

    if (error) {
      toast.error('Failed to update store');
    } else {
      toast.success(store.is_active ? 'Store deactivated' : 'Store activated');
      fetchStores();
    }
  };

  const deleteStore = async (store: StoreData) => {
    if (!confirm(`Are you sure you want to delete "${store.name}"?`)) return;

    const { error } = await supabase.from('stores').delete().eq('id', store.id);

    if (error) {
      toast.error('Failed to delete store');
    } else {
      toast.success('Store deleted');
      fetchStores();
    }
  };

  const getPlatformInfo = (platform: string) => {
    return PLATFORM_INFO[platform] || { name: platform, icon: '🏪', color: 'bg-muted' };
  };

  return (
    <PageContainer>
      <PageHeader
        title="Stores"
        description="Connect and manage your e-commerce stores across platforms"
      >
        {canOperate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="glow">
                <Plus className="w-4 h-4 mr-2" />
                Connect Store
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Connect a Store</DialogTitle>
                <DialogDescription>
                  Choose a platform and enter your credentials to connect your store
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <Select value={selectedPlatform} onValueChange={handlePlatformChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PLATFORM_INFO).map(([key, info]) => (
                        <SelectItem key={key} value={key}>
                          <span className="flex items-center gap-2">
                            <span>{info.icon}</span>
                            <span>{info.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedPlatform && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="name">Store Name *</Label>
                      <Input
                        id="name"
                        placeholder="My Store"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>

                    {PLATFORM_INFO[selectedPlatform].fields.map((field) => (
                      <div key={field.key} className="space-y-2">
                        <Label htmlFor={field.key}>
                          {field.label} {field.required && '*'}
                        </Label>
                        <Input
                          id={field.key}
                          type={field.type}
                          placeholder={field.label}
                          value={formData[field.key] || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                        />
                      </div>
                    ))}

                    {selectedPlatform === 'amazon_kdp' && (
                      <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                          <div className="text-sm">
                            <p className="font-medium text-warning">Manual Integration Required</p>
                            <p className="text-muted-foreground mt-1">
                              Amazon KDP doesn't provide an API. Publishing will require manual steps with approval gates.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <Button
                      variant="glow"
                      className="w-full"
                      onClick={handleSaveStore}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Connecting...' : 'Connect Store'}
                    </Button>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-6 bg-muted rounded w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stores.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Store className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No stores connected</h3>
            <p className="text-muted-foreground text-center mb-4 max-w-md">
              Connect your first store to start syncing products and managing your e-commerce operations.
            </p>
            {canOperate && (
              <Button variant="glow" onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Connect Your First Store
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stores.map((store) => {
            const platformInfo = getPlatformInfo(store.platform);
            return (
              <Card key={store.id} className={!store.is_active ? 'opacity-60' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${platformInfo.color}`}>
                        <span className="text-xl">{platformInfo.icon}</span>
                      </div>
                      <div>
                        <CardTitle className="text-base">{store.name}</CardTitle>
                        <CardDescription>{platformInfo.name}</CardDescription>
                      </div>
                    </div>
                    <Badge variant={store.is_active ? 'success' : 'muted'}>
                      {store.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {store.external_id && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">ID:</span>{' '}
                        <span className="font-mono text-xs">{store.external_id}</span>
                      </div>
                    )}
                    
                    <div className="text-sm text-muted-foreground">
                      Connected {new Date(store.created_at).toLocaleDateString()}
                    </div>

                    {canOperate && (
                      <div className="flex items-center justify-between pt-3 border-t border-border">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={store.is_active}
                            onCheckedChange={() => toggleStoreActive(store)}
                          />
                          <span className="text-sm text-muted-foreground">
                            {store.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon">
                            <Settings className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => deleteStore(store)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
