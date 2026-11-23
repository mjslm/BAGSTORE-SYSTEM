import { NavLink, Route, Routes } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useRequest } from '../hooks/useRequest.js';
import { ErrorBox, SkeletonLoader } from '../components/Feedback.jsx';
import { money } from '../utils/format.js';
import AdminCatalog from './admin/AdminCatalog.jsx';
import AdminCoupons from './admin/AdminCoupons.jsx';
import AdminOrders from './admin/AdminOrders.jsx';

function Dashboard() {
  const { token } = useAuth();
  const stats = useRequest('/admin/dashboard', { token });
  if (stats.loading) return <SkeletonLoader />;
  if (stats.error) return <ErrorBox error={stats.error} />;
  const { paid, gross, pending, flagged, webhookReview, lowStock } = stats.data;
  return <>
    <dl className="dashboard-grid">
      {[['Paid orders', paid], ['Gross sales', money(gross)], ['Awaiting payment', pending], ['Flagged payments', flagged], ['Webhooks to review', webhookReview]].map(([label, value]) =>
        <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl>
    <section className="summary-card"><h2>Low stock</h2>{lowStock.length ? <ul className="order-line-list">
      {lowStock.map((bag) => <li key={bag.id}><span>{bag.name}</span><strong>{bag.stock} left</strong></li>)}
    </ul> : <p>All active bags have sufficient stock.</p>}</section>
  </>;
}

export default function Admin() {
  const pages = [['/admin', 'Dashboard'], ['/admin/products', 'Products'], ['/admin/categories', 'Categories'], ['/admin/coupons', 'Coupons'], ['/admin/orders', 'Orders']];
  return <section className="content">
    <div className="page-heading"><h1>Store admin</h1></div>
    <nav className="admin-nav" aria-label="Admin navigation">{pages.map(([to, label]) => <NavLink to={to} key={to} end>{label}</NavLink>)}</nav>
    <Routes>
      <Route index element={<Dashboard />} />
      <Route path="products" element={<AdminCatalog key="products" mode="products" />} />
      <Route path="categories" element={<AdminCatalog key="categories" mode="categories" />} />
      <Route path="coupons" element={<AdminCoupons />} />
      <Route path="orders" element={<AdminOrders />} />
      <Route path="*" element={<ErrorBox error="That admin page could not be found." />} />
    </Routes>
  </section>;
}
