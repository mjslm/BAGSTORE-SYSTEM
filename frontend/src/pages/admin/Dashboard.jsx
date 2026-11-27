import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationsContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useRequest } from '../../hooks/useRequest.js';
import { ErrorBox, SkeletonLoader } from '../../components/Feedback.jsx';
import Icon from '../../components/Icon.jsx';
import { money, orderNumber, statusLabel, when } from '../../utils/format.js';
import { activityIcons } from './ActivityLogs.jsx';

function Metric({ icon, label, value, detail, primary, to }) {
  return <Link to={to} className={'admin-metric' + (primary ? ' primary' : '')}>
    <span className="metric-top"><Icon name={icon} size={22} /><Icon name="arrow" size={18} /></span>
    <span className="metric-label">{label}</span>
    <strong>{value}</strong><small>{detail}</small>
  </Link>;
}

export default function Dashboard() {
  const { token } = useAuth();
  const [reload, setReload] = useState(0);
  const { refresh: refreshNotifications } = useNotifications();
  const refresh = () => { setReload((n) => n + 1); refreshNotifications(); };
  const stats = useRequest('/admin/dashboard', { token, reload });
  const { recentOrders, activity, lowStock = [], lowStockCount = lowStock.length } = stats.data || {};
  return <div className="workspace-stack">
    <div className="workspace-toolbar">
      <div><p className="eyebrow">Store performance</p><h2 className="workspace-heading">Dashboard</h2><p className="muted">Sales, orders and inventory at a glance.</p></div>
      <button type="button" className="button subtle" disabled={stats.loading} onClick={refresh}><Icon name="refresh" /> Refresh</button>
    </div>
    {stats.loading ? <SkeletonLoader /> : stats.error ? <ErrorBox error={stats.error} onRetry={refresh} /> : <>
      <div className="dashboard-period"><span>Overview</span><span><Icon name="history" size={16} /> All-time sales · Current stock</span></div>
      <div className="admin-metrics">
        <Metric icon="wallet" label="Gross sales" value={money(stats.data.gross)} detail="Verified paid orders" primary to="/admin/orders" />
        <Metric icon="receipt" label="Paid orders" value={stats.data.paid} detail="Payment verified" to="/admin/orders" />
        <Metric icon="history" label="Awaiting payment" value={stats.data.pending} detail="Pending checkouts" to="/admin/orders" />
        <Metric icon="bag" label="Low stock" value={lowStockCount} detail="4 or fewer available" to="/admin/inventory-advisor" />
      </div>
      <div className="dashboard-panels">
        <section className="summary-card workspace-panel">
          <div className="workspace-toolbar panel-toolbar"><div><h3>Recent orders</h3><p className="muted">Latest 5 orders</p></div><Link className="text-link" to="/admin/orders">View orders →</Link></div>
          {recentOrders?.length ? <ul className="dashboard-list">{recentOrders.map((order) =>
            <li key={order.id} className="dashboard-order"><div><Link className="order-reference" to={'/orders/' + order.id}>{orderNumber(order.id)}</Link><time dateTime={order.created_at}>{when(order.created_at)}</time></div>
              <div className="dashboard-order-amount"><strong>{money(order.total_cents)}</strong><span className={'order-state state-' + order.status}>{statusLabel(order.status)}</span></div></li>
          )}</ul> : <p className="panel-empty">{recentOrders ? "No orders yet." : "Recent orders will appear after the API update."}</p>}
        </section>
        <section className="summary-card workspace-panel">
          <div className="workspace-toolbar panel-toolbar"><div><h3>Inventory watchlist</h3><p className="muted">Products with 4 or fewer available units</p></div><Link className="text-link" to="/admin/inventory-advisor">Review stock →</Link></div>
          {lowStock.length ? <><ul className="dashboard-list stock-watchlist">{lowStock.slice(0, 5).map((bag) =>
            <li key={bag.id}><strong>{bag.name}</strong><span className={'order-state ' + (bag.stock === 0 ? 'state-failed' : 'state-pending_payment')}>{bag.stock ? bag.stock + ' left' : 'Out of stock'}</span></li>
          )}</ul>{lowStockCount > 5 && <p className="panel-note">Showing 5 of {lowStockCount} low-stock products.</p>}</> : <p className="panel-empty">All active bags have sufficient stock.</p>}
        </section>
      </div>
      <section className="summary-card workspace-panel">
        <div className="workspace-toolbar panel-toolbar"><div><h3>Recent activity</h3><p className="muted">Latest recorded changes across the store</p></div><Link className="text-link" to="/admin/activity">View activity logs →</Link></div>
        {activity?.length ? <ul className="activity-list dashboard-activity">{activity.map((item) =>
          <li key={item.id} className="activity-row"><span className="event-icon"><Icon name={activityIcons[item.category]} /></span><div className="activity-detail"><strong>{item.action}</strong><p>{item.reference} · {item.description}</p></div><div className="activity-by"><strong>{item.actor}</strong><time dateTime={item.created_at}>{when(item.created_at)}</time></div></li>
        )}</ul> : <p className="panel-empty">{activity ? "No activity recorded yet." : "Activity will appear after the API update."}</p>}
      </section>
    </>}
  </div>;
}
