import { useEffect, useState } from 'react';
import { PageContainer, PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { AuditLog } from '@/types/database';
import { ScrollText, User, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function AuditPage() {
  const { currentOrg } = useAuthContext();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (currentOrg) fetchLogs();
  }, [currentOrg]);

  const fetchLogs = async () => {
    if (!currentOrg) return;
    setIsLoading(true);
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('org_id', currentOrg.id)
      .order('created_at', { ascending: false })
      .limit(100);
    setLogs((data as AuditLog[]) || []);
    setIsLoading(false);
  };

  return (
    <PageContainer>
      <PageHeader title="Audit Log" description="SOC2-compliant activity tracking" />
      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ScrollText className="w-5 h-5" /> Activity Log</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : logs.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">No audit logs yet. Actions will be recorded here.</p>
          ) : (
            <div className="space-y-2">
              {logs.map(log => (
                <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 hover:bg-secondary/30">
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{log.action}</p>
                      <p className="text-xs text-muted-foreground">{log.entity_type} {log.entity_id?.slice(0, 8)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {log.soc2_tags?.map(tag => <Badge key={tag} variant="muted" className="text-xs">{tag}</Badge>)}
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
