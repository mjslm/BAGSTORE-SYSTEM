import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useNetwork } from './NetworkStatusContext.jsx';

const AuthContext = createContext(null);
const key = 'carry-session';

function readSession() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key));
    return typeof saved?.token === 'string' && typeof saved?.user?.id === 'string' ? saved : null;
  } catch { return null; }
}

export function AuthProvider({ children }) {
  const online = useNetwork();
  const [session, setSession] = useState(readSession);
  const [verifiedToken, setVerifiedToken] = useState(null);
  const [checkError, setCheckError] = useState(null);
  const [retry, setRetry] = useState(0);
  const token = session?.token;
  function publish(next) {
    setSession(next);
    try {
      if (next) sessionStorage.setItem(key, JSON.stringify(next));
      else sessionStorage.removeItem(key);
    } catch { /* The active tab still holds the session. */ }
  }

  useEffect(() => {
    if (!token) return;
    const expired = (event) => { if (event.detail === token) publish(null); };
    window.addEventListener('carry-session-ended', expired);
    return () => window.removeEventListener('carry-session-ended', expired);
  }, [token]);

  useEffect(() => {
    if (!token || !online || token === verifiedToken) return;
    const controller = new AbortController();
    api('/auth/me', { token, signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) {
          publish({ user: data, token });
          setVerifiedToken(token);
          setCheckError(null);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted && error.status !== 401) setCheckError({ token, retry, error });
      });
    return () => controller.abort();
  }, [token, online, verifiedToken, retry]);

  async function authenticate(kind, credentials) {
    const { data } = await api('/auth/' + kind, { method: 'POST', body: credentials });
    publish(data);
    setVerifiedToken(data.token);
  }

  const error = checkError?.token === token && checkError?.retry === retry ? checkError.error : null;
  const loading = Boolean(token && online && verifiedToken !== token && !error);
  return <AuthContext.Provider value={{
    user: session?.user, token, verified: Boolean(token && token === verifiedToken), loading, error,
    authenticate, retry: () => setRetry((value) => value + 1), signOut: () => publish(null),
  }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
