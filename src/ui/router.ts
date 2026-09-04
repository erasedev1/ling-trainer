import { useEffect, useState } from 'react';

/**
 * Hash routing — no dependency, works from a file:// build, and a drill URL
 * carries its own configuration so a coach can paste one into the club chat.
 */
export interface Route {
  path: string;
  params: URLSearchParams;
}

function parse(): Route {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [path, query = ''] = raw.split('?');
  return { path: path || '/', params: new URLSearchParams(query) };
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parse);
  useEffect(() => {
    const onChange = () => setRoute(parse());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export function navigate(path: string, params?: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== '') query.set(key, String(value));
  }
  const q = query.toString();
  window.location.hash = q ? `${path}?${q}` : path;
}
