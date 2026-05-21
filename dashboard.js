// ============ SAFEENAH DASHBOARD JS ============
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- Toasts ---------- */
function ensureToastStack(){
  let s = $('.toast-stack');
  if (!s){ s = document.createElement('div'); s.className='toast-stack'; document.body.appendChild(s); }
  return s;
}
function toast(msg, type=''){
  const stack = ensureToastStack();
  const t = document.createElement('div');
  t.className = 'toast ' + (type||'');
  t.textContent = msg;
  stack.appendChild(t);
  setTimeout(()=>{ t.style.opacity='0'; t.style.transform='translateX(20px)'; t.style.transition='all .25s'; }, 3600);
  setTimeout(()=> t.remove(), 4000);
}

/* ---------- Modal pattern (per spec, identical) ---------- */
function openModal(name){
  const m = document.querySelector(`[data-modal="${name}"]`);
  if (m){ m.hidden = false; document.body.style.overflow = 'hidden'; }
}
function closeModal(name){
  const m = document.querySelector(`[data-modal="${name}"]`);
  if (m){ m.hidden = true; document.body.style.overflow = ''; }
}
document.addEventListener('click', e => {
  if (e.target.classList && e.target.classList.contains('modal-close')){
    const m = e.target.closest('[data-modal]');
    if (m){ m.hidden = true; document.body.style.overflow = ''; }
  }
  if (e.target.hasAttribute && e.target.hasAttribute('data-modal') && e.target.classList.contains('modal')){
    e.target.hidden = true; document.body.style.overflow = '';
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape'){
    document.querySelectorAll('[data-modal]').forEach(m => { m.hidden = true; document.body.style.overflow = ''; });
  }
});

