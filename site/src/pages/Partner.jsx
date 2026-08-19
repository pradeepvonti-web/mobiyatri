import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCatalogue, flag } from '../hooks.js';
import { useAuth } from '../lib/auth.jsx';
import { authHeaders } from '../lib/supabase.js';
import { Badge, Skeleton, Spinner, Modal, useToast } from '../components/ui.jsx';

/* Design tokens mirror mobile/App.js `T` + its StyleSheet, so the portal reads as
   the same product as the app rather than as a page on the website. */
const M = {
  bg: '#F7F2E9', bgTop: '#EFE7D9', card: '#FFFFFF',
  ink: '#16182A', soft: '#6A6478', line: '#E9E0D0',
  coral: '#FF6B57', coralDeep: '#E85340',
  indigo: '#33386E', indigoDark: '#20234A',
  mint: '#DCEDDC', mintInk: '#1F5B33', tint: '#EDE4F2',
  fieldLine: '#D8E1EF', statBg: '#EAF0F9',
};
const shadow = '0 5px 14px rgba(90,74,50,.10)';
const shadowSm = '0 2px 8px rgba(42,44,74,.07)';
const display = 'Alexandria, sans-serif';

const inr = n => '₹' + Number(n || 0).toLocaleString('en-IN');
const rupees = paise => Math.floor(Number(paise || 0) / 100);

async function api(path, opts = {}) {
  const r = await fetch('/api/partner/' + path, { ...opts, headers: await authHeaders() });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(body.error || 'request failed'), { body, status: r.status });
  return body;
}

/* ---------------- app-styled primitives ---------------- */
const Card = ({ children, style, ...p }) => (
  <div {...p} style={{ background: M.card, borderRadius: 20, padding: 18, boxShadow: shadow, ...style }}>{children}</div>
);

const Title = ({ children, size = 20, style }) => (
  <h2 style={{ fontFamily: display, fontSize: size, fontWeight: 800, color: M.ink, letterSpacing: '-.01em', margin: 0, ...style }}>{children}</h2>
);

const H = ({ children, sub, size }) => (
  <div style={{ marginBottom: 16 }}>
    <Title size={size}>{children}</Title>
    {sub && <p style={{ fontSize: 13.5, fontWeight: 500, color: M.soft, margin: '6px 0 0', lineHeight: 1.6 }}>{sub}</p>}
  </div>
);

const btnPrimary = {
  background: M.coral, color: '#fff', borderRadius: 999, padding: '15px 26px',
  fontWeight: 700, fontSize: 16, boxShadow: '0 4px 10px rgba(255,107,87,.35)',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'transform .12s ease',
};
const btnLight = {
  background: '#fff', color: M.ink, borderRadius: 999, padding: '13px 22px',
  fontWeight: 700, fontSize: 15, border: '1.5px solid #E0D5C3',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
};
const field = {
  width: '100%', background: '#fff', border: `1.5px solid ${M.fieldLine}`, borderRadius: 14,
  padding: '13px 16px', fontSize: 15, fontWeight: 500, fontFamily: 'inherit', color: M.ink, outline: 'none',
};

const Field = ({ label, children, hint }) => (
  <label style={{ display: 'block' }}>
    <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: M.soft, marginBottom: 6 }}>{label}</span>
    {children}
    {hint && <span style={{ display: 'block', fontSize: 12, fontWeight: 500, color: M.soft, marginTop: 5 }}>{hint}</span>}
  </label>
);

// the app's chip row (white pill, selected fills with ink)
const Chips = ({ value, onChange, options, style }) => (
  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', ...style }}>
    {options.map(([k, l]) => {
      const on = value === k;
      return (
        <button key={k} onClick={() => onChange(k)} style={{
          padding: '9px 16px', borderRadius: 999, fontWeight: 700, fontSize: 13.5,
          background: on ? M.ink : '#fff', color: on ? '#fff' : M.ink,
          border: `1.5px solid ${on ? M.ink : M.fieldLine}`, transition: 'background .14s',
        }}>{l}</button>
      );
    })}
  </div>
);

