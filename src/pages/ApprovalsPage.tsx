import { useEffect, useState } from 'react';
import { PageContainer, PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Approval, ApprovalStatus } from '@/types/database';
import { ClipboardCheck, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function ApprovalsPage() {
  const { currentOrg, canOperate } = useAuthContext();
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (currentOrg) fetchApprovals();
  }, [currentOrg]);

  const fetchApprovals = async () => {
    if (!currentOrg) return;
    setIsLoading(true);
    const { data } = await supabase
      .from('approvals')
      .select('*')
      .eq('org_id', currentOrg.id)
      .order('created_at', { ascending: false });
    setApprovals((data as Approval[]) || []);
    setIsLoading(false);
  };

  const handleDecision = async (approval: Approval, decision: 'approved' | 'rejected') => {
    if (!canOperate) return;
    const { error } = await supabase
      .from('approvals')
      .update({ status: decision, decided_at: new Date().toISOString() })
      .eq('id', approval.id);
    if (error) toast.error('Failed to update approval');
    else {
      toast.success(`Request ${decision}`);
      fetchApprovals();
    }
  };

  const pending = approvals.filter(a => a.status === 'pending');
  const decided = approvals.filter(a => a.status !== 'pending');

  return (
    <PageContainer>
      <PageHeader title="Approvals" description="Human-in-the-loop approval workflows" />
      
      {pending.length > 0 && (
        <Card className="border-warning/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Pending Approvals ({pending.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pending.map(approval => (
              <div key={approval.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                <div>
                  <p className="font-medium">{approval.action}</p>
                  <p className="text-xs text-muted-foreground">{approval.entity_type} • {formatDistanceToNow(new Date(approval.created_at), { addSuffix: true })}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="success" size="sm" onClick={() => handleDecision(approval, 'approved')} disabled={!canOperate}>
                    <CheckCircle className="w-4 h-4 mr-1" /> Approve
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDecision(approval, 'rejected')} disabled={!canOperate}>
                    <XCircle className="w-4 h-4 mr-1" /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-lg">Recent Decisions</CardTitle></CardHeader>
        <CardContent>
          {decided.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No approval history yet</p>
          ) : (
            <div className="space-y-2">
              {decided.slice(0, 20).map(a => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20">
                  <div className="flex items-center gap-3">
                    {a.status === 'approved' ? <CheckCircle className="w-4 h-4 text-success" /> : <XCircle className="w-4 h-4 text-destructive" />}
                    <span>{a.action}</span>
                  </div>
                  <Badge variant={a.status === 'approved' ? 'success' : 'destructive'}>{a.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
