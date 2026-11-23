import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';

export default function InstallButton() {
  const [prompt, setPrompt] = useState(null);
  useEffect(() => {
    const onPrompt = (event) => {
      event.preventDefault();
      setPrompt(event);
    };
    const onInstalled = () => setPrompt(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);
  return prompt && <button className="button subtle install-button" type="button" aria-label="Install app" onClick={async () => {
    try { await prompt.prompt(); } finally { setPrompt(null); }
  }}><Icon name="download" size={18} /><span>Install app</span></button>;
}
