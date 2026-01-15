import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { PageLoader } from "@/components/common/LoadingSpinner";
import { SkipToContent } from "@/components/common/SkipToContent";

// Eager load critical auth pages for better UX
import AuthPage from "./pages/AuthPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

// Lazy load non-critical pages for better initial load performance
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const PluginsPage = lazy(() => import("./pages/PluginsPage"));
const JobsPage = lazy(() => import("./pages/JobsPage"));
const ApprovalsPage = lazy(() => import("./pages/ApprovalsPage"));
const AuditPage = lazy(() => import("./pages/AuditPage"));
const StoresPage = lazy(() => import("./pages/StoresPage"));
const ProductsPage = lazy(() => import("./pages/ProductsPage"));
const PublishPage = lazy(() => import("./pages/PublishPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Configure React Query with sensible defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (previously cacheTime)
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

/**
 * Main application component with routing, providers, and error handling.
 * 
 * Features:
 * - Error boundaries for graceful error handling
 * - Lazy loading for non-critical routes
 * - Skip to content link for accessibility
 * - PWA support with service worker registration
 */
const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <SkipToContent />
            <Routes>
              {/* Auth routes - eagerly loaded */}
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              
              {/* App routes - wrapped in Suspense for lazy loading */}
              <Route path="/" element={<AppLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route
                  path="dashboard"
                  element={
                    <Suspense fallback={<PageLoader message="Loading dashboard..." />}>
                      <ErrorBoundary>
                        <DashboardPage />
                      </ErrorBoundary>
                    </Suspense>
                  }
                />
                <Route
                  path="approvals"
                  element={
                    <Suspense fallback={<PageLoader message="Loading approvals..." />}>
                      <ErrorBoundary>
                        <ApprovalsPage />
                      </ErrorBoundary>
                    </Suspense>
                  }
                />
                <Route
                  path="jobs"
                  element={
                    <Suspense fallback={<PageLoader message="Loading jobs..." />}>
                      <ErrorBoundary>
                        <JobsPage />
                      </ErrorBoundary>
                    </Suspense>
                  }
                />
                <Route
                  path="stores"
                  element={
                    <Suspense fallback={<PageLoader message="Loading stores..." />}>
                      <ErrorBoundary>
                        <StoresPage />
                      </ErrorBoundary>
                    </Suspense>
                  }
                />
                <Route
                  path="plugins"
                  element={
                    <Suspense fallback={<PageLoader message="Loading plugins..." />}>
                      <ErrorBoundary>
                        <PluginsPage />
                      </ErrorBoundary>
                    </Suspense>
                  }
                />
                <Route
                  path="products"
                  element={
                    <Suspense fallback={<PageLoader message="Loading products..." />}>
                      <ErrorBoundary>
                        <ProductsPage />
                      </ErrorBoundary>
                    </Suspense>
                  }
                />
                <Route
                  path="publish"
                  element={
                    <Suspense fallback={<PageLoader message="Loading publish..." />}>
                      <ErrorBoundary>
                        <PublishPage />
                      </ErrorBoundary>
                    </Suspense>
                  }
                />
                <Route
                  path="settings"
                  element={
                    <Suspense fallback={<PageLoader message="Loading settings..." />}>
                      <ErrorBoundary>
                        <SettingsPage />
                      </ErrorBoundary>
                    </Suspense>
                  }
                />
                <Route
                  path="profile"
                  element={
                    <Suspense fallback={<PageLoader message="Loading profile..." />}>
                      <ErrorBoundary>
                        <ProfilePage />
                      </ErrorBoundary>
                    </Suspense>
                  }
                />
                <Route
                  path="audit"
                  element={
                    <Suspense fallback={<PageLoader message="Loading audit log..." />}>
                      <ErrorBoundary>
                        <AuditPage />
                      </ErrorBoundary>
                    </Suspense>
                  }
                />
              </Route>
              
              {/* 404 route */}
              <Route
                path="*"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <NotFound />
                  </Suspense>
                }
              />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
