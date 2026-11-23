import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useNetwork } from '../context/NetworkStatusContext.jsx';
import { Empty, ErrorBox, SkeletonLoader } from './Feedback.jsx';

export default function Protected({ admin = false, children }) {
  const auth = useAuth();
  const online = useNetwork();
  const location = useLocation();
  if (!online) return <section className="content"><Empty title="This page needs a connection" icon="offline"><p>Reconnect to access your account and orders.</p></Empty></section>;
  if (!auth.token) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  if (auth.loading) return <section className="content"><SkeletonLoader /></section>;
  if (!auth.verified) return <section className="content"><ErrorBox error={auth.error || 'Sign in again to continue.'} onRetry={auth.retry} /></section>;
  if (admin && auth.user.role !== 'admin') return <section className="content"><ErrorBox error="Administrator access is required." /></section>;
  return children;
}
