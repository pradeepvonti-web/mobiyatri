import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { sb } from '../lib/supabase.js';
import { useAuth } from '../lib/auth.jsx';
import { useCatalogue, flag } from '../hooks.js';
import { Badge, Modal, Skeleton, useToast } from '../components/ui.jsx';

const fmtDate = d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function EsimCard({ e, c, toast, onInstall }) {
  const [open, setOpen] = useState(false);
  const o = e.orders || {};
  const parts = (o.package_label || '— · —').split(' · ');
  const lpa = e.lpa_string;
  const copy = (v, label) => { navigator.clipboard.writeText(v); toast(label + ' copied'); };
  const statusTone = e.status === 'active' ? 'green' : 'gold';

  return (
    <motion.div layout style={{ background: '#fff', borderRadius: 20, boxShadow: '0 3px 14px rgba(22,24,42,.06)', overflow: 'hidden' }}>
      <div style={{ padding: '20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {c?.iso
            ? <img src={flag(c.iso)} alt="" style={{ width: 44, height: 31, borderRadius: 5, objectFit: 'cover' }} />
            : <span style={{ fontSize: 26 }}>🌐</span>}
          <span style={{ flex: 1 }}>
            <b style={{ fontSize: 17.5 }}>{o.country_name || 'eSIM'}</b><br />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>Purchased {fmtDate(e.created_at)}</span>
          </span>
          <Badge tone={statusTone}>{e.status || 'ready'}</Badge>
        </div>

        {/* plan stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, margin: '16px 0 0' }}>
          {[['⇅ Data', parts[0] || '—'], ['📅 Validity', parts[1] || '—'], ['₹ Paid', '₹' + (o.price_inr ?? '—')]].map(([k, v]) => (
            <div key={k} style={{ background: 'var(--cream)', borderRadius: 12, padding: '10px 12px' }}>
              <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>{k}</span>
              <b style={{ fontSize: 15 }}>{v}</b>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          {lpa && <button className="pill pill-coral" style={{ padding: '11px 22px', fontSize: 14 }} onClick={() => onInstall(e)}>Install</button>}
          <button className="pill pill-white" style={{ padding: '11px 20px', fontSize: 14 }}
            onClick={() => toast('Top-ups are coming soon — buy a fresh pack for now')}>Top up</button>
          <button className="pill pill-white" style={{ padding: '11px 20px', fontSize: 14 }} onClick={() => setOpen(v => !v)}>
            {open ? 'Hide details' : 'Details'}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: .22 }}
            style={{ overflow: 'hidden', background: 'var(--cream-deep)' }}>
            <div style={{ padding: '16px 22px', display: 'grid', gap: 8, fontSize: 13.5, fontWeight: 600 }}>
              {[['ICCID', e.iccid], ['SM-DP+ address', e.smdp_address], ['Matching ID', e.matching_id], ['Activation code', lpa]]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ color: 'var(--muted)', width: 130, flex: 'none' }}>{k}</span>
                    <code style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12.5 }}>{v}</code>
                    <button onClick={() => copy(v, k)} style={{ fontWeight: 800, fontSize: 12, color: 'var(--coral-deep)' }}>Copy</button>
                  </div>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function MyEsims() {
  const { user, ready, openAuth } = useAuth();
  const { countries } = useCatalogue();
  const toast = useToast();
  const [list, setList] = useState(null);
  const [filter, setFilter] = useState('all');
  const [install, setInstall] = useState(null); // esim row
  const [tab, setTab] = useState('ios');

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
      <p style={{ color: 'var(--muted)', fontWeight: 500, marginBottom: 22 }}>Your purchases are saved to your account and available on any device.</p>
      <button className="pill pill-coral" onClick={() => openAuth('login')}>Log in / Sign up</button>
    </div>
  );

  const shown = (list || []).filter(e =>
    filter === 'all' ? true : filter === 'active' ? e.status === 'active' : e.status !== 'active');

  const lpa = install?.lpa_string;
  const oneTap = lpa ? 'https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=' + encodeURIComponent(lpa) : null;

  return (
    <div className="container" style={{ padding: '30px 24px 80px', maxWidth: 780 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontSize: 'clamp(28px,4vw,38px)', fontWeight: 800 }}>My eSIMs</h1>
          <p style={{ color: 'var(--muted)', fontWeight: 500, marginTop: 6 }}>View, install and manage the eSIMs you've purchased.</p>
        </div>
        <Link className="pill pill-coral" to="/app" style={{ padding: '12px 24px', fontSize: 14.5 }}>+ New eSIM</Link>
      </div>

      {/* filter chips */}
      <div style={{ display: 'flex', gap: 8, margin: '20px 0 22px' }}>
        {[['all', 'All'], ['ready', 'Ready to install'], ['active', 'Active']].map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)} style={{
            padding: '9px 18px', borderRadius: 999, fontWeight: 700, fontSize: 13.5,
            background: filter === k ? 'var(--ink)' : '#fff', color: filter === k ? '#fff' : 'var(--ink)',
            boxShadow: '0 2px 8px rgba(22,24,42,.06)'
          }}>{label}</button>
        ))}
      </div>

      {list === null && [...Array(2)].map((_, i) => <Skeleton key={i} h={150} r={20} style={{ marginBottom: 16 }} />)}

      {list && shown.length === 0 && (
        <div style={{ background: '#fff', borderRadius: 22, padding: '44px 24px', textAlign: 'center', boxShadow: '0 3px 14px rgba(22,24,42,.06)' }}>
          <div style={{ fontSize: 40 }}>✈️</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: '10px 0 6px' }}>
            {filter === 'all' ? 'No eSIMs yet' : 'Nothing here'}
          </h2>
          <p style={{ color: 'var(--muted)', fontWeight: 500, marginBottom: 18 }}>Your next trip starts here.</p>
          <Link className="pill pill-coral" to="/app">Browse destinations</Link>
        </div>
      )}

      <div style={{ display: 'grid', gap: 16 }}>
        {shown.map((e, i) => (
          <EsimCard key={e.iccid + i} e={e}
            c={countries.find(x => x.n === (e.orders || {}).country_name)}
            toast={toast} onInstall={setInstall} />
        ))}
      </div>

      {/* install modal */}
      <Modal open={!!install} onClose={() => setInstall(null)} maxWidth={430}>
        {install && (
          <div style={{ padding: '30px 28px', textAlign: 'center' }}>
            <h2 style={{ fontFamily: 'var(--head)', fontWeight: 800, fontSize: 21, marginBottom: 4 }}>
              Install {install.orders?.country_name} eSIM
            </h2>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 16 }}>One code installs on one device, once.</p>
            <img alt="eSIM QR code"
              src={'https://api.qrserver.com/v1/create-qr-code/?size=190x190&data=' + encodeURIComponent(lpa)}
              style={{ width: 180, height: 180, background: '#fff', borderRadius: 14, padding: 8 }} />
            <div style={{ display: 'flex', background: 'var(--cream-deep)', borderRadius: 999, padding: 4, margin: '18px auto 14px', maxWidth: 260 }}>
              {[['ios', ' iPhone'], ['android', '🤖 Android']].map(([k, label]) => (
                <button key={k} onClick={() => setTab(k)} style={{
                  flex: 1, padding: '8px 0', borderRadius: 999, fontWeight: 700, fontSize: 13.5,
                  background: tab === k ? 'var(--indigo)' : 'transparent', color: tab === k ? '#fff' : 'var(--ink)'
                }}>{label}</button>
              ))}
            </div>
            {tab === 'ios' ? (
              <div style={{ display: 'grid', gap: 10 }}>
                <a className="pill pill-coral" href={oneTap}>📱 One-tap install (iOS 17.4+)</a>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted)', textAlign: 'left', lineHeight: 1.7 }}>
                  Older iOS: Settings → Mobile Data → <b>Add eSIM</b> → scan the QR from another screen.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                <button className="pill pill-coral" onClick={() => { navigator.clipboard.writeText(lpa); toast('Activation code copied'); }}>
                  Copy activation code
                </button>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted)', textAlign: 'left', lineHeight: 1.7 }}>
                  Settings → Connections / Network → <b>SIM manager → Add eSIM</b> → scan the QR or paste the code.
                </p>
              </div>
            )}
            <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)', marginTop: 14 }}>
              Stuck? Ask Yatri Sahayak — the chat bubble knows this order.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
