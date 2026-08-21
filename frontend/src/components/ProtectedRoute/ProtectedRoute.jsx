/**
 * ProtectedRoute
 *
 * Wrapper that strictly enforces authentication for protected routes.
 * Redirects unauthenticated users to /login.
 */
import { Navigate, useLocation } from 'react-router-dom';
import { isLoggedIn } from '../../api/auth';

export default function ProtectedRoute({ children }) {
  const location = useLocation();

  if (!isLoggedIn()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
