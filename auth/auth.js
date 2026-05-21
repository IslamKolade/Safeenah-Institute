// ============ SAFEENAH AUTH JS (shared) ============
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- Toasts ---------- */
function ensureToastStack(){
  let s = $('.toast-stack');
  if (!s){ s = document.createElement('div'); s.className = 'toast-stack'; document.body.appendChild(s); }
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

/* ---------- Modal pattern (per spec) ---------- */
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
function setLoading(btn, on, loadingText='Please wait…'){
  if (!btn) return;
  if (on){
    btn.dataset._txt = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spin"></span> ${loadingText}`;
  } else {
    btn.disabled = false;
    btn.innerHTML = btn.dataset._txt || btn.innerHTML;
  }
}
function maskEmail(e){
  if (!e || !e.includes('@')) return e || '';
  const [u, d] = e.split('@');
  return u[0] + '*'.repeat(Math.max(1, u.length-1)) + '@' + d;
}
function emailValid(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function safeGet(k){ try { return localStorage.getItem(k); } catch(_){ return null; } }
function safeSet(k,v){ try { localStorage.setItem(k,v); } catch(_){} }

/* ---------- Password show/hide ---------- */
document.addEventListener('DOMContentLoaded', () => {
  $$('.pw-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.parentElement.querySelector('input');
      if (!input) return;
      const isPw = input.type === 'password';
      input.type = isPw ? 'text' : 'password';
      btn.textContent = isPw ? '🙈' : '👁';
    });
  });
});

/* ---------- OTP wiring ---------- */
function wireOtp(modalName, onVerify){
  const modal = document.querySelector(`[data-modal="${modalName}"]`);
  if (!modal) return;
  const cells = $$('.otp-cell', modal);
  cells.forEach((c, i) => {
    c.addEventListener('input', () => {
      c.value = c.value.replace(/\D/g,'').slice(0,1);
      c.classList.remove('err');
      if (c.value && i < cells.length-1) cells[i+1].focus();
      const code = cells.map(x=>x.value).join('');
      if (code.length === cells.length) onVerify(code);
    });
    c.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !c.value && i>0) cells[i-1].focus();
    });
    c.addEventListener('paste', e => {
      const t = (e.clipboardData.getData('text')||'').replace(/\D/g,'').slice(0,cells.length);
      if (!t) return;
      e.preventDefault();
      cells.forEach((cc, idx) => cc.value = t[idx] || '');
      cells[Math.min(t.length, cells.length-1)].focus();
      if (t.length === cells.length) onVerify(t);
    });
  });
}

function startResendCountdown(modalName, seconds=59){
  const modal = document.querySelector(`[data-modal="${modalName}"]`);
  if (!modal) return;
  const txt = $('.resend-text', modal);
  const btn = $('.resend-btn', modal);
  let s = seconds;
  btn.hidden = true; txt.hidden = false;
  const tick = () => {
    const m = Math.floor(s/60), ss = String(s%60).padStart(2,'0');
    txt.textContent = `Resend code in ${m}:${ss}`;
    if (s <= 0){ clearInterval(iv); txt.hidden = true; btn.hidden = false; }
    s--;
  };
  tick();
  const iv = setInterval(tick, 1000);
  btn.onclick = () => { clearInterval(iv); startResendCountdown(modalName, 59); toast('New code sent', 'ok'); };
}

/* ---------- Mock async ---------- */
function mockAsync(ms = 900){ return new Promise(r => setTimeout(r, ms)); }
