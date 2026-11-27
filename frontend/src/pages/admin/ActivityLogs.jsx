import { useState } from 'react';
import { endpoint } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useRequest } from '../../hooks/useRequest.js';
import { Empty, ErrorBox, Pagination, SkeletonLoader } from '../../components/Feedback.jsx';
import Icon from '../../components/Icon.jsx';
import { when } from '../../utils/format.js';

export const activityLabels = { orders: 'Orders', inventory: 'Inventory', products: 'Products', categories: 'Categories', coupons: 'Coupons' };
export const activityIcons = { orders: 'receipt', inventory: 'bag', products: 'bag', categories: 'layers', coupons: 'tag' };

export default function ActivityLogs() {
  const { token } = useAuth();
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const result = useRequest(endpoint('/admin/activity', { category, page, limit: 15 }), { token, reload });
  const refresh = () => setReload((n) => n + 1);
  return <div className="workspace-stack">
    <div className="workspace-toolbar"><div><p className="eyebrow">Store administration</p><h2 className="workspace-heading">Activity logs</h2>
      <p className="muted">A chronological record of order, inventory, and catalog changes.</p></div>
      <button className="button subtle" type="button" disabled={result.loading} onClick={refresh}><Icon name="refresh" /> Refresh</button>
    </div>
    <section className="summary-card workspace-panel">
      <div className="workspace-toolbar panel-toolbar">
        <div><h3>Activity history</h3><p className="muted">{result.meta ? result.meta.total + ' recorded events' : 'Most recent first'}</p></div>
        <label className="activity-filter">Event type<select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
          <option value="">All activity</option>{Object.entries(activityLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select></label>
      </div>
      {result.loading ? <SkeletonLoader /> : result.error ? <ErrorBox error={result.error} onRetry={refresh} /> : result.data.length ? <>
        <ul className="activity-list">{result.data.map((item) => <li key={item.id} className="activity-row">
          <span className="event-icon"><Icon name={activityIcons[item.category]} /></span>
          <div className="activity-detail"><div className="activity-action"><strong>{item.action}</strong><span className="type-tag">{activityLabels[item.category]}</span></div>
            <p><span className="activity-reference">{item.reference}</span> · {item.description}</p></div>
          <div className="activity-by"><strong>{item.actor}</strong><time dateTime={item.created_at}>{when(item.created_at)}</time></div>
        </li>)}</ul>
        <Pagination meta={result.meta} onPage={setPage} />
      </> : <Empty icon="history" title="No recorded activity"><p>Try another event type or refresh when store changes occur.</p></Empty>}
    </section>
    <p className="muted activity-footnote">Order and inventory events include existing recorded history. Product, category, and coupon activity is recorded from this update onward.</p>
  </div>;
}
