import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, endpoint } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotifications } from '../context/NotificationsContext.jsx';
import { useRequest } from '../hooks/useRequest.js';
import { Empty, ErrorBox, Pagination, SkeletonLoader } from '../components/Feedback.jsx';
import Icon from '../components/Icon.jsx';
import { when } from '../utils/format.js';

const icons = { order: 'receipt', payment: 'wallet', inventory: 'bag' };
const labels = { order: 'Order', payment: 'Payment', inventory: 'Inventory' };

export default function Notifications() {
  const { token, user } = useAuth();
  const { refresh } = useNotifications();
  const [page, setPage] = useState(1);
  const [unread, setUnread] = useState(false);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const result = useRequest(endpoint('/notifications', { page, limit: 12, unread: unread ? 'true' : undefined }), { token, reload });
  function load() { setReload((value) => value + 1); refresh(); }
  async function mark(id) {
    setBusy(id || 'all');
    setError(null);
    try {
      await api(id ? '/notifications/' + id + '/read' : '/notifications/read-all', { token, method: 'PATCH' });
      if (unread) setPage(1);
      load();
    } catch (failure) { setError(failure); }
    finally { setBusy(null); }
  }
  return <section className="content notification-page">
    <div className="page-heading"><p className="eyebrow"><Icon name="bell" /> {user.role === 'admin' ? 'Store updates' : 'Your account'}</p>
      <h1>Notifications</h1>
      <p>{user.role === 'admin' ? 'Stay informed about orders, verified payments, and low inventory.' : 'Keep track of your orders and payment updates in one place.'}</p>
    </div>
    <section className="summary-card notification-inbox" aria-label="Notification inbox">
      <div className="workspace-toolbar">
        <div><h2>Inbox</h2><p className="muted">{result.meta ? result.meta.unread + ' unread' : 'Your latest updates'}</p></div>
        <div className="actions"><button type="button" className="button subtle" onClick={load} disabled={result.loading || Boolean(busy)}><Icon name="refresh" /> Refresh</button>
          <button type="button" className="button" disabled={result.loading || !result.meta?.unread || Boolean(busy)} onClick={() => mark(null)}><Icon name="check" /> Mark all as read</button></div>
      </div>
      <div className="inbox-tabs" role="group" aria-label="Filter notifications">
        <button type="button" aria-pressed={!unread} onClick={() => { setUnread(false); setPage(1); }}>All updates</button>
        <button type="button" aria-pressed={unread} onClick={() => { setUnread(true); setPage(1); }}>Unread</button>
      </div>
      <ErrorBox error={error} />
      {result.loading ? <SkeletonLoader /> : result.error ? <ErrorBox error={result.error} onRetry={load} /> : result.data.length ? <>
        <ul className="notification-list">{result.data.map((item) =>
          <li key={item.id} className={'notification-row' + (item.read_at ? '' : ' unread')}>
            <span className="event-icon"><Icon name={icons[item.kind] || 'bell'} size={21} /></span>
            <div className="notification-copy">
              <div className="notification-meta"><span>{labels[item.kind]}</span>{!item.read_at && <span className="unread-label">Unread</span>}<time dateTime={item.created_at}>{when(item.created_at)}</time></div>
              <h3>{item.title}</h3><p>{item.message}</p>
              <Link className="text-link" to={item.href}>{item.kind === 'inventory' ? 'Review inventory' : 'View order'} <span aria-hidden="true">→</span></Link>
            </div>
            {!item.read_at && <button type="button" className="button subtle read-button" onClick={() => mark(item.id)} disabled={Boolean(busy)}>Mark read</button>}
          </li>)}</ul>
        <Pagination meta={result.meta} onPage={setPage} />
      </> : <Empty icon="bell" title={unread ? 'You’re all caught up' : 'No notifications yet'}><p>{unread ? 'There are no unread updates.' : 'New updates will appear here as they happen.'}</p></Empty>}
    </section>
  </section>;
}
