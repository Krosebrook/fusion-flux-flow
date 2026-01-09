import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { History, RotateCcw, Eye, Clock, User, ChevronRight } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import type { Json } from '@/integrations/supabase/types';

interface SettingsValue {
  id: string;
  definition_id: string;
  scope: string;
  scope_id: string | null;
  value: Json;
  version: number;
  created_at: string;
  created_by: string | null;
}

interface SettingsDefinition {
  id: string;
  key: string;
  description: string | null;
}

interface HistoryEntry {
  id: string;
  definition: SettingsDefinition;
  value: Json;
  version: number;
  created_at: string;
  created_by: string | null;
}

export function SettingsHistory() {
  const { currentOrg } = useAuthContext();
  const queryClient = useQueryClient();
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const [showRollbackDialog, setShowRollbackDialog] = useState(false);

  // Fetch all settings values with their definitions for history
  const { data: historyEntries, isLoading } = useQuery({
    queryKey: ['settings-history', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];
      
      const { data: values, error: valuesError } = await supabase
        .from('settings_values')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (valuesError) throw valuesError;
      
      const { data: definitions, error: defsError } = await supabase
        .from('settings_definitions')
        .select('id, key, description');
      
      if (defsError) throw defsError;
      
      const defMap = new Map(definitions?.map(d => [d.id, d]) || []);
      
      return (values || []).map((v: SettingsValue) => ({
        id: v.id,
        definition: defMap.get(v.definition_id) || { id: v.definition_id, key: 'Unknown', description: null },
        value: v.value,
        version: v.version,
        created_at: v.created_at,
        created_by: v.created_by,
      })) as HistoryEntry[];
    },
    enabled: !!currentOrg,
  });

  // Rollback mutation
  const rollbackMutation = useMutation({
    mutationFn: async (entry: HistoryEntry) => {
      const { error } = await supabase
        .from('settings_values')
        .update({ 
          value: entry.value,
          version: entry.version + 1,
        })
        .eq('id', entry.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-values'] });
      queryClient.invalidateQueries({ queryKey: ['settings-history'] });
      toast.success('Settings rolled back successfully');
      setShowRollbackDialog(false);
      setSelectedEntry(null);
    },
    onError: (error) => {
      toast.error('Failed to rollback settings', { description: error.message });
    },
  });

  const handleRollback = () => {
    if (selectedEntry) {
      rollbackMutation.mutate(selectedEntry);
    }
  };

  const formatSettingKey = (key: string): string => {
    return key
      .split(/[._-]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const renderValuePreview = (value: Json): string => {
    if (typeof value === 'object' && value !== null) {
      const keys = Object.keys(value);
      if (keys.length <= 3) {
        return keys.map(k => `${k}: ${JSON.stringify((value as Record<string, unknown>)[k])}`).join(', ');
      }
      return `${keys.length} properties`;
    }
    return String(value);
  };

  if (!currentOrg) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Please select an organization to view settings history
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <CardTitle>Settings History</CardTitle>
          </div>
          <CardDescription>
            View and rollback to previous setting versions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-60" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : historyEntries && historyEntries.length > 0 ? (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {historyEntries.map((entry, index) => (
                  <div
                    key={`${entry.id}-${entry.version}`}
                    className="group flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">v{entry.version}</span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {formatSettingKey(entry.definition.key)}
                        </span>
                        {index === 0 && (
                          <Badge variant="secondary" className="text-xs">Current</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex items-center gap-1 cursor-help">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {format(new Date(entry.created_at), 'PPpp')}
                          </TooltipContent>
                        </Tooltip>
                        {entry.created_by && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span className="truncate max-w-[150px]">{entry.created_by}</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {renderValuePreview(entry.value)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedEntry(entry)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>View details</TooltipContent>
                      </Tooltip>
                      
                      {index > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedEntry(entry);
                                setShowRollbackDialog(true);
                              }}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Rollback to this version</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No settings history yet</p>
              <p className="text-sm">Changes to settings will appear here</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={!!selectedEntry && !showRollbackDialog} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedEntry && formatSettingKey(selectedEntry.definition.key)} - Version {selectedEntry?.version}
            </DialogTitle>
            <DialogDescription>
              {selectedEntry?.definition.description || 'Setting value details'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {selectedEntry && format(new Date(selectedEntry.created_at), 'PPpp')}
              </span>
              {selectedEntry?.created_by && (
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {selectedEntry.created_by}
                </span>
              )}
            </div>
            <div className="bg-muted rounded-lg p-4 overflow-auto max-h-[300px]">
              <pre className="text-sm font-mono whitespace-pre-wrap">
                {JSON.stringify(selectedEntry?.value, null, 2)}
              </pre>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedEntry(null)}>
              Close
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowRollbackDialog(true)}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Rollback to this version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rollback Confirmation Dialog */}
      <Dialog open={showRollbackDialog} onOpenChange={setShowRollbackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Rollback</DialogTitle>
            <DialogDescription>
              Are you sure you want to rollback to version {selectedEntry?.version} of{' '}
              <strong>{selectedEntry && formatSettingKey(selectedEntry.definition.key)}</strong>?
              This will create a new version with the old values.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRollbackDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRollback}
              disabled={rollbackMutation.isPending}
            >
              {rollbackMutation.isPending ? 'Rolling back...' : 'Confirm Rollback'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
