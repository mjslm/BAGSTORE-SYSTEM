import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from './AuthContext.jsx';
import { useNetwork } from './NetworkStatusContext.jsx';

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const { token, verified } = useAuth();
  const online = useNetwork();
  const { pathname } = useLocation();
  const [snapshot, setSnapshot] = useState(null);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    if (!online || !verified || !token) return;
    let controller;
    const poll = async () => {
      controller?.abort();
      const next = new AbortController();
      controller = next;
      try {
        const { data } = await api('/notifications/unread-count', { token, signal: next.signal });
        if (!next.signal.aborted) setSnapshot({ token, count: data.unread });
      } catch { /* The inbox itself offers explicit retry; a failed poll is not a zero count. */ }
    };
    poll();
    const timer = setInterval(() => { if (!document.hidden) poll(); }, 30_000);
    const visible = () => { if (!document.hidden) poll(); };
    document.addEventListener('visibilitychange', visible);
    return () => { controller?.abort(); clearInterval(timer); document.removeEventListener('visibilitychange', visible); };
  }, [token, verified, online, pathname, revision]);
  return <NotificationsContext.Provider value={{ unread: online && verified && snapshot?.token === token ? snapshot.count : null, refresh }}>
    {children}
  </NotificationsContext.Provider>;
}

export const useNotifications = () => useContext(NotificationsContext);
