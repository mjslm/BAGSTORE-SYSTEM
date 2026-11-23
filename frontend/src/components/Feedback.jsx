import Icon from './Icon.jsx';

export function ErrorBox({ error, onRetry }) {
  if (!error) return null;
  const fields = error.code === 'VALIDATION' && error.details ? Object.entries(error.details) : [];
  return <div className="feedback error" role="alert">
    <p>{typeof error === 'string' ? error : error.message}</p>
    {fields.length > 0 && <ul>{fields.map(([field, detail]) => <li key={field}>{field.split('.').at(-1)} · {detail}</li>)}</ul>}
    {onRetry && <button className="button subtle" type="button" onClick={onRetry}>Try again</button>}
  </div>;
}

export function SkeletonLoader({ grid = false }) {
  return <div role="status" aria-label="Loading" className={grid ? 'product-grid' : 'loading-stack'}>
    {Array.from({ length: grid ? 4 : 2 }, (_, index) => <div className="skeleton" key={index} />)}
  </div>;
}

export function Empty({ title, children, icon = 'bag' }) {
  return <div className="empty-state"><Icon name={icon} size={36} /><h2>{title}</h2>{children}</div>;
}

export function Pagination({ meta, onPage }) {
  if (!meta || meta.total <= meta.limit) return null;
  const total = Math.ceil(meta.total / meta.limit);
  return <nav className="pagination" aria-label="Page navigation">
    <button type="button" className="button subtle" onClick={() => onPage(meta.page - 1)} disabled={meta.page <= 1}>Previous</button>
    <span>Page {meta.page} of {total}</span>
    <button type="button" className="button subtle" onClick={() => onPage(meta.page + 1)} disabled={meta.page >= total}>Next</button>
  </nav>;
}
