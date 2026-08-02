import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { authHeaders } from '../lib/supabase.js';
import { useAuth } from '../lib/auth.jsx';
import { useCatalogue, flag } from '../hooks.js';
import { Badge, Toggle, Modal, Spinner, useToast, inputStyle } from '../components/ui.jsx';

const PAY = [
  { k: 'upi', label: 'UPI', sub: 'GPay · PhonePe · Paytm · BHIM', icon: '📲' },
  { k: 'card', label: 'Card', sub: 'Credit · Debit · RuPay', icon: '💳' },
  { k: 'net', label: 'Netbanking', sub: 'All major Indian banks', icon: '🏦' },
];

const STEPS = ['Confirming payment', 'Reserving your eSIM with the network', 'Generating your QR code'];

export default function Checkout() {
  const nav = useNavigate();
  const { user, openAuth } = useAuth();
  const { countries } = useCatalogue();
  const toast = useToast();
  const [order] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('checkout')); } catch { return null; }
  });
  const [pay, setPay] = useState('upi');
  const [ins, setIns] = useState({ quote: null, on: false });
  const [promo, setPromo] = useState('');
  const [promoMsg, setPromoMsg] = useState(null);
  const [step, setStep] = useState(-1);      // -1 idle, 0..2 progress
  const [done, setDone] = useState(null);
  const [installTab, setInstallTab] = useState('ios');

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
      <div style={{ fontSize: 44 }}>🛒</div>
      <p style={{ fontWeight: 600, color: 'var(--muted)', margin: '12px 0 18px' }}>Nothing in your basket yet.</p>
      <Link className="pill pill-coral" to="/app">Browse destinations</Link>
    </div>
  );

  const total = order.price + (ins.on && ins.quote ? ins.quote.premiumINR : 0);
  const cc = countries.find(x => x.iso === order.iso);

  const applyPromo = () => {
    const code = promo.trim();
    if (!code) return;
    setPromoMsg({ ok: true, text: `Code "${code}" saved — referral rewards are credited to both of you once payments launch.` });
  };

  const placeOrder = async () => {
    if (!user) { openAuth('login'); return; }
    setStep(0);
    const t1 = setTimeout(() => setStep(1), 900);
    try {
      const headers = await authHeaders();
      const o = await fetch('/api/orders', {
        method: 'POST', headers,
        body: JSON.stringify({ bundle: order.bundle, country: order.country, package: order.pkg, price: order.price })
      }).then(r => r.json());
      if (o.error) throw new Error(o.error);
      setStep(2);
      if (ins.on && ins.quote) {
        fetch('/api/insurance/policy', {
          method: 'POST', headers,
          body: JSON.stringify({ quoteId: ins.quote.quoteId, destination: order.country, premium: ins.quote.premiumINR, days: ins.quote.days })
        }).catch(() => {});
      }
      sessionStorage.removeItem('checkout');
      setTimeout(() => { setStep(-1); setDone(o); }, 700);
    } catch (e) {
      clearTimeout(t1);
      setStep(-1);
      toast(e.message || 'Order failed — please try again.', 'err');
    }
  };

  /* ---------- order complete ---------- */
  if (done) {
    const lpa = done.esim?.lpa || done.esim?.lpaString;
    const oneTap = lpa ? 'https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=' + encodeURIComponent(lpa) : null;
    return (
      <div className="container" style={{ padding: '46px 24px 90px', maxWidth: 580 }}>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }}
          style={{ width: 84, height: 84, borderRadius: '50%', background: '#DCEDDC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, margin: '0 auto' }}>
          ✅
        </motion.div>
        <h1 style={{ fontSize: 30, fontWeight: 800, margin: '16px 0 6px', textAlign: 'center' }}>Shubh yatra! 🎉</h1>
        <p style={{ color: 'var(--muted)', fontWeight: 600, textAlign: 'center' }}>
          Order {done.orderReference || 'confirmed'} · {order.country} · {order.pkg}
          {done.emailSent ? ' — QR also emailed to you.' : ''}
        </p>

        {lpa && (
          <div style={{ background: '#fff', borderRadius: 22, padding: 26, margin: '26px 0', boxShadow: '0 6px 24px rgba(22,24,42,.08)', textAlign: 'center' }}>
            <img alt="eSIM QR code"
              src={'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(lpa)}
              style={{ width: 190, height: 190 }} />
            {/* install tabs */}
            <div style={{ display: 'flex', background: 'var(--cream)', borderRadius: 999, padding: 4, margin: '18px auto 14px', maxWidth: 280 }}>
              {[['ios', ' iPhone'], ['android', '🤖 Android']].map(([k, label]) => (
                <button key={k} onClick={() => setInstallTab(k)} style={{
                  flex: 1, padding: '8px 0', borderRadius: 999, fontWeight: 700, fontSize: 13.5,
                  background: installTab === k ? 'var(--indigo)' : 'transparent', color: installTab === k ? '#fff' : 'var(--ink)'
                }}>{label}</button>
              ))}
            </div>
            {installTab === 'ios' ? (
              <div style={{ textAlign: 'left', fontSize: 14, fontWeight: 500, color: 'var(--muted)', lineHeight: 1.8 }}>
                <b style={{ color: 'var(--ink)' }}>iOS 17.4+ (easiest):</b> tap the button below on this iPhone.<br />
                <b style={{ color: 'var(--ink)' }}>Older iOS:</b> Settings → Mobile Data → Add eSIM → scan the QR above from another screen.
                <a className="pill pill-coral" href={oneTap} style={{ width: '100%', marginTop: 12 }}>📱 Install on this iPhone</a>
              </div>
            ) : (
              <div style={{ textAlign: 'left', fontSize: 14, fontWeight: 500, color: 'var(--muted)', lineHeight: 1.8 }}>
                Settings → Connections / Network → <b style={{ color: 'var(--ink)' }}>SIM manager → Add eSIM</b> → scan the QR,
                or choose "Enter activation code" and paste it:
                <button className="pill pill-white" style={{ width: '100%', marginTop: 12 }}
                  onClick={() => { navigator.clipboard.writeText(lpa); toast('Activation code copied'); }}>
                  Copy activation code
                </button>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link className="pill pill-white" to="/my-esims">Go to My eSIMs</Link>
          <Link className="pill pill-outline" to="/app">Buy another</Link>
        </div>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', textAlign: 'center', marginTop: 20 }}>
          ⏱️ Remember: validity starts when the eSIM first connects at your destination.
        </p>
      </div>
    );
  }

  /* ---------- checkout ---------- */
  return (
    <div className="container" style={{ padding: '30px 24px 90px', maxWidth: 640 }}>
      <button onClick={() => nav(-1)} style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--muted)' }}>← Back</button>
      <h1 style={{ fontSize: 'clamp(26px,4vw,34px)', fontWeight: 800, margin: '14px 0 22px' }}>Checkout</h1>

      {/* order review */}
      <div style={{ background: '#fff', borderRadius: 20, padding: '20px 22px', boxShadow: '0 3px 14px rgba(22,24,42,.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {cc?.iso && <img src={flag(cc.iso)} alt="" style={{ width: 46, height: 33, borderRadius: 6, objectFit: 'cover' }} />}
          <span style={{ flex: 1 }}>
            <b style={{ fontSize: 16 }}>{order.country}</b><br />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>{order.pkg} · instant delivery</span>
          </span>
          <span style={{ fontFamily: 'var(--head)', fontWeight: 800, fontSize: 18 }}>₹{order.price}</span>
        </div>
        <Link to={order.iso ? `/country/${order.iso}` : '/app'} style={{ fontSize: 13, fontWeight: 700, color: 'var(--coral-deep)', textDecoration: 'underline' }}>
          Change plan
        </Link>

        {ins.quote && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, paddingTop: 16, borderTop: '1px solid #EFE9DC' }}>
            <span style={{ fontSize: 22 }}>🛡️</span>
            <span style={{ flex: 1 }}>
              <b style={{ fontSize: 14.5 }}>Add trip protection</b> <Badge>Demo</Badge><br />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>
                ₹{ins.quote.premiumINR} · medical {ins.quote.coverage?.medical} + baggage + delays · {ins.quote.days} days ·
                IRDAI-licensed insurer
              </span>
            </span>
            <Toggle on={ins.on} onChange={v => setIns(s => ({ ...s, on: v }))} />
          </div>
        )}

        {/* promo */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid #EFE9DC' }}>
          <input style={{ ...inputStyle, flex: 1 }} placeholder="Referral / promo code"
            value={promo} onChange={e => { setPromo(e.target.value); setPromoMsg(null); }} />
          <button className="pill pill-white" style={{ padding: '11px 22px', fontSize: 14 }} onClick={applyPromo}>Apply</button>
        </div>
        {promoMsg && <p style={{ fontSize: 12.5, fontWeight: 600, color: promoMsg.ok ? '#1F5B33' : 'var(--coral-deep)', marginTop: 8 }}>{promoMsg.text}</p>}

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
            <span style={{
              width: 20, height: 20, borderRadius: '50%',
              border: pay === p.k ? '6.5px solid var(--indigo)' : '2px solid #C9C2B2', background: '#fff'
            }} />
          </button>
        ))}
      </div>
      <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)', marginTop: 12 }}>
        🔒 Payments launch soon with Razorpay — during beta your order is placed without charge.
      </p>

      <button className="pill pill-coral" onClick={placeOrder} disabled={step >= 0}
        style={{ width: '100%', marginTop: 22, fontSize: 17, padding: '17px 0', opacity: step >= 0 ? .6 : 1 }}>
        Pay ₹{total}
      </button>

      {/* provisioning progress */}
      <Modal open={step >= 0} maxWidth={400}>
        <div style={{ padding: '34px 30px' }}>
          <h2 style={{ fontFamily: 'var(--head)', fontWeight: 800, fontSize: 20, marginBottom: 22 }}>Setting up your eSIM…</h2>
          <div style={{ display: 'grid', gap: 16 }}>
            {STEPS.map((s, i) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: i <= step ? 1 : .4 }}>
                <span style={{ width: 26, height: 26, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {i < step ? <span style={{ color: '#1F5B33', fontSize: 18 }}>✓</span>
                    : i === step ? <Spinner size={18} color="var(--indigo)" />
                      : <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#C9C2B2' }} />}
                </span>
                <span style={{ fontWeight: 600, fontSize: 14.5 }}>{s}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)', marginTop: 22 }}>
            This usually takes a few seconds — please don't close the page.
          </p>
        </div>
      </Modal>
    </div>
  );
}
