import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { mayaRedirect, money } from '../utils/format.js';
import { ErrorBox, SkeletonLoader } from '../components/Feedback.jsx';
import Totals from '../components/Totals.jsx';
import BagImage from '../components/BagImage.jsx';

const addressFields = [
  ['name', 'Full name', 'name', 'text', null, 100],
  ['phone', 'Mobile number', 'tel', 'tel', '(?:\\+63|0)9[0-9]{9}', 13],
  ['address', 'Street address', 'street-address', 'text', null, 180],
  ['city', 'City or municipality', 'address-level2', 'text', null, 100],
  ['postalCode', 'Postal code', 'postal-code', 'text', '[0-9]{4}', 4],
];

export default function Checkout() {
  const { user, token } = useAuth();
  const { refresh } = useCart();
  const navigate = useNavigate();
  const [details, setDetails] = useState({ name: user.name, phone: '', address: '', city: '', postalCode: '' });
  const [coupon, setCoupon] = useState('');
  const [applied, setApplied] = useState('');
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState(null);
  const [initial, setInitial] = useState(true);
  const [quoting, setQuoting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [pendingId, setPendingId] = useState('');
  const attempt = useRef(null);
  const locked = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    api('/checkout/quote', { token, method: 'POST', body: {}, signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setQuote(data); })
      .catch((failure) => { if (!controller.signal.aborted) setError(failure); })
      .finally(() => { if (!controller.signal.aborted) setInitial(false); });
    return () => controller.abort();
  }, [token]);

  async function apply(event) {
    event.preventDefault();
    setQuoting(true);
    setError(null);
    const code = coupon.trim().toUpperCase();
    try {
      const { data } = await api('/checkout/quote', { token, method: 'POST', body: { couponCode: code } });
      setQuote(data);
      setApplied(code);
    } catch (failure) {
      setError(failure);
    } finally { setQuoting(false); }
  }

  async function pay(event) {
    event.preventDefault();
    if (locked.current || quoting) return;
    locked.current = true;
    setPaying(true);
    setError(null);
    setPendingId('');
    try {
      const body = { shipping: details, couponCode: applied };
      const fingerprint = JSON.stringify(body);
      if (attempt.current?.input !== fingerprint) attempt.current = { input: fingerprint, key: crypto.randomUUID() };
      const { data } = await api('/checkout', { method: 'POST', token, body, idempotencyKey: attempt.current.key });
      refresh();
      if (data.checkout_url && data.status === 'pending_payment') mayaRedirect(data.checkout_url);
      else navigate('/orders/' + data.id, { replace: true });
    } catch (failure) {
      setError(failure);
      if (failure.details?.orderId) {
        setPendingId(failure.details.orderId);
        refresh();
      }
    } finally { setPaying(false); locked.current = false; }
  }

  return <section className="content checkout-page">
    <Link className="text-link back-link" to="/cart">← Your bag</Link>
    <div className="page-heading"><h1>Checkout</h1></div>
    <ErrorBox error={error} />
    {pendingId && <Link className="button subtle" to={'/orders/' + pendingId}>Open the pending order</Link>}
    {initial ? <SkeletonLoader /> : quote && <div className="checkout-grid">
      <form id="checkout-address" onSubmit={pay} className="form-stack checkout-address">
        <h2>Delivery address</h2>
        {addressFields.map(([field, label, autocomplete, type, pattern, max]) => <label key={field}>{label}
          <input type={type} autoComplete={autocomplete} required pattern={pattern || undefined} maxLength={max}
            minLength={field === 'address' ? 8 : field === 'name' || field === 'city' ? 2 : undefined}
            inputMode={field === 'postalCode' ? 'numeric' : undefined}
            value={details[field]} onChange={(event) => setDetails({ ...details, [field]: event.target.value })} />
        </label>)}
      </form>

      <aside className="checkout-summary" aria-labelledby="checkout-summary-title">
        <section className="summary-card">
          <h2 id="checkout-summary-title">Order summary</h2>
          <ul className="order-line-list checkout-items">{quote.items.map((item) => <li key={item.id + ':' + item.monogram}>
            <div className="checkout-item">
              <span className="checkout-item-photo"><BagImage bag={item} decorative /></span>
              <span>{item.quantity} × {item.name}{item.monogram && ' · ' + item.monogram}</span>
            </div>
            <strong>{money(item.line_cents)}</strong>
          </li>)}</ul>
          <Totals value={quote} checkout />

          <form className="coupon-form" onSubmit={apply}>
            <label>Coupon code<input value={coupon} onChange={(event) => setCoupon(event.target.value.toUpperCase())} maxLength={24} placeholder="Enter code" /></label>
            <button className="button subtle" type="submit" disabled={quoting || paying}>{quoting ? 'Checking…' : 'Apply'}</button>
          </form>
          {applied && <p className="feedback success" role="status">Coupon {applied} applied. Clear the code and apply to remove it.</p>}
          <button className="button checkout-pay" type="submit" form="checkout-address" disabled={paying || quoting || Boolean(pendingId)}>
            {paying ? 'Opening Maya…' : 'Pay with Maya · ' + money(quote.total_cents)}
          </button>
          <p className="muted">Payment opens on Maya’s hosted sandbox page.</p>
        </section>
      </aside>
    </div>}
  </section>;
}