// the app's stat tile
const Stat = ({ k, v }) => (
  <div style={{ flex: 1, background: M.statBg, borderRadius: 12, padding: '10px 12px', minWidth: 0 }}>
    <div style={{ fontSize: 11.5, fontWeight: 700, color: M.soft }}>{k}</div>
    <div style={{ fontFamily: display, fontSize: 16, fontWeight: 800, color: M.ink, marginTop: 2 }}>{v}</div>
  </div>
);

const Page = ({ children, max = 860 }) => (
  <div style={{ background: M.bg, minHeight: '70vh' }}>
    <div style={{ maxWidth: max, margin: '0 auto', padding: '22px 18px 90px' }}>{children}</div>
  </div>
);

/* ---------------- gate: sign in ---------------- */
function SignedOut({ openAuth }) {
  return (
    <Page max={520}>
      <Card style={{ marginTop: 40, padding: 30, textAlign: 'center' }}>
        <div style={{
          width: 66, height: 66, borderRadius: 20, background: M.tint, margin: '0 auto 16px',
          display: 'grid', placeItems: 'center', fontSize: 30,
        }}>🏢</div>
        <H size={22} sub="Bulk eSIMs for group departures, at agent pricing. Sign in with your agency email to continue.">
          MobiYatri for travel agents
        </H>
        <button onClick={() => openAuth('login')} style={{ ...btnPrimary, width: '100%', marginTop: 6 }}>Sign in</button>
      </Card>
    </Page>
  );
}

