import { useState } from 'react';
import { Link } from 'react-router-dom';
import { endpoint } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useRequest } from '../hooks/useRequest.js';
import OrderList from '../components/OrderList.jsx';
import { Empty, ErrorBox, Pagination, SkeletonLoader } from '../components/Feedback.jsx';

export default function Orders() {
  const { token } = useAuth();
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const result = useRequest(endpoint('/orders', { page }), { token, reload });
  return <section className="content narrow">
    <div className="page-heading"><h1>Order history</h1></div>
    {result.loading ? <SkeletonLoader /> : result.error ? <ErrorBox error={result.error} onRetry={() => setReload((n) => n + 1)} /> : result.data.length
      ? <><OrderList orders={result.data} /><Pagination meta={result.meta} onPage={setPage} /></>
      : <Empty title="You have no orders yet"><Link className="button" to="/products">Browse bags</Link></Empty>}
  </section>;
}
