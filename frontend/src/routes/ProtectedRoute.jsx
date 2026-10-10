import { Navigate, useLocation } from 'react-router-dom';
import { PageSpinner } from '../components/ui/Spinner';
import { useAuth } from '../hooks/useAuth';
import { homeFor } from '../utils/constants';

// Redirects anonymous visitors to login and users without a permitted role to their own home.
// This only shapes the UI; the API enforces roles on every request.
export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageSpinner />;
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return children;
}
