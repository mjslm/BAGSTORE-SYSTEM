import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { endpoint } from '../api/client.js';
import { useRequest } from '../hooks/useRequest.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { useNetwork } from '../context/NetworkStatusContext.jsx';
import ProductCard from '../components/ProductCard.jsx';
import Icon from '../components/Icon.jsx';
import { Empty, ErrorBox, Pagination, SkeletonLoader } from '../components/Feedback.jsx';

const defaults = { category: '', min: '', max: '', laptop: '', sort: 'featured' };

export default function Catalog() {
  const [params] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') || '');
  const [filters, setFilters] = useState(() => ({ ...defaults, category: params.get('category') || '' }));
  const [draft, setDraft] = useState(defaults);
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [open, setOpen] = useState(params.get('fit') === 'open');
  const [filterError, setFilterError] = useState('');
  const dialog = useRef(null);
  const searchBox = useRef(null);
  const online = useNetwork();
  const q = useDebounce(search);
  const query = { q, category: filters.category, minPrice: filters.min && Math.round(Number(filters.min) * 100),
    maxPrice: filters.max && Math.round(Number(filters.max) * 100), laptop: filters.laptop,
    sort: filters.sort === 'featured' ? '' : filters.sort, page: page === 1 ? '' : page };
  const catalog = useRequest(endpoint('/products', query), { reload });
  const saved = useRequest('/products', { enabled: !online && Boolean(catalog.error) });
  const categories = useRequest('/categories');
  const activeCategory = categories.data?.find((entry) => entry.id === filters.category);
  const results = !online && catalog.error && saved.data ? saved : catalog;
  const filteredOffline = results === saved;
  const filtered = filteredOffline ? saved.data.filter((bag) =>
    (!filters.category || bag.category_id === filters.category) &&
    (!filters.laptop || bag.laptop_inches >= Number(filters.laptop)) &&
    (!query.minPrice || bag.price_cents >= query.minPrice) &&
    (!query.maxPrice || bag.price_cents <= query.maxPrice) &&
    [bag.name, bag.color, bag.description, bag.category].join(' ').toLowerCase().includes(q.toLowerCase()),
  ) : results.data;
  if (filteredOffline && filters.sort === 'price-asc') filtered.sort((a, b) => a.price_cents - b.price_cents);
  if (filteredOffline && filters.sort === 'price-desc') filtered.sort((a, b) => b.price_cents - a.price_cents);
  useEffect(() => {
    if (open && !dialog.current.open) dialog.current.showModal();
    if (!open && dialog.current.open) dialog.current.close();
  }, [open]);

  useEffect(() => {
    if (params.get('search') === 'open') searchBox.current?.focus();
  }, [params]);

  function close() { setOpen(false); }
  function apply(event) {
    event.preventDefault();
    if (draft.min !== '' && draft.max !== '' && Number(draft.min) > Number(draft.max)) {
      setFilterError('Maximum price must be at least the minimum.');
      return;
    }
    setFilters(draft);
    setPage(1);
    close();
  }

  return <section className="content catalog">
    <div className="page-heading catalog-heading"><h1>{activeCategory?.name || 'Shop bags'}</h1></div>
    <div className="toolbar"><label className="search-field"><Icon name="search" /><input ref={searchBox} type="search" maxLength={100} value={search} onChange={(event) => {
      setSearch(event.target.value); setPage(1);
    }} aria-label="Search bags" placeholder="Search bags" /></label>
      <button className="button subtle" type="button" onClick={() => { setFilterError(''); setDraft(filters); setOpen(true); }}><Icon name="filter" size={19} /> Filters</button>
    </div>
    {categories.data?.length > 0 && <div className="category-tabs" role="group" aria-label="Filter by category">
      {[{ id: '', name: 'All bags' }, ...categories.data].map((category) =>
        <button key={category.id} type="button" aria-pressed={filters.category === category.id} onClick={() => {
          setFilters({ ...filters, category: category.id });
          setPage(1);
        }}>{category.name}</button>
      )}
    </div>}
    {filters.laptop && <p className="filter-summary">Fits a {filters.laptop}″ laptop or larger</p>}
    {results.loading ? <SkeletonLoader grid /> : results.error ? <ErrorBox error={online ? results.error : 'This catalog page is not saved on this device.'} onRetry={() => setReload((n) => n + 1)} /> : <>
      {filteredOffline && <p className="filter-summary">Filters are applied to the catalog page saved on this device.</p>}
      <p className="result-count">{filteredOffline ? filtered.length : results.meta.total} {filtered.length === 1 ? 'result' : 'results'}</p>
      {filtered.length
        ? <div className="product-grid">{filtered.map((bag) => <ProductCard key={bag.id} product={bag} />)}</div>
        : <Empty title="No bags match these filters" icon="search"><button className="button subtle" onClick={() => { setSearch(''); setFilters(defaults); setPage(1); }}>Reset filters</button></Empty>}
      {!filteredOffline && <Pagination meta={results.meta} onPage={(next) => { setPage(next); window.scrollTo(0, 0); }} />}
    </>}
    <dialog ref={dialog} className="filter-dialog" aria-labelledby="filter-title" onCancel={close} onClose={close} onClick={(event) => { if (event.target === dialog.current) close(); }}>
      <form onSubmit={apply} className="filter-sheet">
        <div className="section-title"><h2 id="filter-title">Filter bags</h2><button type="button" className="icon-button" aria-label="Close filters" onClick={close}><Icon name="close" /></button></div>
        <label>Category<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}><option value="">All bags</option>
          {categories.data?.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>
        <label>Laptop screen size<select value={draft.laptop} onChange={(event) => setDraft({ ...draft, laptop: event.target.value })}>
          <option value="">Any size</option>{[13, 14, 15, 15.6, 16, 17].map((size) => <option key={size} value={size}>{size} inches</option>)}
        </select></label>
        <div className="form-grid">
          <label>Min price (₱)<input type="number" min="0" max="100000" step="0.01" value={draft.min} onChange={(event) => setDraft({ ...draft, min: event.target.value })} /></label>
          <label>Max price (₱)<input type="number" min="0" max="100000" step="0.01" value={draft.max} onChange={(event) => setDraft({ ...draft, max: event.target.value })} /></label>
        </div>
        <label>Sort by<select value={draft.sort} onChange={(event) => setDraft({ ...draft, sort: event.target.value })}>
          <option value="featured">Featured</option><option value="newest">Newest</option><option value="price-asc">Price · Low to high</option><option value="price-desc">Price · High to low</option>
        </select></label>
        <ErrorBox error={filterError} /><div className="actions"><button type="button" className="button subtle" onClick={() => setDraft(defaults)}>Reset</button><button className="button">Apply filters</button></div>
      </form>
    </dialog>
  </section>;
}
