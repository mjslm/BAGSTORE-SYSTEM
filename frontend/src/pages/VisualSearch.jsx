import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useNetwork } from '../context/NetworkStatusContext.jsx';
import AiNavigation from '../components/AiNavigation.jsx';
import Icon from '../components/Icon.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { Empty, ErrorBox, SkeletonLoader } from '../components/Feedback.jsx';
import { prepareBagPhoto } from '../utils/prepareBagPhoto.js';

export default function VisualSearch() {
  const online = useNetwork();
  const input = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [preparing, setPreparing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const locked = busy || preparing;

  async function selectPhoto(event) {
    const file = event.target.files?.[0];
    if (!file || locked) return;
    setPreparing(true);
    setPhoto(null);
    setResult(null);
    setError(null);
    try { setPhoto(await prepareBagPhoto(file)); }
    catch (failure) { setError(failure); }
    finally {
      setPreparing(false);
      if (input.current) input.current.value = '';
    }
  }

  function removePhoto() {
    setPhoto(null);
    setResult(null);
    setError(null);
  }

  async function search(event) {
    event.preventDefault();
    if (!photo || locked || !online) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const { data } = await api('/ai/visual-search', { method: 'POST', body: { mimeType: photo.mimeType, data: photo.data } });
      setResult(data);
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  }

  return <section className="content visual-search-page">
    <div className="page-heading">
      <p className="eyebrow"><Icon name="sparkle" size={17} /> AI-Assisted</p>
      <h1>Visual Bag Search</h1>
      <p>Upload a photo of a bag you like to find similar styles in our collection.</p>
    </div>
    <AiNavigation />
    <form className="summary-card visual-search-form" onSubmit={search}>
      <input className="photo-input" type="file" accept="image/jpeg,image/png,image/webp"
        ref={input} onChange={selectPhoto} disabled={locked || !online} aria-label="Upload a bag photo" />
      <div className="photo-preview">
        {photo ? <img src={photo.preview} alt="Selected bag photo" />
          : <div className="photo-placeholder"><Icon name="camera" size={36} />
            <strong>{preparing ? 'Preparing your photo…' : 'Add a bag photo'}</strong>
            <small>JPG, PNG or WebP · Up to 10 MB</small>
          </div>}
      </div>
      {photo && <p className="photo-filename">{photo.name}</p>}
      <div className="actions">
        <button className="button subtle" type="button" onClick={() => input.current?.click()}
          disabled={locked || !online}>{photo ? 'Change photo' : 'Choose photo'}</button>
        {photo && <button className="text-link" type="button" disabled={locked} onClick={removePhoto}>Remove photo</button>}
      </div>
      <small>Your image is resized and sent to Gemini to identify visible bag features.</small>
      <button className="button visual-search-button" disabled={!photo || locked || !online}>
        {!online ? 'Visual search is offline' : busy ? 'Finding similar bags…' : 'Find similar bags'}
      </button>
    </form>
    <ErrorBox error={error} />
    {error && <Link className="text-link" to="/ai-assistant">Try Bag Finder</Link>}
    {busy && <SkeletonLoader grid />}
    {result && <section className="recommendations" aria-live="polite">
      {!result.isBag ? <Empty title="No bag recognized" icon="camera"><p>Try a clear photo with the bag in view.</p></Empty> : <>
        <div className="summary-card"><h2>Photo analysis</h2><p>{result.description}</p></div>
        {result.products.length ? <>
          <h2>Similar bags</h2>
          <p className="muted visual-match-note">AI-matched by style, color and catalog descriptions.</p>
          <div className="product-grid">{result.products.map((bag) => <ProductCard key={bag.id} product={bag} />)}</div>
        </> : <Empty title="No similar bags found" icon="search"><Link className="button subtle" to="/products">Browse the collection</Link></Empty>}
      </>}
    </section>}
  </section>;
}
