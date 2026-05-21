// ============================================================
// SAFEENAH STUDENT PORTAL — vanilla JS
// All API hooks are mocked. Django integration points are marked
// with `// → METHOD /api/path/` comments throughout.
// ============================================================

/* ---------- Tiny helpers ---------- */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const sleep = ms => new Promise(r => setTimeout(r, ms));

function toast(msg, kind = '') {
  const t = document.createElement('div');
  t.className = 'toast ' + kind;
  t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; }, 3700);
  setTimeout(() => t.remove(), 4000);
}

function openModal(name)  { const m = $(`[data-modal="${name}"]`); if (m) m.hidden = false; }
function closeModal(name) { const m = $(`[data-modal="${name}"]`); if (m) m.hidden = true; }
function closeAllModals() { $$('.modal').forEach(m => m.hidden = true); }

document.addEventListener('click', e => {
  if (e.target.matches('[data-close]') || e.target.classList.contains('modal-close')) {
    e.target.closest('.modal').hidden = true;
  }
  // backdrop click
  if (e.target.classList.contains('modal')) e.target.hidden = true;
  // open triggers
  const opener = e.target.closest('[data-open]');
  if (opener) openModal(opener.dataset.open);
});

/* ---------- Mock state ---------- */
const STATE = {
  user: JSON.parse(localStorage.getItem('safeenah_user') || 'null'),
  enrolled: 'standard-hifdh',
  paidThrough: new Date(2026, 5, 30), // June 30, 2026
  paymentHistory: [
    { date: '2026-05-15', track: 'Standard Hifdh', period: 'Jun 2026', cur: 'ngn', amount: 15000, status: 'Paid' },
    { date: '2026-04-12', track: 'Standard Hifdh', period: 'May 2026', cur: 'ngn', amount: 15000, status: 'Paid' },
    { date: '2026-03-14', track: 'Standard Hifdh', period: 'Apr 2026', cur: 'ngn', amount: 15000, status: 'Paid' }
  ],
  notifications: [
    { id: 1, title: 'June payment for Standard Hifdh due in 3 days', meta: 'Today', unread: true, priceKey: 'standard-hifdh' },
    { id: 2, title: 'Your class starts in 1 hour — 5:00 PM WAT',     meta: '4:00 PM', unread: true },
    { id: 3, title: 'Your May progress report is ready — 94% retention', meta: 'Yesterday', unread: true },
    { id: 4, title: 'New track available: Seerah & Islamic Studies', meta: '2 days ago', unread: false },
    { id: 5, title: 'Clock-in window is now open',                   meta: '3 days ago', unread: false }
  ],
  classDays: [1,2,3,4], // Mon-Thu
  classTime: { h: 17, m: 0 } // 5:00 PM (local)
};

/* ---------- AUTH ---------- */
function showPane(name) {
  $$('.auth-pane').forEach(p => p.classList.toggle('hidden', p.dataset.pane !== name));
}

$$('[data-goto]').forEach(b => b.addEventListener('click', () => showPane(b.dataset.goto)));

// password show/hide
$$('.pw-toggle').forEach(btn => btn.addEventListener('click', () => {
  const input = btn.previousElementSibling;
  input.type = input.type === 'password' ? 'text' : 'password';
  btn.textContent = input.type === 'password' ? '👁' : '🙈';
}));

// password strength
function pwStrength(v) {
  let s = 0;
  if (v.length >= 8) s++;
  if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++;
  if (/\d/.test(v)) s++;
  if (/[^A-Za-z0-9]/.test(v) || v.length >= 12) s++;
  return Math.max(0, Math.min(4, s));
}
const pwLabels = ['Enter a password', 'Weak', 'Fair', 'Good', 'Strong'];
$('#signupPw')?.addEventListener('input', e => {
  const s = pwStrength(e.target.value);
  const meter = $('#pwStrength');
  meter.className = 'pw-strength s' + s;
  meter.querySelector('em').textContent = pwLabels[s];
});

// validation helper
function validateForm(form) {
  let ok = true;
  $$('input, select, textarea', form).forEach(el => {
    el.classList.remove('err');
    if (el.required && !el.value.trim()) { el.classList.add('err'); ok = false; }
    if (el.type === 'email' && el.value && !/^\S+@\S+\.\S+$/.test(el.value)) { el.classList.add('err'); ok = false; }
    if (el.minLength > 0 && el.value && el.value.length < el.minLength) { el.classList.add('err'); ok = false; }
  });
  return ok;
}

