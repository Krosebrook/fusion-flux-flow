import { useEffect, useState } from 'react';
import { PageContainer, PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Job, JobStatus } from '@/types/database';
import {
  RefreshCw,
  Play,
  Pause,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Filter,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDistanceToNow } from 'date-fns';

export default function JobsPage() {
  const { currentOrg, canOperate } = useAuthContext();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (currentOrg) {
      fetchJobs();
      // Set up realtime subscription
      const channel = supabase
        .channel('jobs-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'jobs',
            filter: `org_id=eq.${currentOrg.id}`,
          },
          () => fetchJobs()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentOrg]);

  const fetchJobs = async () => {
    if (!currentOrg) return;
    setIsLoading(true);

    let query = supabase
      .from('jobs')
      .select('*')
      .eq('org_id', currentOrg.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (filter !== 'all') {
      query = query.eq('status', filter as JobStatus);
    }

    const { data, error } = await query;

    if (error) {
      toast.error('Failed to load jobs');
    } else {
      setJobs((data as Job[]) || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (currentOrg) fetchJobs();
  }, [filter]);

  const retryJob = async (job: Job) => {
    if (!canOperate) return;

    const { error } = await supabase
      .from('jobs')
      .update({
        status: 'pending',
        attempts: 0,
        error_message: null,
        claimed_at: null,
        started_at: null,
        completed_at: null,
      })
      .eq('id', job.id);

    if (error) {
      toast.error('Failed to retry job');
    } else {
      toast.success('Job queued for retry');
      fetchJobs();
    }
  };

  const cancelJob = async (job: Job) => {
    if (!canOperate) return;

    const { error } = await supabase
      .from('jobs')
      .update({ status: 'cancelled' })
      .eq('id', job.id);

    if (error) {
      toast.error('Failed to cancel job');
    } else {
      toast.success('Job cancelled');
      fetchJobs();
    }
  };

  const getStatusIcon = (status: JobStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-success" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-destructive" />;
      case 'running':
        return <RefreshCw className="w-5 h-5 text-info animate-spin" />;
      case 'claimed':
        return <Play className="w-5 h-5 text-warning" />;
      case 'cancelled':
        return <Pause className="w-5 h-5 text-muted-foreground" />;
      default:
        return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: JobStatus) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'running':
        return <Badge variant="info">Running</Badge>;
      case 'claimed':
        return <Badge variant="warning">Claimed</Badge>;
      case 'cancelled':
        return <Badge variant="muted">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const stats = {
    pending: jobs.filter(j => j.status === 'pending').length,
    running: jobs.filter(j => ['running', 'claimed'].includes(j.status)).length,
    completed: jobs.filter(j => j.status === 'completed').length,
    failed: jobs.filter(j => j.status === 'failed').length,
  };

  return (
    <PageContainer>
      <PageHeader
        title="Jobs"
        description="Background task queue and processing"
      >
        <Button variant="outline" onClick={fetchJobs} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:border-muted-foreground/30 transition-colors" onClick={() => setFilter('pending')}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-info/30 transition-colors" onClick={() => setFilter('running')}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.running}</p>
                <p className="text-sm text-muted-foreground">Running</p>
              </div>
              <RefreshCw className="w-8 h-8 text-info" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-success/30 transition-colors" onClick={() => setFilter('completed')}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-destructive/30 transition-colors" onClick={() => setFilter('failed')}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.failed}</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filter:</span>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Jobs</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="claimed">Claimed</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Jobs List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Job Queue</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No jobs found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {getStatusIcon(job.status as JobStatus)}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{job.job_type}</p>
                        {getStatusBadge(job.status as JobStatus)}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        {job.idempotency_key}
                      </p>
                      {job.error_message && (
                        <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {job.error_message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm">
                      <p className="text-muted-foreground">
                        {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Attempts: {job.attempts}/{job.max_attempts}
                      </p>
                    </div>
                    {job.status === 'failed' && canOperate && (
                      <Button variant="outline" size="sm" onClick={() => retryJob(job)}>
                        Retry
                      </Button>
                    )}
                    {['pending', 'claimed'].includes(job.status) && canOperate && (
                      <Button variant="ghost" size="sm" onClick={() => cancelJob(job)}>
                        Cancel
                      </Button>
                    )}
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
