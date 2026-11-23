export default function Icon({ name, size = 20, ...props }) {
  let paths = {
    bag: <><path d="M5 7h14l1 14H4L5 7Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
    arrow: <><path d="M4 12h16m-6-6 6 6-6 6" /></>,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    plus: <path d="M12 5v14M5 12h14" />,
    minus: <path d="M5 12h14" />,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" /></>,
    home: <><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9m-9 11v-6h4v6"/></>,
    person: <><circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></>,
    sparkle: <><path d="M12 2c0 6-3 9-9 9 6 0 9 3 9 9 0-6 3-9 9-9-6 0-9-3-9-9Z"/><path d="M20 16v6m-3-3h6"/></>,
    fit: <><rect x="4" y="5" width="16" height="11" rx="1" /><path d="M2 19h20m-12-1h4" /></>,
    filter: <><path d="M4 7h16M4 17h16"/><circle cx="8" cy="7" r="2" fill="var(--paper)"/><circle cx="16" cy="17" r="2" fill="var(--paper)"/></>,
    offline: <><path d="M4 9a13 13 0 0 1 16 0M7 13a8 8 0 0 1 10 0m-7 4a3 3 0 0 1 4 0M3 3l18 18"/></>,
    grid: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}
