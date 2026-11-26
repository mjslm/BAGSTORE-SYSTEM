import { NavLink } from 'react-router-dom';
import Icon from './Icon.jsx';

export default function AiNavigation() {
  return <nav className="ai-nav" aria-label="Shopping AI tools">
    <NavLink to="/ai-assistant" end><Icon name="sparkle" size={18} /> Bag Finder</NavLink>
    <NavLink to="/ai-assistant/chat"><Icon name="chat" size={18} /> Shopping Assistant</NavLink>
    <NavLink to="/ai-assistant/visual-search"><Icon name="camera" size={18} /> Visual Bag Search</NavLink>
  </nav>;
}
