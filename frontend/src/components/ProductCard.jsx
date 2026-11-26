import { Link } from 'react-router-dom';
import { money } from '../utils/format.js';
import BagImage from './BagImage.jsx';

export default function ProductCard({ product }) {
  return <article className="product-card">
    <Link className="product-image" to={'/products/' + product.id} style={{ backgroundColor: product.background }} aria-label={product.name}>
      <BagImage bag={product} decorative />
      {product.stock === 0 && <span className="product-badge">Sold out</span>}
    </Link>
    <div className="product-card-copy">
      <div className="product-meta">{product.category} <span aria-hidden="true">·</span> {product.color}</div>
      <h3 className="product-title"><Link to={'/products/' + product.id}>{product.name}</Link></h3>
      <div className="product-price"><strong>{money(product.price_cents)}</strong></div>
      <div className="product-options">
        {product.laptop_inches && <small>Fits {product.laptop_inches}″</small>}
        {product.monogram_cents && <small>Monogram</small>}
      </div>
    </div>
  </article>;
}
