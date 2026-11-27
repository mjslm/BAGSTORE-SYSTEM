import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNetwork } from '../../context/NetworkStatusContext.jsx';
import { ErrorBox } from '../../components/Feedback.jsx';
import Icon from '../../components/Icon.jsx';

function Recommendations({ report }) {
  return <section className="summary-card advisor-results" aria-labelledby="recommendations-heading">
    <div className="advisor-section-heading">
      <div>
        <h3 id="recommendations-heading">Inventory recommendations</h3>
        <p className="muted">{report.summary.attentionCount} products require attention</p>
      </div>
      {report.summary.attentionCount > report.recommendations.length &&
        <small>Showing {report.recommendations.length} priorities</small>}
    </div>
    {report.recommendations.length ? <table className="advisor-table" aria-label="Inventory recommendations" role="table">
      <thead role="rowgroup"><tr role="row">
        <th scope="col">Product</th>
        <th scope="col">Stock</th>
        <th scope="col">Sold ({report.policy.salesDays}d)</th>
        <th scope="col">Reorder qty.</th>
        <th scope="col">Action</th>
        <th scope="col">Reason</th>
      </tr></thead>
      <tbody role="rowgroup">
        {report.recommendations.map((item) => <tr key={item.id} role="row" className="advisor-item">
          <th scope="row" role="rowheader" className="advisor-product">
            <strong>{item.name}</strong><small>{item.category}</small>
          </th>
          <td role="cell" className="advisor-number"><span className="advisor-cell-label" aria-hidden="true">Stock</span><strong>{item.stock}</strong></td>
          <td role="cell" className="advisor-number"><span className="advisor-cell-label" aria-hidden="true">Sold ({report.policy.salesDays}d)</span><strong>{item.units_sold}</strong></td>
          <td role="cell" className="advisor-number advisor-reorder"><span className="advisor-cell-label" aria-hidden="true">Reorder qty.</span>
            {item.suggestedReorder > 0 ? <strong>{item.suggestedReorder}</strong> : <span aria-label="No reorder quantity suggested">—</span>}
          </td>
          <td role="cell" className="advisor-action">
            <span className={'status advisor-status ' + item.action}>{item.action === 'restock' ? 'Restock' : 'Review'}</span>
          </td>
          <td role="cell" className="advisor-note">{item.note}</td>
        </tr>)}
      </tbody>
    </table> : <p className="advisor-empty">No products require attention under the current inventory rules.</p>}
  </section>;
}

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
    <div className="advisor-heading">
      <div className="advisor-heading-copy">
        <h2>Inventory Advisor</h2>
        <p>Review available stock, verified sales, and suggested replenishment.</p>
      </div>
      <div className="actions advisor-actions">
        <button className="button" onClick={analyze} disabled={busy || !online}>
          {!online ? 'Advisor is offline' : busy ? 'Analyzing inventory…' : report ? 'Refresh analysis' : 'Analyze inventory'}
        </button>
        <Link className="button subtle" to="/admin/products">Manage products</Link>
      </div>
    </div>
    <ErrorBox error={error} />
    {busy && <p role="status" className="feedback">Reviewing verified sales and available stock…</p>}
    {report && <div className="advisor-report" aria-busy={busy}>
      <div className="advisor-report-meta">
        <span><Icon name="sparkle" size={16} /> {report.aiAssisted ? 'AI-assisted report' : 'Inventory rules report'}</span>
        <span>Last updated <time dateTime={report.generatedAt}>{new Date(report.generatedAt).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}</time></span>
      </div>
      <dl className="dashboard-grid advisor-metrics">
        {[
          ['Products analyzed', report.summary.productsAnalyzed],
          ['Units sold (' + report.policy.salesDays + ' days)', report.summary.unitsSold],
          ['Low-stock products', report.summary.lowStock],
          ['Products to restock', report.summary.reorderCount],
        ].map(([label, value], index) => <div key={label} className={index === 3 ? 'advisor-metric-priority' : undefined}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
      <section className="summary-card advisor-overview">
        <div className="advisor-section-heading">
          <h3>{report.aiAssisted ? 'AI-assisted analysis' : 'Inventory rules'}</h3>
        </div>
        <p>{report.overview}</p>
      </section>
      <Recommendations report={report} />
      <section className="summary-card advisor-policy">
        <h3>Inventory criteria</h3>
        <dl>
          <div><dt>Sales period</dt><dd>{report.policy.salesDays} days</dd></div>
          <div><dt>Target coverage</dt><dd>{report.policy.targetDays} days of demand</dd></div>
          <div><dt>Minimum target for bags with sales</dt><dd>{report.policy.minimumTarget} units</dd></div>
          <div><dt>Low-stock threshold</dt><dd>{report.policy.lowStockThreshold} units or fewer</dd></div>
        </dl>
      </section>
    </div>}
  </section>;
}
