import { NavLink, Route, Routes } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useRequest } from '../hooks/useRequest.js';
import { ErrorBox, SkeletonLoader } from '../components/Feedback.jsx';
import { money } from '../utils/format.js';
import Icon from '../components/Icon.jsx';
import AdminCatalog from './admin/AdminCatalog.jsx';
import AdminCoupons from './admin/AdminCoupons.jsx';
import AdminOrders from './admin/AdminOrders.jsx';
import InventoryAdvisor from './admin/InventoryAdvisor.jsx';

function Dashboard() {
  const { token } = useAuth();
  const stats = useRequest('/admin/dashboard', { token });
  if (stats.loading) return <SkeletonLoader />;
  if (stats.error) return <ErrorBox error={stats.error} />;
  const { paid, gross, pending, lowStock } = stats.data;
  return <>
    <dl className="dashboard-grid dashboard-summary">
      {[['Paid orders', paid], ['Gross sales', money(gross)], ['Awaiting payment', pending]].map(([label, value]) =>
        <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl>
    <section className="summary-card"><div className="section-title"><h2>Low stock</h2><NavLink className="text-link" to="/admin/inventory-advisor">Inventory Advisor</NavLink></div>{lowStock.length ? <ul className="order-line-list">
      {lowStock.map((bag) => <li key={bag.id}><span>{bag.name}</span><strong>{bag.stock} left</strong></li>)}
    </ul> : <p>All active bags have sufficient stock.</p>}</section>
  </>;
}

export default function Admin() {
  const pages = [
    ['/admin', 'Dashboard', 'grid'], ['/admin/products', 'Products', 'bag'],
    ['/admin/categories', 'Categories', 'layers'], ['/admin/coupons', 'Coupons', 'tag'],
    ['/admin/orders', 'Orders', 'receipt'], ['/admin/inventory-advisor', 'Inventory Advisor', 'sparkle'],
  ];
  return <section className="content admin-page">
    <div className="page-heading admin-heading"><h1>Store admin</h1></div>
    <div className="admin-shell">
      <nav className="admin-nav" aria-label="Admin navigation">{pages.map(([to, label, icon]) =>
        <NavLink to={to} key={to} end><Icon name={icon} size={19} />{label}</NavLink>)}</nav>
      <div className="admin-workspace">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<AdminCatalog key="products" mode="products" />} />
          <Route path="categories" element={<AdminCatalog key="categories" mode="categories" />} />
          <Route path="coupons" element={<AdminCoupons />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="inventory-advisor" element={<InventoryAdvisor />} />
          <Route path="*" element={<ErrorBox error="That admin page could not be found." />} />
        </Routes>
      </div>
    </div>
  </section>;
}
