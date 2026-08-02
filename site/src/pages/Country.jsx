import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCatalogue, flag } from '../hooks.js';
import { useAuth } from '../lib/auth.jsx';
import { Badge, Disclosure, Skeleton } from '../components/ui.jsx';

const gbOf = label => {
  const m = /([\d.]+)\s*GB/i.exec(label);
  return m ? parseFloat(m[1]) : null;
};

export default function Country({ byRegion = false }) {
  const { iso, name } = useParams();
  const { countries, regions, global } = useCatalogue();
  const [seg, setSeg] = useState('std');
  const [sel, setSel] = useState(null);
  const nav = useNavigate();
  const { user, openAuth } = useAuth();

  const c = byRegion
    ? [...regions, ...global].find(r => r.n === decodeURIComponent(name || ''))
    : countries.find(x => x.iso === iso);

  const groups = (c?.packages && c.packages[seg]) || [];

  // best ₹/GB across this segment → "Best value" badge
  const bestKey = useMemo(() => {
    let best = null, bestRate = Infinity;
    for (const g of groups) for (const p of g.list) {
      const gb = gbOf(p.label);
      if (!gb) continue;
      const rate = p.price / gb;
      if (rate < bestRate) { bestRate = rate; best = `${p.label} · ${g.d}`; }
    }
    return best;
  }, [groups]);

  if (!c) return (
    <div className="container" style={{ padding: '40px 24px 80px', maxWidth: 760 }}>
      {countries.length === 0 ? (
        <>
          <Skeleton h={26} w={200} style={{ marginBottom: 22 }} />
          <div style={{ display: 'flex', gap: 16, marginBottom: 26 }}>
            <Skeleton h={44} w={62} r={8} /><Skeleton h={38} w={240} />
          </div>
          {[...Array(5)].map((_, i) => <Skeleton key={i} h={58} r={16} style={{ marginBottom: 10 }} />)}
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ fontWeight: 600, color: 'var(--muted)' }}>Destination not found.</p>
          <Link className="pill pill-white" to="/app" style={{ marginTop: 18 }}>← Back to store</Link>
        </div>
      )}
    </div>
  );

  const flat = groups.flatMap(g => g.list.map(p => ({ ...p, d: g.d })));
  const active = sel || (flat[0] && { pkg: `${flat[0].label} · ${flat[0].d}`, price: flat[0].price, bundle: flat[0].bundle });

  const buy = () => {
    if (!user) { openAuth('signup'); return; }
    sessionStorage.setItem('checkout', JSON.stringify({ country: c.n, iso: c.iso || null, ...active }));
    nav('/checkout');
  };

  return (
    <div className="container" style={{ padding: '26px 24px 130px', maxWidth: 780 }}>
      {/* breadcrumb */}
      <nav style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--muted)', display: 'flex', gap: 8 }}>
        <Link to="/app" style={{ textDecoration: 'underline' }}>eSIM store</Link>
        <span>›</span><span>{c.n}</span>
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '18px 0 4px', flexWrap: 'wrap' }}>
        {c.iso
          ? <img src={flag(c.iso)} alt="" style={{ width: 64, height: 46, borderRadius: 9, objectFit: 'cover', boxShadow: '0 2px 8px rgba(0,0,0,.2)' }} />
          : <span style={{ fontSize: 42 }}>🌐</span>}
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ fontSize: 'clamp(26px,4vw,38px)', fontWeight: 800 }}>{c.n} eSIM</h1>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
            <Badge tone="indigo">📡 {c.op || 'Local networks'}</Badge>
            <Badge tone="green">⚡ Instant QR delivery</Badge>
            <Badge tone="gold">🇮🇳 eKYC-free</Badge>
          </div>
        </div>
      </div>

      {(c.packages?.unl?.length > 0) && (
        <div style={{ display: 'inline-flex', background: '#fff', borderRadius: 999, padding: 4, margin: '18px 0 0', boxShadow: '0 2px 10px rgba(22,24,42,.07)' }}>
          {[['std', 'Standard data'], ['unl', 'Unlimited']].map(([k, label]) => (
            <button key={k} onClick={() => { setSeg(k); setSel(null); }} style={{
              padding: '9px 22px', borderRadius: 999, fontWeight: 700, fontSize: 14.5,
              background: seg === k ? 'var(--indigo)' : 'transparent', color: seg === k ? '#fff' : 'var(--ink)', transition: 'background .15s'
            }}>{label}</button>
          ))}
        </div>
      )}

      {groups.map(g => (
        <div key={g.d}>
          <p style={{ fontWeight: 800, fontSize: 13, color: 'var(--muted)', margin: '24px 0 10px', textTransform: 'uppercase', letterSpacing: '.05em' }}>
            📅 {g.d} validity
          </p>
          <div style={{ display: 'grid', gap: 10 }}>
            {g.list.map(p => {
              const key = `${p.label} · ${g.d}`;
              const isSel = active && active.pkg === key;
              const gb = gbOf(p.label);
              return (
                <motion.button key={key} whileTap={{ scale: .985 }}
                  onClick={() => setSel({ pkg: key, price: p.price, bundle: p.bundle })} style={{
                    display: 'flex', alignItems: 'center', gap: 14, background: '#fff', borderRadius: 16,
                    padding: '16px 18px', textAlign: 'left',
                    border: isSel ? '2.5px solid var(--indigo)' : '2.5px solid transparent',
                    boxShadow: isSel ? '0 6px 20px rgba(51,56,110,.16)' : '0 2px 10px rgba(22,24,42,.06)'
                  }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%', flex: 'none',
                    border: isSel ? '7px solid var(--indigo)' : '2px solid #C9C2B2', background: '#fff', transition: 'border .12s'
                  }} />
                  <span style={{ flex: 1 }}>
                    <b style={{ fontSize: 16.5, color: 'var(--ink)' }}>{p.label}</b>
                    {bestKey === key && <span style={{ marginLeft: 8 }}><Badge tone="coral">Best value</Badge></span>}
                    <br />
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>
                      {g.d}{gb ? ` · ₹${Math.round(p.price / gb)}/GB` : ''}
                    </span>
                  </span>
                  <span style={{ fontFamily: 'var(--head)', fontWeight: 800, fontSize: 19, color: 'var(--ink)' }}>₹{p.price}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      ))}

      {/* plan details */}
      <h2 style={{ fontSize: 19, fontWeight: 800, margin: '34px 0 12px' }}>About this eSIM</h2>
      <div style={{ display: 'grid', gap: 10 }}>
        <Disclosure icon="📦" title="What's included">
          <ul style={{ paddingLeft: 20, display: 'grid', gap: 6 }}>
            <li>High-speed data on {c.op || 'local networks'} — hotspot / tethering allowed.</li>
            <li>Data-only plan: no phone number. Keep your Indian SIM in for WhatsApp and OTP SMS.</li>
            <li>Instant delivery: QR code on screen and by email the moment you pay.</li>
            <li>No eKYC, no paperwork — buy in minutes, even from the departure gate.</li>
          </ul>
        </Disclosure>
        <Disclosure icon="⏱️" title="When does validity start?">
          Validity begins only when the eSIM first connects to a network at your destination — not at
          purchase or install. Install at home in India; it activates when you land and switch on data roaming.
        </Disclosure>
        <Disclosure icon="📱" title="Will it work on my phone?">
          Most phones from 2019 onwards support eSIM (iPhone XS and newer, most Samsung / Pixel flagships).
          Dial <b>*#06#</b> — if an EID number appears and your phone is network-unlocked, you're set.
          Still unsure? Ask Yatri Sahayak in the chat bubble.
        </Disclosure>
        <Disclosure icon="🛠️" title="How do I install it?">
          <b>iPhone (iOS 17.4+):</b> tap the install link in your email — one tap, done.<br />
          <b>iPhone (older):</b> Settings → Mobile Data → Add eSIM → scan the QR.<br />
          <b>Android:</b> Settings → Connections / Network → SIM manager → Add eSIM → scan the QR,
          or paste the copied activation code.
        </Disclosure>
      </div>

      {/* sticky buy bar */}
      {active && (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 40, background: '#fff', boxShadow: '0 -8px 30px rgba(22,24,42,.12)', padding: '13px 20px' }}>
          <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, maxWidth: 780 }}>
            <div>
              <p style={{ fontWeight: 800, fontSize: 15 }}>{c.n} · {active.pkg}</p>
              <p style={{ fontFamily: 'var(--head)', fontWeight: 800, fontSize: 20, color: 'var(--coral-deep)' }}>₹{active.price}</p>
            </div>
            <button className="pill pill-coral" onClick={buy} style={{ fontSize: 16, padding: '15px 36px' }}>
              {user ? 'Buy now' : 'Sign in to buy'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
