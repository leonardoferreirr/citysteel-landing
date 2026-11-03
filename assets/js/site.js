/* City Steel: núcleo do site. Sem dependência para o essencial (menu, formulário,
   revelações, história em 3D); o Lenis (scroll suave) entra depois do load. */
(() => {
  const d = document, h = d.documentElement, w = window;
  const mob = w.matchMedia('(max-width:860px)');
  const rm = w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const F3D = '/assets/js/frame3d.js?v=dfcf349c88';
  let lenis = null;

  /* ---------- cabeçalho e menu ---------- */
  const top = d.querySelector('.top'), burger = d.querySelector('.burger');
  if (burger) burger.addEventListener('click', () => {
    const open = !h.classList.contains('menu-open');
    h.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  });
  d.querySelectorAll('.nav a').forEach(a => a.addEventListener('click', () => {
    h.classList.remove('menu-open');
    burger && burger.setAttribute('aria-expanded', 'false');
  }));

  /* âncoras da mesma página passam pelo Lenis quando ele existe */
  d.addEventListener('click', e => {
    const a = e.target.closest('a[href*="#"]');
    if (!a) return;
    const url = new URL(a.href, location.href);
    if (url.pathname.replace(/\/$/, '') !== location.pathname.replace(/\/$/, '') || !url.hash) return;
    const alvo = d.querySelector(url.hash);
    if (!alvo) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(alvo, { offset: -70 });
    else alvo.scrollIntoView({ behavior: rm ? 'auto' : 'smooth' });
    history.replaceState(null, '', url.hash);
    const modelo = a.dataset.modelo;
    if (modelo) {
      const sel = d.querySelector('#f-modelo');
      if (sel) sel.value = modelo;
    }
  });

  /* ---------- revelações (com reserva: nada fica invisível) ---------- */
  const rvs = [...d.querySelectorAll('.rv, .cota, .mira, .marq')];
  const mostrar = el => el.classList.add('in');
  if ('IntersectionObserver' in w) {
    const io = new IntersectionObserver(es => es.forEach(en => {
      if (en.isIntersecting) { mostrar(en.target); if (!en.target.matches('.mira, .marq')) io.unobserve(en.target); }
      else if (en.target.matches('.mira, .marq')) en.target.classList.remove('in');
    }), { rootMargin: '0px 0px -8% 0px' });
    rvs.forEach(el => io.observe(el));
  } else rvs.forEach(mostrar);
  /* reserva: o que já passou da tela aparece mesmo se o observador falhar */
  const reserva = () => rvs.forEach(el => { if (el.getBoundingClientRect().top < innerHeight) mostrar(el); });
  setTimeout(reserva, 2500);

  /* ---------- história em 3D ---------- */
  const story = d.querySelector('.story');
  let st = null;
  if (story) {
    const beats = [...story.querySelectorAll('.beat')].map(b => ({ el: b, a: +b.dataset.a, z: +b.dataset.b }));
    const bar = story.querySelector('.story__bar'), label = story.querySelector('.story__label');
    const canvas = story.querySelector('.story__canvas');
    const [m0, m1] = (story.dataset.map || '0,1').split(',').map(Number);
    const fases = [[0.25, 'PROJETO'], [0.6, 'ESTRUTURA'], [0.85, 'FACHADA'], [9, 'EMPRESA']];
    let frame = null, montou = false, ultimo = -1;
    st = {
      p: 0,
      medir() {
        const r = story.getBoundingClientRect(), total = story.offsetHeight - innerHeight;
        this.p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
      },
      aplicar() {
        const p = this.p;
        if (Math.abs(p - ultimo) < 0.0005) return;
        ultimo = p;
        beats.forEach((b, i) => {
          const on = p >= b.a && p < b.z;
          b.el.classList.toggle('on', on && i > 0);
          b.el.classList.toggle('out', !on && p >= b.z);
        });
        bar && bar.style.setProperty('--p', p.toFixed(4));
        const q = m0 + (m1 - m0) * p;
        if (label) label.textContent = fases.find(f => q < f[0])[1];
        story.classList.toggle('moved', p > 0.01);
        if (frame) frame.setProgress(q);
      },
    };
    const montar = () => {
      if (montou || !canvas) return;
      montou = true;
      gatilhos.forEach(ev => w.removeEventListener(ev, montar));
      import(F3D)
        .then(m => m.mountFrame(canvas, { mobile: mob.matches, reducedMotion: rm, start: m0 }))
        .then(f => { frame = f; ultimo = -1; st.medir(); st.aplicar(); return f.ready; })
        .then(() => story.classList.add('live'))
        .catch(err => console.warn('3D indisponível, fica o pôster', err));
    };
    const gatilhos = ['pointermove', 'touchstart', 'scroll', 'wheel', 'keydown'];
    gatilhos.forEach(ev => w.addEventListener(ev, montar, { passive: true }));
    setTimeout(montar, 12000);
  }

  /* ---------- trilho horizontal de obras (computador) ---------- */
  const rail = d.querySelector('.rail'), track = rail && rail.querySelector('.rail__track');
  let railDist = 0;
  const medirRail = () => {
    if (!rail) return;
    if (mob.matches || rm) { rail.style.removeProperty('--rail-h'); track.style.transform = ''; railDist = 0; return; }
    railDist = Math.max(0, track.scrollWidth - innerWidth);
    rail.style.setProperty('--rail-h', `${innerHeight + railDist}px`);
  };
  const moverRail = () => {
    if (!railDist) return;
    const r = rail.getBoundingClientRect(), total = rail.offsetHeight - innerHeight;
    const p = Math.min(1, Math.max(0, -r.top / total));
    track.style.transform = `translate3d(${(-railDist * p).toFixed(1)}px,0,0)`;
  };

  /* ---------- linha dos passos da franquia ---------- */
  const steps = d.querySelector('.steps');
  const moverSteps = () => {
    if (!steps) return;
    const r = steps.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight * 0.75 - r.top) / (r.height + innerHeight * 0.25)));
    steps.style.setProperty('--p', p.toFixed(3));
  };

  /* ---------- fundo milimetrado deslizando ---------- */
  const grid = d.querySelector('.grid-bg');
  const moverGrid = () => {
    if (!grid || rm) return;
    grid.style.transform = `translate3d(0,${-((w.scrollY * 0.18) % 120).toFixed(1)}px,0)`;
  };

  /* ---------- um único laço de scroll ---------- */
  let pendente = false;
  const quadro = () => {
    pendente = false;
    top && top.classList.toggle('solid', w.scrollY > 40);
    if (st) { st.medir(); st.aplicar(); }
    moverRail(); moverSteps(); moverGrid();
  };
  const pedir = () => { if (!pendente) { pendente = true; requestAnimationFrame(quadro); } };
  w.addEventListener('scroll', pedir, { passive: true });
  w.addEventListener('resize', () => { medirRail(); pedir(); }, { passive: true });
  medirRail(); quadro();

  /* ---------- formulários: mensagem pronta para o WhatsApp ---------- */
  d.querySelectorAll('form.form').forEach(form => form.addEventListener('submit', e => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const f = new FormData(form), v = k => (f.get(k) || '').toString().trim();
    const linhas = [
      form.dataset.c === 'franquia' ? 'Olá! Quero ser franqueado City Steel.' : 'Olá! Vim pelo site da City Steel.',
      '', `Nome: ${v('nome')}`, `WhatsApp: ${v('whatsapp')}`, `Cidade: ${v('cidade')}`, `Interesse: ${v('interesse')}`,
    ];
    if (v('mensagem')) linhas.push(`Mensagem: ${v('mensagem')}`);
    try { sessionStorage.setItem('cs_msg', linhas.join('\n')); } catch (_) {}
    location.href = `/obrigado?c=${encodeURIComponent(form.dataset.c || 'form')}`;
  }));

  /* ---------- Lenis depois do load (não disputa com a primeira pintura) ---------- */
  const depoisDoLoad = () => {
    medirRail(); pedir();
    if (rm || mob.matches) return;
    const s = d.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/lenis@1.1.20/dist/lenis.min.js';
    s.async = false;
    s.onload = () => {
      if (typeof w.Lenis !== 'function') return;
      lenis = new w.Lenis({ duration: 1.05, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
      const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    };
    d.head.appendChild(s);
  };
  if (d.readyState === 'complete') depoisDoLoad(); else w.addEventListener('load', depoisDoLoad);
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(() => { medirRail(); pedir(); });
})();
