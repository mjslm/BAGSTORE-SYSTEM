import { useState } from 'react';
import { api, endpoint } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useRequest } from '../../hooks/useRequest.js';
import { ErrorBox, Pagination, SkeletonLoader } from '../../components/Feedback.jsx';
import { money, when } from '../../utils/format.js';

const emptyProduct = { id: '', name: '', description: '', category_id: '', color: '', image: '/images/tote.svg',
  background: '#e9e8dc', price_cents: '', stock: '0', laptop_inches: '', monogram_cents: '', active: true };
const emptyCategory = { id: '', name: '', active: true };

function StockEditor({ product, reload }) {
  const { token } = useAuth();
  const [stock, setStock] = useState(product.stock);
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const history = useRequest('/admin/products/' + product.id + '/stock?limit=8', { token, reload });
  return <section className="summary-card">
    <h2>Stock for {product.name}</h2>
    <form className="form-stack" onSubmit={async (event) => {
      event.preventDefault();
      setBusy(true);
      setError(null);
      try {
        await api('/admin/products/' + product.id + '/stock', { token, method: 'PATCH', body: { stock: Number(stock), reason } });
        setReason('');
        product.onSaved();
      } catch (failure) { setError(failure); }
      finally { setBusy(false); }
    }}>
      <label>Available stock<input type="number" required min="0" max="100000" value={stock} onChange={(event) => setStock(event.target.value)} /></label>
      <label>Reason<input required minLength={5} maxLength={200} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
      <ErrorBox error={error} /><button className="button" disabled={busy}>Save stock</button>
    </form>
    <h3>Recent adjustments</h3>
    {history.loading ? <SkeletonLoader /> : <><ErrorBox error={history.error} /><ul className="order-line-list">
      {history.data?.map((row) => <li key={row.id}><span>{row.reason}<br /><small>{when(row.created_at)}</small></span><strong>{row.old_stock} → {row.new_stock}</strong></li>)}
    </ul></>}
  </section>;
}

export default function AdminCatalog({ mode }) {
  const isProduct = mode === 'products';
  const base = '/admin/' + mode;
  const { token } = useAuth();
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [selected, setSelected] = useState(null);
  const [stock, setStock] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const result = useRequest(endpoint(base, isProduct ? { page } : {}), { token, reload });
  const categories = useRequest('/admin/categories', { token, enabled: isProduct });
  const saved = () => setReload((n) => n + 1);

  function edit(row) {
    setError(null);
    setMessage('');
    const value = row && isProduct ? { ...row, price_cents: row.price_cents / 100, monogram_cents: row.monogram_cents === null ? '' : row.monogram_cents / 100,
      laptop_inches: row.laptop_inches ?? '' } : row;
    setSelected({ create: !row, values: value || (isProduct ? emptyProduct : emptyCategory) });
  }

  async function save(event) {
    event.preventDefault();
    const { create, values } = selected;
    const body = { ...values };
    if (isProduct) {
      body.price_cents = Math.round(Number(body.price_cents) * 100);
      body.stock = Number(body.stock);
      body.laptop_inches = body.laptop_inches === '' ? null : Number(body.laptop_inches);
      body.monogram_cents = body.monogram_cents === '' ? null : Math.round(Number(body.monogram_cents) * 100);
    }
    setBusy(true);
    setError(null);
    try {
      await api(base + (create ? '' : '/' + values.id), { token, method: create ? 'POST' : isProduct ? 'PATCH' : 'PUT', body });
      setSelected(null);
      setMessage(isProduct ? 'Product saved.' : 'Category saved.');
      saved();
    } catch (failure) { setError(failure); }
    finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await api(base + '/' + selected.values.id, { token, method: 'DELETE' });
      setSelected(null);
      setStock(null);
      setMessage('Product removed from the catalog.');
      saved();
    } catch (failure) { setError(failure); }
    finally { setBusy(false); }
  }

  function field(id, label, props = {}) {
    return <label>{label}<input value={selected.values[id]} onChange={(event) => update(id, event.target.value)} {...props} /></label>;
  }
  function update(id, value) {
    setSelected({ ...selected, values: { ...selected.values, [id]: value } });
  }

  return <>
    <div className="section-title"><h2>{isProduct ? 'Products' : 'Categories'}</h2><button type="button" className="button" onClick={() => edit(null)}>{isProduct ? 'New product' : 'New category'}</button></div>
    {message && <p role="status" className="feedback success">{message}</p>}
    {selected && <form onSubmit={save} className="form-stack summary-card">
      <h3>{selected.create ? 'Create' : 'Edit'} {isProduct ? 'product' : 'category'}</h3>
      {selected.create && field('id', 'URL slug', { required: true, maxLength: 64, pattern: '[a-z0-9]+(?:\\-[a-z0-9]+)*', placeholder: 'everyday-tote' })}
      {field('name', 'Name', { required: true, minLength: 2, maxLength: 100 })}
      {isProduct && <>
        <label>Description<textarea required minLength={5} maxLength={600} value={selected.values.description} onChange={(event) => update('description', event.target.value)} /></label>
        <label>Category<select required value={selected.values.category_id} onChange={(event) => update('category_id', event.target.value)}><option value="">Select a category</option>
          {categories.data?.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <div className="form-grid">{field('color', 'Bag color', { required: true, maxLength: 40 })}
          {field('price_cents', 'Price (₱)', { type: 'number', required: true, min: 1, max: 100000, step: '0.01' })}</div>
        {field('image', 'Image URL or /images/ path', { required: true, maxLength: 400 })}
        <div className="form-grid">
          {field('laptop_inches', 'Laptop fit (inches)', { type: 'number', min: 10, max: 20, step: '0.1', placeholder: 'Optional' })}
          {field('monogram_cents', 'Monogram fee (₱)', { type: 'number', min: 1, max: 100000, step: '0.01', placeholder: 'Optional' })}
        </div>
        {selected.create && field('stock', 'Opening stock', { type: 'number', required: true, min: 0, max: 100000 })}
      </>}
      <label className="check-field"><input type="checkbox" checked={selected.values.active} onChange={(event) => update('active', event.target.checked)} /> Visible in catalog</label>
      <ErrorBox error={error} />
      <div className="actions">
        <button className="button" disabled={busy}>Save</button><button className="button subtle" type="button" onClick={() => setSelected(null)} disabled={busy}>Close</button>
        {isProduct && !selected.create && <button type="button" className="button danger" disabled={busy}
          onClick={() => { if (window.confirm('Remove this product from the store? Existing orders keep their item history.')) remove(); }}>Delete product</button>}
      </div>
    </form>}
    {stock && <StockEditor key={stock.id} product={stock} reload={reload} />}
    {result.loading ? <SkeletonLoader /> : result.error ? <ErrorBox error={result.error} onRetry={saved} /> : <>
      <div className="admin-list">{result.data.map((row) => <article key={row.id} className="admin-row">
        <div><strong>{row.name}</strong><p>{row.active ? 'Visible' : 'Hidden'}{isProduct && ' · ' + row.stock + ' in stock · ' + money(row.price_cents)}</p></div>
        <div className="actions"><button className="button subtle" type="button" onClick={() => edit(row)}>Edit</button>
          {isProduct && <button className="button subtle" type="button" onClick={() => setStock({ ...row, onSaved: saved })}>Stock</button>}</div>
      </article>)}</div><Pagination meta={result.meta} onPage={setPage} /></>}
  </>;
}