async function submitLoading(btn, fn) {
  const orig = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = 'Please wait…';
  try { await fn(); } finally { btn.disabled = false; btn.innerHTML = orig; }
}

/* LOGIN */
$('#loginForm')?.addEventListener('submit', e => {
  e.preventDefault();
  if (!validateForm(e.target)) { toast('Please check your email & password', 'err'); return; }
  const data = Object.fromEntries(new FormData(e.target));
  submitLoading(e.target.querySelector('button[type=submit]'), async () => {
    // → POST /api/auth/login/  body: {email, password}
    await sleep(700);
    openOtp(data.email);
  });
});

/* SIGNUP */
$('#signupForm')?.addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target;
  if (!validateForm(f)) { toast('Please complete all fields', 'err'); return; }
  const data = Object.fromEntries(new FormData(f));
  if (data.password !== data.confirm) { toast('Passwords do not match', 'err'); return; }
  if (pwStrength(data.password) < 2) { toast('Choose a stronger password', 'err'); return; }
  submitLoading(f.querySelector('button[type=submit]'), async () => {
    // → POST /api/auth/register/  body: {name, email, phone, location, track, password}
    await sleep(800);
    // Save location → default currency
    setCurrency(data.location);
    STATE.user = { name: data.name, email: data.email, phone: (data.cc + ' ' + data.phone), location: data.location };
    openOtp(data.email);
  });
});

/* FORGOT */
$('#forgotForm')?.addEventListener('submit', e => {
  e.preventDefault();
  if (!validateForm(e.target)) return;
  submitLoading(e.target.querySelector('button[type=submit]'), async () => {
    // → POST /api/auth/password/forgot/  body: {email}
    await sleep(600);
    toast('Reset link sent — check your inbox 📬', 'ok');
    showPane('login');
  });
});

/* RESET */
$('#resetForm')?.addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target;
  const [pw, cf] = $$('input', f);
  if (pw.value !== cf.value) { toast('Passwords do not match', 'err'); return; }
  submitLoading(f.querySelector('button[type=submit]'), async () => {
    // → POST /api/auth/password/reset/  body: {token, password}
    await sleep(700);
    toast('Password reset — please sign in', 'ok');
    location.hash = '';
    showPane('login');
  });
});

/* CHANGE PASSWORD */
$('#changePwForm')?.addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target;
  const fd = Object.fromEntries(new FormData(f));
  if (fd.new !== fd.confirm) { toast('Passwords do not match', 'err'); return; }
  submitLoading(f.querySelector('button'), async () => {
    // → POST /api/auth/password/change/  body: {current, new}
    await sleep(600);
    toast('Password updated', 'ok');
    f.reset();
    closeModal('changePw');
  });
});

/* Hash router for reset link */
function checkHashRoute() {
  if (location.hash.startsWith('#reset-password')) {
    showPane('reset');
    openAuth();
  }
}
window.addEventListener('hashchange', checkHashRoute);

/* ---------- OTP ---------- */
let otpTimer;
function openOtp(email) {
  $('#otpEmail').textContent = email;
  openModal('otp');
  $$('#otpInputs input').forEach(i => i.value = '');
  $$('#otpInputs input')[0].focus();
  startOtpTimer();
}
function startOtpTimer() {
  let s = 30;
  const cd = $('#otpCountdown');
  const btn = $('#otpResend');
  btn.disabled = true;
  clearInterval(otpTimer);
  otpTimer = setInterval(() => {
    s--; cd.textContent = s;
    if (s <= 0) { clearInterval(otpTimer); btn.disabled = false; cd.parentElement.firstChild.textContent = 'Code expired · '; }
  }, 1000);
}
$('#otpResend')?.addEventListener('click', () => {
  // → POST /api/auth/otp/resend/
  toast('New code sent', 'ok'); startOtpTimer();
});
$('#otpWhatsApp')?.addEventListener('click', () => {
  // → POST /api/auth/otp/whatsapp/
  toast('Code sent to WhatsApp', 'ok');
});