/* ---------- Helpers ---------- */
function setLoading(btn, on, txt='Please wait…'){
  if (!btn) return;
  if (on){ btn.dataset._txt = btn.innerHTML; btn.disabled = true; btn.innerHTML = `<span class="spin"></span> ${txt}`; }
  else { btn.disabled = false; btn.innerHTML = btn.dataset._txt || btn.innerHTML; }
}
function safeGet(k){ try { return localStorage.getItem(k); } catch(_){ return null; } }
function safeSet(k,v){ try { localStorage.setItem(k,v); } catch(_){} }
function mockAsync(ms=900){ return new Promise(r => setTimeout(r, ms)); }
function emailValid(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

/* ---------- App state ---------- */
const STATE = {
  enrolledKey: safeGet('safeenah_track') || 'standard-hifdh',
  paid: safeGet('safeenah_paid') === '1',
  paidUntilMonths: parseInt(safeGet('safeenah_paid_months')||'1',10),
  monthsSelected: 1,
  // Today's class: today 17:00 local for demo
  todayClassTime: (() => { const d = new Date(); d.setHours(17,0,0,0); return d; })(),
  clockedIn: safeGet('safeenah_clocked_today') === new Date().toDateString(),
  notifications: [
    { id:1, text:"Your Hifdh class starts in 30 minutes.", time:"15 min ago", unread:true },
    { id:2, text:"Teacher Yusuf left a note on your Juz 3 review.", time:"2 hours ago", unread:true },
    { id:3, text:"Monthly retention report for February is ready.", time:"Yesterday", unread:true },
    { id:4, text:"Payment reminder: Standard Hifdh due Aug 1.", time:"3 days ago", unread:false },
    { id:5, text:"📢 Ramadan timetable announced — see banner.", time:"1 week ago", unread:false },
  ],
  pwHistory: [
    { date:"Feb 1, 2026", cls:"Standard Hifdh", period:"Feb 2026", cur:"ngn", amt:15000, status:"Paid" },
    { date:"Jan 1, 2026", cls:"Standard Hifdh", period:"Jan 2026", cur:"ngn", amt:15000, status:"Paid" },
    { date:"Dec 1, 2025", cls:"Standard Hifdh", period:"Dec 2025", cur:"ngn", amt:15000, status:"Paid" },
  ],
  memo: [
    { surah:"Al-Imran ayat 33-50", date:"Feb 18, 2026" },
    { surah:"Al-Imran ayat 15-32", date:"Feb 11, 2026" },
    { surah:"Al-Baqarah ayat 280-286", date:"Feb 4, 2026" },
    { surah:"Al-Baqarah ayat 255-279", date:"Jan 28, 2026" },
  ],
};

/* ============ INIT ============ */
document.addEventListener('DOMContentLoaded', () => {
  // greet
  const name = safeGet('safeenah_name') || 'Student';
  $('#greetName').textContent = name.split(' ')[0];

  // Banner dismiss
  if (safeGet('safeenah_banner_dismissed') === '1') $('#banner').hidden = true;
  $('#bannerX').addEventListener('click', () => { $('#banner').hidden = true; safeSet('safeenah_banner_dismissed','1'); });

  // Bottom nav
  $$('#bnav button').forEach(b => {
    b.addEventListener('click', () => switchTab(b.dataset.tabGo));
  });

  // Pw toggles
  $$('.pw-toggle').forEach(btn => btn.addEventListener('click', () => {
    const i = btn.parentElement.querySelector('input');
    if (!i) return;
    const isPw = i.type === 'password';
    i.type = isPw ? 'text' : 'password';
    btn.textContent = isPw ? '🙈' : '👁';
  }));

  // Switches
  $$('.switch').forEach(s => s.addEventListener('click', () => {
    s.classList.toggle('on');
    safeSet('safeenah_notif_'+s.dataset.n, s.classList.contains('on') ? '1' : '0');
  }));
  $$('.switch').forEach(s => {
    const v = safeGet('safeenah_notif_'+s.dataset.n);
    if (v === '0') s.classList.remove('on');
    if (v === '1') s.classList.add('on');
  });

  initHome();
  initPayments();
  initProgress();
  initSchedule();
  initProfile();
  initNotifications();

  // Wire currency event to re-render parts that don't use [data-price-track]
  window.addEventListener('safeenah:currency', () => {
    renderTracksMini(); renderPayHistory(); renderMilestones(); refreshEnrolledPrices();
  });

  // Active currency toggle button highlight on payments tab
  $$('.currency-toggle button').forEach(b => b.classList.toggle('active', b.dataset.cur === CURRENCY.active));
});

/* ============ TAB SWITCH ============ */
function switchTab(name){
  $$('.tab').forEach(t => t.classList.toggle('hidden', t.dataset.tab !== name));
  $$('#bnav button').forEach(b => b.classList.toggle('active', b.dataset.tabGo === name));
  window.scrollTo({top:0, behavior:'smooth'});
}

/* ============ HOME ============ */
let countdownIv = null;
function initHome(){
  const t = PRICING[STATE.enrolledKey];
  if (t){
    $('#todayClassName').textContent = t.name;
    $('#enrolledName').textContent = t.name;
    $('#enrolledMeta').textContent = `Teacher Yusuf · ${t.schedule}`;
    $('#payClassName').textContent = t.name;
    $('#payStep1Class').textContent = `${t.name} · ${t.schedule}`;
    $('#payStep2Class').textContent = t.name;
  }
  $('#todayClassTime').textContent = `Today · ${STATE.todayClassTime.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}`;

  // Clock-in tick
  const clockBtn = $('#clockBtn');
  function tick(){
    const now = new Date();
    const diff = STATE.todayClassTime - now; // ms
    if (STATE.clockedIn){
      clockBtn.innerHTML = '✓ Clocked in';
      clockBtn.disabled = true;
      $('#countdown').textContent = 'Done for today ✓';
      return;
    }
    if (diff > 0){
      const h = Math.floor(diff/3600000);
      const m = Math.floor((diff%3600000)/60000);
      const s = Math.floor((diff%60000)/1000);
      $('#countdown').textContent = `Starts in ${h}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;
    } else {
      const elapsed = -diff;
      const m = Math.floor(elapsed/60000);
      $('#countdown').textContent = m < 60 ? `Started ${m}m ago` : 'Class ended';
    }
    // Enabled 15 min before to 30 min after
    const canClock = diff <= 15*60000 && diff >= -30*60000;
    clockBtn.disabled = !canClock;
    clockBtn.title = canClock ? 'Clock in for today' : (diff > 15*60000 ? 'Opens 15 min before class' : 'Window closed');
    if (canClock) clockBtn.innerHTML = 'Clock In';
    else clockBtn.innerHTML = diff > 15*60000 ? 'Clock In (opens 15 min before)' : 'Window closed';
  }
  tick();
  countdownIv = setInterval(tick, 1000);

  clockBtn.addEventListener('click', () => {
    if (clockBtn.disabled) return;
    STATE.clockedIn = true;
    safeSet('safeenah_clocked_today', new Date().toDateString());
    const t = new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
    clockBtn.innerHTML = `✓ Clocked in at ${t}`;
    clockBtn.disabled = true;
    toast('Clocked in for today', 'ok');
  });

  refreshEnrolledPrices();

  // Join button
  $('#joinBtn').addEventListener('click', () => {
    if (!STATE.paid) return;
    window.open($('#meetLink').textContent.trim(), '_blank');
  });
  $('#calBtn').addEventListener('click', () => downloadIcs([{ name: PRICING[STATE.enrolledKey].name, date: STATE.todayClassTime }]));

  renderTracksMini();
}

function refreshEnrolledPrices(){
  const meetRow = $('#meetRow');
  const link = $('#meetLink');
  const joinBtn = $('#joinBtn');
  const calBtn = $('#calBtn');
  const ps = $('#payState');
  // Clean dynamic
  $$('.lock-overlay, #payToUnlock', meetRow).forEach(el => el.remove());
  link.classList.remove('locked');

  if (STATE.paid){
    ps.innerHTML = '<span class="badge ok">Paid</span>';
    joinBtn.hidden = false; calBtn.hidden = false;
  } else {
    ps.innerHTML = '<span class="badge warn">Unpaid</span>';
    link.classList.add('locked');
    const ovl = document.createElement('div');
    ovl.className = 'lock-overlay';
    ovl.textContent = '🔒 Locked';
    link.parentElement.style.position='relative';
    link.insertAdjacentElement('afterend', ovl);
    joinBtn.hidden = true; calBtn.hidden = true;
    if (!$('#payToUnlock')){
      const u = document.createElement('button');
      u.id='payToUnlock'; u.className='btn btn-primary';
      const t = PRICING[STATE.enrolledKey];
      u.textContent = `Pay to Unlock — ${formatPrice(t[CURRENCY.active])}/mo →`;
      u.addEventListener('click', () => openPayModal());
      meetRow.appendChild(u);
    }
  }
}

function renderTracksMini(){
  const grid = $('#otherTracks');
  grid.innerHTML = '';
  Object.entries(PRICING).filter(([k]) => k !== STATE.enrolledKey).forEach(([k, t]) => {
    const el = document.createElement('div');
    el.className = 'tmini';
    el.innerHTML = `
      <h4>${t.name}</h4>
      <small>${t.schedule}</small>
      <div class="p" data-price-track="${k}"></div>
      <a href="https://wa.me/2349000000000?text=Book%20assessment%20for%20${encodeURIComponent(t.name)}" target="_blank">Book Free Assessment →</a>
    `;
    grid.appendChild(el);
  });
  renderPrices(grid);
}

/* ============ PAYMENTS ============ */
function initPayments(){
  $('#payNowBtn').addEventListener('click', openPayModal);
  $('#payStatusBadge').className = STATE.paid ? 'badge ok' : 'badge warn';
  $('#payStatusBadge').textContent = STATE.paid ? 'Paid' : 'Due';
  renderPayHistory();
  buildMonthGrid();
  wirePayModal();
  wireChangePw();
  wireLogout();
  wireScholarship();
}

function renderPayHistory(){
  const tb = $('#payHistory');
  tb.innerHTML = STATE.pwHistory.map(r => `
    <tr>
      <td>${r.date}</td>
      <td>${r.cls}</td>
      <td>${r.period}</td>
      <td>${r.cur.toUpperCase()}</td>
      <td>${CURRENCY.symbol[r.cur]}${r.amt.toLocaleString('en-US')}</td>
      <td><span class="badge ${r.status==='Paid'?'ok':r.status==='Due'?'warn':'err'}">${r.status}</span></td>
    </tr>
  `).join('');
}

function buildMonthGrid(){
  const g = $('#monthGrid');
  g.innerHTML = '';
  for (let i=1;i<=12;i++){
    const b = document.createElement('button');
    b.className = 'month-pill'+(i===1?' on':'');
    b.dataset.m = String(i);
    b.textContent = i;
    b.addEventListener('click', () => {
      STATE.monthsSelected = i;
      $$('.month-pill').forEach(p => p.classList.toggle('on', +p.dataset.m === i));
      updateDiscount();
    });
    g.appendChild(b);
  }
  updateDiscount();
}

function updateDiscount(){
  const months = STATE.monthsSelected;
  const d = discountFor(months);
  const w = $('#discountWrap');
  w.innerHTML = d.pct ? `<span class="discount-pill">🎉 Save ${d.pct}% — ${d.label}</span>` : '';
  const start = new Date(); start.setDate(1);
  const end = new Date(start); end.setMonth(start.getMonth() + months - 1);
  const fmt = d => d.toLocaleString(undefined, { month:'long', year:'numeric' });
  $('#rangeText').textContent = months === 1
    ? `Paying for: ${fmt(start)}`
    : `Paying for: ${fmt(start)} → ${fmt(end)}`;
}

function openPayModal(){
  // reset to step 1
  $$('[data-step]', $('[data-modal="pay"]')).forEach(s => s.hidden = s.dataset.step !== '1');
  $('#si1').classList.add('on'); $('#si2').classList.remove('on'); $('#si3').classList.remove('on');
  openModal('pay');
}

function wirePayModal(){
  $('#payNext1').addEventListener('click', () => {
    // build summary
    const t = PRICING[STATE.enrolledKey];
    const months = STATE.monthsSelected;
    const cur = CURRENCY.active;
    const base = t[cur] * months;
    const d = discountFor(months);
    const off = Math.round(base * d.pct / 100);
    const total = base - off;
    const sym = CURRENCY.symbol[cur];
    $('#summaryList').innerHTML = `
      <div><span>${t.name}</span><span>${sym}${t[cur].toLocaleString()}/mo</span></div>
      <div><span>Duration</span><span>${months} month${months>1?'s':''}</span></div>
      <div><span>Subtotal</span><span>${sym}${base.toLocaleString()}</span></div>
      ${d.pct ? `<div style="color:var(--ok)"><span>Discount (${d.pct}%)</span><span>− ${sym}${off.toLocaleString()}</span></div>` : ''}
      <div class="tot"><span>Total</span><span>${sym}${total.toLocaleString()}</span></div>
    `;
    $('#payNote').textContent = cur === 'usd'
      ? "You'll be invoiced in USD · Card payment"
      : 'Pay via bank transfer or card';
    showPayStep(2);
  });

  $('#payBack2').addEventListener('click', () => showPayStep(1));

  $('#payConfirm').addEventListener('click', async () => {
    const btn = $('#payConfirm');
    setLoading(btn, true, 'Processing payment…');
    // POST → /api/payments/charge/
    await mockAsync(1100);
    setLoading(btn, false);

    // Update state
    STATE.paid = true;
    STATE.paidUntilMonths = STATE.monthsSelected;
    safeSet('safeenah_paid','1');
    safeSet('safeenah_paid_months', String(STATE.monthsSelected));

    // Update history
    const t = PRICING[STATE.enrolledKey];
    const cur = CURRENCY.active;
    const months = STATE.monthsSelected;
    const d = discountFor(months);
    const total = Math.round(t[cur] * months * (1 - d.pct/100));
    const now = new Date();
    STATE.pwHistory.unshift({
      date: now.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}),
      cls: t.name,
      period: `${months} month${months>1?'s':''}`,
      cur, amt: total, status:'Paid'
    });
    renderPayHistory();
    refreshEnrolledPrices();
    $('#payStatusBadge').className = 'badge ok'; $('#payStatusBadge').textContent = 'Paid';
    renderMilestones();

    $('#paySuccessMsg').textContent = `Access granted for ${months} month${months>1?'s':''}`;
    showPayStep(3);
    toast(`Payment confirmed — ${months} month${months>1?'s':''} unlocked`, 'ok');
  });
}

function showPayStep(n){
  $$('[data-step]', $('[data-modal="pay"]')).forEach(s => s.hidden = +s.dataset.step !== n);
  ['si1','si2','si3'].forEach((id,i) => $('#'+id).classList.toggle('on', i+1 <= n));
}

/* ============ CHANGE PW ============ */
function wireChangePw(){
  $('#changePwForm').addEventListener('submit', async e => {
    e.preventDefault();
    const cur = $('#cpCurrent').value, n = $('#cpNew').value, c = $('#cpConfirm').value;
    if (!cur){ $('#cpCurrent').classList.add('err'); return toast('Enter current password','err'); }
    if (n.length < 8){ $('#cpNew').classList.add('err'); return toast('New password must be 8+ chars','err'); }
    if (n !== c){ $('#cpConfirm').classList.add('err'); return toast("Passwords don't match",'err'); }
    const btn = $('#cpSubmit');
    setLoading(btn, true);
    // POST → /api/auth/change-password/
    await mockAsync(900);
    setLoading(btn, false);
    toast('Password updated', 'ok');
    closeModal('changePw');
    $('#changePwForm').reset();
  });
}

/* ============ LOGOUT ============ */
function wireLogout(){
  $('#logoutBtn').addEventListener('click', async () => {
    const btn = $('#logoutBtn');
    setLoading(btn, true, 'Signing out…');
    // POST → /api/auth/logout/
    await mockAsync(500);
    safeSet('safeenah_session','');
    window.location.href = '/auth/login.html';
  });
}

/* ============ SCHOLARSHIP ============ */
function wireScholarship(){
  $('#schSubmit').addEventListener('click', async () => {
    const name = $('#schName').value.trim(), tr = $('#schTrack').value, reason = $('#schReason').value.trim(), commit = $('#schCommit').checked;
    [$('#schName'),$('#schTrack'),$('#schReason')].forEach(i => i.classList.remove('err'));
    if (!name){ $('#schName').classList.add('err'); return toast('Enter your name','err'); }
    if (!tr){ $('#schTrack').classList.add('err'); return toast('Pick a track','err'); }
    if (reason.length < 20){ $('#schReason').classList.add('err'); return toast('Tell us a bit more (20+ chars)','err'); }
    if (!commit){ return toast('Please confirm the 95% attendance commitment','err'); }
    const btn = $('#schSubmit');
    setLoading(btn, true);
    // POST → /api/scholarship/apply/
    await mockAsync(900);
    setLoading(btn, false);
    $('#scholarshipForm').hidden = true;
    $('#scholarshipSuccess').hidden = false;
  });
}

/* ============ PROGRESS ============ */
function initProgress(){
  const ul = $('#memoLog');
  ul.innerHTML = STATE.memo.map(r => `<li><span>${r.surah}</span><small>${r.date}</small></li>`).join('');
  drawRetention();
}
function drawRetention(){
  const c = $('#retentionChart');
  if (!c) return;
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  ctx.clearRect(0,0,W,H);
  const data = [78, 82, 85, 80, 88, 92];
  const labels = ['Sep','Oct','Nov','Dec','Jan','Feb'];
  const pad = { l: 36, r: 16, t: 16, b: 28 };
  const cw = W - pad.l - pad.r, ch = H - pad.t - pad.b;
  // gridlines
  ctx.strokeStyle = 'rgba(0,31,63,.08)'; ctx.lineWidth = 1; ctx.font = '11px Work Sans'; ctx.fillStyle = '#6b7a8c';
  for (let i=0;i<=4;i++){
    const y = pad.t + ch * (i/4);
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W-pad.r, y); ctx.stroke();
    const val = 100 - i*25;
    ctx.fillText(val + '%', 4, y+4);
  }
  const xs = labels.map((_,i) => pad.l + cw * (i/(labels.length-1)));
  const ys = data.map(v => pad.t + ch * (1 - (v-50)/50));
  // gradient fill
  const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t+ch);
  grad.addColorStop(0,'rgba(212,175,55,.35)'); grad.addColorStop(1,'rgba(212,175,55,0)');
  ctx.beginPath();
  ctx.moveTo(xs[0], pad.t+ch);
  xs.forEach((x,i) => ctx.lineTo(x, ys[i]));
  ctx.lineTo(xs[xs.length-1], pad.t+ch); ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();
  // line
  ctx.beginPath(); ctx.strokeStyle = '#D4AF37'; ctx.lineWidth = 2.5;
  xs.forEach((x,i) => i===0 ? ctx.moveTo(x, ys[i]) : ctx.lineTo(x, ys[i])); ctx.stroke();
  // dots + labels
  ctx.fillStyle = '#D4AF37';
  xs.forEach((x,i) => { ctx.beginPath(); ctx.arc(x, ys[i], 4, 0, Math.PI*2); ctx.fill(); });
  ctx.fillStyle = '#6b7a8c'; ctx.textAlign='center';
  labels.forEach((l,i) => ctx.fillText(l, xs[i], H-8));
}

/* ============ SCHEDULE ============ */
function initSchedule(){
  $$('#schedSeg button').forEach(b => b.addEventListener('click', () => {
    $$('#schedSeg button').forEach(x => x.classList.toggle('active', x === b));
    $('#weekView').hidden = b.dataset.view !== 'week';
    $('#monthView').hidden = b.dataset.view !== 'month';
  }));

  // Week view
  const wg = $('#weekGrid');
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat'];
  const classDays = [0,1,2,3]; // Mon-Thu
  wg.innerHTML = days.map((d, i) => `
    <div class="week-day">
      <h5>${d}</h5>
      ${classDays.includes(i) ? `<div class="slot ${STATE.paid?'':'unpaid'}"><strong>${PRICING[STATE.enrolledKey].name}</strong>5:00 PM WAT</div>` : '<small style="color:var(--muted)">No class</small>'}
    </div>
  `).join('');

  // Month view
  const cal = $('#monthCal');
  cal.innerHTML = '';
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d => { const h = document.createElement('div'); h.className='dh'; h.textContent=d; cal.appendChild(h); });
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const days31 = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
  for (let i=0;i<first.getDay();i++){ const e = document.createElement('div'); e.className='dc empty'; cal.appendChild(e); }
  for (let d=1; d<=days31; d++){
    const cell = document.createElement('div');
    cell.className = 'dc';
    if (d === now.getDate()) cell.classList.add('today');
    cell.textContent = d;
    const dow = new Date(now.getFullYear(), now.getMonth(), d).getDay();
    if ([1,2,3,4].includes(dow)){
      const dot = document.createElement('span');
      dot.className = 'dot ' + (STATE.paid ? 'ok' : 'warn');
      cell.appendChild(dot);
    }
    cal.appendChild(cell);
  }

  $('#icsBtn').addEventListener('click', () => {
    // Build sessions for next 4 weeks of class days
    const sessions = [];
    const base = new Date();
    for (let w=0;w<4;w++){
      [1,2,3,4].forEach(dow => {
        const d = new Date(base);
        d.setDate(base.getDate() + ((7-base.getDay()+dow)%7) + w*7);
        d.setHours(17,0,0,0);
        sessions.push({ name: PRICING[STATE.enrolledKey].name, date: d });
      });
    }
    downloadIcs(sessions);
  });

  renderMilestones();
}

function renderMilestones(){
  const t = PRICING[STATE.enrolledKey];
  $('#mileDue').textContent = formatPrice(t[CURRENCY.active]);
  $('#nextDue').textContent = 'Aug 1';
  $('#payDueDate').textContent = 'Aug 1, 2026';
}

function downloadIcs(sessions){
  const pad = n => String(n).padStart(2,'0');
  const fmt = d => `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Safeenah//Portal//EN\r\n';
  sessions.forEach((s, i) => {
    const end = new Date(s.date.getTime() + 45*60000);
    ics += `BEGIN:VEVENT\r\nUID:safeenah-${Date.now()}-${i}@safeenah\r\nDTSTAMP:${fmt(new Date())}\r\nDTSTART:${fmt(s.date)}\r\nDTEND:${fmt(end)}\r\nSUMMARY:${s.name}\r\nDESCRIPTION:Safeenah Institute class\r\nEND:VEVENT\r\n`;
  });
  ics += 'END:VCALENDAR';
  const blob = new Blob([ics], { type:'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'safeenah-schedule.ics'; a.click();
  URL.revokeObjectURL(url);
  toast('Calendar file downloaded', 'ok');
}

/* ============ PROFILE ============ */
function initProfile(){
  $('#pfName').value = safeGet('safeenah_name') || '';
  $('#pfEmail').value = safeGet('safeenah_email') || '';
  $('#pfPhone').value = safeGet('safeenah_phone') || '';

  $('#saveProfileBtn').addEventListener('click', async () => {
    const name = $('#pfName').value.trim(), email = $('#pfEmail').value.trim(), phone = $('#pfPhone').value.trim();
    if (!name){ $('#pfName').classList.add('err'); return toast('Name required','err'); }
    if (!emailValid(email)){ $('#pfEmail').classList.add('err'); return toast('Valid email required','err'); }
    const btn = $('#saveProfileBtn');
    setLoading(btn, true);
    // PATCH → /api/profile/
    await mockAsync(700);
    setLoading(btn, false);
    safeSet('safeenah_name', name); safeSet('safeenah_email', email); safeSet('safeenah_phone', phone);
    $('#greetName').textContent = name.split(' ')[0];
    toast('Profile saved','ok');
  });

  // Location radios
  function syncLoc(){
    const cur = CURRENCY.active;
    $$('input[name="pfLoc"]').forEach(r => r.checked = r.value === cur);
    $('#locNgn').classList.toggle('on', cur==='ngn');
    $('#locUsd').classList.toggle('on', cur==='usd');
  }
  syncLoc();
  $$('input[name="pfLoc"]').forEach(r => r.addEventListener('change', () => { setCurrency(r.value); syncLoc(); }));
  window.addEventListener('safeenah:currency', syncLoc);

  $('#copyRefBtn').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('#refLink').value); toast('Link copied','ok'); }
    catch(_){ $('#refLink').select(); document.execCommand('copy'); toast('Link copied','ok'); }
  });
}

/* ============ NOTIFICATIONS ============ */
function initNotifications(){
  const bell = $('#bellBtn'), panel = $('#notifPanel'), bd = $('#notifBackdrop');
  bell.addEventListener('click', () => { panel.classList.add('open'); bd.classList.add('on'); renderNotifs(); });
  $('#notifClose').addEventListener('click', closeNotif);
  bd.addEventListener('click', closeNotif);
  function closeNotif(){ panel.classList.remove('open'); bd.classList.remove('on'); }

  $('#markAllBtn').addEventListener('click', () => {
    STATE.notifications.forEach(n => n.unread = false);
    renderNotifs();
    toast('All marked read','ok');
  });
  renderNotifs();
}
function renderNotifs(){
  const list = $('#notifList');
  const unread = STATE.notifications.filter(n => n.unread).length;
  $('#bellBadge').textContent = unread;
  $('#bellBadge').hidden = unread === 0;
  $('#notifCount').textContent = `${unread} unread`;
  if (!STATE.notifications.length){
    list.innerHTML = '<div class="empty" style="margin:14px">You\'re all caught up ✨</div>'; return;
  }
  list.innerHTML = STATE.notifications.map(n => `
    <div class="notif-item ${n.unread?'unread':''}" data-id="${n.id}">
      <div style="flex:1"><p>${n.text}</p><small>${n.time}</small></div>
    </div>
  `).join('');
  $$('.notif-item', list).forEach(el => el.addEventListener('click', () => {
    const id = +el.dataset.id;
    const n = STATE.notifications.find(x => x.id === id);
    if (n) n.unread = false;
    renderNotifs();
  }));
}
