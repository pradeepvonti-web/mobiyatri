// MobiYatri backend — multi-vendor eSIM engine.
// Zero-dependency (Node 18+). Run:  node server.js   |   node server.js sync
//
// Providers plug in as adapters that normalize to one offer shape; the engine
// merges catalogues and routes each package to the cheapest vendor. Bundle IDs
// are namespaced ("esimgo:NAME", "esimaccess:CODE", "mock:...") so orders route
// back to the vendor that owns them. With no vendor keys in .env, the mock
// provider serves the same shapes so the app works identically.
const http = require('http');
const fs = require('fs');
const path = require('path');

// tiny .env loader
try {
  fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/).forEach(l => {
    const m = l.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  });
} catch {}

const PORT = +(process.env.PORT || 4000);
const USD_INR = +(process.env.USD_INR || 88);
const MARGIN = +(process.env.MARGIN || 1.35);

// wholesale USD -> retail INR, rounded to a ₹xx9 price point
const inr = usd => Math.max(49, Math.round(usd * USD_INR * MARGIN / 10) * 10 - 1);

const COUNTRY_META = {
  ae: ['UAE (Dubai)', 'Etisalat'], th: ['Thailand', 'AIS'], sg: ['Singapore', 'StarHub'],
  id: ['Indonesia (Bali)', 'Telkomsel'], vn: ['Vietnam', 'Viettel'], us: ['United States', 'T-Mobile'],
  gb: ['United Kingdom', 'O2'], my: ['Malaysia', 'Maxis'], lk: ['Sri Lanka', 'Dialog'],
  np: ['Nepal', 'Ncell'], jp: ['Japan', 'SoftBank'], kr: ['South Korea', 'SK Telecom'],
  sa: ['Saudi Arabia', 'STC'], tr: ['Türkiye', 'Turkcell'], fr: ['France', 'Orange'],
  it: ['Italy', 'TIM'], ch: ['Switzerland', 'Swisscom'], au: ['Australia', 'Optus'],
  mv: ['Maldives', 'Dhiraagu'], ge: ['Georgia', 'Magti'],
};
const POPULAR = ['ae', 'th', 'sg', 'id', 'vn', 'us', 'gb', 'my'];

const REGION_TITLES = { asia: 'Asia', gulf: 'Gulf & Middle East', europe: 'Europe', africa: 'Africa', na: 'Americas', global: 'Global' };
// Multi-country packs are classified into region buckets by their name/description.
function classifyRegion(text, locCount) {
  const s = (text || '').toLowerCase();
  if (/global|world/.test(s)) return 'global';
  if (/asia/.test(s)) return 'asia';
  if (/europe/.test(s)) return 'europe';
  if (/middle ?east|gulf|gcc/.test(s)) return 'gulf';
  if (/africa/.test(s)) return 'africa';
  if (/america|latam|caribbean/.test(s)) return 'na';
  return locCount >= 60 ? 'global' : null;   // very large unnamed packs are effectively global
}

/* ================================================================
   Offer shape (normalized across vendors):
   { iso, label ("1 GB"|"Unlimited"), days, priceINR, bundle ("vendor:id"), operator? }
   ================================================================ */

/* ---------------- provider: mock ---------------- */
const STD = [['7 days', [['1 GB', 1], ['3 GB', 2.2]]], ['15 days', [['5 GB', 3.2], ['10 GB', 5.2]]], ['30 days', [['10 GB', 6], ['20 GB', 9.5]]]];
const UNL = [['5 days', [['Unlimited', 8]]], ['10 days', [['Unlimited', 13]]]];
const mockProvider = {
  name: 'mock',
  enabled: () => true,
  async offers() {
    const out = [];
    for (const iso of Object.keys(COUNTRY_META)) {
      const base = { ae: 399, th: 329, sg: 349, id: 379, vn: 299, us: 449, gb: 399, my: 329, lk: 279, np: 249, jp: 429, kr: 429, sa: 449, tr: 399, fr: 379, it: 379, ch: 429, au: 399, mv: 499, ge: 349 }[iso];
      for (const [days, list] of [...STD, ...UNL]) {
        for (const [label, mult] of list) {
          out.push({
            iso, label, days,
            priceINR: Math.round(base * mult / 10) * 10 - 1,
            bundle: `mock:${label.replace(' ', '')}_${days.replace(' ', '')}_${iso.toUpperCase()}`,
          });
        }
      }
    }
    return out;
  },
  async order() {
    const iccid = '8944' + String(Math.floor(1e14 + Math.random() * 9e14));
    const matchingId = 'MOCK-' + Math.random().toString(36).slice(2, 10).toUpperCase();
    const smdp = 'rsp.example.esim-go.com';
    return {
      orderReference: 'MY-' + Date.now().toString(36).toUpperCase(),
      esim: { iccid, smdpAddress: smdp, matchingId, lpa: `LPA:1$${smdp}$${matchingId}` },
    };
  },
};

