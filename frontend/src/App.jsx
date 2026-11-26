import { lazy, Suspense, useEffect } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import Home from './pages/Home.jsx';
import BottomNav from './components/BottomNav.jsx';
import OfflineBanner from './components/OfflineBanner.jsx';
import ReloadPrompt from './components/ReloadPrompt.jsx';
import StoreHeader from './components/StoreHeader.jsx';
import Protected from './components/Protected.jsx';
import { Empty, SkeletonLoader } from './components/Feedback.jsx';

const Catalog = lazy(() => import('./pages/Catalog.jsx'));
const Product = lazy(() => import('./pages/Product.jsx'));
const Cart = lazy(() => import('./pages/Cart.jsx'));
const Checkout = lazy(() => import('./pages/Checkout.jsx'));
const Discovery = lazy(() => import('./pages/Discovery.jsx'));
const ShoppingAssistant = lazy(() => import('./pages/ShoppingAssistant.jsx'));
const AuthForm = lazy(() => import('./pages/AuthForm.jsx'));
const Account = lazy(() => import('./pages/Account.jsx'));
const Orders = lazy(() => import('./pages/Orders.jsx'));
const Order = lazy(() => import('./pages/Order.jsx'));
const Admin = lazy(() => import('./pages/Admin.jsx'));

export default function App() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    const heading = {
      '/products': 'Shop Bags', '/cart': 'Your Bag', '/checkout': 'Checkout', '/ai-assistant': 'Bag Finder', '/ai-assistant/chat': 'Shopping Assistant', '/orders': 'Your Orders',
      '/account': 'Account', '/login': 'Sign In', '/register': 'Create Account',
    }[pathname];
    document.title = heading ? heading + ' | Carry & Co.' : 'Carry & Co. | Everyday Bags';
  }, [pathname]);
  return <>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <StoreHeader />
    <OfflineBanner />
    <main id="main-content" tabIndex={-1}>
      <Suspense fallback={<div className="content"><SkeletonLoader /></div>}>
        <Routes>
          <Route index element={<Home />} />
          <Route path="products" element={<Catalog key={search} />} />
          <Route path="products/:id" element={<Product />} />
          <Route path="cart" element={<Cart />} />
          <Route path="checkout" element={<Protected><Checkout /></Protected>} />
          <Route path="ai-assistant" element={<Discovery />} />
          <Route path="ai-assistant/chat" element={<ShoppingAssistant key={search} />} />
          <Route path="login" element={<AuthForm key="login" mode="login" />} />
          <Route path="register" element={<AuthForm key="register" mode="register" />} />
          <Route path="account" element={<Protected><Account /></Protected>} />
          <Route path="orders" element={<Protected><Orders /></Protected>} />
          <Route path="orders/:id" element={<Protected><Order /></Protected>} />
          <Route path="payment/success" element={<Protected><Order key="success" paymentReturn="success" /></Protected>} />
          <Route path="payment/failed" element={<Protected><Order key="failed" paymentReturn="failed" /></Protected>} />
          <Route path="payment/cancelled" element={<Protected><Order key="cancelled" paymentReturn="cancelled" /></Protected>} />
          <Route path="admin/*" element={<Protected admin><Admin /></Protected>} />
          <Route path="*" element={<section className="content"><Empty title="We couldn’t find that page"><Link className="button" to="/products">Browse the shop</Link></Empty></section>} />
        </Routes>
      </Suspense>
    </main>
    <footer className="site-footer">
      <div className="footer-inner">
        <Link className="footer-brand" to="/">Carry &amp; Co.</Link>
        <nav aria-label="Footer navigation">
          <Link to="/products">Shop bags</Link>
          <a href="/images/photos/credits.txt">Photo credits</a>
        </nav>
      </div>
    </footer>
    <BottomNav />
    <ReloadPrompt />
  </>;
}
