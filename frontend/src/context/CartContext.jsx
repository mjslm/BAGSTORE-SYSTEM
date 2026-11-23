import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from './AuthContext.jsx';
import { useNetwork } from './NetworkStatusContext.jsx';

const CartContext = createContext(null);
const empty = { items: [], subtotal_cents: null };
const cacheKey = (id) => 'carry-cart-' + id;

function readCart(id) {
  if (!id) return empty;
  try {
    const cart = JSON.parse(localStorage.getItem(cacheKey(id)));
    return Array.isArray(cart?.items) && cart.items.every((item) => typeof item?.id === 'string' && Number.isInteger(item.quantity))
      ? cart : empty;
  } catch { return empty; }
}

export function CartProvider({ children }) {
  const { user, token, verified } = useAuth();
  const online = useNetwork();
  const id = user?.id;
  const [state, setState] = useState({ id: null, cart: empty });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const active = useRef(null);
  const load = useRef(null);
  const session = useRef(token);
  session.current = token;
  const cart = state.id === id ? state.cart : readCart(id);
  const save = (owner, result) => {
    setState({ id: owner, cart: result });
    try { localStorage.setItem(cacheKey(owner), JSON.stringify(result)); } catch { /* The cart remains available in this tab. */ }
  };
  useEffect(() => {
    if (!id || !verified || !online) return;
    const controller = new AbortController();
    load.current = controller;
    api('/cart', { token, signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) { save(id, data); setError(null); } })
      .catch((failure) => { if (!controller.signal.aborted) setError({ id, failure }); });
    return () => controller.abort();
  }, [id, token, verified, online]);

  async function mutate(product, quantity, { add = false, monogram = '' } = {}) {
    if (!verified || !online || active.current) return false;
    const controller = new AbortController();
    load.current?.abort();
    active.current = controller;
    setBusy(true);
    setError(null);
    const line = cart.items.find((item) => item.id === product.id && item.monogram === monogram);
    const next = (add ? line?.quantity || 0 : 0) + quantity;
    const remaining = cart.items.filter((item) => item !== line);
    const items = next > 0 ? [...remaining, { ...product, ...line, monogram, quantity: next }] : remaining;
    setState({ id, cart: { ...cart, items } });
    try {
      const { data } = await api('/cart', { token, method: 'PATCH', body: { productId: product.id, monogram, quantity, add } });
      if (session.current === token) save(id, data);
      return true;
    } catch (failure) {
      if (session.current === token) { setState({ id, cart }); setError({ id, failure }); }
      return false;
    } finally {
      active.current = null;
      setBusy(false);
    }
  }

  async function refresh() {
    if (!id || !verified || !online) return;
    try {
      const { data } = await api('/cart', { token });
      if (session.current === token) { save(id, data); setError(null); }
    } catch (failure) { if (session.current === token) setError({ id, failure }); }
  }
  let count = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  return <CartContext.Provider value={{ cart, count, busy, error: error?.id === id ? error?.failure : null, mutate, refresh }}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}
