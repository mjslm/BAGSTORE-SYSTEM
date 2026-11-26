import { Link } from 'react-router-dom';
import { bagPhoto } from '../components/BagImage.jsx';
import Icon from '../components/Icon.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { ErrorBox, SkeletonLoader } from '../components/Feedback.jsx';
import { useRequest } from '../hooks/useRequest.js';

const featuredIds = ['everyday-tote', 'city-backpack', 'mini-crossbody', 'weekender'];
const shoppingTools = [
  { to: '/products?fit=open', icon: 'fit', label: 'Laptop fit', detail: 'Find a bag by screen size.' },
  { to: '/ai-assistant', icon: 'sparkle', label: 'Bag Finder', detail: 'Get picks for your budget and needs.' },
  { to: '/ai-assistant/chat', icon: 'chat', label: 'Shopping Assistant', detail: 'Ask about features and monograms.' },
  { to: '/ai-assistant/visual-search', icon: 'camera', label: 'Visual Bag Search', detail: 'Find similar styles from a photo.' },
];
const categories = [
  { id: 'totes', label: 'Totes', photo: 'studio-tote' },
  { id: 'backpacks', label: 'Backpacks', photo: 'campus-pack' },
  { id: 'crossbody', label: 'Crossbody', photo: 'phone-sling' },
  { id: 'shoulder-bags', label: 'Shoulder bags', photo: 'crescent' },
  { id: 'travel', label: 'Travel bags', photo: 'overnight-duffel' },
];

export default function Home() {
  const featured = useRequest('/products?limit=20');
  const available = featured.data || [];
  const selected = featuredIds.map((id) => available.find((bag) => bag.id === id)).filter(Boolean);
  const bags = [...selected, ...available.filter((bag) => !featuredIds.includes(bag.id))].slice(0, 4);

  return <>
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <h1 id="hero-title">Carry your day.<br /><em>Make it yours.</em></h1>
        <p className="hero-description">Find the bag that fits your work, your weekend, and everything in between.</p>
        <div className="hero-actions">
          <Link className="button hero-button" to="/products">Shop the collection <Icon name="arrow" /></Link>
          <Link className="hero-secondary" to="/ai-assistant"><Icon name="sparkle" size={18} /> Find my bag</Link>
        </div>
      </div>
      <div className="hero-visual">
        <picture>
          <source media="(max-width: 699px)" srcSet="/images/photos/collection-hero-mobile.webp" />
          <img src="/images/photos/collection-hero.webp" alt="Brown leather tote carried by a person wearing a cream jacket"
            width="1200" height="1030" fetchPriority="high" />
        </picture>
      </div>
    </section>

    <section className="content collection-section" aria-labelledby="collections-title">
      <div className="section-title storefront-heading"><h2 id="collections-title">Shop by category</h2></div>
      <div className="collection-grid">
        {categories.map((category) => <Link className="collection-tile" to={'/products?category=' + category.id} key={category.id}>
          <img src={bagPhoto(category.photo)} alt="" width="640" height="740" loading="lazy" />
          <span>{category.label}<Icon name="arrow" size={18} /></span>
        </Link>)}
      </div>
    </section>

    <section className="content featured" aria-labelledby="featured-title">
      <div className="section-title storefront-heading">
        <h2 id="featured-title">The everyday edit</h2>
        <Link to="/products" className="text-link">Shop all bags <Icon name="arrow" size={17} /></Link>
      </div>
      {featured.loading ? <SkeletonLoader grid /> : featured.error ? <ErrorBox error={featured.error} /> : <div className="product-grid">
        {bags.map((bag) => <ProductCard product={bag} key={bag.id} />)}
      </div>}
    </section>

    <section className="content shopping-tools-section" aria-labelledby="tools-title">
      <div className="shopping-tools-panel">
        <div className="section-title storefront-heading"><h2 id="tools-title">Find your perfect carry</h2></div>
        <nav className="shop-assistance" aria-label="Shopping tools">
          {shoppingTools.map((tool) => <Link to={tool.to} key={tool.to}>
            <span className="tool-icon"><Icon name={tool.icon} size={24} /></span>
            <span className="tool-copy"><strong>{tool.label}</strong><small>{tool.detail}</small></span>
            <Icon name="arrow" size={18} />
          </Link>)}
        </nav>
      </div>
    </section>
  </>;
}
