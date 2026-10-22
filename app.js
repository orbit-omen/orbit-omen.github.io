let appConfig = null;
let audioPlayer = null;

async function loadData() {
  try {
    const local = localStorage.getItem('orbitomen_config');
    if (local) {
      appConfig = JSON.parse(local);
    } else {
      const res = await fetch('./config.json');
      appConfig = await res.json();
    }
    applyTheme(appConfig.theme);
    renderProfile(appConfig.profile);
    renderBlocks(appConfig.blocks);
    initWidgets(appConfig.blocks);
    initAudio(appConfig.profile);
    initEasterEggs(appConfig.profile);
  } catch (err) {
    console.error('Failed to load bio config:', err);
  }
}

function applyTheme(theme) {
  if (!theme) return;
  const root = document.documentElement;
  if (theme.bgColor) root.style.setProperty('--bg-color', theme.bgColor);
  if (theme.bgGradient) root.style.setProperty('--bg-gradient', theme.bgGradient);
  if (theme.textColor) root.style.setProperty('--text-color', theme.textColor);
  if (theme.cardBg) root.style.setProperty('--card-bg', theme.cardBg);
  if (theme.cardBorder) root.style.setProperty('--card-border', theme.cardBorder);
  if (theme.accentColor) root.style.setProperty('--accent-color', theme.accentColor);
  if (theme.borderRadius !== undefined) root.style.setProperty('--border-radius', `${theme.borderRadius}px`);
  if (theme.spacing !== undefined) root.style.setProperty('--spacing', `${theme.spacing}px`);
  if (theme.maxWidth !== undefined) root.style.setProperty('--max-width', `${theme.maxWidth}px`);
  if (theme.fontFamily) root.style.setProperty('--font-family', theme.fontFamily);

  if (theme.customCss) {
    let customStyle = document.getElementById('custom-css-style');
    if (!customStyle) {
      customStyle = document.createElement('style');
      customStyle.id = 'custom-css-style';
      document.head.appendChild(customStyle);
    }
    customStyle.textContent = theme.customCss;
  }

  if (theme.enableParticles) initPortalParticles();
}

function renderProfile(profile) {
  if (!profile) return;
  document.title = `${profile.displayName || 'OrbitOmen'} | Developer & Modder`;
  document.getElementById('banner').style.backgroundImage = `url('${profile.banner || ''}')`;
  const avatar = document.getElementById('avatar');
  avatar.src = profile.avatar || '';
  avatar.className = `avatar frame-${profile.avatarFrame || 'glow'}`;
  document.getElementById('display-name').textContent = profile.displayName || '';
  document.getElementById('verified-badge').style.display = profile.verified ? 'flex' : 'none';
  document.getElementById('status-pill').textContent = profile.statusText || '';
  document.getElementById('status-pill').style.display = profile.statusText ? 'inline-block' : 'none';

  const bioEl = document.getElementById('bio-text');
  if (profile.typingBio && profile.bio) {
    let i = 0;
    bioEl.textContent = '';
    const timer = setInterval(() => {
      bioEl.textContent += profile.bio.charAt(i);
      i++;
      if (i >= profile.bio.length) clearInterval(timer);
    }, 28);
  } else {
    bioEl.textContent = profile.bio || '';
  }

  const enterScreen = document.getElementById('click-enter-screen');
  if (profile.clickToEnter) {
    enterScreen.classList.remove('hidden');
    document.getElementById('enter-screen-text').textContent = profile.clickToEnterText || 'Click to Enter';
    enterScreen.onclick = () => {
      enterScreen.classList.add('hidden');
      if (audioPlayer) audioPlayer.play().catch(() => {});
    };
  } else {
    enterScreen.classList.add('hidden');
  }
}

