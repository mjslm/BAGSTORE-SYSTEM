import { createContext, useContext } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';

const NetworkStatusContext = createContext(true);
export function NetworkStatusProvider({ children }) {
  const online = useOnlineStatus();
  return <NetworkStatusContext.Provider value={online}>{children}</NetworkStatusContext.Provider>;
}
export function useNetwork() {
  return useContext(NetworkStatusContext);
}
