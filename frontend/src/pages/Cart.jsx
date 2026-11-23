import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useNetwork } from '../context/NetworkStatusContext.jsx';
import { money } from '../utils/format.js';
import { Empty, ErrorBox, SkeletonLoader } from '../components/Feedback.jsx';
import Quantity from '../components/Quantity.jsx';
import Totals from '../components/Totals.jsx';
import BagImage from '../components/BagImage.jsx';

export default function Cart() {
  const { user, loading } = useAuth();
  const { cart, error, busy, mutate, refresh } = useCart();
  const online = useNetwork();
  return <section className="content narrow">
    <div className="page-heading"><h1>Your bag</h1></div>
    <ErrorBox error={error} onRetry={error?.code === 'CONNECTION' && online ? refresh : undefined} />
    {loading ? <SkeletonLoader /> : !user ? <Empty title="Sign in to start your bag"><p>Your bag is saved with your account.</p>
      {online && <Link className="button" to="/login" state={{ from: '/cart' }}>Sign in</Link>}
    </Empty> : !cart.items.length ? <Empty title={online ? 'Your bag is empty' : 'No saved bag on this device'}><Link className="button" to="/products">Browse bags</Link></Empty> : <>
      <div className="cart-list">{cart.items.map((item) => <article className="cart-item" key={item.id + ':' + item.monogram}>
        <Link to={'/products/' + item.id} className="cart-photo" style={{ backgroundColor: item.background }}><BagImage bag={item} /></Link>
        <div><h2>{item.name}</h2><p>{item.color}{item.monogram && ' · Monogram ' + item.monogram}</p>
          {item.available === false && <p className="text-error">Unavailable</p>}
          <Quantity value={item.quantity} max={Math.min(20, item.stock)} onChange={(value) => mutate(item, value, { monogram: item.monogram })}
            disabled={!online || busy || item.available === false} label={item.name + ' quantity'} />
        </div>
        <div className="cart-line-end">{item.line_cents != null && <strong>{money(item.line_cents)}</strong>}
          <button className="text-link" disabled={!online || busy} type="button" onClick={() => mutate(item, 0, { monogram: item.monogram })}>Remove</button>
        </div>
      </article>)}</div>
      {!online && <p className="filter-summary">Saved prices and stock may have changed.</p>}
      {busy ? <p className="feedback" role="status">Updating the server total…</p> : <Totals value={cart} />}
      <div className="sticky-actions">
        {online ? <Link className="button" to="/checkout">Checkout</Link> : <button className="button" disabled>Checkout unavailable offline</button>}
      </div>
    </>}
  </section>;
}
