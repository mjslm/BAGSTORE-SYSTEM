import { useState } from 'react';
import { api, endpoint } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useRequest } from '../../hooks/useRequest.js';
import { ErrorBox, Pagination, SkeletonLoader } from '../../components/Feedback.jsx';
import { money, when } from '../../utils/format.js';

const empty = { couponCode: '', kind: 'percent', value: '', minimum_cents: '0', expires_at: '', max_uses: '20', max_per_user: '1', active: true };
const timeInput = (value) => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

export default function AdminCoupons() {
  const { token } = useAuth();
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [form, setForm] = useState(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const result = useRequest(endpoint('/admin/coupons', { page }), { token, reload });
  const edit = (row) => {
    setError(null);
    setEditing(Boolean(row));
    setForm(row ? { ...row, couponCode: row.code, expires_at: timeInput(row.expires_at), minimum_cents: row.minimum_cents / 100,
      value: row.kind === 'fixed' ? row.value / 100 : row.value } : empty);
  };
  const field = (key, label, props) => <label>{label}<input value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} {...props} /></label>;

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = { ...form, expires_at: new Date(form.expires_at).toISOString(),
        value: Math.round(Number(form.value) * (form.kind === 'fixed' ? 100 : 1)),
        minimum_cents: Math.round(Number(form.minimum_cents) * 100), max_uses: Number(form.max_uses), max_per_user: Number(form.max_per_user) };
      await api('/admin/coupons' + (editing ? '/' + form.couponCode : ''), { token, method: editing ? 'PUT' : 'POST', body });
      setForm(null);
      setReload((n) => n + 1);
    } catch (failure) { setError(failure); }
    finally { setBusy(false); }
  }

  return <>
    <div className="section-title"><h2>Coupons</h2><button className="button" type="button" onClick={() => edit(null)}>New coupon</button></div>
    {form && <form className="form-stack summary-card" onSubmit={submit}>
      <h3>{editing ? 'Edit coupon' : 'Create coupon'}</h3>
      {field('couponCode', 'Coupon code', { required: true, readOnly: editing, minLength: 3, maxLength: 24 })}
      <label>Discount type<select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value, value: '' })}>
        <option value="percent">Percentage</option><option value="fixed">Fixed amount</option>
      </select></label>
      <div className="form-grid">
        {field('value', form.kind === 'percent' ? 'Discount (%)' : 'Discount (₱)', { type: 'number', required: true, min: form.kind === 'percent' ? 1 : '0.01', max: form.kind === 'percent' ? 100 : 100000, step: form.kind === 'percent' ? 1 : '0.01' })}
        {field('minimum_cents', 'Minimum subtotal (₱)', { type: 'number', min: 0, step: '0.01', required: true })}
        {field('max_uses', 'Total uses', { type: 'number', min: 1, max: 100000, required: true })}
        {field('max_per_user', 'Uses per customer', { type: 'number', min: 1, max: 100000, required: true })}
      </div>
      {field('expires_at', 'Expires at (local time)', { type: 'datetime-local', required: true })}
      <label className="check-field"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /> Active</label>
      <ErrorBox error={error} /><div className="actions"><button className="button" disabled={busy}>Save coupon</button>
        <button className="button subtle" type="button" onClick={() => setForm(null)} disabled={busy}>Close</button></div>
    </form>}
    {result.loading ? <SkeletonLoader /> : result.error ? <ErrorBox error={result.error} /> : <>
      <div className="admin-list">{result.data.map((row) => <article key={row.code} className="admin-row">
        <div><strong>{row.code}</strong><p>{row.kind === 'percent' ? row.value + '%' : money(row.value)} off · {row.active ? 'Active' : 'Disabled'}</p><small>Expires {when(row.expires_at)}</small></div>
        <button className="button subtle" type="button" onClick={() => edit(row)}>Edit</button>
      </article>)}</div><Pagination meta={result.meta} onPage={setPage} /></>}
  </>;
}
