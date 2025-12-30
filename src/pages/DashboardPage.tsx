import { useEffect, useState } from 'react';
import { PageContainer, PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  ClipboardCheck,
  Layers,
  Store,
  Puzzle,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface DashboardStats {
  pendingApprovals: number;
  runningJobs: number;
  activeStores: number;
  installedPlugins: number;
  failedJobs: number;
  completedToday: number;
}

export default function DashboardPage() {
  const { currentOrg, createOrg, orgs } = useAuthContext();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    pendingApprovals: 0,
    runningJobs: 0,
    activeStores: 0,
    installedPlugins: 0,
    failedJobs: 0,
    completedToday: 0,
  });
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (currentOrg) {
      fetchStats();
      fetchRecentJobs();
    }
  }, [currentOrg]);

  const fetchStats = async () => {
    if (!currentOrg) return;

    const [approvals, jobs, stores, plugins] = await Promise.all([
      supabase.from('approvals').select('id', { count: 'exact' }).eq('org_id', currentOrg.id).eq('status', 'pending'),
      supabase.from('jobs').select('id, status', { count: 'exact' }).eq('org_id', currentOrg.id),
      supabase.from('stores').select('id', { count: 'exact' }).eq('org_id', currentOrg.id).eq('is_active', true),
      supabase.from('plugin_instances').select('id', { count: 'exact' }).eq('org_id', currentOrg.id).eq('is_active', true),
    ]);

    const runningJobs = (jobs.data || []).filter(j => ['pending', 'claimed', 'running'].includes(j.status)).length;
    const failedJobs = (jobs.data || []).filter(j => j.status === 'failed').length;
    const completedToday = (jobs.data || []).filter(j => j.status === 'completed').length;

    setStats({
      pendingApprovals: approvals.count || 0,
      runningJobs,
      activeStores: stores.count || 0,
      installedPlugins: plugins.count || 0,
      failedJobs,
      completedToday,
    });
  };

  const fetchRecentJobs = async () => {
    if (!currentOrg) return;
    const { data } = await supabase
      .from('jobs')
      .select('*')
      .eq('org_id', currentOrg.id)
      .order('created_at', { ascending: false })
      .limit(5);
    setRecentJobs(data || []);
  };

  const handleCreateOrg = async () => {
    if (!newOrgName.trim()) return;
    setIsCreatingOrg(true);
    const slug = newOrgName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const { error } = await createOrg(newOrgName, slug);
    setIsCreatingOrg(false);
    if (error) {
      toast.error(error.message || 'Failed to create organization');
    } else {
      toast.success('Organization created!');
      setDialogOpen(false);
      setNewOrgName('');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'failed': return <XCircle className="w-4 h-4 text-destructive" />;
      case 'running': return <Clock className="w-4 h-4 text-info animate-pulse" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge variant="success">Completed</Badge>;
      case 'failed': return <Badge variant="destructive">Failed</Badge>;
      case 'running': return <Badge variant="info">Running</Badge>;
      case 'claimed': return <Badge variant="warning">Claimed</Badge>;
      default: return <Badge variant="muted">Pending</Badge>;
    }
  };

  // No org state
  if (!currentOrg && orgs.length === 0) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mb-6 shadow-glow">
            <Store className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Welcome to FlashFusion</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            Create your first organization to start managing your e-commerce operations across multiple platforms.
          </p>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="glow" size="lg">
                <Plus className="w-5 h-5 mr-2" />
                Create Organization
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Organization</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="org-name">Organization Name</Label>
                  <Input
                    id="org-name"
                    placeholder="My E-commerce Business"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                  />
                </div>
                <Button
                  variant="glow"
                  className="w-full"
                  onClick={handleCreateOrg}
                  disabled={isCreatingOrg || !newOrgName.trim()}
                >
                  {isCreatingOrg ? 'Creating...' : 'Create Organization'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard"
        description={`Overview of ${currentOrg?.name || 'your organization'}`}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="glow" className="cursor-pointer" onClick={() => navigate('/approvals')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Approvals
            </CardTitle>
            <ClipboardCheck className="w-5 h-5 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.pendingApprovals}</div>
            {stats.pendingApprovals > 0 && (
              <p className="text-xs text-warning mt-1">Action required</p>
            )}
          </CardContent>
        </Card>

        <Card variant="glow" className="cursor-pointer" onClick={() => navigate('/jobs')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Running Jobs
            </CardTitle>
            <Layers className="w-5 h-5 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.runningJobs}</div>
            <div className="flex items-center gap-2 mt-1">
              {stats.failedJobs > 0 && (
                <span className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {stats.failedJobs} failed
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card variant="glow" className="cursor-pointer" onClick={() => navigate('/stores')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Stores
            </CardTitle>
            <Store className="w-5 h-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.activeStores}</div>
            <p className="text-xs text-muted-foreground mt-1">Connected platforms</p>
          </CardContent>
        </Card>

        <Card variant="glow" className="cursor-pointer" onClick={() => navigate('/plugins')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Installed Plugins
            </CardTitle>
            <Puzzle className="w-5 h-5 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.installedPlugins}</div>
            <p className="text-xs text-muted-foreground mt-1">Platform integrations</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Recent Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentJobs.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">
                No jobs yet. Create a store and start syncing products.
              </p>
            ) : (
              <div className="space-y-3">
                {recentJobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(job.status)}
                      <div>
                        <p className="text-sm font-medium">{job.job_type}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {job.idempotency_key.slice(0, 20)}...
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(job.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-warning" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate('/stores')}
            >
              <Store className="w-4 h-4 mr-2" />
              Connect New Store
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate('/plugins')}
            >
              <Puzzle className="w-4 h-4 mr-2" />
              Browse Plugins
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate('/products')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Products
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate('/publish')}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Publish to Stores
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
