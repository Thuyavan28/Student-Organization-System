import { Suspense } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import Button from './components/ui/Button';
import EmptyState from './components/ui/EmptyState';
import { PageSpinner } from './components/ui/Spinner';
import ProtectedRoute from './routes/ProtectedRoute';
import { appRoutes, publicRoutes } from './routes/routeConfig';
import { LuCompass } from 'react-icons/lu';

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <EmptyState
        icon={LuCompass}
        title="Page not found"
        message="The page you are looking for does not exist."
        action={<Link to="/"><Button>Back to home</Button></Link>}
      />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>
        {publicRoutes.map(({ path, Component }) => (
          <Route key={path} path={path} element={<Component />} />
        ))}
        {appRoutes.map(({ path, Component, roles }) => (
          <Route
            key={path}
            path={path}
            element={
              <ProtectedRoute roles={roles}>
                <AppShell>
                  <Suspense fallback={<PageSpinner />}>
                    <Component />
                  </Suspense>
                </AppShell>
              </ProtectedRoute>
            }
          />
        ))}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
