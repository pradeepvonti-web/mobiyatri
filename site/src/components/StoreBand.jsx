import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCatalogue, flag, appLink } from '../hooks.js';
import Reveal from './Reveal.jsx';

const TABS = [
  { key: 'popular', label: 'Popular', icon: '🚀', title: 'eSIMs for popular trips', sub: 'Our most-bought destinations — packages start from the shown price.' },
  { key: 'local', label: 'Local', icon: '📍', title: 'eSIMs by country', sub: 'One country, best price. Search all 190+ destinations in the app.' },
  { key: 'regional', label: 'Regional', icon: '🗺️', title: 'One eSIM, whole region', sub: 'Hopping borders? Cover Asia, Europe, the Gulf and more with a single eSIM.' },
  { key: 'global', label: 'Global', icon: '🌏', title: 'Around-the-world eSIMs', sub: 'For the big trips — one eSIM that works across continents.' },
];

const REGION_EMOJI = { asia: '🌏', gulf: '🕌', europe: '🏰', africa: '🦁', na: '🗽', americas: '🗽', global: '🌐' };

function RegionIcon({ name }) {
  const key = String(name || '').toLowerCase();
  const emoji = REGION_EMOJI[key] || Object.entries(REGION_EMOJI).find(([k]) => key.includes(k))?.[1] || '🌐';
  return (
    <span style={{
      width: 44, height: 32, borderRadius: 6, background: 'var(--indigo)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 17
    }}>{emoji}</span>
  );
}

export default function StoreBand() {
  const { countries, regions, global } = useCatalogue();
  const [tab, setTab] = useState('popular');
  const t = TABS.find(x => x.key === tab);

  let list;
  if (tab === 'popular') list = countries.filter(c => c.pop).slice(0, 12);
  else if (tab === 'local') list = countries.slice(0, 12);
  else if (tab === 'regional') list = regions;
  else list = global;
  if (!list || !list.length) list = countries.slice(0, 12);

  return (
    <section id="destinations" className="band" style={{ background: 'var(--sage)' }}>
      <div className="container">
        {/* tabs */}
        <div style={{
          display: 'flex', gap: 8, justifyContent: 'space-between', maxWidth: 760, margin: '0 auto 8px',
          borderBottom: '1.5px solid rgba(22,24,42,.25)'
        }}>
          {TABS.map(x => (
            <button key={x.key} onClick={() => setTab(x.key)} style={{
              flex: 1, padding: '12px 6px 14px', fontWeight: 700, fontSize: 'clamp(13px,1.8vw,17px)',
              color: 'var(--ink)', opacity: tab === x.key ? 1 : .62, position: 'relative'
            }}>
              <span style={{ marginRight: 7 }}>{x.icon}</span>{x.label}
              {tab === x.key && (
                <motion.span layoutId="tabline" style={{
                  position: 'absolute', left: 0, right: 0, bottom: -1.5, height: 3.5,
                  background: 'var(--ink)', borderRadius: 2
                }} />
              )}
            </button>
          ))}
        </div>

        <div style={{
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          gap: 18, margin: '34px 0 26px', flexWrap: 'wrap'
        }}>
          <div>
            <h2 style={{ fontSize: 'clamp(26px,3.6vw,40px)', fontWeight: 800 }}>{t.title}</h2>
            <p style={{ fontWeight: 500, opacity: .8, maxWidth: 520 }}>{t.sub}</p>
          </div>
          <a className="pill pill-white" href="/app">View all destinations</a>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={tab}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            transition={{ duration: .3 }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
            {list.map((c, i) => (
              <a key={(c.iso || c.n) + i} className="rowcard" href={appLink(c.iso)}>
                {c.iso
                  ? <img className="flag" src={flag(c.iso)} alt="" loading="lazy" />
                  : <RegionIcon name={c.icon || '🌐'} />}
                <span className="nm">{c.n}</span>
                <span className="pr">₹{c.from}<small>per pack</small></span>
              </a>
            ))}
          </motion.div>
        </AnimatePresence>

        <Reveal style={{ textAlign: 'center', marginTop: 30 }}>
          <a className="pill pill-outline" href="/app" style={{ background: 'rgba(255,255,255,.6)' }}>
            See all 190+ destinations →
          </a>
        </Reveal>
      </div>
    </section>
  );
}
