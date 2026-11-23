import { useNetwork } from '../context/NetworkStatusContext.jsx';
import Icon from './Icon.jsx';

export default function OfflineBanner() {
  const online = useNetwork();
  return online ? null : <div className="offline-banner" role="status"><Icon name="offline" size={17} />
    <span>Offline mode. Browse saved bags and view your saved cart. Reconnect for checkout and other online actions.</span>
  </div>;
}