/* ---------------- provider: eSIM Go (v2.5) ---------------- */
const esimgoProvider = {
  name: 'esimgo',
  base: 'https://api.esim-go.com/v2.5',
  key: () => process.env.ESIMGO_API_KEY || '',
  enabled() { return !!this.key(); },
  async api(p, opts = {}) {
    const r = await fetch(this.base + p, {
      ...opts,
      headers: { 'X-API-Key': this.key(), 'Content-Type': 'application/json', ...(opts.headers || {}) },
    });
    if (!r.ok) throw new Error(`eSIM Go ${r.status}: ${await r.text()}`);
    return r.json();
  },
  async offers() {
    // v2.5 bundle fields: name, price (org currency, USD), dataAmount (MB),
    // duration (days), unlimited, countries[{name, region, iso}], groups, speed
    const bundles = [];
    for (let page = 1; page <= 15; page++) {
      const data = await this.api(`/catalogue?perPage=1000&page=${page}`);
      const chunk = data.bundles || data;
      if (!Array.isArray(chunk) || !chunk.length) break;
      bundles.push(...chunk);
      if (chunk.length < 1000) break;
    }
    const out = [];
    for (const b of bundles) {
      const list = b.countries || [];
      const iso = ((list[0] && list[0].iso) || '').toLowerCase();
      const base = {
        label: b.unlimited ? 'Unlimited' : `${Math.max(1, Math.round((b.dataAmount || 0) / 1000))} GB`,
        days: `${b.duration} days`,
        priceINR: inr(b.price),
        bundle: `esimgo:${b.name}`,
      };
      if (list.length === 1 && /^[a-z]{2}$/.test(iso)) {
        out.push({ kind: 'country', iso, ...base });
      } else if (list.length > 1) {
        const region = classifyRegion(`${b.description || ''} ${b.name || ''}`, list.length);
        if (region) out.push({ kind: 'region', region, count: list.length, ...base });
      }
    }
    return out;
  },
  async order(bundleName) {
    const o = await this.api('/orders', {
      method: 'POST',
      body: JSON.stringify({ type: 'transaction', assign: true, order: [{ type: 'bundle', item: bundleName, quantity: 1 }] }),
    });
    const e = o.order?.[0]?.esims?.[0] || {};
    return {
      orderReference: o.orderReference,
      esim: {
        iccid: e.iccid, smdpAddress: e.smdpAddress, matchingId: e.matchingId,
        lpa: e.smdpAddress ? `LPA:1$${e.smdpAddress}$${e.matchingId}` : undefined,
      },
    };
  },
  async balance() {
    try {
      const o = await this.api('/organisation');
      return o.balance ?? o.organisation?.balance ?? o.organisations?.[0]?.balance ?? null;
    } catch { return null; }
  },
};

