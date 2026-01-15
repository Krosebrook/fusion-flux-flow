import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { DevModeBanner } from './DevModeBanner';
import { useAuthContext } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { isDevPreviewMode } from '@/hooks/useDevMode';

export function AppLayout() {
  const { isAuthenticated, isLoading } = useAuthContext();
  const devMode = isDevPreviewMode();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !devMode) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      {devMode && <DevModeBanner />}
      <AppSidebar />
      <main className={`flex-1 overflow-auto ${devMode ? 'pt-10' : ''}`}>
        <Outlet />
      </main>
    </div>
  );
}
