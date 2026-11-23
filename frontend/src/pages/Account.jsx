import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Account() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  return <section className="content narrow">
    <div className="page-heading"><h1>Your account</h1><p>{user.name} · {user.email}</p></div>
    <div className="actions">
      <Link className="button" to="/orders">Order history</Link>
      {user.role === 'admin' && <Link className="button subtle" to="/admin">Manage store</Link>}
      <button className="button subtle" type="button" onClick={() => { signOut(); navigate('/'); }}>Sign out</button>
    </div>
  </section>;
}