/* ---------------- provider: eSIM Access ---------------- */
// Auth: RT-AccessCode header. Prices are in 1/10000 USD. volume is bytes.
// Flow: package/list -> esim/order (returns orderNo) -> esim/query (returns iccid + ac).
// NOTE: verify field names against your account once you have an access code.
const esimaccessProvider = {
  name: 'esimaccess',
  base: 'https://api.esimaccess.com/api/v1/open',
  key: () => process.env.ESIMACCESS_ACCESS_CODE || '',
  enabled() { return !!this.key(); },
  async api(p, body) {
    const r = await fetch(this.base + p, {
      method: 'POST',
      headers: { 'RT-AccessCode': this.key(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
    if (!r.ok) throw new Error(`eSIM Access ${r.status}: ${await r.text()}`);
    const j = await r.json();
    if (j.success === false) throw new Error(`eSIM Access: ${j.errorMsg || j.errorCode}`);
    return j.obj ?? j;
  },
  async offers() {
    const data = await this.api('/package/list', {});
    const packages = data.packageList || [];
    const out = [];
    for (const p of packages) {
      const locs = String(p.location || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      const gb = (p.volume || 0) / (1024 * 1024 * 1024);
      const unlimited = p.unusedValidTime === -1 || gb >= 200;
      const base = {
        label: unlimited ? 'Unlimited' : `${Math.max(1, Math.round(gb))} GB`,
        days: `${p.duration} days`,
        priceINR: inr((p.price || 0) / 10000),
        bundle: `esimaccess:${p.packageCode}|${p.price}`,
      };
      if (locs.length === 1 && /^[a-z]{2}$/.test(locs[0])) {
        out.push({ kind: 'country', iso: locs[0], ...base });
      } else {
        // multi-country packs and region-token locations (e.g. "AFRICA") -> region buckets
        const region = classifyRegion(`${p.name || ''} ${p.slug || ''} ${locs.length === 1 ? locs[0] : ''}`, locs.length);
        if (region) out.push({ kind: 'region', region, count: locs.length > 1 ? locs.length : 0, ...base });
      }
    }
    return out;
  },
  async order(rest) {
    const [packageCode, price] = rest.split('|');
    const transactionId = 'MY-' + Date.now().toString(36).toUpperCase();
    const ord = await this.api('/esim/order', {
      transactionId, amount: +price,
      packageInfoList: [{ packageCode, count: 1, price: +price }],
    });
    const orderNo = ord.orderNo;
    // poll for the allocated profile (usually ready within seconds)
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 1500));
      const q = await this.api('/esim/query', { orderNo, pager: { pageNum: 1, pageSize: 10 } });
      const e = (q.esimList || [])[0];
      if (e && e.iccid && e.ac) {
        const [, smdp, matchingId] = e.ac.split('$');
        return { orderReference: orderNo, esim: { iccid: e.iccid, smdpAddress: smdp, matchingId, lpa: e.ac, qrCodeUrl: e.qrCodeUrl } };
      }
    }
    return { orderReference: orderNo, esim: { pending: true } };
  },
  async balance() {
    try { const b = await this.api('/balance/query', {}); return (b.balance ?? 0) / 10000; }
    catch { return null; }
  },
};

const PROVIDERS = [esimgoProvider, esimaccessProvider];
// Vendors listed in VENDOR_DISABLE (comma-separated) keep their keys but are
// excluded from the catalogue and ordering — e.g. unfunded accounts.
const DISABLED = (process.env.VENDOR_DISABLE || '').split(',').map(s => s.trim()).filter(Boolean);
for (const p of PROVIDERS) {
  const was = p.enabled.bind(p);
  p.enabled = () => was() && !DISABLED.includes(p.name);
}

/* ---------------- catalogue engine ---------------- */
async function buildCatalogue() {
  const live = PROVIDERS.filter(p => p.enabled());
  let offers = [], mode;
  if (live.length) {
    mode = 'live:' + live.map(p => p.name).join('+');
    const results = await Promise.allSettled(live.map(p => p.offers()));
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') offers.push(...r.value);
      else console.error(`${live[i].name} catalogue failed:`, r.reason.message);
    });
    if (!offers.length) { mode = 'mock'; offers = await mockProvider.offers(); }
  } else {
    mode = 'mock';
    offers = await mockProvider.offers();
  }
  // merge: per (scope, label, days) keep the cheapest vendor's offer
  const bestC = new Map(), bestR = new Map(), regionCount = {};
  for (const o of offers) {
    if ((o.kind || 'country') === 'country') {
      const k = `${o.iso}|${o.label}|${o.days}`;
      if (!bestC.has(k) || o.priceINR < bestC.get(k).priceINR) bestC.set(k, o);
    } else {
      const k = `${o.region}|${o.label}|${o.days}`;
      if (!bestR.has(k) || o.priceINR < bestR.get(k).priceINR) bestR.set(k, o);
      regionCount[o.region] = Math.max(regionCount[o.region] || 0, o.count || 0);
    }
  }
  const dayNum = d => parseInt(d) || 0;
  const toGroups = o => Object.entries(o)
    .sort((a, b) => dayNum(a[0]) - dayNum(b[0]))
    .map(([d, list]) => ({ d, list: list.sort((a, b) => a.price - b.price) }));
  const packAndFrom = items => {
    const std = {}, unl = {};
    for (const o of items) ((o.label === 'Unlimited' ? unl : std)[o.days] ??= []).push({ label: o.label, price: o.priceINR, bundle: o.bundle });
    const packages = { std: toGroups(std), unl: toGroups(unl) };
    const all = [...packages.std, ...packages.unl].flatMap(g => g.list);
    return { packages, from: Math.min(...all.map(p => p.price)) };
  };
  // countries
  const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
  const isoName = iso => { try { return regionNames.of(iso.toUpperCase()) || iso.toUpperCase(); } catch { return iso.toUpperCase(); } };
  const byIso = {};
  for (const o of bestC.values()) (byIso[o.iso] ??= []).push(o);
  const countries = Object.entries(byIso).map(([iso, items]) => {
    const meta = COUNTRY_META[iso];
    return {
      iso, n: meta ? meta[0] : isoName(iso), op: meta ? meta[1] : 'Local networks',
      pop: POPULAR.includes(iso) ? 1 : undefined,
      ...packAndFrom(items),
    };
  }).sort((a, b) => a.n.localeCompare(b.n));
  // regional + global
  const byRegion = {};
  for (const o of bestR.values()) (byRegion[o.region] ??= []).push(o);
  const regionEntry = key => {
    const items = byRegion[key]; if (!items) return null;
    const count = regionCount[key] || 0;
    const n = key === 'global'
      ? `Global (${count ? count + '+' : '130+'} countries)`
      : `${REGION_TITLES[key]}${count ? ` (${count} countries)` : ''}`;
    return { icon: key, n, op: 'Multi-network', ...packAndFrom(items) };
  };
  const regions = ['asia', 'gulf', 'europe', 'africa', 'na'].map(regionEntry).filter(Boolean);
  const globalEntry = regionEntry('global');
  return { mode, countries, regions, global: globalEntry ? [globalEntry] : [] };
}

