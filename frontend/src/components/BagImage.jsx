const originalArt = {
  'everyday-tote': 'tote',
  'studio-tote': 'tote',
  'desk-tote': 'tote',
  'canvas-tote': 'canvas',
  'market-tote': 'canvas',
  'city-backpack': 'backpack',
  'campus-pack': 'backpack',
  'commuter-pack': 'backpack',
  'trail-pack': 'backpack',
  'mini-crossbody': 'crossbody',
  'phone-sling': 'crossbody',
  'camera-sling': 'crossbody',
  'zip-crossbody': 'crossbody',
  crescent: 'crescent',
  'soft-shoulder': 'crescent',
  'gallery-shoulder': 'crescent',
  'city-shoulder': 'crescent',
  weekender: 'weekender',
  'overnight-duffel': 'weekender',
  'light-duffel': 'weekender',
};

export function bagPhoto(id) {
  return '/images/photos/' + id + '.webp';
}

export default function BagImage({ bag, loading = 'lazy', decorative = false }) {
  const bundled = originalArt[bag.id] && bag.image === '/images/' + originalArt[bag.id] + '.svg';
  return <img className={bundled ? 'bag-photo' : undefined}
    src={bundled ? bagPhoto(bag.id) : bag.image} alt={decorative ? '' : bag.name}
    loading={loading} width="640" height="740" />;
}
