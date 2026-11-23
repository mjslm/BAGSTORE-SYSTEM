import { money } from '../utils/format.js';

export default function Totals({ value, checkout = false }) {
  if (!value) return null;
  return <dl className="totals">
    <div><dt>Subtotal</dt><dd>{value.subtotal_cents == null ? '—' : money(value.subtotal_cents)}</dd></div>
    {checkout && <>
      <div><dt>Coupon discount</dt><dd>{value.discount_cents ? '−' + money(value.discount_cents) : money(0)}</dd></div>
      <div><dt>Shipping</dt><dd>{money(value.shipping_cents)}</dd></div>
      <div className="total"><dt>Total</dt><dd>{money(value.total_cents)}</dd></div>
    </>}
  </dl>;
}
