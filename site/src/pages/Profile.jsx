import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sb } from '../lib/supabase.js';
import { useAuth, displayName } from '../lib/auth.jsx';
import { Badge, Field, Toggle, inputStyle, useToast } from '../components/ui.jsx';

const SECTIONS = [
  ['account', '👤 Account information'],
  ['loyalty', '🏆 Loyalty & YatriCash'],
  ['notify', '🔔 Notification preferences'],
  ['cards', '💳 Saved cards'],
  ['orders', '🧾 Orders'],
  ['refer', '🎁 Refer and earn'],
];

const card = { background: 'var(--cream-deep)', borderRadius: 22, padding: '26px 26px 30px' };
const h2s = { fontSize: 21, fontWeight: 800, marginBottom: 18 };

export default function Profile() {
  const { user, ready, openAuth, logout } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [sec, setSec] = useState('account');
  const [orders, setOrders] = useState(null);
  const [refCode, setRefCode] = useState(null);
  const [name, setName] = useState('');
  const [pw, setPw] = useState({ a: '', b: '' });
  const [busy, setBusy] = useState(false);
  const [prefs, setPrefs] = useState({ trips: true, offers: true });

  useEffect(() => {
    if (!user) return;
    setName(displayName(user));
    setPrefs(p => ({ ...p, ...(user.user_metadata?.notify_prefs || {}) }));
    sb.from('orders')
      .select('order_reference,country_name,package_label,price_inr,created_at')
      .order('created_at', { ascending: false })
      .then(({ data }) => setOrders(data || []));
    sb.from('profiles').select('referral_code').eq('id', user.id).single()
      .then(({ data }) => setRefCode(data?.referral_code || null));
  }, [user]);

  if (ready && !user) return (
    <div className="container" style={{ padding: '70px 24px', textAlign: 'center', maxWidth: 520 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 10 }}>Profile</h1>
      <p style={{ color: 'var(--muted)', fontWeight: 500, marginBottom: 22 }}>Log in to manage your account.</p>
      <button className="pill pill-coral" onClick={() => openAuth('login')}>Log in / Sign up</button>
    </div>
  );
  if (!user) return null;

  const saveName = async () => {
    setBusy(true);
    const { error } = await sb.auth.updateUser({ data: { full_name: name.trim() } });
    setBusy(false);
    toast(error ? 'Could not save name — try again' : 'Name updated', error ? 'err' : 'ok');
  };

  const savePw = async () => {
    if (pw.a.length < 8) return toast('Password must be at least 8 characters', 'err');
    if (pw.a !== pw.b) return toast('Passwords do not match', 'err');
    setBusy(true);
    const { error } = await sb.auth.updateUser({ password: pw.a });
    setBusy(false);
    if (error) toast(error.message, 'err');
    else { setPw({ a: '', b: '' }); toast('Password changed'); }
  };

  const savePrefs = async next => {
    setPrefs(next);
    await sb.auth.updateUser({ data: { notify_prefs: next } });
    toast('Preferences saved');
  };

  const trips = orders?.length || 0;
  const tierGoal = 3;

  return (
    <div className="container" style={{ padding: '30px 24px 80px' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 30, flexWrap: 'wrap' }}>
        <span style={{
          width: 62, height: 62, borderRadius: '50%', background: 'linear-gradient(135deg,var(--coral),var(--coral-deep))',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontFamily: 'var(--head)', fontWeight: 800, fontSize: 25
        }}>{(displayName(user)[0] || 'Y').toUpperCase()}</span>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 'clamp(24px,3.5vw,32px)', fontWeight: 800 }}>{displayName(user)}</h1>
          <p style={{ color: 'var(--muted)', fontWeight: 600, fontSize: 14 }}>
            <Badge tone="indigo">Yatri</Badge>&nbsp; member since {new Date(user.created_at).getFullYear()} · {trips} order{trips === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px,250px) 1fr', gap: 34 }} className="profilegrid">
        {/* sidebar */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {SECTIONS.map(([k, label]) => (
            <button key={k} onClick={() => setSec(k)} style={{
              textAlign: 'left', padding: '12px 14px', fontWeight: 700, fontSize: 15, color: 'var(--ink)',
              borderLeft: sec === k ? '3.5px solid var(--coral)' : '3.5px solid transparent',
              background: sec === k ? '#fff' : 'transparent', borderRadius: '0 12px 12px 0', opacity: sec === k ? 1 : .72
            }}>{label}</button>
          ))}
          <button onClick={() => { logout(); nav('/'); }} style={{
            textAlign: 'left', padding: '12px 14px', fontWeight: 700, fontSize: 15, color: 'var(--coral-deep)', borderLeft: '3.5px solid transparent'
          }}>↪ Log out</button>
        </nav>

        <div>
          {sec === 'account' && (
            <div style={card}>
              <h2 style={h2s}>Account information</h2>
              <div style={{ display: 'grid', gap: 18, maxWidth: 520 }}>
                <Field label="Full name">
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input style={{ ...inputStyle, flex: 1 }} value={name} onChange={e => setName(e.target.value)} />
                    <button className="pill pill-coral" disabled={busy} onClick={saveName} style={{ padding: '11px 22px', fontSize: 14 }}>Save</button>
                  </div>
                </Field>
                <Field label="Email" hint="Email changes need re-verification — contact hello@mobiyatri.in.">
                  <input style={{ ...inputStyle, opacity: .65 }} value={user.email} readOnly />
                </Field>
                <div>
                  <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>Change password</p>
                  <div style={{ display: 'grid', gap: 10 }}>
                    <input style={inputStyle} type="password" placeholder="New password (8+ characters)" value={pw.a} onChange={e => setPw(s => ({ ...s, a: e.target.value }))} />
                    <input style={inputStyle} type="password" placeholder="Repeat new password" value={pw.b} onChange={e => setPw(s => ({ ...s, b: e.target.value }))} />
                    <button className="pill pill-white" disabled={busy} onClick={savePw} style={{ justifySelf: 'start', padding: '11px 24px', fontSize: 14 }}>
                      Update password
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {sec === 'loyalty' && (
            <div style={card}>
              <h2 style={h2s}>Loyalty & YatriCash</h2>
              <div style={{ background: 'linear-gradient(120deg,var(--indigo),#23264D)', color: '#fff', borderRadius: 20, padding: '24px 26px', maxWidth: 460 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <b style={{ fontFamily: 'var(--head)', fontSize: 19 }}>YatriCash balance</b>
                  <Badge tone="gold">Preview</Badge>
                </div>
                <p style={{ fontFamily: 'var(--head)', fontWeight: 800, fontSize: 38, margin: '8px 0 2px' }}>₹0</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#C9CDE8' }}>
                  Earn ₹150 per referral and cashback on trips — redeemable when payments launch.
                </p>
              </div>
              <div style={{ maxWidth: 460, marginTop: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14 }}>
                  <span>Yatri tier</span><span>{trips}/{tierGoal} trips to Musafir</span>
                </div>
                <div style={{ height: 10, background: '#fff', borderRadius: 999, marginTop: 8, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, trips / tierGoal * 100)}%`, background: 'linear-gradient(90deg,var(--coral),var(--coral-deep))', borderRadius: 999, transition: 'width .4s' }} />
                </div>
                <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)', marginTop: 10 }}>
                  Musafir tier unlocks priority support and launch-day cashback boosts. Program details are a preview and may change before launch.
                </p>
              </div>
            </div>
          )}

          {sec === 'notify' && (
            <div style={card}>
              <h2 style={h2s}>Notification preferences</h2>
              <div style={{ display: 'grid', gap: 14, maxWidth: 520 }}>
                {[
                  ['orders', 'Order & delivery updates', 'QR delivery, install reminders. Always on.', true, true],
                  ['trips', 'Trip reminders', 'A nudge to install before your flight and when validity is about to start.', prefs.trips, false],
                  ['offers', 'Offers & new destinations', 'Fare-drop alerts and new country launches. No spam, promise.', prefs.offers, false],
                ].map(([k, title, sub, on, locked]) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#fff', borderRadius: 16, padding: '16px 18px' }}>
                    <span style={{ flex: 1 }}>
                      <b style={{ fontSize: 15 }}>{title}</b><br />
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>{sub}</span>
                    </span>
                    <Toggle on={on} disabled={locked} onChange={v => savePrefs({ ...prefs, [k]: v })} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {sec === 'cards' && (
            <div style={card}>
              <h2 style={h2s}>Saved cards</h2>
              <div style={{ background: '#fff', borderRadius: 18, padding: '38px 24px', textAlign: 'center', maxWidth: 460 }}>
                <div style={{ fontSize: 36 }}>🔒</div>
                <b style={{ display: 'block', fontSize: 16, margin: '10px 0 4px' }}>No saved cards yet</b>
                <p style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--muted)' }}>
                  Card saving arrives with the Razorpay payments launch. MobiYatri never stores card
                  numbers itself — they stay with the licensed payment provider.
                </p>
              </div>
            </div>
          )}

          {sec === 'orders' && (
            <div style={card}>
              <h2 style={h2s}>Orders</h2>
              {orders === null && <p style={{ fontWeight: 600, color: 'var(--muted)' }}>Loading…</p>}
              {orders && orders.length === 0 && <p style={{ fontWeight: 600, color: 'var(--muted)' }}>No orders yet.</p>}
              <div style={{ display: 'grid', gap: 10 }}>
                {(orders || []).map((o, i) => (
                  <div key={i} style={{ background: '#fff', borderRadius: 14, padding: '15px 18px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ flex: 1, minWidth: 180 }}>
                      <b style={{ fontSize: 15 }}>{o.country_name}</b>
                      <span style={{ fontWeight: 600, color: 'var(--muted)', fontSize: 13.5 }}> · {o.package_label}</span><br />
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>
                        {o.order_reference || ''} · {new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </span>
                    <Badge tone="green">Delivered</Badge>
                    <b style={{ fontFamily: 'var(--head)', fontSize: 16 }}>₹{o.price_inr}</b>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sec === 'refer' && (
            <div style={card}>
              <h2 style={h2s}>Refer and earn</h2>
              <p style={{ fontWeight: 500, color: 'var(--muted)', maxWidth: 480 }}>
                Get ₹150 YatriCash for every friend who takes their first trip with MobiYatri — they get a discount on their first eSIM too.
              </p>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', margin: '18px 0', flexWrap: 'wrap' }}>
                <code style={{ background: '#fff', borderRadius: 12, padding: '13px 22px', fontWeight: 800, fontSize: 17, letterSpacing: '.08em', border: '1.5px dashed var(--indigo)' }}>
                  {refCode || '· · · · · ·'}
                </code>
                <button className="pill pill-coral" style={{ padding: '12px 22px', fontSize: 14 }}
                  onClick={() => { if (!refCode) return; navigator.clipboard.writeText(`Use my code ${refCode} for a discount on your first MobiYatri travel eSIM — mobiyatri.in`); toast('Invite copied'); }}>
                  Copy invite
                </button>
                {refCode && (
                  <a className="pill pill-white" style={{ padding: '12px 22px', fontSize: 14 }} target="_blank" rel="noreferrer"
                    href={'https://wa.me/?text=' + encodeURIComponent(`Use my code ${refCode} for a discount on your first MobiYatri travel eSIM — mobiyatri.in`)}>
                    Share on WhatsApp
                  </a>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, maxWidth: 560 }}>
                {[['1', 'Share your code', 'Send it to friends planning a trip.'], ['2', 'They buy their first eSIM', 'They get a first-trip discount.'], ['3', 'You earn ₹150', 'Credited as YatriCash after their order.']].map(([n, t, d]) => (
                  <div key={n} style={{ background: '#fff', borderRadius: 14, padding: '16px 16px' }}>
                    <span style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--indigo)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--head)', fontWeight: 800, fontSize: 14 }}>{n}</span>
                    <b style={{ display: 'block', fontSize: 14, margin: '10px 0 3px' }}>{t}</b>
                    <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--muted)' }}>{d}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
