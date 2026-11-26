import { NavLink } from 'react-router-dom';

export default function AiNavigation() {
  return <nav className="ai-nav" aria-label="Shopping AI tools">
    <NavLink to="/ai-assistant" end>Bag Finder</NavLink>
    <NavLink to="/ai-assistant/chat">Shopping Assistant</NavLink>
  </nav>;
}
