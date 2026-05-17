// Nav scroll state
const nav = document.getElementById('nav');
const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 30);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Mobile nav toggle
const toggle = document.getElementById('navToggle');
const links = document.getElementById('navLinks');
toggle?.addEventListener('click', () => links.classList.toggle('open'));
links?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => links.classList.remove('open')));

// FAQ accordion
document.querySelectorAll('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.parentElement;
    const open = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
    if (!open) item.classList.add('open');
  });
});

// Pricing toggle (group / private)
const toggleBtns = document.querySelectorAll('.pricing-toggle button');
toggleBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    toggleBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const mode = btn.dataset.mode;
    document.querySelectorAll('.track-price[data-group]').forEach(el => {
      const price = el.dataset[mode];
      el.innerHTML = `${price}<small>/month</small>`;
    });
  });
});

// Fade-up on scroll
const observed = document.querySelectorAll('.problem-card, .phase, .step-row, .testi, .track, .savings .card');
observed.forEach(el => el.classList.add('fade-up'));
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }});
}, { threshold: 0.12 });
observed.forEach(el => io.observe(el));

// Year
document.getElementById('yr').textContent = new Date().getFullYear();
