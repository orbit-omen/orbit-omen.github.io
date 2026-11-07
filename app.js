const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pills = t => (t || []).map(x => `<span class="pill">${esc(x)}</span>`).join('');
const toRepo = x => ({ name: x.name, description: x.description || '', url: x.html_url, language: x.language || '', stars: x.stargazers_count || 0, topics: x.topics || [] });

const R = p => (window.__pending && window.__pending[p]) || p;
const urlCss = p => `url('${esc(R(p)).replace(/'/g, '%27')}')`;
const secAttr = (p, cls) => p ? `class="${cls ? cls + ' ' : ''}has-bg" style="--bgimg:${urlCss(p)}"` : (cls ? `class="${cls}"` : '');
const thumb = p => p ? `<img class="thumb" src="${esc(R(p))}" alt="" loading="lazy">` : '';
function videoHtml(v) {
  const u = v.url || '';
  if (!u) return thumb(v.image);
  const yt = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  if (yt) return `<iframe class="thumb" src="https://www.youtube.com/embed/${yt[1]}" allowfullscreen loading="lazy" title="${esc(v.title)}"></iframe>`;
  if (/\.(mp4|webm|mov)(\?|$)/i.test(u)) return `<video class="thumb" src="${esc(R(u))}" ${v.image ? `poster="${esc(R(v.image))}"` : ''} controls playsinline preload="metadata"></video>`;
  return thumb(v.image) + `<p><a class="link" href="${esc(u)}" target="_blank" rel="noopener">Watch →</a></p>`;
}

let cursorObs = null;
let liveRepos = [];

function applyTheme(d) {
  const r = document.documentElement.style, t = d.theme || {};
  if (t.accent) r.setProperty('--accent', t.accent);
  if (t.accent2) r.setProperty('--accent2', t.accent2);
  if (t.blueprint) r.setProperty('--bp', t.blueprint);
  let ic = document.querySelector('link[rel=icon]');
  if (!ic) { ic = document.createElement('link'); ic.rel = 'icon'; document.head.appendChild(ic); }
  ic.href = d.favicon ? R(d.favicon) : 'data:,';
  const saved = localStorage.getItem('mode');
  document.documentElement.classList.toggle('dark', saved ? saved === 'dark' : !!t.darkDefault);
}

function toggleMode() {
  const dark = !document.documentElement.classList.contains('dark');
  document.documentElement.classList.toggle('dark', dark);
  localStorage.setItem('mode', dark ? 'dark' : 'light');
}

