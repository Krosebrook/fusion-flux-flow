import { useEffect, useState } from 'react';
import { PageContainer, PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Plugin, PluginContract, PluginInstance, CapabilityLevel } from '@/types/database';
import {
  Puzzle,
  Check,
  AlertTriangle,
  X,
  Settings,
  Power,
  Info,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface PluginWithContracts extends Plugin {
  plugin_contracts: PluginContract[];
  instance?: PluginInstance;
}

export default function PluginsPage() {
  const { currentOrg, canOperate } = useAuthContext();
  const [plugins, setPlugins] = useState<PluginWithContracts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlugin, setSelectedPlugin] = useState<PluginWithContracts | null>(null);

  useEffect(() => {
    fetchPlugins();
  }, [currentOrg]);

  const fetchPlugins = async () => {
    setIsLoading(true);
    
    // Fetch all plugins with their contracts
    const { data: pluginsData, error } = await supabase
      .from('plugins')
      .select('*, plugin_contracts(*)')
      .eq('is_active', true);

    if (error) {
      toast.error('Failed to load plugins');
      setIsLoading(false);
      return;
    }

    // Fetch installed instances for this org
    let instances: PluginInstance[] = [];
    if (currentOrg) {
      const { data } = await supabase
        .from('plugin_instances')
        .select('*')
        .eq('org_id', currentOrg.id);
      instances = (data as PluginInstance[]) || [];
    }

    // Map instances to plugins
    const pluginsWithInstances = (pluginsData || []).map((p: any) => ({
      ...p,
      instance: instances.find(i => i.plugin_id === p.id),
    }));

    setPlugins(pluginsWithInstances);
    setIsLoading(false);
  };

  const installPlugin = async (plugin: PluginWithContracts) => {
    if (!currentOrg || !canOperate) return;

    const { error } = await supabase.from('plugin_instances').insert({
      org_id: currentOrg.id,
      plugin_id: plugin.id,
      config: {},
      is_active: true,
    });

    if (error) {
      toast.error('Failed to install plugin');
    } else {
      toast.success(`${plugin.name} installed!`);
      fetchPlugins();
    }
  };

  const uninstallPlugin = async (plugin: PluginWithContracts) => {
    if (!plugin.instance || !canOperate) return;

    const { error } = await supabase
      .from('plugin_instances')
      .delete()
      .eq('id', plugin.instance.id);

    if (error) {
      toast.error('Failed to uninstall plugin');
    } else {
      toast.success(`${plugin.name} uninstalled`);
      fetchPlugins();
    }
  };

  const getCapabilityBadge = (level: CapabilityLevel) => {
    switch (level) {
      case 'native':
        return (
          <Badge variant="native" className="gap-1">
            <Check className="w-3 h-3" /> Native
          </Badge>
        );
      case 'workaround':
        return (
          <Badge variant="workaround" className="gap-1">
            <AlertTriangle className="w-3 h-3" /> Workaround
          </Badge>
        );
      case 'unsupported':
        return (
          <Badge variant="unsupported" className="gap-1">
            <X className="w-3 h-3" /> Unsupported
          </Badge>
        );
    }
  };

  const getCapabilityExplanation = (level: CapabilityLevel, capability: string, plugin: PluginWithContracts) => {
    const contract = plugin.plugin_contracts.find(c => c.capability === capability);
    if (!contract) return '';

    switch (level) {
      case 'native':
        return contract.description || 'Fully supported via API';
      case 'workaround':
        return `${contract.description || 'Requires workaround'}. Actions will be staged and queued.`;
      case 'unsupported':
        return `${contract.description || 'Not supported'}. This action cannot be performed via the API.`;
    }
  };

  const capabilities = ['product_sync', 'inventory_sync', 'order_create', 'bulk_publish', 'webhooks', 'reconciliation'];

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Plugins"
        description="Platform connectors and integrations"
      />

      <Tabs defaultValue="available" className="space-y-6">
        <TabsList>
          <TabsTrigger value="available">Available Plugins</TabsTrigger>
          <TabsTrigger value="capabilities">Capabilities Matrix</TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plugins.map((plugin) => (
              <Card key={plugin.id} variant="glow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                        <Puzzle className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{plugin.name}</CardTitle>
                        <p className="text-xs text-muted-foreground font-mono">v{plugin.version}</p>
                      </div>
                    </div>
                    {plugin.instance && (
                      <Badge variant="success" className="gap-1">
                        <Power className="w-3 h-3" /> Active
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CardDescription className="text-sm">
                    {plugin.description}
                  </CardDescription>

                  <div className="flex flex-wrap gap-1">
                    {plugin.plugin_contracts.slice(0, 4).map((contract) => (
                      <Tooltip key={contract.id}>
                        <TooltipTrigger>
                          {getCapabilityBadge(contract.level as CapabilityLevel)}
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">{contract.capability.replace(/_/g, ' ')}</p>
                          <p className="text-xs">{contract.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    {plugin.instance ? (
                      <>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Settings className="w-4 h-4 mr-1" /> Configure
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => uninstallPlugin(plugin)}
                          disabled={!canOperate}
                        >
                          Uninstall
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        className="w-full"
                        onClick={() => installPlugin(plugin)}
                        disabled={!canOperate || !currentOrg}
                      >
                        Install Plugin
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="capabilities">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Capability Matrix</CardTitle>
              <CardDescription>
                Support levels across all plugins. Click a badge to see details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Plugin</th>
                      {capabilities.map((cap) => (
                        <th key={cap} className="text-center py-3 px-2 font-medium text-muted-foreground capitalize">
                          {cap.replace(/_/g, ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {plugins.map((plugin) => (
                      <tr key={plugin.id} className="border-b border-border/50 hover:bg-secondary/30">
                        <td className="py-3 px-2 font-medium">{plugin.name}</td>
                        {capabilities.map((cap) => {
                          const contract = plugin.plugin_contracts.find(c => c.capability === cap);
                          return (
                            <td key={cap} className="text-center py-3 px-2">
                              {contract ? (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <button className="hover:scale-110 transition-transform">
                                      {getCapabilityBadge(contract.level as CapabilityLevel)}
                                    </button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle className="flex items-center gap-2">
                                        {plugin.name} - {cap.replace(/_/g, ' ')}
                                        {getCapabilityBadge(contract.level as CapabilityLevel)}
                                      </DialogTitle>
                                      <DialogDescription className="pt-4">
                                        {getCapabilityExplanation(contract.level as CapabilityLevel, cap, plugin)}
                                      </DialogDescription>
                                    </DialogHeader>
                                    {contract.constraints && Object.keys(contract.constraints).length > 0 && (
                                      <div className="space-y-2">
                                        <p className="text-sm font-medium">Constraints:</p>
                                        <pre className="text-xs bg-secondary p-3 rounded-lg overflow-auto font-mono">
                                          {JSON.stringify(contract.constraints, null, 2)}
                                        </pre>
                                      </div>
                                    )}
                                    {contract.level === 'unsupported' && (
                                      <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg">
                                        <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
                                        <p className="text-sm text-destructive">
                                          This action is blocked and cannot be performed. The platform does not support this capability via API.
                                        </p>
                                      </div>
                                    )}
                                    {contract.level === 'workaround' && (
                                      <div className="flex items-start gap-2 p-3 bg-warning/10 rounded-lg">
                                        <Info className="w-5 h-5 text-warning shrink-0" />
                                        <p className="text-sm text-warning">
                                          This action will be staged and queued. It may require manual intervention or additional processing time.
                                        </p>
                                      </div>
                                    )}
                                  </DialogContent>
                                </Dialog>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  {getCapabilityBadge('native')}
                  <span className="text-sm text-muted-foreground">Fully supported</span>
                </div>
                <div className="flex items-center gap-2">
                  {getCapabilityBadge('workaround')}
                  <span className="text-sm text-muted-foreground">Staged & queued</span>
                </div>
                <div className="flex items-center gap-2">
                  {getCapabilityBadge('unsupported')}
                  <span className="text-sm text-muted-foreground">Blocked with explanation</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