/* ---------------- gate: register agency ---------------- */
function Register({ email, onDone }) {
  const [f, setF] = useState({ agency_name: '', contact_name: '', contact_phone: '', gstin: '', city: '' });
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const set = k => e => setF(v => ({ ...v, [k]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    try { onDone((await api('register', { method: 'POST', body: JSON.stringify(f) })).partner); }
    catch (err) { toast(err.message, 'err'); setBusy(false); }
  };

  return (
    <Page max={520}>
      <form onSubmit={submit}>
        <Card style={{ marginTop: 26, padding: 24 }}>
          <H size={21} sub={`Signed in as ${email}. Tell us about your agency and your partner account opens straight away.`}>
            Open a partner account
          </H>
          <div style={{ display: 'grid', gap: 12 }}>
            <Field label="Agency name *"><input required style={field} value={f.agency_name} onChange={set('agency_name')} placeholder="e.g. Sunrise Holidays" /></Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Your name"><input style={field} value={f.contact_name} onChange={set('contact_name')} /></Field>
              <Field label="Phone"><input style={field} value={f.contact_phone} onChange={set('contact_phone')} placeholder="+91…" /></Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="City"><input style={field} value={f.city} onChange={set('city')} /></Field>
              <Field label="GSTIN" hint="Needed on your tax invoices"><input style={field} value={f.gstin} onChange={set('gstin')} /></Field>
            </div>
          </div>
          <button disabled={busy} style={{ ...btnPrimary, width: '100%', marginTop: 20 }}>
            {busy ? <Spinner /> : 'Create partner account'}
          </button>
        </Card>
      </form>
    </Page>
  );
}

/* ---------------- wallet ---------------- */
function Wallet({ partner, ledger, onChange }) {
  const [open, setOpen] = useState(false);
  const [amt, setAmt] = useState(25000);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const topup = async () => {
    setBusy(true);
    try {
      const body = { amountInr: Number(amt) };
      const cfg = await fetch('/api/payments/create-order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: Number(amt), country: 'Wallet top-up', package: partner.agency_name }),
      }).then(r => r.json()).catch(() => ({ configured: false }));
      if (cfg.configured) {
        const paid = await new Promise(resolve => {
          const launch = () => new window.Razorpay({
            key: cfg.keyId, order_id: cfg.orderId, amount: cfg.amount * 100, currency: 'INR',
            name: 'MobiYatri', description: 'Partner wallet top-up',
            prefill: { name: partner.agency_name, contact: partner.contact_phone || '' },
            theme: { color: '#FF6B57' },
            handler: r => resolve(r), modal: { ondismiss: () => resolve(null) },
          }).open();
          if (window.Razorpay) return launch();
          const sc = document.createElement('script');
          sc.src = 'https://checkout.razorpay.com/v1/checkout.js';
          sc.onload = launch; sc.onerror = () => resolve(null);
          document.body.appendChild(sc);
        });
        if (!paid) { setBusy(false); return; }
        Object.assign(body, paid);
      }
      const res = await api('topup', { method: 'POST', body: JSON.stringify(body) });
      onChange(res.wallet_paise);
      setOpen(false);
      toast(`${inr(amt)} added to your wallet`);
    } catch (err) { toast(err.message, 'err'); }
    setBusy(false);
  };

  const bal = rupees(partner.wallet_paise);
  return (
    <>
      {/* the app's dark promo card */}
      <div style={{ background: M.indigoDark, borderRadius: 20, padding: 20, color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, opacity: .62, textTransform: 'uppercase', letterSpacing: '.06em' }}>Wallet balance</div>
            <div style={{ fontFamily: display, fontSize: 36, fontWeight: 800, lineHeight: 1.25, letterSpacing: '-.02em' }}>{inr(bal)}</div>
            <div style={{ fontSize: 13, fontWeight: 500, opacity: .72, marginTop: 2 }}>
              {Number(partner.commission_pct)}% off retail on every eSIM
            </div>
          </div>
          <button onClick={() => setOpen(true)} style={{ ...btnPrimary, padding: '13px 22px', fontSize: 15 }}>Add funds</button>
        </div>
        {bal < 5000 && (
          <div style={{ marginTop: 16, background: 'rgba(255,107,87,.18)', borderRadius: 14, padding: '11px 15px', fontSize: 13.5, fontWeight: 600 }}>
            Low balance — top up before your next departure so provisioning doesn't stall.
          </div>
        )}
      </div>

      {ledger?.length > 0 && (
        <Card style={{ marginTop: 14 }}>
          <H size={17} sub="Every top-up and purchase against your account.">Statement</H>
          <div>
            {ledger.map((l, i) => (
              <div key={l.id} style={{
                display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 0',
                borderTop: i ? `1px solid ${M.line}` : 'none', fontSize: 14,
              }}>
                <div>
                  <div style={{ fontWeight: 700, color: M.ink }}>{l.note || l.kind}</div>
                  <div style={{ fontSize: 12.5, color: M.soft, fontWeight: 500, marginTop: 1 }}>{new Date(l.created_at).toLocaleString('en-IN')}</div>
                </div>
                <div style={{ fontFamily: display, fontWeight: 800, color: l.delta_paise > 0 ? M.mintInk : M.ink, whiteSpace: 'nowrap' }}>
                  {l.delta_paise > 0 ? '+' : '−'}{inr(Math.abs(rupees(l.delta_paise)))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal open={open} onClose={() => !busy && setOpen(false)}>
        <div style={{ padding: 26 }}>
          <H size={20} sub="Funds sit in your account and are drawn down as you provision eSIMs.">Add funds</H>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {[10000, 25000, 50000, 100000].map(v => (
              <button key={v} onClick={() => setAmt(v)} style={{
                flex: '1 0 auto', padding: '11px 14px', borderRadius: 999, fontWeight: 700, fontSize: 14,
                background: Number(amt) === v ? M.ink : '#fff', color: Number(amt) === v ? '#fff' : M.ink,
                border: `1.5px solid ${Number(amt) === v ? M.ink : M.fieldLine}`,
              }}>{inr(v)}</button>
            ))}
          </div>
          <Field label="Amount (₹)"><input type="number" min="1000" style={field} value={amt} onChange={e => setAmt(e.target.value)} /></Field>
          <button disabled={busy} onClick={topup} style={{ ...btnPrimary, width: '100%', marginTop: 18 }}>
            {busy ? <Spinner /> : `Add ${inr(amt)}`}
          </button>
        </div>
      </Modal>
    </>
  );
}

/* ---------------- new batch ---------------- */
function NewBatch({ partner, onCreated }) {
  const { countries, regions, global } = useCatalogue();
  const all = useMemo(() => [...countries, ...regions, ...global], [countries, regions, global]);
  const [q, setQ] = useState('');
  const [dest, setDest] = useState(null);
  const [pick, setPick] = useState(null);
  const [qty, setQty] = useState(30);
  const [tour, setTour] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const matches = useMemo(() => {
    if (!q.trim()) return [];
    return all.filter(c => c.n.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 6);
  }, [q, all]);

  const options = useMemo(() => {
    const groups = (dest?.packages && dest.packages.std) || [];
    return groups.flatMap(g => g.list.map(p => ({ ...p, d: g.d, label2: `${p.label} · ${g.d}` })));
  }, [dest]);

  const unit = pick ? Math.max(1, Math.round(pick.price * (1 - Number(partner.commission_pct) / 100))) : 0;
  const total = unit * Number(qty || 0);
  const retail = pick ? pick.price * Number(qty || 0) : 0;
  const short = total * 100 > Number(partner.wallet_paise || 0);

  const create = async () => {
    setBusy(true);
    try {
      const res = await api('batch', {
        method: 'POST',
        body: JSON.stringify({
          bundle: pick.bundle, qty: Number(qty), retailInr: pick.price,
          country: dest.n, package: pick.label2, tour: tour || null,
        }),
      });
      toast(res.provisioned < res.requested
        ? `${res.provisioned} of ${res.requested} eSIMs provisioned — you were charged for ${res.provisioned}.`
        : `${res.provisioned} eSIMs ready to assign.`);
      setDest(null); setPick(null); setQ(''); setTour('');
      onCreated(res.wallet_paise);
    } catch (err) {
      toast(err.status === 402
        ? `Wallet short by ${inr((err.body.needInr || 0) - (err.body.haveInr || 0))} — add funds first.`
        : err.message, 'err');
    }
    setBusy(false);
  };

  return (
    <Card>
      <H sub="Buy the whole group in one go, then hand each eSIM to a passenger.">New departure</H>

      <div style={{ display: 'grid', gap: 14 }}>
        <Field label="Destination">
          {dest ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: M.bgTop, borderRadius: 14, padding: '12px 16px' }}>
              {dest.iso && <img alt="" src={flag(dest.iso)} width={44} height={32} style={{ borderRadius: 7, objectFit: 'cover' }} />}
              <span style={{ fontWeight: 700, flex: 1 }}>{dest.n}</span>
              <button onClick={() => { setDest(null); setPick(null); }} style={{ fontWeight: 700, color: M.soft, fontSize: 13 }}>Change</button>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <input style={{ ...field, boxShadow: shadowSm, border: 'none' }} value={q} onChange={e => setQ(e.target.value)} placeholder="Search country or region…" />
              {matches.length > 0 && (
                <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: '#fff', borderRadius: 16, boxShadow: '0 16px 40px rgba(22,24,42,.16)', overflow: 'hidden', zIndex: 5 }}>
                  {matches.map((c, i) => (
                    <button key={c.n} onClick={() => { setDest(c); setPick(null); setQ(''); }} style={{
                      display: 'flex', alignItems: 'center', gap: 13, width: '100%', padding: '13px 15px',
                      textAlign: 'left', fontWeight: 700, borderTop: i ? `1px solid ${M.line}` : 'none',
                    }}>
                      {c.iso && <img alt="" src={flag(c.iso)} width={44} height={32} style={{ borderRadius: 7, objectFit: 'cover' }} />}
                      <span style={{ flex: 1 }}>{c.n}</span>
                      <span style={{ color: M.soft, fontSize: 13, fontWeight: 600 }}>from {inr(c.from)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </Field>

        {dest && (
          <Field label="Package">
            <div style={{ display: 'grid', gap: 10, maxHeight: 280, overflowY: 'auto', padding: 2 }}>
              {options.length === 0 && <Skeleton h={56} r={16} />}
              {options.map(p => {
                const on = pick?.bundle === p.bundle;
                const agent = Math.max(1, Math.round(p.price * (1 - Number(partner.commission_pct) / 100)));
                return (
                  <button key={p.bundle} onClick={() => setPick(p)} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16, textAlign: 'left',
                    background: '#fff', border: `2px solid ${on ? M.coral : 'transparent'}`, boxShadow: shadowSm,
                  }}>
                    <span style={{ fontWeight: 700, fontSize: 15, flex: 1 }}>{p.label2}</span>
                    <span style={{ color: M.soft, fontSize: 13, fontWeight: 600, textDecoration: 'line-through' }}>{inr(p.price)}</span>
                    <span style={{ fontFamily: display, fontWeight: 800, fontSize: 17 }}>{inr(agent)}</span>
                  </button>
                );
              })}
            </div>
          </Field>
        )}

        {pick && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Passengers"><input type="number" min="1" max="100" style={field} value={qty} onChange={e => setQty(e.target.value)} /></Field>
              <Field label="Tour name" hint="Shows on your invoice"><input style={field} value={tour} onChange={e => setTour(e.target.value)} placeholder="Dubai Nov 14 departure" /></Field>
            </div>

            <div style={{ background: M.bgTop, borderRadius: 16, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14.5, fontWeight: 500, color: M.soft, marginBottom: 8 }}>
                <span>Retail value</span><span>{inr(retail)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800, color: M.ink }}>
                <span>Your price ({Number(partner.commission_pct)}% off)</span>
                <span style={{ fontFamily: display, fontSize: 18 }}>{inr(total)}</span>
              </div>
              <div style={{ background: M.mint, color: M.mintInk, borderRadius: 12, padding: '10px 13px', marginTop: 12, fontSize: 13, fontWeight: 700 }}>
                You keep {inr(retail - total)} if you resell at MobiYatri's retail price.
              </div>
            </div>

            <button disabled={busy || short || !(qty > 0)} onClick={create}
              style={{ ...btnPrimary, width: '100%', opacity: short ? .55 : 1 }}>
              {busy ? <Spinner /> : short ? `Add ${inr(total - rupees(partner.wallet_paise))} to your wallet` : `Provision ${qty} eSIMs · ${inr(total)}`}
            </button>
          </>
        )}
      </div>
    </Card>
  );
}

/* ---------------- seat assignment ---------------- */
function Seat({ seat, onSaved }) {
  const [f, setF] = useState({
    passenger_name: seat.passenger_name || '', passenger_phone: seat.passenger_phone || '', passenger_email: seat.passenger_email || '',
  });
  const [busy, setBusy] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const toast = useToast();
  const set = k => e => setF(v => ({ ...v, [k]: e.target.value }));

  const save = async () => {
    if (!f.passenger_name.trim()) { toast('Passenger name required', 'err'); return; }
    setBusy(true);
    try {
      const res = await api('assign', { method: 'POST', body: JSON.stringify({ id: seat.id, ...f }) });
      onSaved(res.seat);
      toast(res.emailed || res.whatsapped
        ? `Sent to ${f.passenger_name}${res.whatsapped ? ' on WhatsApp' : ''}${res.emailed ? (res.whatsapped ? ' and email' : ' by email') : ''}`
        : `Saved — add an email or phone to deliver the QR`);
    } catch (err) { toast(err.message, 'err'); }
    setBusy(false);
  };

  const small = { ...field, padding: '11px 14px', fontSize: 14.5 };
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontFamily: 'monospace', fontSize: 12, color: M.soft, flex: 1 }}>{seat.iccid}</span>
        {seat.delivered_at ? <Badge tone="green">Delivered</Badge>
          : seat.passenger_name ? <Badge tone="gold">Assigned</Badge>
          : <Badge tone="indigo">Open seat</Badge>}
      </div>
      <div className="seatgrid">
        <input style={small} value={f.passenger_name} onChange={set('passenger_name')} placeholder="Passenger name" />
        <input style={small} value={f.passenger_phone} onChange={set('passenger_phone')} placeholder="+91 phone" />
        <input style={small} value={f.passenger_email} onChange={set('passenger_email')} placeholder="email" />
        <button disabled={busy} onClick={save} style={{ ...btnPrimary, padding: '12px 20px', fontSize: 14.5 }}>
          {busy ? <Spinner size={15} /> : seat.delivered_at ? 'Resend' : 'Send eSIM'}
        </button>
      </div>
      <button onClick={() => setShowQr(true)} style={{ fontSize: 13, fontWeight: 700, color: M.soft, marginTop: 11 }}>
        Show QR / activation code
      </button>

      <Modal open={showQr} onClose={() => setShowQr(false)} maxWidth={380}>
        <div style={{ padding: 26, textAlign: 'center' }}>
          <Title size={18}>{seat.passenger_name || 'Unassigned eSIM'}</Title>
          <p style={{ fontSize: 13, color: M.soft, fontWeight: 500, margin: '6px 0 18px' }}>Scan with the passenger's phone camera</p>
          <img alt="eSIM QR" width={230} height={230} style={{ background: '#fff', borderRadius: 16, padding: 12, boxShadow: shadowSm }}
            src={'https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=' + encodeURIComponent(seat.lpa_string || '')} />
          <p style={{ fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all', color: M.soft, marginTop: 16 }}>{seat.lpa_string}</p>
        </div>
      </Modal>
    </Card>
  );
}

function BatchDetail({ batch, onBack }) {
  const [seats, setSeats] = useState(null);
  const [filter, setFilter] = useState('all');
  const toast = useToast();

  useEffect(() => { api('batch?id=' + batch.id).then(r => setSeats(r.seats)).catch(e => toast(e.message, 'err')); }, [batch.id]);

  const shown = (seats || []).filter(s =>
    filter === 'open' ? !s.passenger_name : filter === 'sent' ? s.delivered_at : true);

  const invoice = async () => {
    const r = await fetch('/api/partner/invoice?batch=' + batch.id, { headers: await authHeaders() });
    const w = window.open('', '_blank');
    if (w) w.document.write(await r.text());
  };

  const csv = () => {
    const rows = [['ICCID', 'Passenger', 'Phone', 'Email', 'Activation code', 'Delivered']];
    (seats || []).forEach(s => rows.push([s.iccid, s.passenger_name || '', s.passenger_phone || '', s.passenger_email || '', s.lpa_string, s.delivered_at || '']));
    const blob = new Blob([rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(batch.tour_name || batch.country_name || 'batch').replace(/\W+/g, '-')}.csv`;
    a.click();
  };

  return (
    <Page>
      {/* app-style screen header with a round back button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={onBack} aria-label="Back" style={{
          width: 38, height: 38, borderRadius: 19, background: '#fff', boxShadow: shadowSm,
          display: 'grid', placeItems: 'center', flex: 'none',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={M.ink} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div style={{ minWidth: 0 }}>
          <Title size={21}>{batch.tour_name || batch.country_name}</Title>
          <p style={{ fontSize: 13.5, color: M.soft, fontWeight: 500, margin: '3px 0 0' }}>
            {batch.country_name} · {batch.package_label} · {batch.qty} eSIMs
          </p>
        </div>
      </div>

      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <Stat k="eSIMs" v={batch.qty} />
          <Stat k="Delivered" v={(seats || []).filter(s => s.delivered_at).length} />
          <Stat k="Paid" v={inr(batch.total_inr)} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={csv} style={{ ...btnLight, flex: 1 }}>Export CSV</button>
          <button onClick={invoice} style={{ ...btnLight, flex: 1 }}>Tax invoice</button>
        </div>
      </Card>

      <Chips value={filter} onChange={setFilter} style={{ marginBottom: 12 }}
        options={[['all', 'All'], ['open', 'Unassigned'], ['sent', 'Delivered']]} />

      <div style={{ display: 'grid', gap: 10 }}>
        {!seats && [...Array(4)].map((_, i) => <Skeleton key={i} h={120} r={20} />)}
        {shown.map(s => (
          <Seat key={s.id} seat={s} onSaved={row => setSeats(list => list.map(x => x.id === row.id ? row : x))} />
        ))}
        {seats && shown.length === 0 && (
          <p style={{ textAlign: 'center', color: M.soft, fontWeight: 600, padding: 30 }}>Nothing here.</p>
        )}
      </div>
    </Page>
  );
}

/* ---------------- dashboard ---------------- */
function Dashboard({ partner: p0, ledger: l0, email }) {
  const [partner, setPartner] = useState(p0);
  const [ledger, setLedger] = useState(l0 || []);
  const [batches, setBatches] = useState(null);
  const [open, setOpen] = useState(null);
  const [tab, setTab] = useState('departures');

  const refresh = async () => {
    const [me, b] = await Promise.all([api('me'), api('batches')]);
    setPartner(me.partner); setLedger(me.ledger || []); setBatches(b.batches);
  };
  useEffect(() => { refresh(); }, []);

  if (open) return <BatchDetail batch={open} onBack={() => { setOpen(null); refresh(); }} />;

  const totals = (batches || []).reduce((a, b) => ({
    esims: a.esims + b.qty, spend: a.spend + b.total_inr, delivered: a.delivered + (b.delivered || 0),
  }), { esims: 0, spend: 0, delivered: 0 });

  const initials = (partner.agency_name || '?').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

  return (
    <Page>
      {/* app-style greeting header with avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 16 }}>
        <div style={{
          width: 50, height: 50, borderRadius: 25, background: M.coralDeep, color: '#fff', flex: 'none',
          display: 'grid', placeItems: 'center', fontFamily: display, fontWeight: 800, fontSize: 17,
        }}>{initials}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <Title size={22}>{partner.agency_name}</Title>
          <p style={{ fontSize: 13, color: M.soft, fontWeight: 500, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Partner account · {email}
          </p>
        </div>
      </div>

      <Chips value={tab} onChange={setTab} style={{ marginBottom: 14 }}
        options={[['departures', 'Departures'], ['new', 'New departure'], ['wallet', 'Wallet']]} />

      {tab === 'departures' && (
        <>
          <Card style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Stat k="Wallet" v={inr(rupees(partner.wallet_paise))} />
              <Stat k="eSIMs" v={totals.esims} />
              <Stat k="Delivered" v={totals.delivered} />
              <Stat k="Spend" v={inr(totals.spend)} />
            </div>
          </Card>

          {!batches && <Skeleton h={92} r={20} />}
          {batches?.length === 0 && (
            <Card style={{ textAlign: 'center', padding: 34 }}>
              <div style={{ width: 66, height: 66, borderRadius: 20, background: M.tint, margin: '0 auto 14px', display: 'grid', placeItems: 'center', fontSize: 30 }}>✈️</div>
              <H size={19} sub="Buy eSIMs for your next group in one go, then assign each one to a passenger.">No departures yet</H>
              <button onClick={() => setTab('new')} style={{ ...btnPrimary, width: '100%' }}>Create your first departure</button>
            </Card>
          )}

          <div style={{ display: 'grid', gap: 10 }}>
            <AnimatePresence>
              {(batches || []).map(b => (
                <motion.button key={b.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  onClick={() => setOpen(b)} style={{ textAlign: 'left' }}>
                  <Card style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 13 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 14, background: M.tint, flex: 'none',
                      display: 'grid', placeItems: 'center', fontSize: 21,
                    }}>🧳</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15.5, color: M.ink }}>{b.tour_name || b.country_name}</div>
                      <div style={{ fontSize: 13, color: M.soft, fontWeight: 500, marginTop: 2 }}>
                        {b.country_name} · {new Date(b.created_at).toLocaleDateString('en-IN')}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flex: 'none' }}>
                      <div style={{ fontFamily: display, fontWeight: 800, fontSize: 15 }}>{b.delivered}/{b.qty}</div>
                      <div style={{ fontSize: 12, color: M.soft, fontWeight: 600 }}>delivered</div>
                    </div>
                    {b.assigned < b.qty && <Badge tone="coral">{b.qty - b.assigned} open</Badge>}
                  </Card>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </>
      )}

      {tab === 'new' && <NewBatch partner={partner} onCreated={() => { setTab('departures'); refresh(); }} />}
      {tab === 'wallet' && <Wallet partner={partner} ledger={ledger} onChange={() => refresh()} />}
    </Page>
  );
}

/* ---------------- page ---------------- */
export default function Partner() {
  const { user, ready, openAuth } = useAuth();
  const [state, setState] = useState(null);

  useEffect(() => {
    if (!user) { setState(null); return; }
    api('me').then(setState).catch(err => setState(err.body?.setupRequired ? { setup: err.body } : { partner: null }));
  }, [user]);

  const loading = <Page><Skeleton h={120} r={20} /></Page>;
  if (!ready) return loading;
  if (!user) return <SignedOut openAuth={openAuth} />;
  if (!state) return loading;
  if (state.setup) return (
    <Page max={520}>
      <Card style={{ marginTop: 34, padding: 26 }}>
        <H size={21} sub="One setup step left: run the partner tables migration in your Supabase project's SQL editor, then reload this page.">
          Almost there
        </H>
        <code style={{ display: 'block', background: M.bgTop, borderRadius: 14, padding: '13px 16px', fontSize: 13.5, fontWeight: 600 }}>
          {state.setup.sql}
        </code>
      </Card>
    </Page>
  );
  if (!state.partner) return <Register email={state.email} onDone={p => setState(s => ({ ...s, partner: p }))} />;
  return <Dashboard partner={state.partner} ledger={state.ledger} email={state.email} />;
}