function render(d, repos) {
  applyTheme(d);
  document.title = `${d.name} | ${d.brand}`;
  const show = d.show || {};
  const on = k => show[k] !== false;
  const hiddenRepos = d.repoHidden || {};
  const grid = a => `<div class="grid">${a.join('')}</div>`;
  const a = d.about || {};

  const manual = (d.projects || []).filter(p => p.show !== false).map(p => `<article class="card" data-build>
      ${thumb(p.image)}<div class="meta">${esc(p.status)}</div><h3>${esc(p.title)}</h3><p>${esc(p.description)}</p>
      ${pills(p.tags)}${p.url ? `<p><a class="link" href="${esc(p.url)}" target="_blank" rel="noopener">Open →</a></p>` : ''}</article>`);
  const repoCards = (repos || []).filter(r => !hiddenRepos[r.name]).map(r => `<article class="card" data-build>
      ${thumb((d.repoImages || {})[r.name])}<div class="meta">REPO${r.language ? ' · ' + esc(r.language) : ''} · ★ ${r.stars}</div><h3>${esc(r.name)}</h3><p>${esc(r.description)}</p>
      ${pills(r.topics)}<p><a class="link" href="${esc(r.url)}" target="_blank" rel="noopener">View repo →</a></p></article>`);
  const projects = [...manual, ...repoCards];
  const services = (d.services || []).map(s => `<article class="card" data-build>${thumb(s.image)}<h3>${esc(s.name)}</h3><p>${esc(s.description)}</p></article>`);
  const videos = (d.videos || []).map(v => `<article class="card" data-build>${videoHtml(v)}<h3>${esc(v.title)}</h3></article>`);
  const updates = (d.updates || []).map(u => `<article class="card" data-build>${thumb(u.image)}<div class="meta">${esc(u.date)}</div><h3>${esc(u.title)}</h3><p>${esc(u.text)}</p></article>`);
  const links = (d.links || []).filter(l => l.label).map(l => `<a class="btn ${l.primary ? 'solid' : ''}" data-build href="${esc(l.url || '#')}" target="_blank" rel="noopener">${esc(l.label)}</a>`);
  const aboutInner = `<div class="about"><div>
      <p class="lead" data-build>${esc(a.text)}</p>
      <div class="facts" data-build>${(a.facts || []).filter(f => f.label || f.value).map(f => `<div><span>${esc(f.label)}</span><span>${esc(f.value)}</span></div>`).join('')}</div>
    </div><div class="avatar" data-build>${a.image ? `<img src="${esc(R(a.image))}" alt="">` : esc(d.avatarText)}</div></div>`;

  const sec = (key, tag, title, inner, has) => (on(key) && has)
    ? `<section id="${key}" data-key="${key}" ${secAttr((d.bg || {})[key])}><div class="wrap"><div class="tag">${esc(tag)}</div><h2>${esc(title)}</h2>${inner}</div></section>`
    : '';

  const navItems = [['about', 'About', !!a.text], ['projects', 'Projects', projects.length], ['services', 'Services', services.length],
    ['videos', 'Videos', videos.length], ['updates', 'Updates', updates.length], ['contact', 'Contact', true]]
    .filter(x => x[2] && on(x[0]));

  const skinCfg = d.skin || {};
  const skinOn = on('skin') && skinCfg.enabled !== false && !!skinCfg.file;
  const nameTag = ((d.cursors || {}).list || [])[0]?.name || d.name;
  document.getElementById('app').innerHTML = `
    <nav><div class="wrap"><div class="logo">${d.logo ? `<img src="${esc(R(d.logo))}" alt="${esc(d.brand)}">` : esc(d.brand)}</div>
      <ul>${navItems.map(([id, l]) => `<li><a href="#${id}">${l}</a></li>`).join('')}</ul>
      <button class="mode" onclick="toggleMode()" aria-label="Toggle dark mode">◐</button></div></nav>
    <header data-key="hero" ${secAttr(d.heroBg, 'hero')}>
      ${d.heroWord ? `<div class="hero-word" aria-hidden="true">${esc(d.heroWord)}</div>` : ''}
      <div class="wrap hero-grid">
        <div class="hero-text">
          <div class="tag" data-build>${esc(d.role)}</div>
          <h1 data-build>${esc(d.heroTitle)}<br><span class="grad">${esc(d.name)}.</span></h1>
          <p data-build>${esc(d.tagline)}</p>
          <div class="btns" data-build><a class="btn solid" href="#projects">${esc(d.heroCta)}</a><a class="btn" href="#contact">Contact</a></div>
          ${(d.stats || []).some(x => x.value || x.label) ? `<div class="stats" data-build>${(d.stats || []).filter(x => x.value || x.label).map(x => `<div><b>${esc(x.value)}</b><span>${esc(x.label)}</span></div>`).join('')}</div>` : ''}
        </div>
        ${d.heroImage ? `<div class="hero-img" data-build><img src="${esc(R(d.heroImage))}" alt=""></div>` : ''}
      </div></header>
    ${skinOn ? `<section id="skin" data-key="skin" class="skin-sec"><div class="wrap skin-grid">
      <div><div class="tag">00 — Skin</div><h2>Live model</h2><p class="lead">Scroll to spin me. Click to flip. Hover to tilt.</p></div>
      <div class="skin-stage" data-build><canvas id="skinCanvas"></canvas><div class="scan"></div><div class="skin-name">${esc(nameTag)}</div></div>
    </div></section>` : ''}
    ${sec('about', '01 — About', 'Background', aboutInner, !!a.text)}
    ${sec('projects', '02 — Projects', 'Projects', grid(projects), projects.length)}
    ${sec('services', '03 — Services', 'What I do', grid(services), services.length)}
    ${sec('videos', '04 — Videos', 'Videos', grid(videos), videos.length)}
    ${sec('updates', '05 — Updates', 'Latest', grid(updates), updates.length)}
    ${on('contact') ? `<section id="contact" data-key="contact" ${secAttr((d.bg || {}).contact, 'contact')}><div class="wrap">
      <div class="tag">06 — Contact</div><h2 data-build>${esc(d.contactHeading)}</h2>
      <div class="links">${links.join('')}</div></div></section>` : ''}
    <footer>${esc(d.footer)}</footer>`;

  if (!on('hero')) document.querySelector('.hero').remove();
  if (skinOn) initSkin(skinCfg, nameTag);
  setupCursors(d.cursors);
}