$$('#otpInputs input').forEach((inp, i, arr) => {
  inp.addEventListener('input', () => {
    inp.value = inp.value.replace(/\D/g, '').slice(0,1);
    if (inp.value && arr[i+1]) arr[i+1].focus();
    const code = arr.map(a => a.value).join('');
    if (code.length === 6) verifyOtp(code);
  });
  inp.addEventListener('keydown', e => {
    if (e.key === 'Backspace' && !inp.value && arr[i-1]) arr[i-1].focus();
  });
});

async function verifyOtp(code) {
  // → POST /api/auth/otp/verify/  body: {email, code}
  await sleep(400);
  clearInterval(otpTimer);
  closeModal('otp');
  // Mock user if just logging in
  if (!STATE.user) STATE.user = { name: 'Ahmad Abdullahi', email: $('#otpEmail').textContent, location: CURRENCY.active };
  localStorage.setItem('safeenah_user', JSON.stringify(STATE.user));
  toast('Welcome back, ' + STATE.user.name.split(' ')[0] + ' 🌙', 'ok');
  enterDashboard();
}

/* ---------- SCREEN SWITCH ---------- */
function openAuth() {
  $('.screen-auth').classList.remove('hidden');
  $('.screen-dash').classList.add('hidden');
}
function enterDashboard() {
  $('.screen-auth').classList.add('hidden');
  $('.screen-dash').classList.remove('hidden');
  hydrateDashboard();
}

/* ---------- DASHBOARD INIT ---------- */
function hydrateDashboard() {
  $('#userName').textContent = STATE.user?.name?.split(' ')[0] || 'Student';
  $('#todayDate').textContent = new Date().toLocaleDateString(undefined, { weekday:'long', month:'long', day:'numeric' });

  // Announcement (dismissed?)
  if (!localStorage.getItem('safeenah_announce_dismissed')) $('#announce').classList.remove('hidden');

  renderEnrolled();
  renderOtherTracks();
  renderPayments();
  renderSchedule('week');
  renderRetentionChart();
  renderNotifications();
  updateClockIn();
  // pre-select profile location radio
  $$('input[name=loc]').forEach(r => r.checked = r.value === CURRENCY.active);
  renderPrices(document);
}

/* ---------- TAB SWITCH ---------- */
$$('.bottom-nav button').forEach(b => b.addEventListener('click', () => {
  const tab = b.dataset.tabGo;
  $$('.bottom-nav button').forEach(x => x.classList.toggle('active', x === b));
  $$('.tab').forEach(t => t.classList.toggle('hidden', t.dataset.tab !== tab));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}));

/* ---------- ANNOUNCEMENT ---------- */
$('#announceClose')?.addEventListener('click', () => {
  $('#announce').classList.add('hidden');
  localStorage.setItem('safeenah_announce_dismissed', '1');
});

