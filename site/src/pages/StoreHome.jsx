import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import SearchBox from '../components/SearchBox.jsx';
import { useCatalogue, flag } from '../hooks.js';

const TABS = [
  { key: 'popular', label: 'Popular', icon: '🚀' },
  { key: 'local', label: 'Local', icon: '📍' },
  { key: 'regional', label: 'Regional', icon: '🗺️' },
  { key: 'global', label: 'Global', icon: '🌏' },
];

const REGION_EMOJI = { asia: '🌏', gulf: '🕌', europe: '🏰', africa: '🦁', na: '🗽', global: '🌐' };

export default function StoreHome() {
  const { countries, regions, global } = useCatalogue();
  const [tab, setTab] = useState('popular');
  const [q, setQ] = useState('');
  const nav = useNavigate();
  const [params] = useSearchParams();

  // deep link /app?country=iso (also the OAuth landing) → straight to the country page
  useEffect(() => {
    const iso = params.get('country');
    if (iso) nav('/country/' + iso, { replace: true });
  }, [params, nav]);

  let list;
  if (q.trim()) list = countries.filter(c => c.n.toLowerCase().includes(q.trim().toLowerCase()));
  else if (tab === 'popular') list = countries.filter(c => c.pop);
  else if (tab === 'local') list = countries;
  else if (tab === 'regional') list = regions;
  else list = global;

  const dest = c => c.iso ? '/country/' + c.iso : '/region/' + encodeURIComponent(c.n);

  return (
    <div className="container" style={{ padding: '30px 24px 70px' }}>
      <h1 style={{ fontSize: 'clamp(28px,4vw,40px)', fontWeight: 800 }}>eSIM store</h1>
      <p style={{ color: 'var(--muted)', fontWeight: 500, margin: '6px 0 22px' }}>
        Live prices in ₹ — packages start from the shown price. Where are you flying?
      </p>

      <div style={{ maxWidth: 640 }}>
        <div className="searchbar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16182A" strokeWidth="2.4" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
          </svg>
          <input placeholder="Search 190+ destinations" value={q} onChange={e => setQ(e.target.value)} />
        </div>
      </div>

      {!q.trim() && (
        <div style={{ display: 'flex', gap: 8, margin: '26px 0 4px', borderBottom: '1.5px solid rgba(22,24,42,.15)', maxWidth: 640 }}>
          {TABS.map(x => (
            <button key={x.key} onClick={() => setTab(x.key)} style={{
              flex: 1, padding: '11px 4px 13px', fontWeight: 700, fontSize: 'clamp(13px,1.7vw,16px)',
              opacity: tab === x.key ? 1 : .55, position: 'relative', color: 'var(--ink)'
            }}>
              <span style={{ marginRight: 6 }}>{x.icon}</span>{x.label}
              {tab === x.key && <motion.span layoutId="storetab" style={{
                position: 'absolute', left: 0, right: 0, bottom: -1.5, height: 3,
                background: 'var(--ink)', borderRadius: 2
              }} />}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={tab + q}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          transition={{ duration: .22 }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 13, marginTop: 22 }}>
          {(list || []).map((c, i) => (
            <Link key={(c.iso || c.n) + i} className="rowcard" to={dest(c)}>
              {c.iso
                ? <img className="flag" src={flag(c.iso)} alt="" loading="lazy" />
                : <span style={{
                    width: 44, height: 32, borderRadius: 6, background: 'var(--indigo)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 17
                  }}>{REGION_EMOJI[c.icon] || '🌐'}</span>}
              <span className="nm">{c.n}</span>
              <span className="pr">₹{c.from}<small>per pack</small></span>
            </Link>
          ))}
          {(!list || !list.length) && (
            <p style={{ color: 'var(--muted)', fontWeight: 600, padding: 20 }}>
              {countries.length ? 'No matches — try another spelling.' : 'Loading live catalogue…'}
            </p>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