const CUR_SECTIONS = ['hero', 'skin', 'about', 'projects', 'services', 'videos', 'updates', 'contact'];
const CUR_DEFS = [['Yugansh', '#9b6fe0'], ['Orbit', '#f08cc0'], ['Omen', '#6fb7e0'], ['Nova', '#f0c06f']];
const GROUP_DEF = { heading: 1, text: 1, cards: 2, buttons: 3 };
function normCursors(c) {
  c = c || {};
  const names = c.names || [];
  const list = CUR_DEFS.map((d, i) => { const x = (c.list || [])[i] || {}; return { name: x.name || names[i] || d[0], color: x.color || d[1] }; });
  const sections = {};
  CUR_SECTIONS.forEach(k => {
    const x = (c.sections || {})[k];
    sections[k] = x && typeof x === 'object' ? { enabled: x.enabled !== false, count: +x.count || 1, assign: x.assign || {}, blueprint: x.blueprint !== false } : { enabled: x !== false, count: 1, assign: {}, blueprint: true };
  });
  return { enabled: c.enabled !== false, speed: +c.speed || 650, blueprint: c.blueprint !== false, swarm: c.swarm == null ? 14 : +c.swarm, list, sections };
}
const groupOf = el => el.matches('article,.hero-img') ? 'cards' : el.matches('.btn,.btns') ? 'buttons' : el.matches('h1,h2,.tag') ? 'heading' : 'text';
function planQueues(items, sc, max) {
  const n = Math.max(1, Math.min(max, +sc.count || 1));
  const queues = Array.from({ length: n }, () => []);
  items.forEach(it => {
    const g = groupOf(it);
    const who = Math.min(n, Math.max(1, +((sc.assign || {})[g] || GROUP_DEF[g]))) - 1;
    queues[who].push(it);
  });
  return queues;
}

function setupCursors(raw) {
  if (cursorObs) cursorObs.disconnect();
  document.querySelectorAll('.cursor-layer,.bp-layer').forEach(n => n.remove());
  bpBoxes.clear();
  const c = normCursors(raw);
  const keys = [...document.querySelectorAll('[data-key]')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!c.enabled || reduce) { document.querySelectorAll('[data-build]').forEach(x => x.classList.add('built')); return; }
  const wanted = s => c.sections[s.dataset.key].enabled;
  keys.forEach(s => { if (!wanted(s)) s.querySelectorAll('[data-build]').forEach(x => x.classList.add('built')); });
  const layer = document.createElement('div');
  layer.className = 'cursor-layer';
  document.body.appendChild(layer);
  cursorObs = new IntersectionObserver(entries => entries.forEach(en => {
    if (!en.isIntersecting) return;
    cursorObs.unobserve(en.target);
    buildSection(en.target, layer, c.sections[en.target.dataset.key], c.list, c.speed, c);
  }), { threshold: 0.15 });
  keys.filter(wanted).forEach(s => cursorObs.observe(s));
}

function springStep(p, tx, ty, omega, dt) {
  for (let t = 0; t < dt; t += 0.008) {
    const h = Math.min(0.008, dt - t);
    p.vx += (omega * omega * (tx - p.x) - 2 * omega * p.vx) * h;
    p.vy += (omega * omega * (ty - p.y) - 2 * omega * p.vy) * h;
    p.x += p.vx * h;
    p.y += p.vy * h;
  }
}