/* ---------------- order routing ---------------- */
async function placeOrder(bundle) {
  if (!bundle) throw new Error('bundle required');
  const i = bundle.indexOf(':');
  const vendor = i === -1 ? 'mock' : bundle.slice(0, i);      // legacy "MOCK_..." ids -> mock
  const rest = i === -1 ? bundle : bundle.slice(i + 1);
  if (vendor === 'mock') return { vendor, ...(await mockProvider.order(rest)) };
  const p = PROVIDERS.find(x => x.name === vendor);
  if (!p || !p.enabled()) throw new Error(`vendor ${vendor} not available`);
  return { vendor, ...(await p.order(rest)) };
}

/* ---------------- travel insurance (embedded adapter) ---------------- */
// Mock insurer shaped like embedded-insurance APIs (quote -> policy issue).
// Swap `mockInsurer` for a licensed partner adapter (Riskcovry / Zopper /
// Symbo style) once a partnership is signed. Until then every "policy" is a
// DEMO record — no real cover exists and the UI labels it as such.
const EU_ISO = new Set(['fr', 'it', 'ch', 'de', 'es', 'nl', 'pt', 'gr', 'at', 'be', 'se', 'no', 'dk', 'fi', 'ie', 'pl', 'cz', 'hu', 'gb', 'tr']);
const NA_ISO = new Set(['us', 'ca', 'mx']);
function insMult(iso, name) {
  const s = (name || '').toLowerCase();
  if ((iso && EU_ISO.has(iso)) || /europe/.test(s)) return 1.6;
  if ((iso && NA_ISO.has(iso)) || /america/.test(s)) return 1.8;
  if (/global/.test(s)) return 1.7;
  if (/africa/.test(s)) return 1.4;
  if (/gulf|middle east/.test(s)) return 1.1;
  return 1.0;
}
const mockInsurer = {
  quote({ iso, destination, days = 7, age = 30 }) {
    const ageMult = age > 60 ? 2.2 : age > 40 ? 1.4 : 1;
    const premium = Math.max(349, Math.round((30 + days * 28) * insMult(iso, destination) * ageMult / 10) * 10 - 1);
    return {
      quoteId: 'QT-' + Math.random().toString(36).slice(2, 10).toUpperCase(),
      premiumINR: premium, days,
      coverage: { medical: '$50,000', baggage: 'Covered', delay: 'Covered', evacuation: 'Covered' },
      provider: 'mock', demo: true,
    };
  },
  issue() {
    return {
      policyNumber: 'MYP-' + Date.now().toString(36).toUpperCase(),
      status: 'active', provider: 'mock', demo: true,
    };
  },
};

