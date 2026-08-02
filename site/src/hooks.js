import { useEffect, useState } from 'react';

let cache = null;
let inflight = null;

export function useCatalogue() {
  const [data, setData] = useState(cache || { countries: [], regions: [], global: [] });
  useEffect(() => {
    if (cache) return;
    inflight = inflight || fetch('/api/catalogue').then(r => r.json()).catch(() => null);
    inflight.then(d => {
      if (!d) return;
      cache = { countries: d.countries || [], regions: d.regions || [], global: d.global || [] };
      setData(cache);
    });
  }, []);
  return data;
}

export function useScrollY() {
  const [y, setY] = useState(0);
  useEffect(() => {
    const on = () => setY(window.scrollY);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return y;
}

export const flag = iso => `https://flagcdn.com/w80/${iso}.png`;
export const appLink = iso => iso ? `/app?country=${iso}` : '/app';
