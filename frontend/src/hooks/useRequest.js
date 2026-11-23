import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

export function useRequest(path, { token, enabled = true, reload = 0 } = {}) {
  const [state, setState] = useState({ path: null, token: null, reload, loading: true });
  useEffect(() => {
    if (!enabled || !path) return;
    const controller = new AbortController();
    api(path, { token, signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setState({ ...result, path, token, reload, loading: false });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setState({ error, path, token, reload, loading: false });
      });
    return () => controller.abort();
  }, [path, token, enabled, reload]);
  return state.path === path && state.token === token && state.reload === reload ? state : { loading: true };
}