/* ---------------- AI setup assistant (Claude) ---------------- */
const ASSISTANT_MODEL = process.env.ASSISTANT_MODEL || 'claude-opus-5';
const ASSISTANT_SYSTEM = `You are Yatri Sahayak, the in-app support assistant for MobiYatri, an eSIM store for Indian travellers going abroad.

Your job: help customers choose, install, activate, and troubleshoot travel eSIMs. Be warm, direct, and brief — 2 to 4 short sentences per reply unless step-by-step instructions are needed. Reply in the language the customer uses: English, Hindi (Devanagari), or Hinglish. Greet with "Namaste" naturally, never robotically.

Product knowledge:
- MobiYatri sells prepaid data eSIMs for 190+ countries plus regional packs (Asia, Europe, Gulf, Africa, Americas, Global). Prices in INR. Purchases appear in the "My eSIMs" tab and the QR code is emailed after purchase.
- Installation: stay on Wi-Fi; scan the QR from the email with the phone camera, or go to Settings > Mobile Data > Add eSIM (iPhone) / Settings > SIMs > Add eSIM (Android). Install BEFORE flying. One QR = one install on one device.
- Validity starts only when the eSIM first connects to a network in its coverage area, not at purchase or install. Buying and installing early is safe.
- On landing: enable the MobiYatri line and turn data roaming ON for that line ONLY. Keep data roaming OFF on the Indian SIM (Jio/Airtel/Vi) to avoid roaming charges. Keep the Indian SIM active for incoming SMS/OTP if the phone supports dual SIM.
- These are data-only eSIMs: no local phone number, no calls/SMS. WhatsApp calls, maps, and apps work normally.
- Troubleshooting "no network": confirm the traveller is inside the coverage area, MobiYatri line is ON, data roaming ON for that line, then restart the phone. Check APN only if still failing.
- Compatibility: iPhone XS/XR and newer, Google Pixel 3+, Samsung S20+ and most flagships after 2020 support eSIM. Phones must be network-unlocked. Check: dial *#06# — an EID number means eSIM is supported.
- Top-ups: available from the eSIM detail screen once a pack runs low.
- Travel insurance: MobiYatri refers customers to IRDAI-licensed insurers via partners (Profile > Travel insurance). Single-trip cover from ~Rs.350; Schengen visas REQUIRE insurance with at least EUR 30,000 medical cover. MobiYatri itself does not sell or underwrite insurance — quotes, purchase, and claims happen with the insurer.

Rules:
- Use the customer context block (their device, the country they are browsing, their purchased eSIMs) to give specific answers — reference their actual eSIM by country when relevant.
- Never invent order details, prices, or refund promises. For refunds, payment problems, or anything you cannot resolve, tell them to tap "Chat on WhatsApp" in the app for human support.
- Never ask for passwords, OTPs, or payment details.`;

function mockAssistant(messages) {
  const last = String((messages[messages.length - 1] || {}).content || '').toLowerCase();
  if (/install|qr|setup/.test(last)) return 'To install: stay on Wi-Fi, open Settings → Mobile Data → Add eSIM, and scan the QR from your email. Install before you fly — validity only starts when you connect abroad!';
  if (/not work|no network|problem|issue/.test(last)) return 'Check that data roaming is ON for your MobiYatri line and OFF for your Jio/Airtel/Vi SIM, then restart your phone. Still stuck? Tap "Chat on WhatsApp" for human help.';
  return 'Namaste! I can help with choosing, installing, and troubleshooting your eSIM. (Demo mode — add ANTHROPIC_API_KEY in .env for the full AI assistant.)';
}

async function askAssistant(messages, context) {
  const key = process.env.ANTHROPIC_API_KEY || '';
  // drop leading assistant turns; the API requires the first message to be from the user
  while (messages.length && messages[0].role !== 'user') messages.shift();
  if (!messages.length) messages = [{ role: 'user', content: 'Hello' }];
  if (!key) return { reply: mockAssistant(messages), live: false };
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: ASSISTANT_MODEL,
      max_tokens: 1024,
      output_config: { effort: 'low' },
      system: [
        { type: 'text', text: ASSISTANT_SYSTEM, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: 'Customer context (from the app, may be partial):\n' + JSON.stringify(context) },
      ],
      messages,
    }),
  });
  if (!r.ok) throw new Error('assistant ' + r.status + ': ' + await r.text());
  const j = await r.json();
  if (j.stop_reason === 'refusal') {
    return { reply: "Sorry, I can't help with that one — tap \"Chat on WhatsApp\" for human support.", live: true };
  }
  const text = (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
  return { reply: text || 'Sorry, I could not generate a reply — please try again.', live: true };
}

