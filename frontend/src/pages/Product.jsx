import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useRequest } from '../hooks/useRequest.js';
import { useNetwork } from '../context/NetworkStatusContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { money } from '../utils/format.js';
import { ErrorBox, SkeletonLoader } from '../components/Feedback.jsx';
import Quantity from '../components/Quantity.jsx';
import BagImage from '../components/BagImage.jsx';

function ProductContent({ bag }) {
  const { verified } = useAuth();
  const { mutate, busy, error } = useCart();
  const online = useNetwork();
  const location = useLocation();
  const [quantity, setQuantity] = useState(1);
  const [personalize, setPersonalize] = useState(false);
  const [initials, setInitials] = useState('');
  const [message, setMessage] = useState('');
  const remaining = Math.min(quantity, Math.max(1, bag.stock));
  useEffect(() => { document.title = bag.name + ' | Carry & Co.'; }, [bag.name]);

  return <form className="product-detail" onSubmit={async (event) => {
    event.preventDefault();
    setMessage('');
    const success = await mutate(bag, remaining, { add: true, monogram: personalize ? initials : '' });
    if (success) setMessage('Added to your bag.');
  }}>
    <div className="detail-image" style={{ backgroundColor: bag.background }}><BagImage bag={bag} loading="eager" /></div>
    <div className="detail-copy">
      <p className="eyebrow">{bag.category}</p><h1>{bag.name}</h1>
      <p className="detail-price">{money(bag.price_cents)}</p><p>{bag.description}</p>
      <dl className="product-facts"><div><dt>Color</dt><dd>{bag.color}</dd></div><div><dt>Stock</dt><dd>{bag.stock ? bag.stock + ' available' : 'Sold out'}</dd></div>
        <div><dt>Laptop fit</dt><dd>{bag.laptop_inches ? 'Up to ' + bag.laptop_inches + ' inches' : 'No laptop compartment'}</dd></div></dl>
      {bag.monogram_cents && <div className="custom-option">
        <label className="check-field"><input type="checkbox" checked={personalize} onChange={(event) => setPersonalize(event.target.checked)} /> Add a monogram <span>+{money(bag.monogram_cents)}</span></label>
        {personalize && <label>Initials<input type="text" value={initials} onChange={(event) => setInitials(event.target.value.toUpperCase())} required
          pattern="[A-Z]{1,3}" maxLength={3} placeholder="ABC" autoCapitalize="characters" aria-describedby="monogram-help" />
          <small id="monogram-help">1 to 3 letters. The monogram appears on every bag in this line.</small></label>}
      </div>}
      <ErrorBox error={error} />
      {message && <p className="feedback success" role="status">{message} <Link className="text-link" to="/cart">View bag</Link></p>}
      <div className="sticky-actions">
        <Quantity value={remaining} max={Math.min(20, bag.stock)} onChange={setQuantity} label="quantity" disabled={!bag.stock || busy || !online} />
        {online && !verified && bag.stock > 0
          ? <Link className="button" to="/login" state={{ from: location.pathname }}>Sign in to add</Link>
          : <button className="button" disabled={!online || busy || bag.stock === 0}>{!online ? 'Offline' : bag.stock === 0 ? 'Sold out' : busy ? 'Adding…' : 'Add to bag'}</button>}
      </div>
    </div>
  </form>;
}

export default function Product() {
  const { id } = useParams();
  const [reload, setReload] = useState(0);
  const result = useRequest('/products/' + encodeURIComponent(id), { reload });
  return <section className="content product-page"><Link className="text-link back-link" to="/products">← All bags</Link>
    {result.loading ? <SkeletonLoader /> : result.error ? <ErrorBox error={result.error} onRetry={() => setReload((value) => value + 1)} /> : <ProductContent key={id} bag={result.data} />}
  </section>;
}
