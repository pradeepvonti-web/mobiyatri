import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authHeaders } from '../lib/supabase.js';
import { useAuth } from '../lib/auth.jsx';

const PAY = [
  { k: 'upi', label: 'UPI', sub: 'GPay · PhonePe · Paytm', icon: '📲' },
  { k: 'card', label: 'Card', sub: 'Credit · Debit · RuPay', icon: '💳' },
  { k: 'net', label: 'Netbanking', sub: 'All major banks', icon: '🏦' },
];

export default function Checkout() {
  const nav = useNavigate();
  const { user, openAuth } = useAuth();
  const [order] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('checkout')); } catch { return null; }
  });
  const [pay, setPay] = useState('upi');
  const [ins, setIns] = useState({ quote: null, on: false });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null); // {orderReference, esim, emailSent}
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!order) return;
    const days = parseInt((order.pkg.split('·')[1] || '7')) || 7;
    fetch('/api/insurance/quote', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination: order.country, iso: order.iso, days })
    }).then(r => r.json())
      .then(q => q && q.premiumINR && setIns({ quote: q, on: false }))
      .catch(() => {});
  }, [order]);

  if (!order) return (
    <div className="container" style={{ padding: 60, textAlign: 'center' }}>
      <p style={{ fontWeight: 600, color: 'var(--muted)' }}>Nothing in your basket yet.</p>
      <Link className="pill pill-coral" to="/app" style={{ marginTop: 18 }}>Browse destinations</Link>
    </div>
  );

  const total = order.price + (ins.on && ins.quote ? ins.quote.premiumINR : 0);

  const placeOrder = async () => {
    if (!user) { openAuth('login'); return; }
    setBusy(true); setErr('');
    try {
      const headers = await authHeaders();
      const o = await fetch('/api/orders', {
        method: 'POST', headers,
        body: JSON.stringify({ bundle: order.bundle, country: order.country, package: order.pkg, price: order.price })
      }).then(r => r.json());
      if (o.error) throw new Error(o.error);
      if (ins.on && ins.quote) {
        fetch('/api/insurance/policy', {
          method: 'POST', headers,
          body: JSON.stringify({ quoteId: ins.quote.quoteId, destination: order.country, premium: ins.quote.premiumINR, days: ins.quote.days })
        }).catch(() => {});
      }
      sessionStorage.removeItem('checkout');
      setDone(o);
    } catch (e) {
      setErr(e.message || 'Order failed — please try again.');
    } finally { setBusy(false); }
  };

  /* ---- order complete ---- */
  if (done) {
    const lpa = done.esim?.lpa || done.esim?.lpaString;
    const oneTap = lpa ? 'https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=' + encodeURIComponent(lpa) : null;
    return (
      <div className="container" style={{ padding: '50px 24px 90px', maxWidth: 560, textAlign: 'center' }}>
        <div style={{ fontSize: 54 }}>🎉</div>
        <h1 style={{ fontSize: 30, fontWeight: 800, margin: '10px 0 6px' }}>Shubh yatra!</h1>
        <p style={{ color: 'var(--muted)', fontWeight: 600 }}>
          Order {done.orderReference || 'confirmed'} · {order.country} · {order.pkg}
          {done.emailSent ? ' — QR emailed to you.' : ''}
        </p>
        {lpa && (
          <div style={{ background: '#fff', borderRadius: 22, padding: 26, margin: '26px 0', boxShadow: '0 6px 24px rgba(22,24,42,.08)' }}>
            <img alt="eSIM QR code"
              src={'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(lpa)}
              style={{ width: 190, height: 190 }} />
            <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--muted)', marginTop: 12 }}>
              Scan from another device, or use the buttons below on this phone.
            </p>
            <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
              {oneTap && <a className="pill pill-coral" href={oneTap}>📱 Install on iPhone (one tap)</a>}
              <button className="pill pill-white" onClick={() => navigator.clipboard.writeText(lpa)}>
                Copy activation code (Android)
              </button>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link className="pill pill-white" to="/my-esims">Go to My eSIMs</Link>
          <Link className="pill pill-outline" to="/app">Buy another</Link>
        </div>
      </div>
    );
  }

  /* ---- checkout form ---- */
  return (
    <div className="container" style={{ padding: '30px 24px 90px', maxWidth: 640 }}>
      <Link to={-1} style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--muted)' }}>← Back</Link>
      <h1 style={{ fontSize: 'clamp(26px,4vw,34px)', fontWeight: 800, margin: '14px 0 22px' }}>Checkout</h1>

      <div style={{ background: '#fff', borderRadius: 20, padding: '20px 22px', boxShadow: '0 3px 14px rgba(22,24,42,.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15.5 }}>
          <span>{order.country} · {order.pkg}</span><span>₹{order.price}</span>
        </div>
        {ins.quote && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, paddingTop: 16, borderTop: '1px solid #EFE9DC' }}>
            <span style={{ fontSize: 22 }}>🛡️</span>
            <span style={{ flex: 1 }}>
              <b style={{ fontSize: 14.5 }}>Add trip protection</b>{' '}
              <span style={{ fontSize: 11, fontWeight: 800, background: '#FFE9C9', color: '#8A5A00', borderRadius: 6, padding: '2px 7px' }}>DEMO</span>
              <br />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>
                ₹{ins.quote.premiumINR} · medical {ins.quote.coverage?.medical} + baggage + delays · {ins.quote.days} days
              </span>
            </span>
            <button onClick={() => setIns(s => ({ ...s, on: !s.on }))} aria-label="Toggle insurance" style={{
              width: 52, height: 30, borderRadius: 999, position: 'relative', transition: 'background .18s',
              background: ins.on ? 'var(--indigo)' : '#D8D2C4'
            }}>
              <span style={{
                position: 'absolute', top: 3, left: ins.on ? 25 : 3, width: 24, height: 24,
                borderRadius: '50%', background: '#fff', transition: 'left .18s', boxShadow: '0 1px 4px rgba(0,0,0,.25)'
              }} />
            </button>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTop: '1px solid #EFE9DC', fontFamily: 'var(--head)', fontWeight: 800, fontSize: 19 }}>
          <span>Total</span><span>₹{total}</span>
        </div>
      </div>

      <h2 style={{ fontSize: 17, fontWeight: 800, margin: '26px 0 12px' }}>Pay with</h2>
      <div style={{ display: 'grid', gap: 10 }}>
        {PAY.map(p => (
          <button key={p.k} onClick={() => setPay(p.k)} style={{
            display: 'flex', alignItems: 'center', gap: 14, background: '#fff', borderRadius: 16,
            padding: '15px 18px', textAlign: 'left',
            border: pay === p.k ? '2.5px solid var(--indigo)' : '2.5px solid transparent',
            boxShadow: '0 2px 10px rgba(22,24,42,.06)'
          }}>
            <span style={{ fontSize: 24 }}>{p.icon}</span>
            <span style={{ flex: 1 }}>
              <b style={{ fontSize: 15.5, color: 'var(--ink)' }}>{p.label}</b><br />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>{p.sub}</span>
            </span>
          </button>
        ))}
      </div>
      <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)', marginTop: 12 }}>
        Payments launch soon — this order is placed without charge while MobiYatri is in beta.
      </p>

      {err && <p style={{ color: 'var(--coral-deep)', fontWeight: 700, marginTop: 14 }}>{err}</p>}

      <button className="pill pill-coral" onClick={placeOrder} disabled={busy}
        style={{ width: '100%', marginTop: 22, fontSize: 17, padding: '17px 0', opacity: busy ? .6 : 1 }}>
        {busy ? 'Placing your order…' : `Pay ₹${total}`}
      </button>
    </div>
  );
}