const bpBoxes = new Set();
let bpRaf = 0;
const bpLabel = el => el.matches('h1') ? 'H1' : el.matches('h2') ? 'H2' : el.matches('.tag') ? 'LABEL' : el.matches('.btns') ? 'BUTTONS' : el.matches('.btn') ? 'BTN'
  : el.matches('article') ? 'CARD' : el.matches('.avatar,.hero-img') ? 'IMAGE' : el.matches('.stats') ? 'STATS' : el.matches('.facts') ? 'FACTS' : 'TEXT';
function bpAdd(it) {
  let l = document.querySelector('.bp-layer');
  if (!l) { l = document.createElement('div'); l.className = 'bp-layer'; document.body.appendChild(l); }
  const r = it.getBoundingClientRect();
  const b = document.createElement('div');
  b.className = 'bp' + (it.matches('article,.avatar,.hero-img') ? ' fill' : '');
  b.innerHTML = `<i></i><i></i><i></i><i></i><b>${bpLabel(it)} ${Math.round(r.width)}×${Math.round(r.height)}</b>`;
  l.appendChild(b);
  const rec = { it, b };
  bpBoxes.add(rec);
  requestAnimationFrame(() => b.classList.add('on'));
  if (!bpRaf) {
    const f = () => {
      if (!bpBoxes.size) { bpRaf = 0; return; }
      bpBoxes.forEach(({ it, b }) => {
        const q = it.getBoundingClientRect();
        b.style.transform = `translate(${q.left}px, ${q.top}px)`;
        b.style.width = q.width + 'px';
        b.style.height = q.height + 'px';
      });
      bpRaf = requestAnimationFrame(f);
    };
    bpRaf = requestAnimationFrame(f);
  }
  return rec;
}
function bpRemove(rec) {
  bpBoxes.delete(rec);
  rec.b.classList.remove('on');
  rec.b.classList.add('done');
  setTimeout(() => rec.b.remove(), 350);
}

function startSwarm(items, layer, n, palette) {
  const colors = [...palette, '#4aa8ff', '#f0c06f', '#7be0a6'];
  const agents = Array.from({ length: n }, (_, i) => {
    const el = document.createElement('div');
    el.className = 'tiny';
    el.style.color = colors[i % colors.length];
    el.innerHTML = '<svg width="10" height="13" viewBox="0 0 18 24"><path d="M2 2v18.2l4.7-4.4 3.3 7.4 3-1.3-3.2-7.2h6.5z" fill="currentColor"/></svg>';
    layer.appendChild(el);
    return { el, x: Math.random() * innerWidth, y: -20, vx: 0, vy: 0, tx: 0, ty: 0, next: 0, om: 4 + Math.random() * 4 };
  });
  let alive = true, last = performance.now();
  const f = now => {
    if (!alive) return;
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    agents.forEach(a => {
      if (now > a.next) {
        const r = items[Math.floor(Math.random() * items.length)].getBoundingClientRect();
        a.tx = r.left + Math.random() * r.width;
        a.ty = r.top + Math.random() * r.height;
        a.next = now + 500 + Math.random() * 900;
      }
      springStep(a, a.tx, a.ty, a.om, dt);
      a.el.style.transform = `translate(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px) rotate(${(a.vx * 0.03).toFixed(1)}deg)`;
    });
    requestAnimationFrame(f);
  };
  requestAnimationFrame(f);
  return () => { alive = false; agents.forEach(a => { a.el.classList.add('out'); setTimeout(() => a.el.remove(), 500); }); };
}

