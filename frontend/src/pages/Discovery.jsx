import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useNetwork } from '../context/NetworkStatusContext.jsx';
import Icon from '../components/Icon.jsx';
import AiNavigation from '../components/AiNavigation.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { Empty, ErrorBox, SkeletonLoader } from '../components/Feedback.jsx';

export default function Discovery() {
  const online = useNetwork();
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (busy || !online) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try { setResult((await api('/ai/discover', { method: 'POST', body: { prompt } })).data); }
    catch (failure) { setError(failure); }
    finally { setBusy(false); }
  }

  return <section className="content">
    <div className="page-heading"><p className="eyebrow"><Icon name="sparkle" size={17} /> AI-Assisted</p><h1>Bag Finder</h1>
      <p>Tell us what you carry, where you’re headed, or what you want to spend.</p></div>
    <AiNavigation />
    <form className="form-stack discovery-form" onSubmit={submit}>
      <label>What kind of bag are you looking for?<textarea value={prompt} onChange={(event) => setPrompt(event.target.value)}
        minLength={5} maxLength={280} required rows={4} placeholder="A backpack for a 15.6-inch laptop under ₱2,000" /></label>
      <div className="section-title"><small>{prompt.length}/280</small><button className="button" disabled={busy || !online}>
        {!online ? 'Bag Finder is offline' : busy ? 'Finding bags…' : 'Find my bag'}</button></div>
    </form>
    <ErrorBox error={error} />{error && <Link className="button subtle" to="/products">Search the catalog instead</Link>}
    {busy && <SkeletonLoader grid />}
    {result && (result.products.length > 0 ? <section className="recommendations"><h2>{result.aiAssisted ? 'AI-Assisted picks' : 'Catalog matches'}</h2><div className="product-grid">
      {result.products.map((product) => <ProductCard product={product} key={product.id} />)}
    </div></section> : <Empty title="No available bags fit that request" icon="search"><Link className="button subtle" to="/products">Search the catalog</Link></Empty>)}
  </section>;
}