function renderBlocks(blocks) {
  const container = document.getElementById('blocks-container');
  container.innerHTML = '';
  if (!Array.isArray(blocks)) return;

  blocks.forEach(b => {
    if (b.hidden) return;
    const el = document.createElement('div');
    el.className = 'block-item';
    el.id = b.id;

    const iconHtml = b.icon ? escapeHtml(b.icon) : '✨';
    const hasImage = !!b.image;

    if (b.type === 'link') {
      el.classList.add('clickable');
      const forceExternal = b.openExternal !== false;
      let inner = '';
      if (hasImage) {
        inner += `<img class="block-img-banner" src="${escapeHtml(b.image)}" alt="${escapeHtml(b.title || '')}" loading="lazy">`;
      }
      inner += `
        <div class="link-block">
          <div class="link-icon">${iconHtml}</div>
          <div class="link-details">
            <div class="link-title">${escapeHtml(b.title)} ${forceExternal ? '<span class="external-glyph">↗</span>' : ''}</div>
            ${b.subtitle ? `<div class="link-subtitle">${escapeHtml(b.subtitle)}</div>` : ''}
          </div>
          ${b.badge ? `<span class="link-badge">${escapeHtml(b.badge)}</span>` : ''}
        </div>
      `;
      el.innerHTML = inner;
      el.onclick = () => {
        playClick();
        if (b.url) {
          if (forceExternal) {
            window.open(b.url, '_blank', 'noopener,noreferrer');
          } else {
            window.location.href = b.url;
          }
        }
      };
    } else if (b.type === 'image') {
      if (b.url) el.classList.add('clickable');
      el.innerHTML = `
        ${b.image ? `<img class="block-img-banner" style="margin-bottom:${b.title ? '8px' : '0'}" src="${escapeHtml(b.image)}" alt="${escapeHtml(b.title || '')}">` : ''}
        ${b.title ? `<div style="font-weight:600;font-size:0.95rem;color:#fdf2f8;display:flex;align-items:center;gap:6px"><span>${iconHtml}</span> ${escapeHtml(b.title)} ${b.url ? '<span class="external-glyph">↗</span>' : ''}</div>` : ''}
      `;
      if (b.url) {
        el.onclick = () => {
          playClick();
          window.open(b.url, b.openExternal !== false ? '_blank' : '_self', 'noopener,noreferrer');
        };
      }
    } else if (b.type === 'header') {
      el.classList.add('header-block');
      el.innerHTML = `<span>${iconHtml}</span> ${escapeHtml(b.title || '')}`;
    } else if (b.type === 'divider') {
      el.classList.add('divider-block');
    } else if (b.type === 'text') {
      el.classList.add('text-block');
      let inner = '';
      if (hasImage) {
        inner += `<img class="block-img-banner" src="${escapeHtml(b.image)}" alt="">`;
      }
      inner += `<h4 style="color:#f472b6;margin-bottom:6px;display:flex;align-items:center;gap:6px"><span>${iconHtml}</span> ${escapeHtml(b.title || '')}</h4><div>${escapeHtml(b.text || '').replace(/\n/g, '<br/>')}</div>`;
      el.innerHTML = inner;
    } else if (b.type === 'skills') {
      let inner = '';
      if (hasImage) {
        inner += `<img class="block-img-banner" src="${escapeHtml(b.image)}" alt="">`;
      }
      inner += `
        <div style="font-weight:600;font-size:0.95rem;color:#f472b6;display:flex;align-items:center;gap:6px"><span>${iconHtml}</span> ${escapeHtml(b.title || 'Tech Stack')}</div>
        <div class="skills-container">
          ${(b.tags || []).map(t => `<span class="skill-tag">${escapeHtml(t)}</span>`).join('')}
        </div>
      `;
      el.innerHTML = inner;
    } else if (b.type === 'copy') {
      el.classList.add('clickable');
      let inner = '';
      if (hasImage) {
        inner += `<img class="block-img-banner" src="${escapeHtml(b.image)}" alt="">`;
      }
      inner += `
        <div class="link-block">
          <div class="link-icon">${iconHtml}</div>
          <div class="link-details">
            <div class="link-title">${escapeHtml(b.title)}</div>
            <div class="link-subtitle">${escapeHtml(b.valueToCopy)}</div>
          </div>
          <span class="link-badge">COPY</span>
        </div>
      `;
      el.innerHTML = inner;
      el.onclick = () => {
        playClick();
        navigator.clipboard.writeText(b.valueToCopy);
        showToast(b.toastMessage || 'Copied to clipboard!');
      };
    } else if (b.type === 'minecraft') {
      el.classList.add('widget-mc');
      let inner = '';
      if (hasImage) {
        inner += `<img class="block-img-banner" src="${escapeHtml(b.image)}" alt="">`;
      }
      inner += `
        <div class="mc-status-row">
          <strong>${iconHtml} ${escapeHtml(b.title || 'Minecraft Server')}</strong>
          <span class="mc-pill" id="mc-status-${b.id}">Checking...</span>
        </div>
        <div style="font-size:0.82rem;color:#fbcfe8">Server IP: <span style="font-weight:bold;color:#f472b6">${escapeHtml(b.serverIp)}</span></div>
        <div style="font-size:0.8rem;color:#c084fc" id="mc-players-${b.id}">Querying players...</div>
      `;
      el.innerHTML = inner;
      if (b.copyOnClick) {
        el.style.cursor = 'pointer';
        el.onclick = () => {
          navigator.clipboard.writeText(b.serverIp);
          showToast('Server IP copied!');
        };
      }
    } else if (b.type === 'discord') {
      el.classList.add('widget-discord');
      let inner = '';
      if (hasImage) {
        inner += `<img class="block-img-banner" src="${escapeHtml(b.image)}" alt="">`;
      }
      inner += `
        <div class="link-icon">${iconHtml}</div>
        <div style="flex:1">
          <div style="font-weight:600;font-size:0.95rem;color:#fff">${escapeHtml(b.title || 'Discord Profile')}</div>
          <div id="discord-details-${b.id}" style="font-size:0.82rem;color:#fbcfe8;opacity:0.85">Connecting to Lanyard API...</div>
        </div>
      `;
      el.innerHTML = inner;
    } else if (b.type === 'faq') {
      let inner = '';
      if (hasImage) {
        inner += `<img class="block-img-banner" src="${escapeHtml(b.image)}" alt="">`;
      }
      inner += `<h4 style="margin-bottom:8px;color:#f472b6;display:flex;align-items:center;gap:6px"><span>${iconHtml}</span> ${escapeHtml(b.title || 'Frequently Asked Questions')}</h4>` + (b.items || []).map(item => `
        <div class="faq-item" onclick="this.classList.toggle('open')">
          <div class="faq-question">${escapeHtml(item.q)} <span>+</span></div>
          <div class="faq-answer">${escapeHtml(item.a)}</div>
        </div>
      `).join('');
      el.innerHTML = inner;
    }

    container.appendChild(el);
  });
}

