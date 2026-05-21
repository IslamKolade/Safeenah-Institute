// ============================================================
// SAFEENAH CONFIG — single source of truth for pricing & currency.
// Every price rendered anywhere in the site/portal reads from here.
// ============================================================

const PRICING = {
  beginner:         { ngn: 8000,  usd: 5,  name: "Beginner — Qa'idah",      schedule: "4 sessions/week · 30 min",      size: "5–6 students" },
  tilawah:          { ngn: 10000, usd: 6,  name: "Tilawah & Tajweed",       schedule: "3–4 sessions/week · 45 min",    size: "4–5 students" },
  'standard-hifdh': { ngn: 15000, usd: 9,  name: "Standard Hifdh",          schedule: "4 sessions/week · 45–60 min",   size: "4–6 students" },
  'fast-track':     { ngn: 25000, usd: 15, name: "Fast-Track Hifdh",        schedule: "5 + 1 sessions/week · 60–75 min", size: "3–4 students" },
  murajaah:         { ngn: 8000,  usd: 5,  name: "Muraja'ah & Retention",   schedule: "2–3 sessions/week · 45 min",    size: "4–6 students" }
};

const CURRENCY = {
  active: (typeof localStorage !== 'undefined' && localStorage.getItem('safeenah_currency')) || 'ngn',
  symbol: { ngn: '₦', usd: '$' },
  label:  { ngn: 'Naira (₦)', usd: 'USD ($)' }
};

// Prepaid discounts (months -> % off)
const DISCOUNTS = [
  { minMonths: 12, pct: 10, label: 'Annual — save 10%' },
  { minMonths: 6,  pct: 8,  label: 'Bi-annual — save 8%' },
  { minMonths: 3,  pct: 5,  label: 'Quarterly — save 5%' }
];

function discountFor(months) {
  return DISCOUNTS.find(d => months >= d.minMonths) || { pct: 0, label: '' };
}

function formatPrice(amount, currency = CURRENCY.active) {
  const sym = CURRENCY.symbol[currency];
  return sym + Number(amount).toLocaleString('en-US');
}

function priceFor(trackKey, currency = CURRENCY.active) {
  const t = PRICING[trackKey];
  if (!t) return '';
  return formatPrice(t[currency], currency);
}

// Update every [data-price-track] node + currency labels in the DOM
function renderPrices(root = document) {
  root.querySelectorAll('[data-price-track]').forEach(el => {
    const key = el.dataset.priceTrack;
    const t = PRICING[key];
    if (!t) return;
    const amount = t[CURRENCY.active];
    const sym = CURRENCY.symbol[CURRENCY.active];
    const small = el.dataset.suffix || '/month';
    el.innerHTML = `${sym}${amount.toLocaleString('en-US')}<small>${small}</small>`;
  });
  root.querySelectorAll('[data-currency-label]').forEach(el => {
    el.textContent = CURRENCY.label[CURRENCY.active];
  });
  root.querySelectorAll('.currency-toggle button').forEach(b => {
    b.classList.toggle('active', b.dataset.cur === CURRENCY.active);
  });
  const note = root.querySelector('[data-currency-note]');
  if (note) {
    note.textContent = CURRENCY.active === 'usd'
      ? 'International students are invoiced in USD and pay by card. Nigerian students may pay via bank transfer or card.'
      : 'Nigerian students may pay via bank transfer or card. International students pay in USD by card.';
  }
}

function setCurrency(code) {
  if (!['ngn','usd'].includes(code)) return;
  CURRENCY.active = code;
  try { localStorage.setItem('safeenah_currency', code); } catch(_) {}
  renderPrices(document);
  // Notify any listeners (dashboard tabs etc.)
  window.dispatchEvent(new CustomEvent('safeenah:currency', { detail: { code } }));
}

// Wire up any .currency-toggle button group on load
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.currency-toggle').forEach(group => {
    group.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => setCurrency(btn.dataset.cur));
    });
  });
  renderPrices(document);
});