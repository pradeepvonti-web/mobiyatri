import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCatalogue, flag } from '../hooks.js';
import { useAuth } from '../lib/auth.jsx';
import { authHeaders } from '../lib/supabase.js';
import { Badge, Field, inputStyle, Skeleton, Spinner, Modal, useToast } from '../components/ui.jsx';

const inr = n => '₹' + Number(n || 0).toLocaleString('en-IN');
const rupees = paise => Math.floor(Number(paise || 0) / 100);

async function api(path, opts = {}) {
  const r = await fetch('/api/partner/' + path, { ...opts, headers: await authHeaders() });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(body.error || 'request failed'), { body, status: r.status });
  return body;
}

const Card = ({ children, style }) => (
  <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 2px 14px rgba(22,24,42,.06)', padding: 24, ...style }}>{children}</div>
);
const H = ({ children, sub }) => (
  <div style={{ marginBottom: 18 }}>
    <h2 style={{ fontSize: 19, fontWeight: 800, color: 'var(--ink)', margin: 0 }}>{children}</h2>
    {sub && <p style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--muted)', margin: '5px 0 0' }}>{sub}</p>}
  </div>
);

/* ---------------- gate: sign in ---------------- */
function SignedOut({ openAuth }) {
  return (
    <Card style={{ maxWidth: 520, margin: '60px auto', textAlign: 'center', padding: 40 }}>
      <div style={{ fontSize: 42, marginBottom: 14 }}>🏢</div>
      <H sub="Bulk eSIMs for group departures, at agent pricing. Sign in with your agency email to continue.">
        MobiYatri for travel agents
      </H>
      <button className="pill pill-coral" onClick={() => openAuth('login')} style={{ marginTop: 6 }}>Sign in</button>
    </Card>
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
    <form onSubmit={submit}>
      <Card style={{ maxWidth: 560, margin: '40px auto', padding: 32 }}>
        <H sub={`Signed in as ${email}. Tell us about your agency and your partner account opens straight away.`}>
          Open a partner account
        </H>
        <div style={{ display: 'grid', gap: 14 }}>
          <Field label="Agency name *"><input required style={inputStyle} value={f.agency_name} onChange={set('agency_name')} placeholder="e.g. Sunrise Holidays" /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Your name"><input style={inputStyle} value={f.contact_name} onChange={set('contact_name')} /></Field>
            <Field label="Phone"><input style={inputStyle} value={f.contact_phone} onChange={set('contact_phone')} placeholder="+91…" /></Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="City"><input style={inputStyle} value={f.city} onChange={set('city')} /></Field>
            <Field label="GSTIN" hint="Needed on your tax invoices"><input style={inputStyle} value={f.gstin} onChange={set('gstin')} /></Field>
          </div>
        </div>
        <button className="pill pill-coral" disabled={busy} style={{ width: '100%', marginTop: 22, justifyContent: 'center' }}>
          {busy ? <Spinner /> : 'Create partner account'}
        </button>
      </Card>
    </form>
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
      <Card style={{ background: 'linear-gradient(135deg,#33386E,#20234A)', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, opacity: .7, textTransform: 'uppercase', letterSpacing: '.05em' }}>Wallet balance</div>
            <div style={{ fontSize: 38, fontWeight: 800, lineHeight: 1.2 }}>{inr(bal)}</div>
            <div style={{ fontSize: 13, fontWeight: 500, opacity: .75, marginTop: 2 }}>
              Your commission: {Number(partner.commission_pct)}% off retail on every eSIM
            </div>
          </div>
          <button className="pill pill-coral" onClick={() => setOpen(true)}>Add funds</button>
        </div>
        {bal < 5000 && (
          <div style={{ marginTop: 16, background: 'rgba(255,107,87,.18)', borderRadius: 12, padding: '11px 15px', fontSize: 13.5, fontWeight: 600 }}>
            Low balance — top up before your next departure so provisioning doesn't stall.
          </div>
        )}
      </Card>

      {ledger?.length > 0 && (
        <Card style={{ marginTop: 16 }}>
          <H sub="Every top-up and purchase against your account.">Statement</H>
          <div style={{ display: 'grid', gap: 2 }}>
            {ledger.map(l => (
              <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '11px 0', borderBottom: '1px solid #F2EDE3', fontSize: 14 }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{l.note || l.kind}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 500 }}>{new Date(l.created_at).toLocaleString('en-IN')}</div>
                </div>
                <div style={{ fontWeight: 800, color: l.delta_paise > 0 ? '#1F5B33' : 'var(--ink)', whiteSpace: 'nowrap' }}>
                  {l.delta_paise > 0 ? '+' : '−'}{inr(Math.abs(rupees(l.delta_paise)))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal open={open} onClose={() => !busy && setOpen(false)}>
        <div style={{ padding: 30 }}>
          <H sub="Funds sit in your account and are drawn down as you provision eSIMs.">Add funds</H>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {[10000, 25000, 50000, 100000].map(v => (
              <button key={v} onClick={() => setAmt(v)} style={{
                flex: '1 0 auto', padding: '10px 14px', borderRadius: 12, fontWeight: 700, fontSize: 14,
                background: Number(amt) === v ? 'var(--ink)' : '#fff', color: Number(amt) === v ? '#fff' : 'var(--ink)',
                border: '1.5px solid ' + (Number(amt) === v ? 'var(--ink)' : '#DDD5C6'),
              }}>{inr(v)}</button>
            ))}
          </div>
          <Field label="Amount (₹)"><input type="number" min="1000" style={inputStyle} value={amt} onChange={e => setAmt(e.target.value)} /></Field>
          <button className="pill pill-coral" disabled={busy} onClick={topup} style={{ width: '100%', marginTop: 20, justifyContent: 'center' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#F7F2E9', borderRadius: 13, padding: '12px 16px' }}>
              {dest.iso && <img alt="" src={flag(dest.iso)} width={30} style={{ borderRadius: 4 }} />}
              <span style={{ fontWeight: 700, flex: 1 }}>{dest.n}</span>
              <button onClick={() => { setDest(null); setPick(null); }} style={{ fontWeight: 700, color: 'var(--muted)', fontSize: 13 }}>Change</button>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <input style={inputStyle} value={q} onChange={e => setQ(e.target.value)} placeholder="Search country or region…" />
              {matches.length > 0 && (
                <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: '#fff', borderRadius: 14, boxShadow: '0 16px 40px rgba(22,24,42,.16)', overflow: 'hidden', zIndex: 5 }}>
                  {matches.map(c => (
                    <button key={c.n} onClick={() => { setDest(c); setPick(null); setQ(''); }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 16px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #F2EDE3' }}>
                      {c.iso && <img alt="" src={flag(c.iso)} width={24} style={{ borderRadius: 3 }} />}
                      <span style={{ flex: 1 }}>{c.n}</span>
                      <span style={{ color: 'var(--muted)', fontSize: 13 }}>from {inr(c.from)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </Field>

        {dest && (
          <Field label="Package">
            <div style={{ display: 'grid', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
              {options.length === 0 && <Skeleton h={54} r={13} />}
              {options.map(p => {
                const on = pick?.bundle === p.bundle;
                const agent = Math.max(1, Math.round(p.price * (1 - Number(partner.commission_pct) / 100)));
                return (
                  <button key={p.bundle} onClick={() => setPick(p)} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderRadius: 13, textAlign: 'left',
                    background: on ? '#F7F2E9' : '#fff', border: '1.5px solid ' + (on ? 'var(--ink)' : '#E9E0D0'),
                  }}>
                    <span style={{ fontWeight: 700, flex: 1 }}>{p.label2}</span>
                    <span style={{ color: 'var(--muted)', fontSize: 13, textDecoration: 'line-through' }}>{inr(p.price)}</span>
                    <span style={{ fontWeight: 800 }}>{inr(agent)}</span>
                  </button>
                );
              })}
            </div>
          </Field>
        )}

        {pick && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Passengers"><input type="number" min="1" max="100" style={inputStyle} value={qty} onChange={e => setQty(e.target.value)} /></Field>
              <Field label="Tour name" hint="Shows on your invoice"><input style={inputStyle} value={tour} onChange={e => setTour(e.target.value)} placeholder="Dubai Nov 14 departure" /></Field>
            </div>

            <div style={{ background: '#F7F2E9', borderRadius: 16, padding: 18 }}>
              {[
                ['Retail value', inr(retail)],
                [`Your price (${Number(partner.commission_pct)}% off)`, inr(total)],
              ].map(([l, v], i) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14.5, fontWeight: i ? 800 : 500, color: i ? 'var(--ink)' : 'var(--muted)', marginBottom: i ? 0 : 8 }}>
                  <span>{l}</span><span>{v}</span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid #E4DBC9', marginTop: 12, paddingTop: 12, fontSize: 13.5, fontWeight: 600, color: '#1F5B33' }}>
                You keep {inr(retail - total)} if you resell at MobiYatri's retail price.
              </div>
            </div>

            <button className="pill pill-coral" disabled={busy || short || !(qty > 0)} onClick={create}
              style={{ width: '100%', justifyContent: 'center', opacity: short ? .55 : 1 }}>
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

  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: 16, border: '1px solid #EFE7D9' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--muted)', flex: 1 }}>{seat.iccid}</span>
        {seat.delivered_at ? <Badge tone="green">Delivered</Badge>
          : seat.passenger_name ? <Badge tone="gold">Assigned</Badge>
          : <Badge tone="indigo">Open seat</Badge>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.3fr auto', gap: 8, alignItems: 'end' }}>
        <input style={{ ...inputStyle, padding: '10px 13px', fontSize: 14 }} value={f.passenger_name} onChange={set('passenger_name')} placeholder="Passenger name" />
        <input style={{ ...inputStyle, padding: '10px 13px', fontSize: 14 }} value={f.passenger_phone} onChange={set('passenger_phone')} placeholder="+91 phone" />
        <input style={{ ...inputStyle, padding: '10px 13px', fontSize: 14 }} value={f.passenger_email} onChange={set('passenger_email')} placeholder="email" />
        <button className="pill pill-dark" disabled={busy} onClick={save} style={{ padding: '11px 18px', fontSize: 14 }}>
          {busy ? <Spinner size={15} /> : seat.delivered_at ? 'Resend' : 'Send eSIM'}
        </button>
      </div>
      <button onClick={() => setShowQr(true)} style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginTop: 10 }}>Show QR / activation code</button>

      <Modal open={showQr} onClose={() => setShowQr(false)} maxWidth={380}>
        <div style={{ padding: 30, textAlign: 'center' }}>
          <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>{seat.passenger_name || 'Unassigned eSIM'}</h3>
          <p style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500, marginBottom: 18 }}>Scan with the passenger's phone camera</p>
          <img alt="eSIM QR" width={230} height={230} style={{ background: '#fff', borderRadius: 12, padding: 10 }}
            src={'https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=' + encodeURIComponent(seat.lpa_string || '')} />
          <p style={{ fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all', color: 'var(--muted)', marginTop: 16 }}>{seat.lpa_string}</p>
        </div>
      </Modal>
    </div>
  );
}

function BatchDetail({ batch, onBack, partner }) {
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
    <div>
      <button onClick={onBack} style={{ fontWeight: 700, color: 'var(--muted)', marginBottom: 16 }}>← All departures</button>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: 21, fontWeight: 800, margin: 0 }}>{batch.tour_name || batch.country_name}</h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 500, margin: '5px 0 0' }}>
              {batch.country_name} · {batch.package_label} · {batch.qty} eSIMs · {inr(batch.total_inr)}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="pill pill-white" onClick={csv} style={{ fontSize: 14 }}>Export CSV</button>
            <button className="pill pill-white" onClick={invoice} style={{ fontSize: 14 }}>Invoice</button>
          </div>
        </div>
      </Card>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[['all', 'All'], ['open', 'Unassigned'], ['sent', 'Delivered']].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} style={{
            padding: '8px 16px', borderRadius: 999, fontWeight: 700, fontSize: 13.5,
            background: filter === k ? 'var(--ink)' : '#fff', color: filter === k ? '#fff' : 'var(--ink)',
          }}>{l}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {!seats && [...Array(4)].map((_, i) => <Skeleton key={i} h={110} r={16} />)}
        {shown.map(s => (
          <Seat key={s.id} seat={s} onSaved={row => setSeats(list => list.map(x => x.id === row.id ? row : x))} />
        ))}
        {seats && shown.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--muted)', fontWeight: 600, padding: 30 }}>Nothing here.</p>
        )}
      </div>
    </div>
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

  if (open) return <div className="container" style={{ padding: '26px 24px 100px', maxWidth: 900 }}>
    <BatchDetail batch={open} partner={partner} onBack={() => { setOpen(null); refresh(); }} />
  </div>;

  const totals = (batches || []).reduce((a, b) => ({
    esims: a.esims + b.qty, spend: a.spend + b.total_inr, delivered: a.delivered + (b.delivered || 0),
  }), { esims: 0, spend: 0, delivered: 0 });

  return (
    <div className="container" style={{ padding: '26px 24px 100px', maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 27, fontWeight: 800, margin: 0 }}>{partner.agency_name}</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 500, margin: '4px 0 0' }}>Partner account · {email}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['departures', 'Departures'], ['new', 'New departure'], ['wallet', 'Wallet']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              padding: '9px 18px', borderRadius: 999, fontWeight: 700, fontSize: 14,
              background: tab === k ? 'var(--ink)' : '#fff', color: tab === k ? '#fff' : 'var(--ink)',
            }}>{l}</button>
          ))}
        </div>
      </div>

      {tab === 'departures' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 18 }}>
            {[
              ['Wallet', inr(rupees(partner.wallet_paise))],
              ['eSIMs bought', totals.esims],
              ['Delivered', totals.delivered],
              ['Spend', inr(totals.spend)],
            ].map(([l, v]) => (
              <Card key={l} style={{ padding: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{l}</div>
                <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{v}</div>
              </Card>
            ))}
          </div>

          {!batches && <Skeleton h={90} r={18} />}
          {batches?.length === 0 && (
            <Card style={{ textAlign: 'center', padding: 44 }}>
              <div style={{ fontSize: 38, marginBottom: 10 }}>✈️</div>
              <H sub="Buy eSIMs for your next group in one go, then assign each one to a passenger.">No departures yet</H>
              <button className="pill pill-coral" onClick={() => setTab('new')}>Create your first departure</button>
            </Card>
          )}
          <div style={{ display: 'grid', gap: 10 }}>
            <AnimatePresence>
              {(batches || []).map(b => (
                <motion.button key={b.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  onClick={() => setOpen(b)} style={{ textAlign: 'left' }}>
                  <Card style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontWeight: 800, fontSize: 16 }}>{b.tour_name || b.country_name}</div>
                      <div style={{ fontSize: 13.5, color: 'var(--muted)', fontWeight: 500, marginTop: 3 }}>
                        {b.country_name} · {b.package_label} · {new Date(b.created_at).toLocaleDateString('en-IN')}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800 }}>{b.delivered}/{b.qty} delivered</div>
                      <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>{inr(b.total_inr)}</div>
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
    </div>
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

  if (!ready) return <div className="container" style={{ padding: 60, maxWidth: 900 }}><Skeleton h={120} r={20} /></div>;
  if (!user) return <div className="container" style={{ padding: '20px 24px 90px' }}><SignedOut openAuth={openAuth} /></div>;
  if (state?.setup) return (
    <div className="container" style={{ padding: '20px 24px 90px' }}>
      <Card style={{ maxWidth: 560, margin: '50px auto', padding: 34 }}>
        <H sub="One setup step left: run the partner tables migration in your Supabase project's SQL editor, then reload this page.">
          Almost there
        </H>
        <code style={{ display: 'block', background: '#F7F2E9', borderRadius: 12, padding: '13px 16px', fontSize: 13.5, fontWeight: 600 }}>
          {state.setup.sql}
        </code>
      </Card>
    </div>
  );
  if (!state) return <div className="container" style={{ padding: 60, maxWidth: 900 }}><Skeleton h={120} r={20} /></div>;
  if (!state.partner) return <div className="container" style={{ padding: '20px 24px 90px' }}>
    <Register email={state.email} onDone={p => setState(s => ({ ...s, partner: p }))} />
  </div>;
  return <Dashboard partner={state.partner} ledger={state.ledger} email={state.email} />;
}
