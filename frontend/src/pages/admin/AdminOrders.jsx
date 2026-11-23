import { useState } from 'react';
import { endpoint } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useRequest } from '../../hooks/useRequest.js';
import { Empty, ErrorBox, Pagination, SkeletonLoader } from '../../components/Feedback.jsx';
import OrderList from '../../components/OrderList.jsx';
import { statusLabel } from '../../utils/format.js';

const states = ['pending_payment','paid','processing','shipped','delivered','cancelled','expired','failed'];
export default function AdminOrders() {
  const { token } = useAuth();
  const [filters, setFilters] = useState({ status: '', from: '', to: '', page: 1 });
  const result = useRequest(endpoint('/admin/orders', filters), { token });
  const change = (key) => (event) => setFilters({ ...filters, page: 1, [key]: event.target.value });
  return <>
    <h2>Orders</h2><div className="form-grid order-filters">
      <label>Status<select value={filters.status} onChange={change('status')}><option value="">All statuses</option>
        {states.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></label>
      <label>From<input type="date" value={filters.from} onChange={change('from')} /></label>
      <label>To<input type="date" value={filters.to} onChange={change('to')} /></label>
    </div>
    {result.loading ? <SkeletonLoader /> : result.error ? <ErrorBox error={result.error} /> : result.data.length ? <>
      <OrderList orders={result.data} /><Pagination meta={result.meta} onPage={(page) => setFilters({ ...filters, page })} />
    </> : <Empty title="No matching orders" />}
  </>;
}
