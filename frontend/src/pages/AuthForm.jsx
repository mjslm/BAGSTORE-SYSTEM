import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useNetwork } from '../context/NetworkStatusContext.jsx';
import { ErrorBox } from '../components/Feedback.jsx';
import { returnPath } from '../utils/format.js';

export default function AuthForm({ mode }) {
  const online = useNetwork();
  const auth = useAuth();
  const location = useLocation();
  const from = returnPath(location.state?.from);
  const register = mode === 'register';
  const [info, setInfo] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  if (auth.verified) return <Navigate to={from === '/' && auth.user.role === 'admin' ? '/admin' : from} replace />;
  function change(field) {
    return (event) => setInfo({ ...info, [field]: event.target.value });
  }
  async function submit(event) {
    event.preventDefault();
    if (busy || !online) return;
    setBusy(true);
    setError(null);
    try { await auth.authenticate(mode, info); }
    catch (failure) { setError(failure); }
    finally { setBusy(false); }
  }
  return <section className="content narrow account-form">
    <div className="page-heading"><h1>{register ? 'Create an account' : 'Welcome back'}</h1></div>
    <ErrorBox error={error} />
    <form className="form-stack" onSubmit={submit}>
      {register && <label>Full name<input value={info.name} onChange={change('name')} autoComplete="name" required minLength={2} maxLength={100} /></label>}
      <label>Email<input type="email" value={info.email} onChange={change('email')} autoComplete="email" required maxLength={254} /></label>
      <label>Password<input type="password" value={info.password} onChange={change('password')} autoComplete={register ? 'new-password' : 'current-password'}
        required minLength={register ? 8 : 1} maxLength={72} /></label>
      {register && <small>Use at least eight characters.</small>}
      <button className="button" disabled={busy || !online}>{!online ? 'Reconnect to continue' : busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}</button>
    </form>
    <p>{register ? 'Already have an account? ' : 'New to Carry & Co.? '}<Link className="text-link" to={register ? '/login' : '/register'} state={{ from }}>
      {register ? 'Sign in' : 'Create an account'}
    </Link></p>
  </section>;
}
