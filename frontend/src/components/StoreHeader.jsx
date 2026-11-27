import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import Icon from './Icon.jsx';
import { useNotifications } from '../context/NotificationsContext.jsx';
import InstallButton from './InstallButton.jsx';

export default function StoreHeader() {
  const { user } = useAuth();
  const { count } = useCart();
  const { unread } = useNotifications();
  return <header className="site-header">
    <div className="shipping-bar">₱120 flat-rate shipping</div>
    <div className="header-inner">
      <Link to="/" className="wordmark" aria-label="Carry &amp; Co. home">
        <span className="brand-mark"><img src="/icons/carry-co-mark-96.png" width={35} height={35} alt="" /></span>
        <span>Carry <span className="brand-amp">&amp;</span> Co.</span>
      </Link>
      <nav className="desktop-nav" aria-label="Main navigation">
        <NavLink to="/products">Shop</NavLink>
        <NavLink to="/ai-assistant">AI tools</NavLink>
        <NavLink to="/orders">Orders</NavLink>
        {user?.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
      </nav>
      <div className="header-actions">
        {user?.role === 'admin' && <Link className="mobile-admin text-link" to="/admin">Admin</Link>}
        <InstallButton />
        <Link className="header-search" aria-label="Search bags" to="/products?search=open"><Icon name="search" size={21} /></Link>
        <NavLink className="mobile-orders" to="/orders">Orders</NavLink>
        {user && <NavLink className="header-notifications" to="/notifications" aria-label={unread == null ? 'Notifications' : 'Notifications, ' + unread + ' unread'}>
          <Icon name="bell" size={22} />{unread > 0 && <span className="notification-counter" aria-hidden="true">{unread > 99 ? '99+' : unread}</span>}
        </NavLink>}
        <NavLink className="desktop-action" to={user ? '/account' : '/login'}><Icon name="person" size={20} /> Account</NavLink>
        <NavLink className="desktop-action" to="/cart" aria-label={'Bag, ' + count + ' items'}>
          <Icon name="bag" size={20} /> Bag <span className="header-count" aria-hidden="true">{count}</span>
        </NavLink>
      </div>
    </div>
  </header>;
}
