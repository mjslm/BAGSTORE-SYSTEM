import { NavLink, Route, Routes } from 'react-router-dom';
import { ErrorBox } from '../components/Feedback.jsx';
import Icon from '../components/Icon.jsx';
import AdminCatalog from './admin/AdminCatalog.jsx';
import AdminCoupons from './admin/AdminCoupons.jsx';
import AdminOrders from './admin/AdminOrders.jsx';
import InventoryAdvisor from './admin/InventoryAdvisor.jsx';

import Dashboard from './admin/Dashboard.jsx';
import ActivityLogs from './admin/ActivityLogs.jsx';

export default function Admin() {
  const pages = [
    ['/admin', 'Dashboard', 'grid'], ['/admin/products', 'Products', 'bag'],
    ['/admin/categories', 'Categories', 'layers'], ['/admin/coupons', 'Coupons', 'tag'],
    ['/admin/orders', 'Orders', 'receipt'], ['/admin/inventory-advisor', 'Inventory Advisor', 'sparkle'],
    ['/admin/activity', 'Activity logs', 'history'],
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
          <Route path="activity" element={<ActivityLogs />} />
          <Route path="*" element={<ErrorBox error="That admin page could not be found." />} />
        </Routes>
      </div>
    </div>
  </section>;
}
