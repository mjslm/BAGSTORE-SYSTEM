import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotifications } from '../context/NotificationsContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { mayaRedirect, money, orderNumber, statusLabel, when } from '../utils/format.js';
import { ErrorBox, SkeletonLoader } from '../components/Feedback.jsx';
import Totals from '../components/Totals.jsx';

const transitions = { paid: 'processing', processing: 'shipped', shipped: 'delivered' };
const returnText = {
  success: 'You’ve returned from Maya. The order status below reflects the latest server confirmation.',
  failed: 'Maya reported a payment problem. Check the confirmed order status before trying again.',
  cancelled: 'You left Maya Checkout. Check the order status below to see if you can resume or cancel it.',
};

export default function Order({ paymentReturn }) {
  const { id: routeId } = useParams();
  const [params] = useSearchParams();
  const id = routeId || params.get('orderId');
  const ready = id && /^[0-9a-f-]{36}$/i.test(id);
  const { token, user } = useAuth();
  const { refresh } = useCart();
  const { refresh: refreshNotifications } = useNotifications();
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const order = loaded?.id === id ? loaded.order : null;
  const failure = error?.id === id ? error.failure : null;
  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    async function load() {
      try {
        const result = await api('/orders/' + id, { token, signal: controller.signal });
        if (controller.signal.aborted) return;
        setLoaded({ id, order: result.data });
        setError(null);
        if (paymentReturn && result.data.status === 'pending_payment') {
          const verified = await api('/orders/' + id + '/verify', { token, method: 'POST', signal: controller.signal });
          if (!controller.signal.aborted) { setLoaded({ id, order: verified.data }); refreshNotifications(); }
        }
      } catch (failure) { if (!controller.signal.aborted) setError({ id, failure }); }
    }
    load();
    return () => controller.abort();
  }, [id, ready, token, paymentReturn, reload, refreshNotifications]);

  async function update(path, method, body) {
    setBusy(true);
    setError(null);
    try {
      const { data } = await api(path, { token, method, body });
      if (path.endsWith('restore-cart')) { await refresh(); navigate('/cart'); }
      else { setLoaded({ id, order: data }); refreshNotifications(); }
    } catch (failure) { setError({ id, failure }); }
    finally { setBusy(false); }
  }

  const own = order?.user_id === user.id;
  const admin = user.role === 'admin';
  const pending = order?.status === 'pending_payment';
  const base = '/orders/' + id;
  return <section className="content narrow">
    <Link className="text-link back-link" to={admin && !own && order ? '/admin/orders' : '/orders'}>← {admin && !own && order ? 'Manage orders' : 'Order history'}</Link>
    <div className="page-heading"><h1>{paymentReturn ? 'Maya payment status' : 'Order details'}</h1></div>
    {paymentReturn && <p className="feedback">{returnText[paymentReturn]}</p>}
    {!ready ? <ErrorBox error="This link does not include a valid order reference." /> : <>
      <ErrorBox error={failure} onRetry={!order ? () => setReload((n) => n + 1) : undefined} />
      {!order ? !failure && <SkeletonLoader /> : <>
        <section className="summary-card">
          <div className="section-title"><h2>{orderNumber(id)}</h2><span className="status">{statusLabel(order.status)}</span></div>
          <p className="muted">{when(order.created_at)}</p>
          {order.payment_flag && <ErrorBox error={admin ? JSON.stringify(order.payment_flag) : 'The payment needs store review before this order can be processed.'} />}
          <ul className="order-line-list">{order.items.map((item) => <li key={item.product_id + ':' + item.monogram}><span>{item.quantity} × {item.name}
            {item.monogram && ' · Monogram ' + item.monogram}</span><strong>{money(item.line_cents)}</strong></li>)}</ul>
          <Totals value={order} checkout />
        </section>
        {order.shipping && <section className="summary-card"><h2>Delivery address</h2><address>{order.shipping.name}<br />{order.shipping.address}<br />
          {order.shipping.city} {order.shipping.postalCode}<br />{order.shipping.phone}</address></section>}
        <section className="summary-card"><h2>Status history</h2><ol className="timeline">
          {order.history.map((item, index) => <li key={item.status + ':' + item.created_at + ':' + index}><span>{statusLabel(item.status)}</span><small>{when(item.created_at)}</small></li>)}
        </ol></section>
        <div className="actions">
          {pending && <button className="button subtle" type="button" disabled={busy} onClick={() => update(base + '/verify', 'POST')}>Check payment status</button>}
          {pending && own && order.checkout_url && !order.payment_flag && <button className="button" type="button" disabled={busy} onClick={() => {
            try { mayaRedirect(order.checkout_url); } catch (failure) { setError({ id, failure }); }
          }}>Continue to Maya</button>}
          {pending && own && <button className="button subtle" type="button" disabled={busy} onClick={() => update(base + '/cancel', 'POST')}>Cancel unpaid order</button>}
          {own && order.canRetry && <><p className="muted">Retry replaces the current bag with the items from this order.</p>
            <button className="button" type="button" disabled={busy} onClick={() => update(base + '/restore-cart', 'POST')}>Put items back in bag</button></>}
          {admin && transitions[order.status] && <button className="button" type="button" disabled={busy} onClick={() =>
            update('/admin/orders/' + id, 'PATCH', { status: transitions[order.status] })}>Mark {statusLabel(transitions[order.status]).toLowerCase()}</button>}
        </div>
      </>}
    </>}
  </section>;
}