function initWidgets(blocks) {
  if (!Array.isArray(blocks)) return;
  blocks.forEach(b => {
    if (b.type === 'minecraft' && b.serverIp) {
      fetch(`https://api.mcsrvstat.us/2/${encodeURIComponent(b.serverIp)}`)
        .then(r => r.json())
        .then(data => {
          const statusEl = document.getElementById(`mc-status-${b.id}`);
          const playersEl = document.getElementById(`mc-players-${b.id}`);
          if (!statusEl || !playersEl) return;
          if (data.online) {
            statusEl.textContent = 'ONLINE';
            statusEl.style.background = 'rgba(16, 185, 129, 0.25)';
            statusEl.style.color = '#6ee7b7';
            playersEl.textContent = `Online: ${data.players ? data.players.online : 0}/${data.players ? data.players.max : 0} players`;
          } else {
            statusEl.textContent = 'OFFLINE';
            statusEl.style.background = 'rgba(239, 68, 68, 0.25)';
            statusEl.style.color = '#fca5a5';
            playersEl.textContent = 'Server sleeping or unreachable';
          }
        }).catch(() => {});
    }
    if (b.type === 'discord' && b.lanyardId) {
      fetch(`https://api.lanyard.rest/v1/users/${encodeURIComponent(b.lanyardId)}`)
        .then(r => r.json())
        .then(res => {
          const details = document.getElementById(`discord-details-${b.id}`);
          if (!details) return;
          if (res.success && res.data) {
            const d = res.data;
            const statusEmoji = { online: '🟢', idle: '🌙', dnd: '⛔', offline: '⚪' };
            const game = d.activities && d.activities.length ? `playing ${d.activities[0].name}` : d.discord_status;
            details.textContent = `${statusEmoji[d.discord_status] || '⚪'} ${d.discord_user.username} (${game})`;
          } else {
            details.textContent = 'Discord user unavailable';
          }
        }).catch(() => {});
    }
  });
}

function initAudio(profile) {
  if (!profile || !profile.bgMusic) return;
  audioPlayer = new Audio(profile.bgMusic);
  audioPlayer.loop = true;
  const btn = document.getElementById('music-toggle');
  btn.style.display = 'flex';
  btn.onclick = () => {
    if (audioPlayer.paused) {
      audioPlayer.play();
      btn.textContent = '🔊';
    } else {
      audioPlayer.pause();
      btn.textContent = '🔇';
    }
  };
}

function playClick() {
  if (!appConfig?.theme?.clickSound) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(950, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(450, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.07, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.05);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch {}
}

function initEasterEggs(profile) {
  const konami = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  let kPos = 0;
  window.addEventListener('keydown', e => {
    if (e.key === konami[kPos]) {
      kPos++;
      if (kPos === konami.length) {
        showToast('👾 Nether Rift Activated!');
        kPos = 0;
      }
    } else {
      kPos = 0;
    }
  });

  if (profile?.secretCode) {
    let typed = '';
    window.addEventListener('keypress', e => {
      typed += e.key;
      if (typed.endsWith(profile.secretCode)) {
        showToast('🔮 Nether Vault Unlocked!');
        const sBlock = document.getElementById(profile.secretBlockId);
        if (sBlock) sBlock.style.display = 'block';
      }
    });
  }
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function initPortalParticles() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;
  window.onresize = () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; };

  const colors = ['rgba(217, 70, 239, 0.4)', 'rgba(244, 114, 182, 0.45)', 'rgba(192, 132, 252, 0.4)'];
  const particles = Array.from({ length: 45 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.4,
    vy: -(Math.random() * 0.7 + 0.2),
    size: Math.random() * 2.5 + 1.2,
    color: colors[Math.floor(Math.random() * colors.length)]
  }));

  function loop() {
    ctx.clearRect(0, 0, width, height);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    requestAnimationFrame(loop);
  }
  loop();
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

window.addEventListener('message', e => {
  if (e.data && e.data.type === 'LIVE_CONFIG_UPDATE') {
    appConfig = e.data.config;
    applyTheme(appConfig.theme);
    renderProfile(appConfig.profile);
    renderBlocks(appConfig.blocks);
  }
});

window.onload = loadData;
