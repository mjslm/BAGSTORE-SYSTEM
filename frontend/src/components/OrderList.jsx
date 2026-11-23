import { Link } from 'react-router-dom';
import { money, orderNumber, statusLabel, when } from '../utils/format.js';

export default function OrderList({ orders }) {
  return <div className="order-list">{orders.map((order) => <Link className="order-card" key={order.id} to={'/orders/' + order.id}>
    <div><strong>{orderNumber(order.id)}</strong><p>{when(order.created_at)}</p></div>
    <div className="order-card-end"><span className="status">{statusLabel(order.status)}</span><strong>{money(order.total_cents)}</strong>
      {order.payment_flag && <small className="text-error">Payment needs review</small>}</div>
  </Link>)}</div>;
}
