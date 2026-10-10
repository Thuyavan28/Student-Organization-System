import { Suspense, useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useIsFetching } from '@tanstack/react-query';
import AppShell from './components/layout/AppShell';
import Button from './components/ui/Button';
import EmptyState from './components/ui/EmptyState';
import ErrorBoundary from './components/ui/ErrorBoundary';
import PageLoader from './components/ui/PageLoader';
import SessionExpiredModal from './components/ui/SessionExpiredModal';
import TopProgressBar from './components/ui/TopProgressBar';
import { ShellContext } from './components/layout/ShellContext';
import { OfflineProvider } from './context/OfflineContext';
import { useAuth } from './hooks/useAuth';
import ProtectedRoute from './routes/ProtectedRoute';
import { appRoutes, publicRoutes } from './routes/routeConfig';
import { LuCompass } from 'react-icons/lu';

function OrdersRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login?next=%2Forders" replace />;
  if (user.role === 'ADMIN' || user.role === 'TREASURER') {
    return <Navigate to="/admin/orders" replace />;
  }
  return <Navigate to="/me/orders" replace />;
}

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <EmptyState
        icon={LuCompass}
        title="Page not found"
        message="The page you are looking for does not exist or has been moved."
        action={
          <Link to="/">
            <Button>Back to home</Button>
          </Link>
        }
      />
    </div>
  );
}

// Wraps page content with the page-enter CSS animation on every route change.
function PageWrapper({ children }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}

// Public pages such as Events and Shop: signed-in users get them inside the dashboard so the sidebar never disappears.
function PublicPage({ shellWhenSignedIn, children }) {
  const { user } = useAuth();
  if (!shellWhenSignedIn || !user) return children;
  return (
    <ShellContext.Provider value>
      <AppShell>{children}</AppShell>
    </ShellContext.Provider>
  );
}

export default function App() {
  const location = useLocation();
  const [navigating, setNavigating] = useState(false);
  const fetching = useIsFetching();

  // Trigger smooth top-loader effect on every route change
  useEffect(() => {
    setNavigating(true);
    const timer = setTimeout(() => setNavigating(false), 350);
    return () => clearTimeout(timer);
  }, [location.pathname, location.search]);

  return (
    <OfflineProvider>
      <ErrorBoundary>
        <TopProgressBar loading={navigating || fetching > 0} />
        <Suspense fallback={<PageLoader message="Loading ClubFlow..." isColdStart />}>
          <Routes>
            {publicRoutes.map(({ path, Component, shellWhenSignedIn }) => (
              <Route
                key={path}
                path={path}
                element={
                  <ErrorBoundary>
                    <PublicPage shellWhenSignedIn={shellWhenSignedIn}>
                      <PageWrapper>
                        <Component />
                      </PageWrapper>
                    </PublicPage>
                  </ErrorBoundary>
                }
              />
            ))}
            {appRoutes.map(({ path, Component, roles }) => (
              <Route
                key={path}
                path={path}
                element={
                  <ProtectedRoute roles={roles}>
                    <AppShell>
                      <ErrorBoundary>
                        <Suspense fallback={<PageLoader message="Loading view..." />}>
                          <PageWrapper>
                            <Component />
                          </PageWrapper>
                        </Suspense>
                      </ErrorBoundary>
                    </AppShell>
                  </ProtectedRoute>
                }
              />
            ))}
            <Route path="/orders" element={<OrdersRedirect />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>

        {/* Global 401 Session Expiration Dialog */}
        <SessionExpiredModal />
      </ErrorBoundary>
    </OfflineProvider>
  );
}
