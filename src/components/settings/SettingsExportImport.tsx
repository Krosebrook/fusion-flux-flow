import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { toast } from 'sonner';
import { Download, Upload, FileJson, AlertTriangle, CheckCircle2, Copy } from 'lucide-react';
import type { Json } from '@/integrations/supabase/types';

interface ExportData {
  version: string;
  exportedAt: string;
  orgName: string;
  definitions: Array<{
    key: string;
    schema: Json;
    scope: string;
    default_value: Json | null;
    description: string | null;
  }>;
  values: Array<{
    definition_key: string;
    scope: string;
    scope_id: string | null;
    value: Json;
    version: number;
  }>;
}

export function SettingsExportImport() {
  const { currentOrg } = useAuthContext();
  const queryClient = useQueryClient();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState('');
  const [importPreview, setImportPreview] = useState<ExportData | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: async () => {
      if (!currentOrg) throw new Error('No organization selected');

      const { data: definitions, error: defsError } = await supabase
        .from('settings_definitions')
        .select('key, schema, scope, default_value, description');
      
      if (defsError) throw defsError;

      const { data: values, error: valuesError } = await supabase
        .from('settings_values')
        .select('definition_id, scope, scope_id, value, version');
      
      if (valuesError) throw valuesError;

      // Create a map of definition_id to key
      const { data: allDefs } = await supabase
        .from('settings_definitions')
        .select('id, key');
      
      const defKeyMap = new Map(allDefs?.map(d => [d.id, d.key]) || []);

      const exportData: ExportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        orgName: currentOrg.name,
        definitions: definitions || [],
        values: (values || []).map(v => ({
          definition_key: defKeyMap.get(v.definition_id) || 'unknown',
          scope: v.scope,
          scope_id: v.scope_id,
          value: v.value,
          version: v.version,
        })),
      };

      return exportData;
    },
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `settings-export-${currentOrg?.slug || 'org'}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Settings exported successfully');
    },
    onError: (error) => {
      toast.error('Failed to export settings', { description: error.message });
    },
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (data: ExportData) => {
      if (!currentOrg) throw new Error('No organization selected');

      // Import definitions first
      for (const def of data.definitions) {
        const { data: existing } = await supabase
          .from('settings_definitions')
          .select('id')
          .eq('key', def.key)
          .single();

        if (!existing) {
          const { error } = await supabase
            .from('settings_definitions')
            .insert({
              key: def.key,
              schema: def.schema,
              scope: def.scope as 'global' | 'org' | 'store' | 'plugin_instance' | 'workflow',
              default_value: def.default_value,
              description: def.description,
            });
          if (error) throw error;
        }
      }

      // Get updated definitions map
      const { data: allDefs } = await supabase
        .from('settings_definitions')
        .select('id, key');
      
      const keyDefMap = new Map(allDefs?.map(d => [d.key, d.id]) || []);

      // Import values
      for (const val of data.values) {
        const definitionId = keyDefMap.get(val.definition_key);
        if (!definitionId) continue;

        // Check if value exists
        const scopeForQuery = val.scope as 'global' | 'org' | 'store' | 'plugin_instance' | 'workflow';
        const { data: existing } = await supabase
          .from('settings_values')
          .select('id, version')
          .eq('definition_id', definitionId)
          .eq('scope', scopeForQuery)
          .eq('scope_id', val.scope_id || currentOrg.id)
          .single();

        if (existing) {
          const { error } = await supabase
            .from('settings_values')
            .update({ value: val.value as Json, version: existing.version + 1 })
            .eq('id', existing.id);
          if (error) throw error;
        } else {
          const scopeValue = val.scope as 'global' | 'org' | 'store' | 'plugin_instance' | 'workflow';
          const { error } = await supabase
            .from('settings_values')
            .insert({
              definition_id: definitionId,
              scope: scopeValue,
              scope_id: val.scope_id || currentOrg.id,
              value: val.value as Json,
            });
          if (error) throw error;
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-definitions'] });
      queryClient.invalidateQueries({ queryKey: ['settings-values'] });
      queryClient.invalidateQueries({ queryKey: ['settings-history'] });
      toast.success('Settings imported successfully');
      setImportDialogOpen(false);
      setImportData('');
      setImportPreview(null);
    },
    onError: (error) => {
      toast.error('Failed to import settings', { description: error.message });
    },
  });

  const handleImportDataChange = (value: string) => {
    setImportData(value);
    setImportError(null);
    setImportPreview(null);

    if (!value.trim()) return;

    try {
      const parsed = JSON.parse(value) as ExportData;
      
      // Validate structure
      if (!parsed.version || !parsed.definitions || !parsed.values) {
        setImportError('Invalid export file format. Missing required fields.');
        return;
      }

      setImportPreview(parsed);
    } catch {
      setImportError('Invalid JSON format. Please paste a valid export file.');
    }
  };

  const handleCopyToClipboard = async () => {
    const data = await exportMutation.mutateAsync();
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    toast.success('Settings copied to clipboard');
  };

  if (!currentOrg) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Please select an organization to export/import settings
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileJson className="h-5 w-5 text-primary" />
          <CardTitle>Export / Import Settings</CardTitle>
        </div>
        <CardDescription>
          Backup your settings configuration or restore from a previous export
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            {exportMutation.isPending ? 'Exporting...' : 'Export to File'}
          </Button>

          <Button
            variant="outline"
            onClick={handleCopyToClipboard}
            disabled={exportMutation.isPending}
            className="flex-1"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy to Clipboard
          </Button>

          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" className="flex-1">
                <Upload className="h-4 w-4 mr-2" />
                Import Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Import Settings</DialogTitle>
                <DialogDescription>
                  Paste your exported settings JSON below to import
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <Textarea
                  placeholder="Paste your settings export JSON here..."
                  value={importData}
                  onChange={(e) => handleImportDataChange(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />

                {importError && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{importError}</AlertDescription>
                  </Alert>
                )}

                {importPreview && (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <AlertTitle>Valid Export File</AlertTitle>
                    <AlertDescription>
                      <div className="mt-2 space-y-1">
                        <p><strong>Source:</strong> {importPreview.orgName}</p>
                        <p><strong>Exported:</strong> {new Date(importPreview.exportedAt).toLocaleString()}</p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="secondary">
                            {importPreview.definitions.length} definitions
                          </Badge>
                          <Badge variant="secondary">
                            {importPreview.values.length} values
                          </Badge>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => importPreview && importMutation.mutate(importPreview)}
                  disabled={!importPreview || importMutation.isPending}
                >
                  {importMutation.isPending ? 'Importing...' : 'Import Settings'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <p className="text-sm text-muted-foreground">
          Export includes all setting definitions and their current values. Import will merge with existing settings.
        </p>
      </CardContent>
    </Card>
  );
}