function buildSection(sec, layer, sc, list, speed, c) {
  const all = [...sec.querySelectorAll('[data-build]')];
  const queues = planQueues(all, sc, list.length);
  const top = Math.max(0, sec.getBoundingClientRect().top);
  const travel = Math.max(0.15, speed * 0.9 / 1000);
  const omega = 4.5 / travel;
  const recs = new Map();
  let delay = 0;
  if (c.blueprint && sc.blueprint) {
    all.forEach((it, idx) => setTimeout(() => { if (sec.isConnected) recs.set(it, bpAdd(it)); }, idx * 70));
    delay = Math.min(1400, all.length * 70 + 400);
  }
  let active = queues.filter(q => q.length).length;
  if (!active) return;
  const stopSwarm = c.swarm > 0 ? startSwarm(all, layer, c.swarm, list.map(x => x.color)) : () => {};
  const finish = () => { if (--active > 0) return; recs.forEach(bpRemove); stopSwarm(); };
  queues.forEach((q, i) => {
    if (!q.length) return;
    const def = list[i];
    const el = document.createElement('div');
    el.className = 'cursor';
    el.style.color = def.color;
    el.innerHTML = `<svg width="18" height="24" viewBox="0 0 18 24"><path d="M2 2v18.2l4.7-4.4 3.3 7.4 3-1.3-3.2-7.2h6.5z" fill="#fff" stroke="#15121c" stroke-width="1.4" stroke-linejoin="round"/></svg><span>${esc(def.name)}</span>`;
    layer.appendChild(el);
    const p = { x: innerWidth - 60 - i * 36, y: top + i * 24, vx: 0, vy: 0 };
    el.style.transform = `translate(${p.x}px, ${p.y}px)`;
    let k = 0, last = performance.now(), arrivedAt = 0, giveUp = 0;
    const started = last + delay + 80 + i * 140;
    const frame = now => {
      if (!el.isConnected) return;
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      if (now < started) return requestAnimationFrame(frame);
      if (k >= q.length) {
        el.classList.add('out');
        setTimeout(() => el.remove(), 600);
        return finish();
      }
      const r = q[k].getBoundingClientRect();
      const tx = r.left + Math.min(18, r.width / 2), ty = r.top + Math.min(14, r.height / 2);
      springStep(p, tx, ty, omega, dt);
      el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
      if (!giveUp) giveUp = now + speed * 3;
      const near = Math.hypot(tx - p.x, ty - p.y) < 8 && Math.hypot(p.vx, p.vy) < 60;
      if ((near || now > giveUp) && !arrivedAt) arrivedAt = now;
      if (arrivedAt && now - arrivedAt > speed * 0.35) {
        const rec = recs.get(q[k]);
        if (rec) { recs.delete(q[k]); bpRemove(rec); }
        q[k].classList.add('built');
        el.classList.add('click');
        setTimeout(() => el.classList.remove('click'), 140);
        k++;
        arrivedAt = 0;
        giveUp = 0;
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}

/* ---------- Minecraft skin viewer (three.js) ---------- */
let skinRun = null;
function loadThree() {
  return new Promise((res, rej) => {
    if (window.THREE) return res();
    const sc = document.createElement('script');
    sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    sc.onload = res;
    sc.onerror = rej;
    document.head.appendChild(sc);
  });
}
function uvBox(w, h, d, u0, v0) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const rects = [
    [u0, v0 + d, d, h], [u0 + d + w, v0 + d, d, h], [u0 + d, v0, w, d],
    [u0 + d + w, v0, w, d], [u0 + d, v0 + d, w, h], [u0 + 2 * d + w, v0 + d, w, h]
  ];
  rects.forEach(([x, y, rw, rh], f) => {
    const l = x / 64, r = (x + rw) / 64, tp = 1 - y / 64, bt = 1 - (y + rh) / 64;
    uv.setXY(f * 4, l, tp); uv.setXY(f * 4 + 1, r, tp);
    uv.setXY(f * 4 + 2, l, bt); uv.setXY(f * 4 + 3, r, bt);
  });
  uv.needsUpdate = true;
  return new THREE.Mesh(g);
}
function skinPart(mat, w, h, d, base, over, cx, cy) {
  const g = new THREE.Group();
  const a = uvBox(w, h, d, base[0], base[1]); a.material = mat;
  const b = uvBox(w + 0.6, h + 0.6, d + 0.6, over[0], over[1]); b.material = mat;
  g.add(a, b);
  g.position.set(cx, cy, 0);
  return g;
}
async function initSkin(cfg, tag) {
  if (skinRun) { skinRun.stop(); skinRun = null; }
  const canvas = document.getElementById('skinCanvas');
  if (!canvas) return;
  try { await loadThree(); } catch (_) { return; }
  const stage = canvas.parentNode;
  const tex = new THREE.TextureLoader().load(R(cfg.file), () => stage.classList.add('ready'));
  tex.magFilter = tex.minFilter = THREE.NearestFilter;
  const mat = new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5 });
  const slim = cfg.model === 'slim', aw = slim ? 3 : 4, ax = slim ? 5.5 : 6;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  cam.position.set(0, 0.35, 6.2); cam.lookAt(0, 0.1, 0);
  const rig = new THREE.Group(); scene.add(rig);
  const holder = new THREE.Group();
  holder.scale.set(cfg.mirror ? -1 / 16 : 1 / 16, 1 / 16, 1 / 16);
  holder.position.y = -1;
  holder.add(
    skinPart(mat, 8, 8, 8, [0, 0], [32, 0], 0, 28),
    skinPart(mat, 8, 12, 4, [16, 16], [16, 32], 0, 18),
    skinPart(mat, aw, 12, 4, [40, 16], [40, 32], -ax, 18),
    skinPart(mat, aw, 12, 4, [32, 48], [48, 48], ax, 18),
    skinPart(mat, 4, 12, 4, [0, 16], [0, 32], -2, 6),
    skinPart(mat, 4, 12, 4, [16, 48], [0, 48], 2, 6)
  );
  rig.add(holder);
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent2').trim() || '#f5a3cf';
  const ringMat = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.72, 0.76, 96), ringMat);
  ring.rotation.x = -Math.PI / 2; ring.position.y = -1.01; scene.add(ring);

  const fit = () => {
    const w = canvas.clientWidth || 400, h = canvas.clientHeight || 480;
    renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
  };
  fit();
  window.addEventListener('resize', fit);

  const sec = canvas.closest('section');
  let scrollT = 0, spin = 0, flip = 0, flipTo = 0, visible = true, running = true;
  const tilt = { x: 0, y: 0 }, pt = { x: 0, y: 0 };
  const onScroll = () => {
    const r = sec.getBoundingClientRect(), vh = innerHeight;
    scrollT = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  canvas.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    pt.x = (e.clientX - r.left) / r.width - 0.5;
    pt.y = (e.clientY - r.top) / r.height - 0.5;
  });
  canvas.addEventListener('pointerleave', () => { pt.x = 0; pt.y = 0; });
  canvas.addEventListener('click', () => { flipTo += Math.PI * 2; });
  const io = new IntersectionObserver(es => { visible = es[0].isIntersecting; });
  io.observe(canvas);

  const t0 = performance.now();
  const frame = now => {
    if (!running) return;
    requestAnimationFrame(frame);
    if (!visible) return;
    const t = (now - t0) / 1000;
    const target = scrollT * Math.PI * 4 * (cfg.spin ?? 1) + (cfg.idle !== false ? t * 0.35 : 0);
    spin += (target - spin) * 0.08;
    flip += (flipTo - flip) * 0.07;
    tilt.x += (pt.y * 0.35 - tilt.x) * 0.08;
    tilt.y += (pt.x * 0.35 - tilt.y) * 0.08;
    rig.rotation.set(tilt.x, spin + flip + tilt.y, 0);
    rig.position.y = Math.sin(t * 1.6) * 0.03;
    ringMat.opacity = 0.35 + Math.sin(t * 2.2) * 0.2;
    ring.scale.setScalar(1 + Math.sin(t * 2.2) * 0.03);
    renderer.render(scene, cam);
  };
  requestAnimationFrame(frame);
  skinRun = {
    stop() {
      running = false;
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', fit);
      io.disconnect();
      renderer.forceContextLoss();
    }
  };
}

async function boot() {
  const d = await (await fetch('data/portfolio.json')).json();
  let repos = d.repos || [];
  try {
    const r = await fetch(`https://api.github.com/users/${encodeURIComponent(d.github)}/repos?per_page=100&sort=updated`);
    if (r.ok) repos = (await r.json()).filter(x => !x.fork).map(toRepo);
  } catch (_) { /* offline or rate-limited: fall back to cached repos */ }
  liveRepos = repos;
  if (!window.__studio) render(d, repos);
}

window.addEventListener('message', e => {
  if (e.data && e.data.type === 'studio-data') {
    window.__studio = true;
    window.__pending = e.data.pending || {};
    render(e.data.data, liveRepos.length ? liveRepos : (e.data.data.repos || []));
  }
});

boot().catch(() => { document.getElementById('app').textContent = 'Could not load the portfolio.'; });

