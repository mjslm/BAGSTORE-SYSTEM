import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNetwork } from '../../context/NetworkStatusContext.jsx';
import { ErrorBox } from '../../components/Feedback.jsx';
import Icon from '../../components/Icon.jsx';

export default function InventoryAdvisor() {
  const { token } = useAuth();
  const online = useNetwork();
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function analyze() {
    if (busy || !online) return;
    setBusy(true);
    setError(null);
    try {
      const { data } = await api('/admin/ai/inventory', { method: 'POST', token });
      setReport(data);
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  }

  return <section className="inventory-advisor">
    <div className="summary-card">
      <p className="eyebrow"><Icon name="sparkle" size={17} /> AI-Assisted</p>
      <h2>Inventory Advisor</h2>
      <p>Analyze verified sales and available stock to see which bags need replenishment.</p>
      <div className="actions advisor-actions">
        <button className="button" onClick={analyze} disabled={busy || !online}>
          {!online ? 'Advisor is offline' : busy ? 'Analyzing inventory…' : report ? 'Refresh analysis' : 'Analyze inventory'}
        </button>
        <Link className="button subtle" to="/admin/products">Manage products</Link>
      </div>
      <ErrorBox error={error} />
      {busy && <p role="status" className="feedback">Reviewing the last 30 days of verified sales…</p>}
    </div>
    {report && <>
      <dl className="dashboard-grid advisor-metrics">
        {[
          ['Products checked', report.summary.productsAnalyzed],
          ['Units sold (30 days)', report.summary.unitsSold],
          ['Low stock', report.summary.lowStock],
          ['Restock suggested', report.summary.reorderCount],
        ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
      <section className="summary-card advisor-overview">
        <div className="section-title"><h3>{report.aiAssisted ? 'AI-assisted analysis' : 'Inventory rules'}</h3><small>{new Date(report.generatedAt).toLocaleString()}</small></div>
        <p>{report.overview}</p>
        <small>Target: {report.policy.targetDays} days of recent demand, with a minimum of {report.policy.minimumTarget} units for bags with verified sales. Low stock: {report.policy.lowStockThreshold} units or fewer.</small>
      </section>
      <section aria-label="Inventory recommendations" className="advisor-results">
        <h3>Inventory recommendations ({report.summary.attentionCount})</h3>
        {report.summary.attentionCount > report.recommendations.length && <p className="muted">Showing the first {report.recommendations.length} priorities.</p>}
        {!report.recommendations.length && <p className="summary-card">No products require attention under the current inventory rules.</p>}
        {report.recommendations.map((item) => <article key={item.id} className="summary-card advisor-item">
          <div className="section-title">
            <div><h3>{item.name}</h3><small>{item.category}</small></div>
            <span className={'status advisor-status ' + item.action}>{item.action === 'restock' ? 'Restock' : 'Review'}</span>
          </div>
          <dl className="advisor-facts">
            <div><dt>Available stock</dt><dd>{item.stock}</dd></div>
            <div><dt>Units sold (30 days)</dt><dd>{item.units_sold}</dd></div>
            <div><dt>Suggested order</dt><dd>{item.suggestedReorder || 'Review'}</dd></div>
          </dl>
          <p>{item.note}</p>
        </article>)}
      </section>
    </>}
  </section>;
}
