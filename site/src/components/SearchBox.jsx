import React, { useState, useRef, useEffect } from 'react';
import { useCatalogue, flag, appLink } from '../hooks.js';

export default function SearchBox({ compact = false, placeholder = 'Where are you travelling to?' }) {
  const { countries } = useCatalogue();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    const close = e => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const hits = q.trim()
    ? countries.filter(c => c.n.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 7)
    : [];

  const go = () => {
    const hit = hits[0];
    if (hit) window.location.href = appLink(hit.iso);
    else window.location.href = appLink();
  };

  return (
    <div className="searchwrap" ref={box}>
      <div className="searchbar" style={compact ? { boxShadow: '0 3px 14px rgba(22,24,42,.09)', padding: '2px 2px 2px 18px' } : null}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16182A" strokeWidth="2.4" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          value={q}
          placeholder={placeholder}
          onChange={e => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => e.key === 'Enter' && go()}
          style={compact ? { padding: '10px 10px', fontSize: 15 } : null}
        />
        <button className="pill pill-coral" onClick={go}
          style={compact ? { padding: '10px 20px', fontSize: 14 } : null}>Search</button>
      </div>
      {open && hits.length > 0 && (
        <div className="sresults">
          {hits.map(c => (
            <a key={c.iso} href={appLink(c.iso)}>
              <img className="flag" src={flag(c.iso)} alt="" loading="lazy" />
              {c.n}
              <span className="pr">from ₹{c.from}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
