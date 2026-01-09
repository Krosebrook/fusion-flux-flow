import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  MessageSquare,
  User,
  AlertTriangle,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Json } from '@/integrations/supabase/types';

interface Approval {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  status: 'pending' | 'approved' | 'rejected';
  payload: Json | null;
  requested_by: string | null;
  decided_by: string | null;
  decision_note: string | null;
  created_at: string;
  decided_at: string | null;
  expires_at: string | null;
  org_id: string;
}

interface SettingsPayload {
  definition_key?: string;
  scope?: string;
  scope_id?: string | null;
  old_value?: Json;
  new_value?: Json;
  setting_name?: string;
}

// Define which settings require approval
const SENSITIVE_SETTINGS = [
  'api.rate_limit',
  'api.allowed_ips',
  'security.',
  'auth.',
  'billing.',
  'webhooks.secret',
];

export function isSensitiveSetting(key: string): boolean {
  return SENSITIVE_SETTINGS.some(pattern => 
    key.startsWith(pattern) || key.includes('secret') || key.includes('password') || key.includes('api_key')
  );
}

export function SettingsApproval() {
  const { currentOrg, user } = useAuthContext();
  const queryClient = useQueryClient();
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [decisionNote, setDecisionNote] = useState('');
  const [showDecisionDialog, setShowDecisionDialog] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<'approved' | 'rejected' | null>(null);

  // Fetch pending approvals for settings
  const { data: approvals, isLoading } = useQuery({
    queryKey: ['settings-approvals', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];
      const { data, error } = await supabase
        .from('approvals')
        .select('*')
        .eq('org_id', currentOrg.id)
        .eq('entity_type', 'setting')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Approval[];
    },
    enabled: !!currentOrg,
  });

  // Decision mutation
  const decisionMutation = useMutation({
    mutationFn: async ({
      approvalId,
      status,
      note,
    }: {
      approvalId: string;
      status: 'approved' | 'rejected';
      note?: string;
    }) => {
      const { error: updateError } = await supabase
        .from('approvals')
        .update({
          status,
          decided_by: user?.id,
          decided_at: new Date().toISOString(),
          decision_note: note || null,
        })
        .eq('id', approvalId);

      if (updateError) throw updateError;

      // If approved, apply the setting change
      if (status === 'approved') {
        const approval = approvals?.find(a => a.id === approvalId);
        if (approval && approval.payload) {
          const payload = approval.payload as SettingsPayload;
          
          // Get the definition ID
          const { data: def } = await supabase
            .from('settings_definitions')
            .select('id')
            .eq('key', payload.definition_key || '')
            .single();

          if (def && payload.new_value !== undefined) {
            // Check if value exists
            const scopeForQuery = (payload.scope || 'org') as 'global' | 'org' | 'store' | 'plugin_instance' | 'workflow';
            const { data: existing } = await supabase
              .from('settings_values')
              .select('id, version')
              .eq('definition_id', def.id)
              .eq('scope', scopeForQuery)
              .eq('scope_id', payload.scope_id || currentOrg?.id)
              .single();

            if (existing) {
              const { error } = await supabase
                .from('settings_values')
                .update({
                  value: payload.new_value as Json,
                  version: existing.version + 1,
                })
                .eq('id', existing.id);
              if (error) throw error;
            } else {
              const scopeValue = (payload.scope || 'org') as 'global' | 'org' | 'store' | 'plugin_instance' | 'workflow';
              const { error } = await supabase
                .from('settings_values')
                .insert({
                  definition_id: def.id,
                  scope: scopeValue,
                  scope_id: payload.scope_id || currentOrg?.id || null,
                  value: payload.new_value as Json,
                });
              if (error) throw error;
            }
          }
        }
      }
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['settings-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['settings-values'] });
      queryClient.invalidateQueries({ queryKey: ['settings-history'] });
      toast.success(`Setting change ${status}`);
      setShowDecisionDialog(false);
      setSelectedApproval(null);
      setDecisionNote('');
      setPendingDecision(null);
    },
    onError: (error) => {
      toast.error('Failed to process approval', { description: error.message });
    },
  });

  const handleDecision = (status: 'approved' | 'rejected') => {
    if (!selectedApproval) return;
    decisionMutation.mutate({
      approvalId: selectedApproval.id,
      status,
      note: decisionNote,
    });
  };

  const pendingApprovals = approvals?.filter(a => a.status === 'pending') || [];
  const processedApprovals = approvals?.filter(a => a.status !== 'pending') || [];

  const getStatusBadge = (status: Approval['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="border-green-500 text-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="border-red-500 text-red-600"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
    }
  };

  const formatSettingKey = (key: string): string => {
    return key
      .split(/[._-]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (!currentOrg) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Please select an organization to manage setting approvals
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Pending Approvals */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <CardTitle>Pending Approvals</CardTitle>
              {pendingApprovals.length > 0 && (
                <Badge variant="destructive">{pendingApprovals.length}</Badge>
              )}
            </div>
            <CardDescription>
              Sensitive settings changes requiring admin approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="p-4 rounded-lg border">
                    <Skeleton className="h-5 w-40 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            ) : pendingApprovals.length > 0 ? (
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-3">
                  {pendingApprovals.map((approval) => {
                    const payload = approval.payload as SettingsPayload;
                    return (
                      <div
                        key={approval.id}
                        className="p-4 rounded-lg border bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <AlertTriangle className="h-4 w-4 text-yellow-600" />
                              <span className="font-medium">
                                {payload?.setting_name || formatSettingKey(payload?.definition_key || 'Unknown Setting')}
                              </span>
                              {getStatusBadge(approval.status)}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              Requested {formatDistanceToNow(new Date(approval.created_at), { addSuffix: true })}
                            </p>
                            <div className="flex items-center gap-4 text-sm">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-muted-foreground cursor-help">
                                    Old: <code className="bg-muted px-1 rounded">{JSON.stringify(payload?.old_value)?.slice(0, 30)}...</code>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <pre className="text-xs">{JSON.stringify(payload?.old_value, null, 2)}</pre>
                                </TooltipContent>
                              </Tooltip>
                              <span className="text-muted-foreground">→</span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-muted-foreground cursor-help">
                                    New: <code className="bg-muted px-1 rounded">{JSON.stringify(payload?.new_value)?.slice(0, 30)}...</code>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <pre className="text-xs">{JSON.stringify(payload?.new_value, null, 2)}</pre>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedApproval(approval);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-green-500 text-green-600 hover:bg-green-50"
                              onClick={() => {
                                setSelectedApproval(approval);
                                setPendingDecision('approved');
                                setShowDecisionDialog(true);
                              }}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500 text-red-600 hover:bg-red-50"
                              onClick={() => {
                                setSelectedApproval(approval);
                                setPendingDecision('rejected');
                                setShowDecisionDialog(true);
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50 text-green-500" />
                <p>No pending approvals</p>
                <p className="text-sm">All sensitive settings changes have been processed</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Decisions */}
        {processedApprovals.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Decisions</CardTitle>
              <CardDescription>Previously processed approval requests</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-2">
                  {processedApprovals.slice(0, 10).map((approval) => {
                    const payload = approval.payload as SettingsPayload;
                    return (
                      <div
                        key={approval.id}
                        className={cn(
                          "p-3 rounded-lg border",
                          approval.status === 'approved' && "bg-green-50/50 dark:bg-green-950/10",
                          approval.status === 'rejected' && "bg-red-50/50 dark:bg-red-950/10"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getStatusBadge(approval.status)}
                            <span className="font-medium text-sm">
                              {payload?.setting_name || formatSettingKey(payload?.definition_key || 'Unknown')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {approval.decided_at && (
                              <span>{format(new Date(approval.decided_at), 'MMM d, yyyy')}</span>
                            )}
                            {approval.decision_note && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <MessageSquare className="h-4 w-4 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">{approval.decision_note}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* View Details Dialog */}
        <Dialog open={!!selectedApproval && !showDecisionDialog} onOpenChange={() => setSelectedApproval(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Approval Request Details
              </DialogTitle>
              <DialogDescription>
                Review the proposed setting change
              </DialogDescription>
            </DialogHeader>
            {selectedApproval && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Setting:</span>
                    <p className="font-medium">
                      {formatSettingKey((selectedApproval.payload as SettingsPayload)?.definition_key || 'Unknown')}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Scope:</span>
                    <p className="font-medium capitalize">
                      {(selectedApproval.payload as SettingsPayload)?.scope || 'org'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Requested:</span>
                    <p className="font-medium">
                      {format(new Date(selectedApproval.created_at), 'PPpp')}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <p className="font-medium">{getStatusBadge(selectedApproval.status)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Current Value</span>
                    <div className="mt-1 p-3 bg-muted rounded-lg">
                      <pre className="text-sm font-mono whitespace-pre-wrap">
                        {JSON.stringify((selectedApproval.payload as SettingsPayload)?.old_value, null, 2) || 'null'}
                      </pre>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Proposed Value</span>
                    <div className="mt-1 p-3 bg-primary/10 rounded-lg border border-primary/20">
                      <pre className="text-sm font-mono whitespace-pre-wrap">
                        {JSON.stringify((selectedApproval.payload as SettingsPayload)?.new_value, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedApproval(null)}>
                Close
              </Button>
              {selectedApproval?.status === 'pending' && (
                <>
                  <Button
                    variant="outline"
                    className="border-red-500 text-red-600"
                    onClick={() => {
                      setPendingDecision('rejected');
                      setShowDecisionDialog(true);
                    }}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      setPendingDecision('approved');
                      setShowDecisionDialog(true);
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Decision Confirmation Dialog */}
        <Dialog open={showDecisionDialog} onOpenChange={setShowDecisionDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {pendingDecision === 'approved' ? 'Approve' : 'Reject'} Setting Change
              </DialogTitle>
              <DialogDescription>
                {pendingDecision === 'approved'
                  ? 'The setting change will be applied immediately after approval.'
                  : 'The setting change will be discarded and the requester will be notified.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Decision Note (optional)</label>
                <Textarea
                  placeholder="Add a note explaining your decision..."
                  value={decisionNote}
                  onChange={(e) => setDecisionNote(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDecisionDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => pendingDecision && handleDecision(pendingDecision)}
                disabled={decisionMutation.isPending}
                className={cn(
                  pendingDecision === 'approved' && "bg-green-600 hover:bg-green-700",
                  pendingDecision === 'rejected' && "bg-red-600 hover:bg-red-700"
                )}
              >
                {decisionMutation.isPending
                  ? 'Processing...'
                  : pendingDecision === 'approved'
                    ? 'Confirm Approval'
                    : 'Confirm Rejection'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

// Export helper function for creating approval requests
export async function createSettingApprovalRequest({
  orgId,
  definitionKey,
  settingName,
  scope,
  scopeId,
  oldValue,
  newValue,
  requestedBy,
}: {
  orgId: string;
  definitionKey: string;
  settingName: string;
  scope: string;
  scopeId: string | null;
  oldValue: Json;
  newValue: Json;
  requestedBy: string;
}) {
  const { error } = await supabase
    .from('approvals')
    .insert({
      org_id: orgId,
      entity_type: 'setting',
      entity_id: definitionKey,
      action: 'update',
      requested_by: requestedBy,
      payload: {
        definition_key: definitionKey,
        setting_name: settingName,
        scope,
        scope_id: scopeId,
        old_value: oldValue,
        new_value: newValue,
      },
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    });

  if (error) throw error;
  return true;
}