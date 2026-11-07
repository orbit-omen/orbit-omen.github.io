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
let filterState = { cat: 'all', q: '' };
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

  const cats = d.categories || [];
  if (filterState.cat !== 'all' && !cats.some(c => c.id === filterState.cat)) filterState.cat = 'all';
  const allItems = [];
  (d.projects || []).filter(p => p.show !== false).forEach(p => {
    const pc = p.categories || [];
    allItems.push({ cats: pc, html: `<article class="card" data-build data-cats="${esc(pc.join(' '))}" data-text="${esc([p.title, p.description, ...(p.tags || [])].join(' ').toLowerCase())}">
      ${thumb(p.image)}<div class="meta">${esc(p.status)}</div><h3>${esc(p.title)}</h3><p>${esc(p.description)}</p>
      ${pills(p.tags)}${p.url ? `<p><a class="link" href="${esc(p.url)}" target="_blank" rel="noopener">Open →</a></p>` : ''}</article>` });
  });
  (repos || []).filter(r => !hiddenRepos[r.name]).forEach(r => {
    const rc = (d.repoCategories || {})[r.name] || [];
    allItems.push({ cats: rc, html: `<article class="card" data-build data-cats="${esc(rc.join(' '))}" data-text="${esc([r.name, r.description, r.language, ...(r.topics || [])].join(' ').toLowerCase())}">
      ${thumb((d.repoImages || {})[r.name])}<div class="meta">REPO${r.language ? ' · ' + esc(r.language) : ''} · ★ ${r.stars}</div><h3>${esc(r.name)}</h3><p>${esc(r.description)}</p>
      ${pills(r.topics)}<p><a class="link" href="${esc(r.url)}" target="_blank" rel="noopener">View repo →</a></p></article>` });
  });
  const projects = allItems.map(x => x.html);
  const catCount = id => allItems.filter(x => x.cats.includes(id)).length;
  const filterBar = allItems.length ? `<div class="filters" data-build>
      <div class="chips"><button class="chip ${filterState.cat === 'all' ? 'on' : ''}" data-filter="all">All <b>${allItems.length}</b></button>${cats.map(c => `<button class="chip ${filterState.cat === c.id ? 'on' : ''}" data-filter="${esc(c.id)}">${esc(c.label)} <b>${catCount(c.id)}</b></button>`).join('')}</div>
      <div class="fbar"><input class="fsearch" type="search" placeholder="Search…" value="${esc(filterState.q)}"><span id="filterCount" class="fcount"></span></div>
    </div>` : '';
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
    ${sec('projects', '02 — Projects', 'Projects', filterBar + grid(projects), projects.length)}
    ${sec('services', '03 — Services', 'What I do', grid(services), services.length)}
    ${sec('videos', '04 — Videos', 'Videos', grid(videos), videos.length)}
    ${sec('updates', '05 — Updates', 'Latest', grid(updates), updates.length)}
    ${on('contact') ? `<section id="contact" data-key="contact" ${secAttr((d.bg || {}).contact, 'contact')}><div class="wrap">
      <div class="tag">06 — Contact</div><h2 data-build>${esc(d.contactHeading)}</h2>
      <div class="links">${links.join('')}</div></div></section>` : ''}
    <footer>${esc(d.footer)}</footer>`;

  if (!on('hero')) document.querySelector('.hero').remove();
  if (skinOn) initSkin(skinCfg, nameTag);
  applyFilter();
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
  return { enabled: c.enabled !== false, speed: +c.speed || 650, blueprint: c.blueprint !== false, swarm: c.swarm == null ? 14 : +c.swarm, idle: c.idle == null ? 30 : +c.idle, list, sections };
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
  frames.clear(); trackRaf = 0;
  gates.forEach(([ev, fn]) => window.removeEventListener(ev, fn));
  gates = [];
  clearTimeout(idleTimer);
  stopIdle();
  const c = normCursors(raw);
  const keys = [...document.querySelectorAll('[data-key]')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!c.enabled || reduce) { document.getElementById('hud')?.remove(); document.querySelectorAll('[data-build]').forEach(x => x.classList.add('built')); return; }
  const wanted = s => c.sections[s.dataset.key].enabled;
  keys.forEach(s => { if (!wanted(s)) s.querySelectorAll('[data-build]').forEach(x => x.classList.add('built')); });
  hudTotal = keys.filter(wanted).reduce((n, s) => n + s.querySelectorAll('[data-build]').length, 0);
  hudDone = 0;
  hudUpdate();
  const layer = document.createElement('div');
  layer.className = 'cursor-layer';
  document.body.appendChild(layer);
  cursorObs = new IntersectionObserver(entries => entries.forEach(en => {
    if (!en.isIntersecting) return;
    cursorObs.unobserve(en.target);
    buildSection(en.target, layer, c.sections[en.target.dataset.key], c.list, c.speed, c);
  }), { threshold: 0.15 });
  const begin = () => {
    if (buildStarted) return;
    buildStarted = true;
    clearTimeout(idleTimer);
    stopIdle();
    gates.forEach(([ev, fn]) => window.removeEventListener(ev, fn));
    gates = [];
    keys.filter(wanted).forEach(s => cursorObs.observe(s));
  };
  buildStarted = false;
  gates = ['scroll', 'wheel', 'touchmove'].map(ev => { window.addEventListener(ev, begin, { passive: true }); return [ev, begin]; });
  idleTimer = setTimeout(begin, 6000);
  startIdle(c.idle);
}

let gates = [], buildStarted = false, idleTimer = 0, idleRaf = 0, idleStop = null;
function tinyEl(color) {
  const el = document.createElement('div');
  el.className = 'tiny';
  el.style.color = color;
  el.innerHTML = '<svg width="10" height="13" viewBox="0 0 18 24"><path d="M2 2v18.2l4.7-4.4 3.3 7.4 3-1.3-3.2-7.2h6.5z" fill="currentColor"/></svg>';
  return el;
}
function startIdle(n) {
  stopIdle();
  if (!n || n < 1) return;
  const layer = document.createElement('div');
  layer.className = 'idle-layer';
  document.body.appendChild(layer);
  const colors = ['#b48cf2', '#f5a3cf', '#4aa8ff', '#f0c06f', '#7be0a6'];
  const agents = Array.from({ length: n }, (_, i) => {
    const el = tinyEl(colors[i % colors.length]);
    layer.appendChild(el);
    return { el, x: Math.random() * innerWidth, y: Math.random() * innerHeight, vx: 0, vy: 0, tx: 0, ty: 0, next: 0, om: 3 + Math.random() * 3 };
  });
  let alive = true, last = performance.now();
  const f = now => {
    if (!alive) return;
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    agents.forEach(a => {
      if (now > a.next) {
        a.tx = Math.random() * innerWidth;
        a.ty = Math.random() * innerHeight;
        a.next = now + 900 + Math.random() * 1700;
      }
      springStep(a, a.tx, a.ty, a.om, dt);
      a.el.style.transform = `translate(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px) rotate(${(a.vx * 0.03).toFixed(1)}deg)`;
    });
    idleRaf = requestAnimationFrame(f);
  };
  idleRaf = requestAnimationFrame(f);
  idleStop = () => { alive = false; cancelAnimationFrame(idleRaf); layer.classList.add('out'); setTimeout(() => layer.remove(), 700); };
}
function stopIdle() { if (idleStop) { idleStop(); idleStop = null; } }

function springStep(p, tx, ty, omega, dt) {
  for (let t = 0; t < dt; t += 0.008) {
    const h = Math.min(0.008, dt - t);
    p.vx += (omega * omega * (tx - p.x) - 2 * omega * p.vx) * h;
    p.vy += (omega * omega * (ty - p.y) - 2 * omega * p.vy) * h;
    p.x += p.vx * h;
    p.y += p.vy * h;
  }
}

const frames = new Map();
let trackRaf = 0, hudDone = 0, hudTotal = 0;
const bpLabel = el => el.matches('h1') ? 'H1' : el.matches('h2') ? 'H2' : el.matches('.tag') ? 'LABEL' : el.matches('.btns') ? 'BUTTONS' : el.matches('.btn') ? 'BTN'
  : el.matches('article') ? 'CARD' : el.matches('.avatar,.hero-img') ? 'IMAGE' : el.matches('.stats') ? 'STATS' : el.matches('.facts') ? 'FACTS' : el.matches('.skin-stage') ? 'MODEL' : 'TEXT';

function bpLayer() {
  let l = document.querySelector('.bp-layer');
  if (!l) { l = document.createElement('div'); l.className = 'bp-layer'; document.body.appendChild(l); }
  return l;
}
function hudUpdate() {
  let h = document.getElementById('hud');
  if (!h) { h = document.createElement('div'); h.id = 'hud'; document.body.appendChild(h); }
  h.textContent = `SCAN ${hudDone}/${hudTotal}`;
  h.classList.toggle('full', hudTotal > 0 && hudDone >= hudTotal);
}
function place(rec) {
  const r = rec.el.getBoundingClientRect(), f = rec.f;
  f.style.transform = `translate(${r.left}px, ${r.top}px)`;
  f.style.width = r.width + 'px';
  f.style.height = r.height + 'px';
  const rect = f.querySelector('rect');
  rect.setAttribute('x', 1); rect.setAttribute('y', 1);
  rect.setAttribute('width', Math.max(1, r.width - 2));
  rect.setAttribute('height', Math.max(1, r.height - 2));
  rect.style.strokeDashoffset = String(100 - rec.p * 100);
  f.querySelector('b').textContent = `${bpLabel(rec.el)} ${Math.round(r.width)}×${Math.round(r.height)}${rec.locked ? ' · LOCKED' : ''}`;
  if (rec.x) {
    const W = Math.max(1, r.width - 2), H = Math.max(1, r.height - 2);
    const q = Math.max(0, Math.min(1, (rec.p - 0.5) * 2));
    f.querySelectorAll('line').forEach((ln, j) => {
      ln.setAttribute('x1', j ? W + 1 : 1); ln.setAttribute('y1', 1);
      ln.setAttribute('x2', j ? 1 : W + 1); ln.setAttribute('y2', H + 1);
      ln.style.strokeDashoffset = String(100 - q * 100);
    });
  }
  f.classList.toggle('locked', rec.locked);
}
function ensureTrack() {
  if (trackRaf) return;
  const loop = () => {
    if (!frames.size) { trackRaf = 0; return; }
    frames.forEach(place);
    trackRaf = requestAnimationFrame(loop);
  };
  trackRaf = requestAnimationFrame(loop);
}
function makeFrame(el, color, idx) {
  const f = document.createElement('div');
  f.className = 'bp';
  f.style.color = color;
  const x = el.matches('article,.avatar,.hero-img,.skin-stage');
  f.innerHTML = '<svg class="trace"><rect pathLength="100"/>' + (x ? '<line pathLength="100"/><line pathLength="100"/>' : '') + '</svg><i></i><i></i><i></i><i></i><em></em><b></b>';
  if (x) f.classList.add('x');
  bpLayer().appendChild(f);
  const rec = { el, f, p: 0, locked: false, idx, x };
  frames.set(el, rec);
  place(rec);
  ensureTrack();
  return rec;
}
// clockwise point on the element's outline, p in 0..1, starting top-left
function perimPoint(r, p) {
  const W = r.width, H = r.height;
  let d = p * 2 * (W + H);
  if (d <= W) return [r.left + d, r.top];
  d -= W;
  if (d <= H) return [r.left + W, r.top + d];
  d -= H;
  if (d <= W) return [r.left + W - d, r.top + H];
  d -= W;
  return [r.left, r.top + H - d];
}

function startSwarm(items, layer, n, palette) {
  const colors = [...palette, '#4aa8ff', '#f0c06f', '#7be0a6'];
  const agents = Array.from({ length: n }, (_, i) => {
    const el = document.createElement('div');
    el.className = 'tiny';
    el.style.color = colors[i % colors.length];
    el.innerHTML = '<svg width="10" height="13" viewBox="0 0 18 24"><path d="M2 2v18.2l4.7-4.4 3.3 7.4 3-1.3-3.2-7.2h6.5z" fill="currentColor"/></svg>';
    layer.appendChild(el);
    return { el, x: Math.random() * innerWidth, y: -20, vx: 0, vy: 0, tx: 0, ty: 0, next: 0, om: 4 + Math.random() * 4, hit: null };
  });
  let alive = true, last = performance.now();
  const f = now => {
    if (!alive) return;
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    agents.forEach(a => {
      if (now > a.next) {
        const it = items[Math.floor(Math.random() * items.length)];
        const r = it.getBoundingClientRect();
        const corner = Math.floor(Math.random() * 4);
        a.tx = r.left + (corner % 2 ? r.width : 0);
        a.ty = r.top + (corner < 2 ? 0 : r.height);
        a.hit = frames.get(it) || null;
        a.next = now + 500 + Math.random() * 900;
      }
      springStep(a, a.tx, a.ty, a.om, dt);
      a.el.style.transform = `translate(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px) rotate(${(a.vx * 0.03).toFixed(1)}deg)`;
      if (a.hit && Math.hypot(a.tx - a.x, a.ty - a.y) < 10) {
        a.hit.f.classList.remove('hit'); void a.hit.f.offsetWidth; a.hit.f.classList.add('hit');
        a.hit = null;
      }
    });
    requestAnimationFrame(f);
  };
  requestAnimationFrame(f);
  return () => { alive = false; agents.forEach(a => { a.el.classList.add('out'); setTimeout(() => a.el.remove(), 500); }); };
}

function buildSection(sec, layer, sc, list, speed, c) {
  const all = [...sec.querySelectorAll('[data-build]')].filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
  const draw = c.blueprint && sc.blueprint;
  const queues = planQueues(all, sc, list.length);
  const active = queues.filter(q => q.length);
  if (!active.length) return;
  let left = active.length;
  const stopSwarm = c.swarm > 0 ? startSwarm(all, layer, c.swarm, list.map(x => x.color)) : () => {};
  const done = () => { if (--left > 0) return; stopSwarm(); };
  const dur = speed * 0.6;

  queues.forEach((q, i) => {
    if (!q.length) return;
    const def = list[i];
    const el = document.createElement('div');
    el.className = 'cursor';
    el.style.color = def.color;
    el.innerHTML = `<svg width="18" height="24" viewBox="0 0 18 24"><path d="M2 2v18.2l4.7-4.4 3.3 7.4 3-1.3-3.2-7.2h6.5z" fill="#fff" stroke="#15121c" stroke-width="1.4" stroke-linejoin="round"/></svg><span>${esc(def.name)}</span>`;
    layer.appendChild(el);
    const p = { x: innerWidth - 60 - i * 36, y: Math.max(0, sec.getBoundingClientRect().top) + i * 24, vx: 0, vy: 0 };
    el.style.transform = `translate(${p.x}px, ${p.y}px)`;

    let k = 0, prog = 0, travelled = !draw, rec = null;
    let last = performance.now();
    const started = last + 80 + i * 140;

    const frame = now => {
      if (!el.isConnected) return;
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      if (now < started) return requestAnimationFrame(frame);
      if (k >= q.length) {
        el.classList.add('out');
        setTimeout(() => el.remove(), 600);
        return done();
      }
      const it = q[k];
      const r = it.getBoundingClientRect();
      let tx, ty;
      if (!draw) { tx = r.left + r.width / 2; ty = r.top + r.height / 2; }
      else if (!travelled) { tx = r.left; ty = r.top; }
      else { [tx, ty] = perimPoint(r, prog); }
      springStep(p, tx, ty, 14, dt);
      el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;

      if (!travelled) {
        if (Math.hypot(tx - p.x, ty - p.y) < 6) {
          travelled = true;
          if (draw) rec = frames.get(it) || makeFrame(it, def.color, k);
        }
        return requestAnimationFrame(frame);
      }

      prog = Math.min(1, prog + dt / (dur / 1000));
      if (rec) { rec.p = prog; }
      if (prog >= 1) {
        if (rec) { rec.p = 1; rec.locked = true; place(rec); }
        it.classList.add('built');
        el.classList.add('click');
        setTimeout(() => el.classList.remove('click'), 140);
        hudDone++;
        hudUpdate();
        k++;
        prog = 0;
        travelled = !draw;
        rec = null;
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

function applyFilter() {
  const q = filterState.q.trim().toLowerCase();
  let shown = 0;
  document.querySelectorAll('#projects .card').forEach(c => {
    const cs = (c.dataset.cats || '').split(' ').filter(Boolean);
    const ok = (filterState.cat === 'all' || cs.includes(filterState.cat)) && (!q || (c.dataset.text || '').includes(q));
    c.style.display = ok ? '' : 'none';
    if (ok) { shown++; c.classList.add('built'); }
  });
  document.querySelectorAll('[data-filter]').forEach(b => b.classList.toggle('on', b.dataset.filter === filterState.cat));
  const n = document.getElementById('filterCount');
  if (n) n.textContent = `${shown} shown`;
}
function onAppClick(e) {
  const b = e.target.closest && e.target.closest('[data-filter]');
  if (!b) return;
  filterState.cat = b.dataset.filter;
  applyFilter();
}
function onAppInput(e) {
  if (e.target.classList && e.target.classList.contains('fsearch')) {
    filterState.q = e.target.value;
    applyFilter();
  }
}

async function boot() {
  const app = document.getElementById('app');
  app.addEventListener('click', onAppClick);
  app.addEventListener('input', onAppInput);
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