/* ---------------- delivery email (Resend) ---------------- */
async function sendDeliveryEmail(toEmail, info) {
  const key = process.env.RESEND_API_KEY || '';
  if (!key || !toEmail || !info.esim || !info.esim.lpa) return false;
  const qr = info.esim.qrCodeUrl ||
    ('https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=' + encodeURIComponent(info.esim.lpa));
  const oneTap = 'https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=' + encodeURIComponent(info.esim.lpa);
  const html = `
  <div style="margin:0;padding:24px;background:#F6F2EA;font-family:Segoe UI,Arial,sans-serif;color:#23253A">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden">
      <div style="background:#33386E;padding:22px 28px">
        <span style="font-size:22px;font-weight:800;color:#ffffff"><span style="color:#FF6B57">mobi</span>yatri</span>
        <span style="float:right;font-size:13px;color:#C9CBE0;padding-top:6px">Order ${info.orderReference || ''}</span>
      </div>
      <div style="padding:28px">
        <h1 style="font-size:20px;margin:0 0 6px">Your ${info.country || ''} eSIM is ready 🎉</h1>
        <p style="font-size:14px;color:#7C7D90;margin:0 0 20px">${info.package || ''} · ₹${info.price || ''} — Shubh Yatra!</p>
        <div style="text-align:center;background:#F6F2EA;border-radius:12px;padding:20px;margin-bottom:20px">
          <img src="${qr}" width="220" height="220" alt="eSIM QR code" style="display:inline-block;background:#fff;border-radius:8px;padding:8px"/>
          <p style="font-size:12px;color:#7C7D90;margin:10px 0 0">Scan with your phone's camera, or install from the MobiYatri app</p>
        </div>
        <a href="${oneTap}" style="display:block;background:#33386E;color:#ffffff;text-align:center;border-radius:999px;padding:15px;font-weight:700;font-size:15px;text-decoration:none;margin-bottom:8px">On iPhone? Tap to install in one step</a>
        <p style="font-size:12px;color:#7C7D90;text-align:center;margin:0 0 18px">Opens the eSIM installer directly (iOS 17.4+). Android: scan the QR above, or Settings → SIM manager → Add eSIM → enter the activation code below manually.</p>
        <table style="width:100%;font-size:13px;border-collapse:collapse">
          <tr><td style="padding:6px 0;color:#7C7D90">ICCID</td><td style="text-align:right;font-family:monospace">${info.esim.iccid || ''}</td></tr>
          <tr><td style="padding:6px 0;color:#7C7D90">Activation code</td><td style="text-align:right;font-family:monospace;font-size:11px;word-break:break-all">${info.esim.lpa}</td></tr>
        </table>
        <div style="border-top:1px solid #EBEAF1;margin:18px 0;padding-top:18px;font-size:13.5px;line-height:1.7">
          <b>How to install</b><br>
          1. Stay on Wi-Fi and scan the QR (Settings → Mobile Data → Add eSIM)<br>
          2. Install before you fly — validity starts only when you connect abroad<br>
          3. When you land, turn ON data roaming for your MobiYatri line only<br>
          4. Keep data roaming OFF on your Jio / Airtel / Vi line to avoid charges
        </div>
        <p style="font-size:12px;color:#7C7D90;margin:14px 0 0">Need help? Reply to this email — support in English and हिन्दी.</p>
      </div>
    </div>
    <p style="text-align:center;font-size:11px;color:#989AAC;margin:16px 0 0">MobiYatri · Made in India with ❤️ · शुभ यात्रा</p>
  </div>`;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL || 'MobiYatri <onboarding@resend.dev>',
        to: [toEmail],
        subject: `Your ${info.country || 'travel'} eSIM is ready — Shubh Yatra!`,
        html,
      }),
    });
    if (!r.ok) { console.error('resend failed:', r.status, await r.text()); return false; }
    return true;
  } catch (e) { console.error('resend error:', e.message); return false; }
}

/* ---------------- Supabase persistence (service role) ---------------- */
const SB_URL = process.env.SUPABASE_URL || '';
const SB_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function sbFetch(p, opts = {}) {
  const r = await fetch(SB_URL + p, {
    ...opts,
    headers: {
      apikey: SB_SERVICE, Authorization: 'Bearer ' + SB_SERVICE,
      'Content-Type': 'application/json', Prefer: 'return=representation',
      ...(opts.headers || {}),
    },
  });
  if (!r.ok) throw new Error('supabase ' + r.status + ': ' + await r.text());
  return r.status === 204 ? null : r.json();
}
async function getUserFromToken(token) {
  const r = await fetch(SB_URL + '/auth/v1/user', { headers: { apikey: SB_SERVICE, Authorization: 'Bearer ' + token } });
  return r.ok ? r.json() : null;
}

