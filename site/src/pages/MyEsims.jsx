import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { sb } from '../lib/supabase.js';
import { useAuth } from '../lib/auth.jsx';
import { useCatalogue, flag } from '../hooks.js';

export default function MyEsims() {
  const { user, ready, openAuth } = useAuth();
  const { countries } = useCatalogue();
  const [list, setList] = useState(null);

  useEffect(() => {
    if (!user) { setList(null); return; }
    sb.from('esims')
      .select('iccid,matching_id,smdp_address,lpa_string,status,created_at,orders(country_name,package_label,price_inr)')
      .order('created_at', { ascending: false })
      .then(({ data }) => setList(data || []));
  }, [user]);

  if (ready && !user) return (
    <div className="container" style={{ padding: '70px 24px', textAlign: 'center', maxWidth: 520 }}>
      <div style={{ fontSize: 46 }}>🧳</div>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: '12px 0 8px' }}>Sign in to see your eSIMs</h1>
      <p style={{ color: 'var(--muted)', fontWeight: 500, marginBottom: 22 }}>
        Your purchases are saved to your account and available on any device.
      </p>
      <button className="pill pill-coral" onClick={() => openAuth('login')}>Log in / Sign up</button>
    </div>
  );

  return (
    <div className="container" style={{ padding: '30px 24px 80px', maxWidth: 760 }}>
      <h1 style={{ fontSize: 'clamp(28px,4vw,38px)', fontWeight: 800 }}>My eSIMs</h1>
      <p style={{ color: 'var(--muted)', fontWeight: 500, margin: '6px 0 26px' }}>View, install and manage the eSIMs you've purchased.</p>

      {list === null && <p style={{ fontWeight: 600, color: 'var(--muted)' }}>Loading…</p>}

      {list && list.length === 0 && (
        <div style={{ background: '#fff', borderRadius: 22, padding: '44px 24px', textAlign: 'center', boxShadow: '0 3px 14px rgba(22,24,42,.06)' }}>
          <div style={{ fontSize: 40 }}>✈️</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: '10px 0 6px' }}>No eSIMs yet</h2>
          <p style={{ color: 'var(--muted)', fontWeight: 500, marginBottom: 18 }}>Your next trip starts here.</p>
          <Link className="pill pill-coral" to="/app">Browse destinations</Link>
        </div>
      )}

      <div style={{ display: 'grid', gap: 16 }}>
        {(list || []).map((e, i) => {
          const o = e.orders || {};
          const c = countries.find(x => x.n === o.country_name);
          const parts = (o.package_label || '— · —').split(' · ');
          const lpa = e.lpa_string;
          const oneTap = lpa ? 'https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=' + encodeURIComponent(lpa) : null;
          return (
            <div key={e.iccid + i} style={{ background: '#fff', borderRadius: 20, padding: '20px 22px', boxShadow: '0 3px 14px rgba(22,24,42,.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                {c?.iso && <img src={flag(c.iso)} alt="" style={{ width: 40, height: 28, borderRadius: 5, objectFit: 'cover' }} />}
                <b style={{ fontSize: 17.5, flex: 1 }}>{o.country_name || 'eSIM'}</b>
                <span style={{
                  fontSize: 11.5, fontWeight: 800, borderRadius: 999, padding: '4px 12px',
                  background: e.status === 'active' ? '#DCEDDC' : '#FFE9C9',
                  color: e.status === 'active' ? '#1F5B33' : '#8A5A00', textTransform: 'uppercase'
                }}>{e.status || 'ready'}</span>
              </div>
              <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap', fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>
                <span>⇅ {parts[0] || '—'}</span>
                <span>📅 {parts[1] || '—'}</span>
                <span>₹{o.price_inr || '—'}</span>
                <span style={{ fontSize: 12.5 }}>ICCID {e.iccid}</span>
              </div>
              {lpa && (
                <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
                  {oneTap && <a className="pill pill-coral" style={{ padding: '11px 20px', fontSize: 14 }} href={oneTap}>📱 One-tap install (iPhone)</a>}
                  <button className="pill pill-white" style={{ padding: '11px 20px', fontSize: 14 }}
                    onClick={() => navigator.clipboard.writeText(lpa)}>Copy code (Android)</button>
                  <a className="pill pill-white" style={{ padding: '11px 20px', fontSize: 14 }} target="_blank" rel="noreferrer"
                    href={'https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=' + encodeURIComponent(lpa)}>Show QR</a>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
