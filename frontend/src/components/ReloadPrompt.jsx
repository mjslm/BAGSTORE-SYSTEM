import { useRegisterSW } from 'virtual:pwa-register/react';
import Icon from './Icon.jsx';

export default function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(url, registration) {
      if (registration && navigator.onLine) registration.update().catch(() => {});
    },
  });
  if (!offlineReady && !needRefresh) return null;
  return <aside className="pwa-toast" role="status">
    <div><strong>{needRefresh ? 'A fresh update is ready' : 'Ready for offline browsing'}</strong>
      <p>{needRefresh ? 'Reload to open the latest version.' : 'Product pages you open online are saved on this device.'}</p></div>
    {needRefresh && <button className="button" onClick={() => updateServiceWorker(true)}>Reload</button>}
    <button className="icon-button" aria-label="Close notification" onClick={() => { setOfflineReady(false); setNeedRefresh(false); }}><Icon name="close" size={18} /></button>
  </aside>;
}
