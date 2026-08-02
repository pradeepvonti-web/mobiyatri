import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCatalogue, flag } from '../hooks.js';
import { useAuth } from '../lib/auth.jsx';

export default function Country({ byRegion = false }) {
  const { iso, name } = useParams();
  const { countries, regions, global } = useCatalogue();
  const [seg, setSeg] = useState('std');
  const [sel, setSel] = useState(null); // {pkg, price, bundle}
  const nav = useNavigate();
  const { user, openAuth } = useAuth();

  const c = byRegion
    ? [...regions, ...global].find(r => r.n === decodeURIComponent(name || ''))
    : countries.find(x => x.iso === iso);

  if (!c) return (
    <div className="container" style={{ padding: 60, textAlign: 'center' }}>
      <p style={{ fontWeight: 600, color: 'var(--muted)' }}>
        {countries.length ? 'Destination not found.' : 'Loading live catalogue…'}
      </p>
      <Link className="pill pill-white" to="/app" style={{ marginTop: 18 }}>← Back to store</Link>
    </div>
  );

  const groups = (c.packages && c.packages[seg]) || [];
  const flat = groups.flatMap(g => g.list.map(p => ({ ...p, d: g.d })));
  const active = sel || (flat[0] && { pkg: `${flat[0].label} · ${flat[0].d}`, price: flat[0].price, bundle: flat[0].bundle });

  const buy = () => {
    if (!user) { openAuth('signup'); return; }
    sessionStorage.setItem('checkout', JSON.stringify({
      country: c.n, iso: c.iso || null, ...active
    }));
    nav('/checkout');
  };

  return (
    <div className="container" style={{ padding: '26px 24px 120px', maxWidth: 760 }}>
      <Link to="/app" style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--muted)' }}>← All destinations</Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '20px 0 6px' }}>
        {c.iso
          ? <img src={flag(c.iso)} alt="" style={{ width: 62, height: 44, borderRadius: 8, objectFit: 'cover', boxShadow: '0 2px 8px rgba(0,0,0,.2)' }} />
          : <span style={{ fontSize: 40 }}>🌐</span>}
        <div>
          <h1 style={{ fontSize: 'clamp(26px,4vw,36px)', fontWeight: 800 }}>{c.n}</h1>
          <p style={{ color: 'var(--muted)', fontWeight: 600, fontSize: 14 }}>{c.op || 'Local networks'} · instant QR delivery</p>
        </div>
      </div>

      {/* std / unlimited segments */}
      {(c.packages?.unl?.length > 0) && (
        <div style={{
          display: 'inline-flex', background: '#fff', borderRadius: 999, padding: 4,
          margin: '16px 0 4px', boxShadow: '0 2px 10px rgba(22,24,42,.07)'
        }}>
          {[['std', 'Standard'], ['unl', 'Unlimited']].map(([k, label]) => (
            <button key={k} onClick={() => { setSeg(k); setSel(null); }} style={{
              padding: '9px 22px', borderRadius: 999, fontWeight: 700, fontSize: 14.5,
              background: seg === k ? 'var(--indigo)' : 'transparent',
              color: seg === k ? '#fff' : 'var(--ink)', transition: 'background .15s'
            }}>{label}</button>
          ))}
        </div>
      )}

      {groups.map(g => (
        <div key={g.d}>
          <p style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--muted)', margin: '22px 0 10px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
            {g.d} validity
          </p>
          <div style={{ display: 'grid', gap: 10 }}>
            {g.list.map(p => {
              const key = `${p.label} · ${g.d}`;
              const isSel = active && active.pkg === key;
              return (
                <button key={key} onClick={() => setSel({ pkg: key, price: p.price, bundle: p.bundle })} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: '#fff', borderRadius: 16, padding: '17px 20px',
                  border: isSel ? '2.5px solid var(--indigo)' : '2.5px solid transparent',
                  boxShadow: '0 2px 10px rgba(22,24,42,.06)', fontSize: 16, fontWeight: 700, color: 'var(--ink)'
                }}>
                  <span>{p.label}</span>
                  <span style={{ fontFamily: 'var(--head)', fontWeight: 800 }}>₹{p.price}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* sticky buy bar */}
      {active && (
        <div style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 40,
          background: '#fff', boxShadow: '0 -8px 30px rgba(22,24,42,.12)', padding: '14px 20px'
        }}>
          <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, maxWidth: 760 }}>
            <div>
              <p style={{ fontWeight: 800, fontSize: 15.5 }}>{c.n} · {active.pkg}</p>
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
