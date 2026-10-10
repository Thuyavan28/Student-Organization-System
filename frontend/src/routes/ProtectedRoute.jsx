import { Navigate, useLocation } from 'react-router-dom';
import PageLoader from '../components/ui/PageLoader';
import PermissionDenied from '../components/ui/PermissionDenied';
import { useAuth } from '../hooks/useAuth';

// Redirects anonymous visitors to login and shows a calm Permission Denied screen if the account role lacks access.
export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader message="Verifying authentication..." isColdStart />;
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  // Account / Role Permission Denied (403)
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="flex min-h-[75vh] items-center justify-center p-4 sm:p-6">
        <PermissionDenied type="account" requiredRole={roles[0] || 'ADMIN'} />
      </div>
    );
  }

  return children;
}
