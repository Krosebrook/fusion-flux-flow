import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { GitCompare, ArrowRight, Equal, Plus, Minus, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
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

interface ComparisonItem {
  key: string;
  description: string | null;
  leftValue: Json | null;
  rightValue: Json | null;
  leftVersion?: number;
  rightVersion?: number;
  status: 'same' | 'different' | 'left-only' | 'right-only';
}

const SCOPE_OPTIONS: { value: SettingsScope; label: string }[] = [
  { value: 'global', label: 'Global' },
  { value: 'org', label: 'Organization' },
  { value: 'store', label: 'Store' },
  { value: 'plugin_instance', label: 'Plugin Instance' },
];

export function SettingsComparison() {
  const { currentOrg } = useAuthContext();
  const [leftScope, setLeftScope] = useState<SettingsScope>('org');
  const [rightScope, setRightScope] = useState<SettingsScope>('store');
  const [leftScopeId, setLeftScopeId] = useState<string>('');
  const [rightScopeId, setRightScopeId] = useState<string>('');

  // Fetch definitions
  const { data: definitions, isLoading: loadingDefs } = useQuery({
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

  // Fetch all values
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

  // Fetch stores for scope selection
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

  // Fetch plugin instances
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

  const getScopeIdOptions = (scope: SettingsScope) => {
    switch (scope) {
      case 'org':
        return currentOrg ? [{ id: currentOrg.id, label: currentOrg.name }] : [];
      case 'store':
        return stores?.map(s => ({ id: s.id, label: `${s.name} (${s.platform})` })) || [];
      case 'plugin_instance':
        return pluginInstances?.map(p => ({
          id: p.id,
          label: (p.plugins as { name: string } | null)?.name || 'Unknown Plugin',
        })) || [];
      default:
        return [];
    }
  };

  const getEffectiveScopeId = (scope: SettingsScope, scopeId: string): string | null => {
    if (scope === 'global') return null;
    if (scope === 'org') return currentOrg?.id || null;
    return scopeId || null;
  };

  // Compute comparison
  const comparison = useMemo<ComparisonItem[]>(() => {
    if (!definitions || !values) return [];

    const leftEffectiveId = getEffectiveScopeId(leftScope, leftScopeId);
    const rightEffectiveId = getEffectiveScopeId(rightScope, rightScopeId);

    // Get definitions that match either scope
    const relevantDefs = definitions.filter(
      d => d.scope === leftScope || d.scope === rightScope
    );

    return relevantDefs.map(def => {
      const leftVal = values.find(
        v => v.definition_id === def.id && v.scope === leftScope && v.scope_id === leftEffectiveId
      );
      const rightVal = values.find(
        v => v.definition_id === def.id && v.scope === rightScope && v.scope_id === rightEffectiveId
      );

      let status: ComparisonItem['status'];
      if (leftVal && rightVal) {
        status = JSON.stringify(leftVal.value) === JSON.stringify(rightVal.value) ? 'same' : 'different';
      } else if (leftVal) {
        status = 'left-only';
      } else if (rightVal) {
        status = 'right-only';
      } else {
        status = 'same'; // Both using defaults
      }

      return {
        key: def.key,
        description: def.description,
        leftValue: leftVal?.value ?? def.default_value,
        rightValue: rightVal?.value ?? def.default_value,
        leftVersion: leftVal?.version,
        rightVersion: rightVal?.version,
        status,
      };
    });
  }, [definitions, values, leftScope, rightScope, leftScopeId, rightScopeId, currentOrg?.id]);

  const formatSettingKey = (key: string): string => {
    return key
      .split(/[._-]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const renderValuePreview = (value: Json | null): string => {
    if (value === null) return '(default)';
    if (typeof value === 'object' && value !== null) {
      const keys = Object.keys(value);
      if (keys.length === 0) return '{}';
      if (keys.length <= 2) {
        return keys.map(k => `${k}: ${JSON.stringify((value as Record<string, unknown>)[k])}`).join(', ');
      }
      return `{${keys.length} properties}`;
    }
    return String(value);
  };

  const getStatusIcon = (status: ComparisonItem['status']) => {
    switch (status) {
      case 'same':
        return <Equal className="h-4 w-4 text-muted-foreground" />;
      case 'different':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'left-only':
        return <Plus className="h-4 w-4 text-blue-500" />;
      case 'right-only':
        return <Minus className="h-4 w-4 text-orange-500" />;
    }
  };

  const getStatusBadge = (status: ComparisonItem['status']) => {
    switch (status) {
      case 'same':
        return <Badge variant="secondary">Same</Badge>;
      case 'different':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Different</Badge>;
      case 'left-only':
        return <Badge variant="outline" className="border-blue-500 text-blue-600">Left Only</Badge>;
      case 'right-only':
        return <Badge variant="outline" className="border-orange-500 text-orange-600">Right Only</Badge>;
    }
  };

  const isLoading = loadingDefs || loadingValues;

  const differentCount = comparison.filter(c => c.status === 'different').length;
  const leftOnlyCount = comparison.filter(c => c.status === 'left-only').length;
  const rightOnlyCount = comparison.filter(c => c.status === 'right-only').length;

  if (!currentOrg) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Please select an organization to compare settings
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-primary" />
            <CardTitle>Compare Settings</CardTitle>
          </div>
          <CardDescription>
            View differences between scope levels to understand configuration inheritance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Scope Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Left Scope</label>
              <Select value={leftScope} onValueChange={(v) => setLeftScope(v as SettingsScope)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCOPE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(leftScope === 'store' || leftScope === 'plugin_instance') && (
                <Select value={leftScopeId} onValueChange={setLeftScopeId}>
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${leftScope === 'store' ? 'store' : 'plugin'}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {getScopeIdOptions(leftScope).map(opt => (
                      <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex justify-center">
              <ArrowRight className="h-6 w-6 text-muted-foreground" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Right Scope</label>
              <Select value={rightScope} onValueChange={(v) => setRightScope(v as SettingsScope)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCOPE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(rightScope === 'store' || rightScope === 'plugin_instance') && (
                <Select value={rightScopeId} onValueChange={setRightScopeId}>
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${rightScope === 'store' ? 'store' : 'plugin'}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {getScopeIdOptions(rightScope).map(opt => (
                      <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="flex gap-2 flex-wrap">
            <Badge variant="secondary">{comparison.length} settings compared</Badge>
            {differentCount > 0 && (
              <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                {differentCount} different
              </Badge>
            )}
            {leftOnlyCount > 0 && (
              <Badge variant="outline" className="border-blue-500 text-blue-600">
                {leftOnlyCount} left only
              </Badge>
            )}
            {rightOnlyCount > 0 && (
              <Badge variant="outline" className="border-orange-500 text-orange-600">
                {rightOnlyCount} right only
              </Badge>
            )}
          </div>

          {/* Comparison Results */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="p-4 rounded-lg border">
                  <Skeleton className="h-5 w-40 mb-2" />
                  <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : comparison.length > 0 ? (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {comparison.map((item) => (
                  <div
                    key={item.key}
                    className={cn(
                      "p-4 rounded-lg border transition-colors",
                      item.status === 'different' && "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900",
                      item.status === 'left-only' && "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900",
                      item.status === 'right-only' && "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900"
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(item.status)}
                        <span className="font-medium">{formatSettingKey(item.key)}</span>
                      </div>
                      {getStatusBadge(item.status)}
                    </div>
                    
                    {item.description && (
                      <p className="text-sm text-muted-foreground mb-3">{item.description}</p>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="p-3 bg-muted/50 rounded-md">
                            <div className="text-xs text-muted-foreground mb-1 flex items-center justify-between">
                              <span>{SCOPE_OPTIONS.find(o => o.value === leftScope)?.label}</span>
                              {item.leftVersion !== undefined && (
                                <Badge variant="outline" className="text-xs">v{item.leftVersion}</Badge>
                              )}
                            </div>
                            <p className="text-sm font-mono truncate">
                              {renderValuePreview(item.leftValue)}
                            </p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-md">
                          <pre className="text-xs whitespace-pre-wrap">
                            {JSON.stringify(item.leftValue, null, 2)}
                          </pre>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="p-3 bg-muted/50 rounded-md">
                            <div className="text-xs text-muted-foreground mb-1 flex items-center justify-between">
                              <span>{SCOPE_OPTIONS.find(o => o.value === rightScope)?.label}</span>
                              {item.rightVersion !== undefined && (
                                <Badge variant="outline" className="text-xs">v{item.rightVersion}</Badge>
                              )}
                            </div>
                            <p className="text-sm font-mono truncate">
                              {renderValuePreview(item.rightValue)}
                            </p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-md">
                          <pre className="text-xs whitespace-pre-wrap">
                            {JSON.stringify(item.rightValue, null, 2)}
                          </pre>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <GitCompare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No settings to compare</p>
              <p className="text-sm">Add some settings definitions first</p>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}