/* ---------------- catalogue -> Supabase sync ---------------- */
async function syncToSupabase() {
  if (!SB_URL || !SB_SERVICE) { console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env'); process.exit(1); }
  const cat = await buildCatalogue();
  const rows = [
    ...cat.countries.map(c => ({
      iso: c.iso, name: c.n, operator: c.op, from_inr: c.from,
      popular: !!c.pop, packages: c.packages,
    })),
    // region/global rows: iso is null, icon+kind tucked into the packages jsonb
    ...[...cat.regions, ...cat.global].map(r => ({
      iso: null, name: r.n, operator: r.op, from_inr: r.from, popular: false,
      packages: { ...r.packages, meta: { icon: r.icon, kind: r.icon === 'global' ? 'global' : 'regional' } },
    })),
  ];
  const h = { apikey: SB_SERVICE, Authorization: 'Bearer ' + SB_SERVICE, 'Content-Type': 'application/json' };
  const del = await fetch(SB_URL + '/rest/v1/catalogue_cache?id=gt.0', { method: 'DELETE', headers: h });
  if (!del.ok) { console.error('delete failed:', del.status, await del.text()); process.exit(1); }
  const ins = await fetch(SB_URL + '/rest/v1/catalogue_cache', {
    method: 'POST', headers: { ...h, Prefer: 'return=minimal' }, body: JSON.stringify(rows),
  });
  if (!ins.ok) { console.error('insert failed:', ins.status, await ins.text()); process.exit(1); }
  console.log(`Synced ${rows.length} countries to Supabase (${cat.mode} catalogue)`);
}
if (process.argv[2] === 'sync') { syncToSupabase(); return; }

/* ---------------- http server ---------------- */
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.end(); return; }
  const send = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
  // static files — lets the app run at http://localhost:4000 (required for OAuth login redirects)
  const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.sql': 'text/plain', '.woff2': 'font/woff2', '.woff': 'font/woff', '.map': 'application/json' };
  const SITE_DIST = path.join(__dirname, 'site', 'dist');
  if (req.method === 'GET' && !req.url.startsWith('/api/')) {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    // React SPA (site/dist): serves the marketing site AND the full web app.
    // Any extension-less route falls back to index.html so client-side routing works
    // (/app, /country/:iso, /region/:name, /checkout, /my-esims, /profile).
    const SPA_EXEMPT = ['/privacy', '/terms', '/legacy'];
    if ((urlPath === '/' || urlPath.startsWith('/assets/') || !path.extname(urlPath)) && !SPA_EXEMPT.includes(urlPath)) {
      const wantFile = urlPath.startsWith('/assets/') ? urlPath : 'index.html';
      const distFp = path.join(SITE_DIST, wantFile);
      if (distFp.startsWith(SITE_DIST) && fs.existsSync(distFp) && fs.statSync(distFp).isFile()) {
        res.writeHead(200, { 'Content-Type': MIME[path.extname(distFp).toLowerCase()] || 'application/octet-stream' });
        res.end(fs.readFileSync(distFp)); return;
      }
    }
    if (urlPath === '/') urlPath = 'site.html';        // fallback if dist not built
    else if (urlPath === '/app' || urlPath === '/legacy') urlPath = 'index.html'; // legacy single-file app (fallback)
    else if (urlPath === '/privacy') urlPath = 'privacy.html';
    else if (urlPath === '/terms') urlPath = 'terms.html';
    const fp = path.join(__dirname, urlPath);
    if (!fp.startsWith(__dirname)) { res.writeHead(403); res.end(); return; }
    if (fs.existsSync(fp) && fs.statSync(fp).isFile()) {
      res.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream' });
      res.end(fs.readFileSync(fp)); return;
    }
    res.writeHead(404); res.end('not found'); return;
  }
  try {
    if (req.method === 'GET' && req.url === '/api/health') {
      const live = PROVIDERS.filter(p => p.enabled()).map(p => p.name);
      return send(200, { ok: true, mode: live.length ? 'live:' + live.join('+') : 'mock', providers: live });
    }
    if (req.method === 'GET' && req.url === '/api/providers') {
      const out = [];
      for (const p of PROVIDERS) {
        out.push({ name: p.name, enabled: p.enabled(), balanceUSD: p.enabled() && p.balance ? await p.balance() : null });
      }
      return send(200, { providers: out, supabasePersistence: !!(SB_URL && SB_SERVICE) });
    }
    if (req.method === 'GET' && req.url.startsWith('/api/catalogue')) return send(200, await buildCatalogue());
    if (req.method === 'POST' && req.url === '/api/insurance/quote') {
      let b = ''; for await (const ch of req) b += ch;
      return send(200, mockInsurer.quote(JSON.parse(b || '{}')));
    }
    if (req.method === 'POST' && req.url === '/api/insurance/policy') {
      let b = ''; for await (const ch of req) b += ch;
      const body = JSON.parse(b || '{}');
      const pol = mockInsurer.issue(body);
      pol.persisted = false;
      const token = (req.headers.authorization || '').replace(/^Bearer /, '');
      if (SB_URL && SB_SERVICE && token) {
        const user = await getUserFromToken(token);
        if (user && user.id) {
          try {
            await sbFetch('/rest/v1/policies', {
              method: 'POST',
              body: JSON.stringify({
                user_id: user.id, policy_number: pol.policyNumber,
                destination: body.destination || null, premium_inr: body.premium || 0,
                days: body.days || null, provider: 'mock',
              }),
            });
            pol.persisted = true;
          } catch {} // policies table may not exist yet — run supabase/add_insurance.sql
        }
      }
      return send(200, pol);
    }
    if (req.method === 'POST' && req.url === '/api/assistant') {
      let b = ''; for await (const ch of req) b += ch;
      const body = JSON.parse(b || '{}');
      const context = body.context || {};
      // enrich with the customer's real eSIMs when they're signed in
      const token = (req.headers.authorization || '').replace(/^Bearer /, '');
      if (SB_URL && SB_SERVICE && token) {
        const user = await getUserFromToken(token);
        if (user && user.id) {
          try {
            const esims = await sbFetch(`/rest/v1/esims?user_id=eq.${user.id}&select=iccid,status,created_at,orders(country_name,package_label,price_inr)&order=created_at.desc&limit=3`);
            context.customer_email = user.email;
            context.purchased_esims = (esims || []).map(e => ({
              country: e.orders && e.orders.country_name, package: e.orders && e.orders.package_label,
              price_inr: e.orders && e.orders.price_inr, status: e.status, iccid: e.iccid,
            }));
          } catch {}
        }
      }
      return send(200, await askAssistant((body.messages || []).slice(-12), context));
    }
    if (req.method === 'POST' && req.url === '/api/orders') {
      let b = ''; for await (const ch of req) b += ch;
      const body = JSON.parse(b || '{}');
      const result = await placeOrder(body.bundle);
      // Persist to Supabase when configured AND the request carries a valid user session.
      // (Payment gate comes later — for now every order is treated as paid+provisioned.)
      const token = (req.headers.authorization || '').replace(/^Bearer /, '');
      if (SB_URL && SB_SERVICE && token) {
        const user = await getUserFromToken(token);
        if (user && user.id) {
          const [ord] = await sbFetch('/rest/v1/orders', {
            method: 'POST',
            body: JSON.stringify({
              user_id: user.id, bundle_id: body.bundle,
              country_name: body.country || null, package_label: body.package || null,
              price_inr: body.price || 0, status: 'provisioned',
            }),
          });
          const [es] = await sbFetch('/rest/v1/esims', {
            method: 'POST',
            body: JSON.stringify({
              order_id: ord.id, user_id: user.id,
              iccid: result.esim.iccid, smdp_address: result.esim.smdpAddress,
              matching_id: result.esim.matchingId, lpa_string: result.esim.lpa,
              status: 'assigned',
            }),
          });
          result.persisted = true; result.orderId = ord.id; result.esimId = es.id;
          result.emailSent = await sendDeliveryEmail(user.email, {
            orderReference: result.orderReference,
            country: body.country, package: body.package, price: body.price,
            esim: result.esim,
          });
        }
      }
      return send(200, result);
    }
    send(404, { error: 'not found' });
  } catch (e) { send(500, { error: String(e.message || e) }); }
});
server.listen(PORT, () => {
  const live = PROVIDERS.filter(p => p.enabled()).map(p => p.name);
  console.log(`MobiYatri backend on http://localhost:${PORT} — vendors: ${live.length ? live.join(', ') : 'mock (add keys in .env)'}`);
});
