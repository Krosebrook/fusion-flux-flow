import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { 
  Monitor, 
  Smartphone, 
  Laptop, 
  Globe, 
  LogOut, 
  Loader2, 
  Clock, 
  MapPin,
  Shield,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

interface SessionInfo {
  id: string;
  user_agent: string;
  ip?: string;
  created_at: string;
  updated_at: string;
  isCurrent: boolean;
}

export function SessionManager() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [sessionToRevoke, setSessionToRevoke] = useState<string | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [isRevokingAll, setIsRevokingAll] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      const currentId = session?.access_token ? 
        // Extract session ID from token payload
        JSON.parse(atob(session.access_token.split('.')[1]))?.session_id : null;
      setCurrentSessionId(currentId);

      // For now, we'll show the current session info
      // Supabase doesn't expose a direct API for listing all sessions,
      // but we can get the current one and track sign-in events
      const sessionInfo: SessionInfo = {
        id: currentId || 'current',
        user_agent: navigator.userAgent,
        created_at: session?.user?.last_sign_in_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        isCurrent: true,
      };

      setSessions([sessionInfo]);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSessions = async () => {
    setIsRefreshing(true);
    await fetchSessions();
    setIsRefreshing(false);
    toast.success('Sessions refreshed');
  };

  const revokeSession = async (sessionId: string) => {
    setIsRevoking(true);
    try {
      // Sign out from the specific session
      // Note: Supabase currently only supports signing out from all sessions or current
      await supabase.auth.signOut({ scope: 'local' });
      toast.success('Session revoked successfully');
      await fetchSessions();
    } catch (error: any) {
      toast.error('Failed to revoke session', {
        description: error.message,
      });
    } finally {
      setIsRevoking(false);
      setRevokeDialogOpen(false);
      setSessionToRevoke(null);
    }
  };

  const revokeAllOtherSessions = async () => {
    setIsRevokingAll(true);
    try {
      // Sign out from all sessions except current
      await supabase.auth.signOut({ scope: 'others' });
      toast.success('All other sessions have been revoked');
      await fetchSessions();
    } catch (error: any) {
      toast.error('Failed to revoke sessions', {
        description: error.message,
      });
    } finally {
      setIsRevokingAll(false);
    }
  };

  const getDeviceIcon = (userAgent: string) => {
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return <Smartphone className="w-5 h-5" />;
    }
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return <Laptop className="w-5 h-5" />;
    }
    return <Monitor className="w-5 h-5" />;
  };

  const getDeviceName = (userAgent: string) => {
    const ua = userAgent.toLowerCase();
    
    // Browser detection
    let browser = 'Unknown Browser';
    if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome';
    else if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
    else if (ua.includes('edg')) browser = 'Edge';
    else if (ua.includes('opera') || ua.includes('opr')) browser = 'Opera';

    // OS detection
    let os = 'Unknown OS';
    if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('mac')) os = 'macOS';
    else if (ua.includes('linux')) os = 'Linux';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';

    return `${browser} on ${os}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Active Sessions
              </CardTitle>
              <CardDescription>
                Manage devices where you're currently signed in
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={refreshSessions} disabled={isRefreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No active sessions found
            </p>
          ) : (
            <>
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      session.isCurrent 
                        ? 'bg-primary/5 border-primary/20' 
                        : 'bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${
                        session.isCurrent ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      }`}>
                        {getDeviceIcon(session.user_agent)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{getDeviceName(session.user_agent)}</p>
                          {session.isCurrent && (
                            <Badge variant="default" className="text-xs">
                              <Shield className="w-3 h-3 mr-1" />
                              This device
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Last active: {formatDate(session.updated_at)}
                          </span>
                          {session.ip && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {session.ip}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {!session.isCurrent && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          setSessionToRevoke(session.id);
                          setRevokeDialogOpen(true);
                        }}
                      >
                        <LogOut className="w-4 h-4 mr-1" />
                        Revoke
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {sessions.length > 1 && (
                <div className="pt-4 border-t">
                  <Button
                    variant="outline"
                    className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={revokeAllOtherSessions}
                    disabled={isRevokingAll}
                  >
                    {isRevokingAll ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Revoking...
                      </>
                    ) : (
                      <>
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign out of all other devices
                      </>
                    )}
                  </Button>
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center pt-2">
                If you see any unfamiliar devices, revoke their access immediately and change your password.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div className="space-y-2">
                <AlertDialogTitle>Revoke Session</AlertDialogTitle>
                <AlertDialogDescription>
                  This will sign out the device from your account. You'll need to sign in again on that device.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => sessionToRevoke && revokeSession(sessionToRevoke)}
              disabled={isRevoking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRevoking ? 'Revoking...' : 'Revoke Session'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
