import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sb } from '../lib/supabase.js';
import { useAuth, displayName } from '../lib/auth.jsx';

const SECTIONS = [
  ['account', 'Account information'],
  ['orders', 'Orders'],
  ['refer', 'Refer and earn'],
];

export default function Profile() {
  const { user, ready, openAuth, logout } = useAuth();
  const [sec, setSec] = useState('account');
  const [orders, setOrders] = useState(null);
  const [refCode, setRefCode] = useState(null);
  const nav = useNavigate();

  useEffect(() => {
    if (!user) return;
    sb.from('orders')
      .select('order_reference,country_name,package_label,price_inr,created_at')
      .order('created_at', { ascending: false })
      .then(({ data }) => setOrders(data || []));
    sb.from('profiles').select('referral_code').eq('id', user.id).single()
      .then(({ data }) => setRefCode(data?.referral_code || null));
  }, [user]);

  if (ready && !user) {
    return (
      <div className="container" style={{ padding: '70px 24px', textAlign: 'center', maxWidth: 520 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 10 }}>Profile</h1>
        <p style={{ color: 'var(--muted)', fontWeight: 500, marginBottom: 22 }}>Log in to manage your account.</p>
        <button className="pill pill-coral" onClick={() => openAuth('login')}>Log in / Sign up</button>
      </div>
    );
  }
  if (!user) return null;

  const field = (label, value, locked = true) => (
    <div style={{ background: '#fff', borderRadius: 14, padding: '13px 18px', border: '1.5px solid #E8E1D2', display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ flex: 1 }}>
        <span style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--muted)' }}>{label}</span>
        <span style={{ fontWeight: 600, fontSize: 15.5 }}>{value || '—'}</span>
      </span>
      {locked && <span style={{ opacity: .45 }}>🔒</span>}
    </div>
  );

  return (
    <div className="container" style={{ padding: '30px 24px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 30 }}>
        <span style={{
          width: 58, height: 58, borderRadius: '50%', background: 'linear-gradient(135deg,var(--coral),var(--coral-deep))',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontFamily: 'var(--head)', fontWeight: 800, fontSize: 24
        }}>{(displayName(user)[0] || 'Y').toUpperCase()}</span>
        <div>
          <h1 style={{ fontSize: 'clamp(24px,3.5vw,32px)', fontWeight: 800 }}>{displayName(user)}</h1>
          <p style={{ color: 'var(--muted)', fontWeight: 600, fontSize: 14 }}>Yatri · member since {new Date(user.created_at).getFullYear()}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(190px,240px) 1fr', gap: 34 }} className="profilegrid">
        {/* sidebar */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {SECTIONS.map(([k, label]) => (
            <button key={k} onClick={() => setSec(k)} style={{
              textAlign: 'left', padding: '12px 14px', fontWeight: 700, fontSize: 15, color: 'var(--ink)',
              borderLeft: sec === k ? '3.5px solid var(--coral)' : '3.5px solid transparent',
              background: sec === k ? '#fff' : 'transparent', borderRadius: '0 12px 12px 0',
              opacity: sec === k ? 1 : .7
            }}>{label}</button>
          ))}
          <button onClick={() => { logout(); nav('/'); }} style={{
            textAlign: 'left', padding: '12px 14px', fontWeight: 700, fontSize: 15,
            color: 'var(--coral-deep)', borderLeft: '3.5px solid transparent'
          }}>Log out</button>
        </nav>

        {/* content */}
        <div>
          {sec === 'account' && (
            <div style={{ background: 'var(--cream-deep)', borderRadius: 22, padding: '26px 26px 30px' }}>
              <h2 style={{ fontSize: 21, fontWeight: 800, marginBottom: 18 }}>Account information</h2>
              <div style={{ display: 'grid', gap: 12, maxWidth: 520 }}>
                {field('Name', displayName(user))}
                {field('Email', user.email)}
                {field('Password', '••••••••')}
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginTop: 16 }}>
                Need to change something? Email <a href="mailto:hello@mobiyatri.in" style={{ textDecoration: 'underline' }}>hello@mobiyatri.in</a> — self-serve editing is coming soon.
              </p>
            </div>
          )}

          {sec === 'orders' && (
            <div style={{ background: 'var(--cream-deep)', borderRadius: 22, padding: '26px 26px 30px' }}>
              <h2 style={{ fontSize: 21, fontWeight: 800, marginBottom: 18 }}>Orders</h2>
              {orders === null && <p style={{ fontWeight: 600, color: 'var(--muted)' }}>Loading…</p>}
              {orders && orders.length === 0 && <p style={{ fontWeight: 600, color: 'var(--muted)' }}>No orders yet.</p>}
              <div style={{ display: 'grid', gap: 10 }}>
                {(orders || []).map((o, i) => (
                  <div key={i} style={{ background: '#fff', borderRadius: 14, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <span>
                      <b style={{ fontSize: 15 }}>{o.country_name}</b>
                      <span style={{ fontWeight: 600, color: 'var(--muted)', fontSize: 13.5 }}> · {o.package_label}</span><br />
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>
                        {o.order_reference || ''} · {new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </span>
                    <b style={{ fontFamily: 'var(--head)', fontSize: 16 }}>₹{o.price_inr}</b>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sec === 'refer' && (
            <div style={{ background: 'var(--cream-deep)', borderRadius: 22, padding: '26px 26px 30px' }}>
              <h2 style={{ fontSize: 21, fontWeight: 800, marginBottom: 8 }}>Refer and earn</h2>
              <p style={{ fontWeight: 500, color: 'var(--muted)', maxWidth: 480 }}>
                Get ₹150 YatriCash for every friend who takes their first trip with MobiYatri — they get a discount on their first eSIM too.
              </p>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 18, flexWrap: 'wrap' }}>
                <code style={{
                  background: '#fff', borderRadius: 12, padding: '13px 22px', fontWeight: 800,
                  fontSize: 17, letterSpacing: '.08em', border: '1.5px dashed var(--indigo)'
                }}>{refCode || '· · · · · ·'}</code>
                <button className="pill pill-coral" style={{ padding: '12px 24px', fontSize: 14.5 }}
                  onClick={() => refCode && navigator.clipboard.writeText(
                    `Use my code ${refCode} for a discount on your first MobiYatri travel eSIM — mobiyatri.in`)}>
                  Copy invite
                </button>
              </div>
              <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)', marginTop: 14 }}>
                Rewards are credited as YatriCash after your friend's first completed order.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
