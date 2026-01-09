import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { JsonSchemaForm } from '@/components/settings/JsonSchemaForm';
import { toast } from 'sonner';
import { Building2, Store, Puzzle, Globe } from 'lucide-react';
import type { Json } from '@/integrations/supabase/types';

type SettingsScope = 'global' | 'org' | 'store' | 'plugin_instance';

interface SettingsDefinition {
  id: string;
  key: string;
  schema: Json;
  scope: SettingsScope;
  default_value: Json | null;
  description: string | null;
}

interface SettingsValue {
  id: string;
  definition_id: string;
  scope: SettingsScope;
  scope_id: string | null;
  value: Json;
  version: number;
}

export default function SettingsPage() {
  const { currentOrg } = useAuthContext();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<SettingsScope>('org');
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [selectedPluginInstanceId, setSelectedPluginInstanceId] = useState<string>('');

  // Fetch settings definitions
  const { data: definitions, isLoading: loadingDefinitions } = useQuery({
    queryKey: ['settings-definitions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings_definitions')
        .select('*')
        .order('key');
      if (error) throw error;
      return data as SettingsDefinition[];
    },
  });

  // Fetch settings values for current org
  const { data: values, isLoading: loadingValues } = useQuery({
    queryKey: ['settings-values', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];
      const { data, error } = await supabase
        .from('settings_values')
        .select('*');
      if (error) throw error;
      return data as SettingsValue[];
    },
    enabled: !!currentOrg,
  });

  // Fetch stores for store-scoped settings
  const { data: stores } = useQuery({
    queryKey: ['stores', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, platform')
        .eq('org_id', currentOrg.id)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg,
  });

  // Fetch plugin instances for plugin-scoped settings
  const { data: pluginInstances } = useQuery({
    queryKey: ['plugin-instances', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];
      const { data, error } = await supabase
        .from('plugin_instances')
        .select('id, plugin_id, plugins(name)')
        .eq('org_id', currentOrg.id);
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg,
  });

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async ({
      definitionId,
      scope,
      scopeId,
      value,
    }: {
      definitionId: string;
      scope: SettingsScope;
      scopeId: string | null;
      value: Record<string, unknown>;
    }) => {
      // Check if value exists
      const existing = values?.find(
        (v) => v.definition_id === definitionId && v.scope === scope && v.scope_id === scopeId
      );

      if (existing) {
        const { error } = await supabase
          .from('settings_values')
          .update({ value: value as Json, version: existing.version + 1 })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('settings_values')
          .insert({
            definition_id: definitionId,
            scope,
            scope_id: scopeId,
            value: value as Json,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-values'] });
      toast.success('Settings saved successfully');
    },
    onError: (error) => {
      toast.error('Failed to save settings', { description: error.message });
    },
  });

  const getScopeId = (scope: SettingsScope): string | null => {
    switch (scope) {
      case 'org':
        return currentOrg?.id || null;
      case 'store':
        return selectedStoreId || null;
      case 'plugin_instance':
        return selectedPluginInstanceId || null;
      default:
        return null;
    }
  };

  const getSettingsForScope = (scope: SettingsScope) => {
    return definitions?.filter((d) => d.scope === scope) || [];
  };

  const getValueForDefinition = (definitionId: string, scope: SettingsScope): Record<string, unknown> | undefined => {
    const scopeId = getScopeId(scope);
    const value = values?.find(
      (v) => v.definition_id === definitionId && v.scope === scope && v.scope_id === scopeId
    );
    return value?.value as Record<string, unknown> | undefined;
  };

  const handleSave = async (definitionId: string, scope: SettingsScope, value: Record<string, unknown>) => {
    const scopeId = getScopeId(scope);
    await saveMutation.mutateAsync({ definitionId, scope, scopeId, value });
  };

  if (!currentOrg) {
    return (
      <div className="p-6">
        <PageHeader
          title="Settings"
          description="Configure your organization, stores, and plugins"
        />
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Please select or create an organization first
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLoading = loadingDefinitions || loadingValues;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Settings"
        description="Configure your organization, stores, and plugins with versioned settings"
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SettingsScope)}>
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="global" className="gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Global</span>
          </TabsTrigger>
          <TabsTrigger value="org" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Organization</span>
          </TabsTrigger>
          <TabsTrigger value="store" className="gap-2">
            <Store className="h-4 w-4" />
            <span className="hidden sm:inline">Store</span>
          </TabsTrigger>
          <TabsTrigger value="plugin_instance" className="gap-2">
            <Puzzle className="h-4 w-4" />
            <span className="hidden sm:inline">Plugin</span>
          </TabsTrigger>
        </TabsList>

        {/* Global Settings */}
        <TabsContent value="global" className="space-y-6">
          <SettingsScopeContent
            scope="global"
            definitions={getSettingsForScope('global')}
            getValueForDefinition={getValueForDefinition}
            onSave={handleSave}
            isLoading={isLoading}
            isSaving={saveMutation.isPending}
          />
        </TabsContent>

        {/* Organization Settings */}
        <TabsContent value="org" className="space-y-6">
          <SettingsScopeContent
            scope="org"
            definitions={getSettingsForScope('org')}
            getValueForDefinition={getValueForDefinition}
            onSave={handleSave}
            isLoading={isLoading}
            isSaving={saveMutation.isPending}
          />
        </TabsContent>

        {/* Store Settings */}
        <TabsContent value="store" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Store</CardTitle>
              <CardDescription>Choose a store to configure its settings</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Select a store" />
                </SelectTrigger>
                <SelectContent>
                  {stores?.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name} ({store.platform})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {selectedStoreId && (
            <SettingsScopeContent
              scope="store"
              definitions={getSettingsForScope('store')}
              getValueForDefinition={getValueForDefinition}
              onSave={handleSave}
              isLoading={isLoading}
              isSaving={saveMutation.isPending}
            />
          )}
        </TabsContent>

        {/* Plugin Instance Settings */}
        <TabsContent value="plugin_instance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Plugin</CardTitle>
              <CardDescription>Choose an installed plugin to configure</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedPluginInstanceId} onValueChange={setSelectedPluginInstanceId}>
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Select a plugin instance" />
                </SelectTrigger>
                <SelectContent>
                  {pluginInstances?.map((instance) => (
                    <SelectItem key={instance.id} value={instance.id}>
                      {(instance.plugins as { name: string } | null)?.name || 'Unknown Plugin'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {selectedPluginInstanceId && (
            <SettingsScopeContent
              scope="plugin_instance"
              definitions={getSettingsForScope('plugin_instance')}
              getValueForDefinition={getValueForDefinition}
              onSave={handleSave}
              isLoading={isLoading}
              isSaving={saveMutation.isPending}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface SettingsScopeContentProps {
  scope: SettingsScope;
  definitions: SettingsDefinition[];
  getValueForDefinition: (definitionId: string, scope: SettingsScope) => Record<string, unknown> | undefined;
  onSave: (definitionId: string, scope: SettingsScope, value: Record<string, unknown>) => Promise<void>;
  isLoading: boolean;
  isSaving: boolean;
}

function SettingsScopeContent({
  scope,
  definitions,
  getValueForDefinition,
  onSave,
  isLoading,
  isSaving,
}: SettingsScopeContentProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-60" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (definitions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No settings defined for this scope yet
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {definitions.map((definition) => {
        const schema = definition.schema as { type: string; properties?: Record<string, unknown> };
        const existingValue = getValueForDefinition(definition.id, scope);
        const defaultValue = definition.default_value as Record<string, unknown> | null;

        return (
          <Card key={definition.id}>
            <CardHeader>
              <CardTitle className="text-lg">{formatSettingKey(definition.key)}</CardTitle>
              {definition.description && (
                <CardDescription>{definition.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <JsonSchemaForm
                schema={schema as { type: string; properties?: Record<string, { type: string; title?: string; description?: string; default?: unknown; enum?: string[]; minimum?: number; maximum?: number; minLength?: number; maxLength?: number; pattern?: string; format?: string }> }}
                defaultValues={existingValue || defaultValue || undefined}
                onSubmit={(value) => onSave(definition.id, scope, value)}
                isLoading={isSaving}
              />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function formatSettingKey(key: string): string {
  return key
    .split(/[._-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