/* ---------- CLOCK-IN ---------- */
let clockTimer;
function updateClockIn() {
  clearInterval(clockTimer);
  const card = $('#clockCard');
  const btn  = $('#clockInBtn');
  const cd   = $('#clockCountdown');
  if (!card) return;

  function tick() {
    const now = new Date();
    const day = now.getDay();
    // Find next class today or upcoming
    const start = new Date(now);
    start.setHours(STATE.classTime.h, STATE.classTime.m, 0, 0);
    let diff = start - now; // ms
    let isToday = STATE.classDays.includes(day) && diff > -30*60*1000;
    if (!isToday) {
      // search next class day in upcoming week
      for (let i = 1; i <= 7; i++) {
        const d = (day + i) % 7;
        if (STATE.classDays.includes(d)) {
          start.setDate(start.getDate() + i);
          diff = start - now;
          break;
        }
      }
    }
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const txt = diff > 0 ? (hours > 0 ? `${hours}h ${mins%60}m` : `${mins}m ${Math.floor((diff%60000)/1000)}s`) : 'now';
    cd.textContent = txt;
    // Clock-in window: 15 min before → 30 min after start, today only
    const minsToStart = diff / 60000;
    const inWindow = STATE.classDays.includes(day) && minsToStart <= 15 && minsToStart >= -30;
    if (inWindow) {
      btn.disabled = false; btn.title = '';
    } else {
      btn.disabled = true;
      btn.title = minsToStart > 15 ? `Opens in ${Math.ceil(minsToStart - 15)} minutes` : 'Window closed — contact your teacher if you attended';
    }
  }
  tick();
  clockTimer = setInterval(tick, 1000);
}
$('#clockInBtn')?.addEventListener('click', e => {
  // → POST /api/attendance/clock-in/
  e.target.disabled = true;
  e.target.textContent = '✓ Clocked in';
  toast('Clock-in recorded at ' + new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit'}), 'ok');
});

/* ---------- ENROLLED CLASSES ---------- */
function isPaid() { return new Date() <= STATE.paidThrough; }

function renderEnrolled() {
  const t = PRICING[STATE.enrolled];
  const paid = isPaid();
  const meetLink = 'https://meet.google.com/abc-defg-hij';
  $('#enrolledList').innerHTML = `
    <div class="card class-row">
      <div>
        <small class="eyebrow-sm">${paid ? 'Active' : 'Awaiting payment'}</small>
        <h3>${t.name} <span class="badge ${paid?'badge-ok':'badge-warn'}">${paid?'Paid':'Locked'}</span></h3>
        <div class="class-meta">
          <span>👨‍🏫 Ustadh Yusuf</span>
          <span>Mon–Thu · 5:00 PM WAT</span>
          <span class="gold">Juz 3 · Page 47</span>
          <span>Attendance: 6/8 sessions</span>
        </div>
        <div class="meet-row">
          ${paid
            ? `<a class="btn btn-primary" href="${meetLink}" target="_blank">Join Class →</a>
               <a class="btn btn-outline" href="data:text/calendar;charset=utf8,${encodeURIComponent(buildIcs())}" download="safeenah.ics">Add to Calendar</a>`
            : `<button class="btn btn-outline" disabled>🔒 <span class="locked">${meetLink}</span></button>
               <button class="btn btn-primary" id="payUnlock">Pay to Unlock · <span data-price-track="${STATE.enrolled}" data-suffix="/month">—</span></button>`
          }
        </div>
        <p class="muted" style="margin-top:8px;font-size:.85rem">Next class: tomorrow · 5:00 PM WAT</p>
      </div>
    </div>`;
  $('#payUnlock')?.addEventListener('click', () => openPay(STATE.enrolled));
  renderPrices($('#enrolledList'));
}

function renderOtherTracks() {
  const others = Object.keys(PRICING).filter(k => k !== STATE.enrolled);
  $('#otherTracks').innerHTML = others.map(k => {
    const t = PRICING[k];
    return `<div class="other-track">
      <h4>${t.name}</h4>
      <p class="muted" style="font-size:.85rem">${t.schedule} · ${t.size}</p>
      <div class="price" data-price-track="${k}">—</div>
      <a href="https://wa.me/2349155689294?text=I'd%20like%20a%20free%20assessment%20for%20${encodeURIComponent(t.name)}" target="_blank">Book Free Assessment →</a>
    </div>`;
  }).join('');
  renderPrices($('#otherTracks'));
}

/* ---------- PAYMENTS ---------- */
function renderPayments() {
  $('#nextDue').textContent = STATE.paidThrough.toLocaleDateString(undefined, { month:'long', day:'numeric', year:'numeric' });
  $('#payStatus').textContent = isPaid() ? 'Paid through ' + STATE.paidThrough.toLocaleDateString(undefined,{month:'short',year:'numeric'}) : 'Payment overdue';
  $('#payStatus').className = 'badge ' + (isPaid() ? 'badge-ok' : 'badge-err');
  $('#payHistory').innerHTML = STATE.paymentHistory.map(p => `
    <tr>
      <td>${p.date}</td>
      <td>${p.track}</td>
      <td>${p.period}</td>
      <td>${p.cur.toUpperCase()}</td>
      <td>${CURRENCY.symbol[p.cur]}${p.amount.toLocaleString('en-US')}</td>
      <td><span class="badge badge-ok">${p.status}</span></td>
    </tr>`).join('');
}
$('#openPayBtn')?.addEventListener('click', () => openPay(STATE.enrolled));

/* ---------- PAY MODAL ---------- */
const PAY = { months: 1, track: null };
function openPay(trackKey) {
  PAY.track = trackKey;
  PAY.months = 1;
  const t = PRICING[trackKey];
  $('#payTrackLabel').textContent = t.name + ' · ' + t.schedule;
  $('#monthsGrid').innerHTML = Array.from({length:12}, (_,i) => `<button class="month-pill ${i===0?'active':''}" data-m="${i+1}">${i+1}</button>`).join('');
  $$('#monthsGrid .month-pill').forEach(b => b.addEventListener('click', () => {
    $$('#monthsGrid .month-pill').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    PAY.months = +b.dataset.m;
    refreshPay();
  }));
  refreshPay();
  showPayStep(1);
  openModal('pay');
}
function refreshPay() {
  const t = PRICING[PAY.track];
  const per = t[CURRENCY.active];
  const base = per * PAY.months;
  const d = discountFor(PAY.months);
  const disc = Math.round(base * d.pct / 100);
  const total = base - disc;
  const sym = CURRENCY.symbol[CURRENCY.active];

  const dEl = $('#payDiscount');
  if (d.pct > 0) { dEl.classList.add('show'); dEl.innerHTML = `🎉 ${d.label} — you save ${sym}${disc.toLocaleString('en-US')}`; }
  else { dEl.classList.remove('show'); }

  const start = new Date(); start.setMonth(start.getMonth() + 1);
  const end = new Date(start); end.setMonth(end.getMonth() + PAY.months - 1);
  const fmt = d => d.toLocaleDateString(undefined, { month:'short', year:'numeric' });
  $('#payRange').textContent = 'Paying for: ' + fmt(start) + (PAY.months > 1 ? ' → ' + fmt(end) : '');

  $('#paySummary').innerHTML = `
    <div class="row"><span>${t.name}</span><span>${sym}${per.toLocaleString('en-US')}/mo</span></div>
    <div class="row"><span>Duration</span><span>${PAY.months} month${PAY.months>1?'s':''}</span></div>
    <div class="row"><span>Base total</span><span>${sym}${base.toLocaleString('en-US')}</span></div>
    ${d.pct ? `<div class="row disc"><span>Discount (${d.pct}%)</span><span>− ${sym}${disc.toLocaleString('en-US')}</span></div>` : ''}
    <div class="row total"><span>Total</span><span>${sym}${total.toLocaleString('en-US')}</span></div>`;

  $('#payNote').textContent = CURRENCY.active === 'usd'
    ? "You'll be invoiced in USD · Payment by card"
    : 'Pay via bank transfer or card';

  $('#paySuccess').textContent = `Access granted for ${PAY.months} month${PAY.months>1?'s':''} — your class link is now active.`;
  // store for confirmation
  PAY._total = total; PAY._cur = CURRENCY.active;
}
function showPayStep(n) {
  $$('.pay-steps span').forEach((s,i) => s.classList.toggle('active', i === n-1));
  $$('.pay-step').forEach(s => s.classList.toggle('hidden', +s.dataset.step !== n));
}
document.addEventListener('click', e => {
  const n = e.target.dataset.payNext, b = e.target.dataset.payBack;
  if (n) {
    if (n === '3') {
      // → POST /api/payments/checkout/  body: {track, months, currency, total}
      submitLoading(e.target, async () => {
        await sleep(900);
        // Mark paid: extend paidThrough by N months
        const np = new Date(STATE.paidThrough); np.setMonth(np.getMonth() + PAY.months);
        STATE.paidThrough = np;
        STATE.paymentHistory.unshift({
          date: new Date().toISOString().slice(0,10),
          track: PRICING[PAY.track].name,
          period: `${PAY.months} month${PAY.months>1?'s':''}`,
          cur: PAY._cur, amount: PAY._total, status: 'Paid'
        });
        renderPayments(); renderEnrolled();
        toast('Payment successful 🎉', 'ok');
        showPayStep(3);
      });
    } else showPayStep(+n);
  }
  if (b) showPayStep(+b);
});

/* ---------- SCHEDULE ---------- */
function renderSchedule(view) {
  const container = $('#scheduleView');
  if (view === 'week') {
    const days = ['Mon','Tue','Wed','Thu','Fri','Sat'];
    container.innerHTML = `
      <div class="week-grid">
        <div class="time-col"></div>
        ${days.map(d => `<div class="day-h">${d}</div>`).join('')}
        <div class="time-col">5 PM</div>
        ${days.map((_,i) => {
          const isClass = STATE.classDays.includes(i+1);
          const paid = isClass && isPaid();
          return isClass
            ? `<div class="slot ${paid?'paid':'unpaid'}"><span class="name">Standard Hifdh</span><span>${paid?'Paid':'Locked'}</span></div>`
            : `<div class="slot">—</div>`;
        }).join('')}
      </div>`;
  } else {
    const today = new Date();
    const year = today.getFullYear(), m = today.getMonth();
    const first = new Date(year, m, 1).getDay();
    const daysIn = new Date(year, m+1, 0).getDate();
    const heads = ['S','M','T','W','T','F','S'];
    let cells = heads.map(h => `<div class="mh">${h}</div>`).join('');
    for (let i = 0; i < first; i++) cells += `<div class="mcell dim"></div>`;
    for (let d = 1; d <= daysIn; d++) {
      const day = new Date(year, m, d).getDay();
      const isClass = STATE.classDays.includes(day);
      const cls = isClass ? (isPaid() ? 'paid' : 'unpaid') : '';
      const tod = d === today.getDate() ? ' today' : '';
      cells += `<div class="mcell ${cls}${tod}">${d}</div>`;
    }
    container.innerHTML = `<div class="month-grid">${cells}</div>`;
  }
}
$$('[data-view]').forEach(b => b.addEventListener('click', () => {
  $$('[data-view]').forEach(x => x.classList.toggle('active', x === b));
  renderSchedule(b.dataset.view);
}));

function buildIcs() {
  // Minimal recurring .ics for class days
  const dtstamp = new Date().toISOString().replace(/[-:.]/g,'').slice(0,15)+'Z';
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Safeenah//Portal//EN
BEGIN:VEVENT
UID:safeenah-${Date.now()}@safeenah.app
DTSTAMP:${dtstamp}
SUMMARY:Standard Hifdh — Safeenah Institute
DTSTART;TZID=Africa/Lagos:20260615T170000
DTEND;TZID=Africa/Lagos:20260615T180000
RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH
DESCRIPTION:Join: https://meet.google.com/abc-defg-hij
END:VEVENT
END:VCALENDAR`;
}
$('#exportCal')?.addEventListener('click', () => {
  const blob = new Blob([buildIcs()], { type: 'text/calendar' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'safeenah-classes.ics'; a.click();
  toast('Calendar file downloaded', 'ok');
});

/* ---------- RETENTION CHART (Canvas, no libs) ---------- */
function renderRetentionChart() {
  const c = $('#retChart');
  if (!c) return;
  const data = [82, 85, 88, 90, 91, 94];
  const labels = ['Jan','Feb','Mar','Apr','May','Jun'];
  const ratio = window.devicePixelRatio || 1;
  const w = c.clientWidth, h = 160;
  c.width = w * ratio; c.height = h * ratio;
  c.style.height = h + 'px';
  const ctx = c.getContext('2d'); ctx.scale(ratio, ratio);
  ctx.clearRect(0,0,w,h);
  const pad = 36;
  const min = 70, max = 100;
  const x = i => pad + (i*(w-pad*2))/(data.length-1);
  const y = v => h - pad/1.5 - ((v-min)/(max-min))*(h-pad*1.5);

  // gridlines
  ctx.strokeStyle = 'rgba(0,31,63,.08)'; ctx.lineWidth = 1;
  [70,80,90,100].forEach(v => {
    ctx.beginPath(); ctx.moveTo(pad, y(v)); ctx.lineTo(w-pad, y(v)); ctx.stroke();
    ctx.fillStyle = '#6b7a8c'; ctx.font = '11px Work Sans'; ctx.textAlign = 'right';
    ctx.fillText(v + '%', pad - 6, y(v) + 4);
  });

  // area
  const grad = ctx.createLinearGradient(0,0,0,h);
  grad.addColorStop(0,'rgba(212,175,55,.35)'); grad.addColorStop(1,'rgba(212,175,55,0)');
  ctx.beginPath();
  ctx.moveTo(x(0), y(data[0]));
  data.forEach((v,i) => ctx.lineTo(x(i), y(v)));
  ctx.lineTo(x(data.length-1), h-pad/1.5); ctx.lineTo(x(0), h-pad/1.5); ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();

  // line
  ctx.beginPath();
  ctx.moveTo(x(0), y(data[0]));
  data.forEach((v,i) => ctx.lineTo(x(i), y(v)));
  ctx.strokeStyle = '#D4AF37'; ctx.lineWidth = 2.5; ctx.stroke();

  // dots + labels
  data.forEach((v,i) => {
    ctx.beginPath(); ctx.arc(x(i), y(v), 4, 0, Math.PI*2); ctx.fillStyle = '#001F3F'; ctx.fill();
    ctx.fillStyle = '#6b7a8c'; ctx.font = '11px Work Sans'; ctx.textAlign = 'center';
    ctx.fillText(labels[i], x(i), h - 8);
  });
}
window.addEventListener('resize', () => { if (!$('.screen-dash').classList.contains('hidden')) renderRetentionChart(); });

/* ---------- NOTIFICATIONS ---------- */
function renderNotifications() {
  const list = $('#notifList');
  list.innerHTML = STATE.notifications.map(n => {
    let title = n.title;
    if (n.priceKey) {
      const t = PRICING[n.priceKey];
      title += ` — ${CURRENCY.symbol.ngn}${t.ngn.toLocaleString('en-US')} / ${CURRENCY.symbol.usd}${t.usd}`;
    }
    return `<li class="${n.unread?'unread':''}" data-id="${n.id}">${title}<small>${n.meta}</small></li>`;
  }).join('');
  const unread = STATE.notifications.filter(n => n.unread).length;
  const badge = $('#bellBadge');
  badge.textContent = unread; badge.classList.toggle('zero', !unread);
  $('#notifEmpty').classList.toggle('hidden', STATE.notifications.length > 0);
  $$('#notifList li').forEach(li => li.addEventListener('click', () => {
    const id = +li.dataset.id;
    const n = STATE.notifications.find(x => x.id === id);
    if (n) { n.unread = false; renderNotifications(); }
  }));
}
$('#bellBtn')?.addEventListener('click', () => $('#notifPanel').classList.toggle('hidden'));
$('#closeNotif')?.addEventListener('click', () => $('#notifPanel').classList.add('hidden'));
$('#markAllRead')?.addEventListener('click', () => {
  STATE.notifications.forEach(n => n.unread = false); renderNotifications();
  toast('All caught up', 'ok');
});
document.addEventListener('click', e => {
  const panel = $('#notifPanel');
  if (panel && !panel.classList.contains('hidden') && !panel.contains(e.target) && !e.target.closest('#bellBtn')) {
    panel.classList.add('hidden');
  }
});

/* ---------- PROFILE ---------- */
$('#saveProfile')?.addEventListener('click', () => {
  // → PATCH /api/profile/
  STATE.user.name  = $('#profName').value.trim();
  STATE.user.email = $('#profEmail').value.trim();
  STATE.user.phone = $('#profPhone').value.trim();
  localStorage.setItem('safeenah_user', JSON.stringify(STATE.user));
  $('#userName').textContent = STATE.user.name.split(' ')[0];
  toast('Profile saved', 'ok');
});
$$('input[name=loc]').forEach(r => r.addEventListener('change', () => setCurrency(r.value)));
$('#copyRefer')?.addEventListener('click', () => {
  navigator.clipboard?.writeText($('#referLink').value);
  toast('Link copied — Jazak Allahu Khairan 🤲', 'ok');
});
$('#confirmLogout')?.addEventListener('click', () => {
  // → POST /api/auth/logout/
  localStorage.removeItem('safeenah_user');
  STATE.user = null;
  closeAllModals();
  openAuth();
  toast('Signed out', '');
});

/* ---------- Currency change listener ---------- */
window.addEventListener('safeenah:currency', () => {
  // Re-render anything tied to currency
  renderEnrolled(); renderOtherTracks(); renderPayments();
  if (PAY.track) refreshPay();
  renderNotifications();
  $$('input[name=loc]').forEach(r => r.checked = r.value === CURRENCY.active);
});

/* ---------- BOOT ---------- */
document.addEventListener('DOMContentLoaded', () => {
  checkHashRoute();
  if (STATE.user) enterDashboard();
  // ensure prices render initially
  renderPrices(document);
});