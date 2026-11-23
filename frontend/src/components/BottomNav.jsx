import { NavLink } from 'react-router-dom';
import Icon from './Icon.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function BottomNav() {
  const { count } = useCart();
  const { user } = useAuth();
  const tabs = [
    ['/', 'home', 'Home'], ['/products', 'grid', 'Shop'], ['/ai-assistant', 'sparkle', 'Bag Finder'],
    ['/cart', 'bag', 'Bag'], [user ? '/account' : '/login', 'person', 'Account'],
  ];
  return <nav className="bottom-nav" aria-label="Main navigation">
    {tabs.map(([to, icon, label]) => <NavLink to={to} end={to !== '/products'} key={to}>
      <span className="nav-icon"><Icon name={icon} />{icon === 'bag' && count > 0 && <b aria-label={count + ' items'}>{count}</b>}</span>
      <span>{label}</span>
    </NavLink>)}
  </nav>;
}
