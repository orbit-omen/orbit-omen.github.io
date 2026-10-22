let currentConfig = null;
let undoStack = [];
let redoStack = [];

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function init() {
  const local = localStorage.getItem('orbitomen_config');
  if (local) {
    currentConfig = JSON.parse(local);
  } else {
    const res = await fetch('./config.json');
    currentConfig = await res.json();
  }

  const authenticated = sessionStorage.getItem('orbitomen_auth') === 'true';
  if (!authenticated) {
    document.getElementById('login-modal').style.display = 'flex';
  } else {
    loadAdmin();
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const inputPassword = e.target.password.value;
  const hash = await sha256(inputPassword);
  
  if (hash === currentConfig.adminPasswordHash) {
    sessionStorage.setItem('orbitomen_auth', 'true');
    document.getElementById('login-modal').style.display = 'none';
    loadAdmin();
  } else {
    alert('Incorrect password! (Default: admin123)');
  }
}

function loadAdmin() {
  populateForm(currentConfig);
  loadGitHubSettings();
  syncPreview();
}

function pushState() {
  undoStack.push(JSON.stringify(currentConfig));
  if (undoStack.length > 30) undoStack.shift();
  redoStack = [];
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(JSON.stringify(currentConfig));
  currentConfig = JSON.parse(undoStack.pop());
  populateForm(currentConfig);
  syncPreview();
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(JSON.stringify(currentConfig));
  currentConfig = JSON.parse(redoStack.pop());
  populateForm(currentConfig);
  syncPreview();
}

function syncPreview() {
  const iframe = document.getElementById('preview-frame');
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage({ type: 'LIVE_CONFIG_UPDATE', config: currentConfig }, '*');
  }
}

function populateForm(cfg) {
  document.getElementById('cfg-displayName').value = cfg.profile.displayName || '';
  document.getElementById('cfg-bio').value = cfg.profile.bio || '';
  document.getElementById('cfg-statusText').value = cfg.profile.statusText || '';
  document.getElementById('cfg-avatar').value = cfg.profile.avatar || '';
  document.getElementById('cfg-banner').value = cfg.profile.banner || '';
  document.getElementById('cfg-avatarFrame').value = cfg.profile.avatarFrame || 'glow';
  document.getElementById('cfg-verified').checked = !!cfg.profile.verified;
  document.getElementById('cfg-typingBio').checked = !!cfg.profile.typingBio;
  document.getElementById('cfg-clickToEnter').checked = !!cfg.profile.clickToEnter;
  document.getElementById('cfg-bgMusic').value = cfg.profile.bgMusic || '';

  document.getElementById('cfg-bgColor').value = cfg.theme.bgColor || '#0c0714';
  document.getElementById('cfg-textColor').value = cfg.theme.textColor || '#fdf2f8';
  document.getElementById('cfg-cardBg').value = cfg.theme.cardBg || 'rgba(28, 16, 44, 0.78)';
  document.getElementById('cfg-cardBorder').value = cfg.theme.cardBorder || 'rgba(244, 114, 182, 0.25)';
  document.getElementById('cfg-accentColor').value = cfg.theme.accentColor || '#d946ef';
  document.getElementById('cfg-borderRadius').value = cfg.theme.borderRadius || 14;
  document.getElementById('cfg-maxWidth').value = cfg.theme.maxWidth || 680;
  document.getElementById('cfg-fontFamily').value = cfg.theme.fontFamily || "'JetBrains Mono', monospace";
  document.getElementById('cfg-customCss').value = cfg.theme.customCss || '';

  renderBlocksList(cfg.blocks || []);
}

function renderBlocksList(blocks) {
  const container = document.getElementById('blocks-list');
  container.innerHTML = '';
  blocks.forEach((b, idx) => {
    const card = document.createElement('div');
    card.className = 'block-editor-card';
    card.innerHTML = `
      <div class="block-header">
        <span>#${idx + 1} [${b.type.toUpperCase()}] ${b.title || ''}</span>
        <div>
          <button class="btn-secondary" onclick="moveBlock(${idx}, -1)">▲</button>
          <button class="btn-secondary" onclick="moveBlock(${idx}, 1)">▼</button>
          <button class="btn-danger" onclick="deleteBlock(${idx})">✕</button>
        </div>
      </div>
      <div class="form-row">
        <input class="form-control" style="max-width: 90px;" placeholder="Icon / Emoji" value="${b.icon || ''}" oninput="updateBlockField(${idx}, 'icon', this.value)">
        <input class="form-control" placeholder="Block Title" value="${b.title || ''}" oninput="updateBlockField(${idx}, 'title', this.value)">
      </div>
      <div class="form-group" style="margin-top: 4px;">
        <input class="form-control" placeholder="Image URL (optional banner for block)" value="${b.image || ''}" oninput="updateBlockField(${idx}, 'image', this.value)">
      </div>
      <div class="form-row" style="margin-top: 4px;">
        ${(b.type === 'link' || b.type === 'image') ? `<input class="form-control" placeholder="Destination URL (https://...)" value="${b.url || ''}" oninput="updateBlockField(${idx}, 'url', this.value)">` : ''}
        ${b.type === 'link' ? `<input class="form-control" placeholder="Subtitle" value="${b.subtitle || ''}" oninput="updateBlockField(${idx}, 'subtitle', this.value)">` : ''}
        ${b.type === 'minecraft' ? `<input class="form-control" placeholder="Server IP" value="${b.serverIp || ''}" oninput="updateBlockField(${idx}, 'serverIp', this.value)">` : ''}
        ${b.type === 'discord' ? `<input class="form-control" placeholder="Lanyard Discord ID" value="${b.lanyardId || ''}" oninput="updateBlockField(${idx}, 'lanyardId', this.value)">` : ''}
        ${b.type === 'copy' ? `<input class="form-control" placeholder="Value to Copy" value="${b.valueToCopy || ''}" oninput="updateBlockField(${idx}, 'valueToCopy', this.value)">` : ''}
        ${b.type === 'text' ? `<textarea class="form-control" placeholder="Text Content" oninput="updateBlockField(${idx}, 'text', this.value)">${b.text || ''}</textarea>` : ''}
      </div>
      ${(b.type === 'link' || b.type === 'image') ? `
        <div style="display:flex;align-items:center;gap:8px;margin-top:6px;font-size:0.8rem;color:#fbcfe8">
          <input type="checkbox" id="ext-check-${idx}" ${b.openExternal !== false ? 'checked' : ''} onchange="updateBlockField(${idx}, 'openExternal', this.checked)">
          <label for="ext-check-${idx}">Force open externally in new tab (_blank)</label>
        </div>
      ` : ''}
    `;
    container.appendChild(card);
  });
}

function updateBlockField(idx, field, val) {
  pushState();
  currentConfig.blocks[idx][field] = val;
  syncPreview();
}

function moveBlock(idx, dir) {
  const target = idx + dir;
  if (target < 0 || target >= currentConfig.blocks.length) return;
  pushState();
  const temp = currentConfig.blocks[idx];
  currentConfig.blocks[idx] = currentConfig.blocks[target];
  currentConfig.blocks[target] = temp;
  renderBlocksList(currentConfig.blocks);
  syncPreview();
}

function deleteBlock(idx) {
  pushState();
  currentConfig.blocks.splice(idx, 1);
  renderBlocksList(currentConfig.blocks);
  syncPreview();
}

function addBlock() {
  const type = document.getElementById('new-block-type').value;
  pushState();
  const newB = { id: `b-${Date.now()}`, type, title: `New ${type}`, icon: '✨', image: '' };
  if (type === 'link') { newB.url = 'https://'; newB.icon = '🔗'; newB.openExternal = true; }
  if (type === 'image') { newB.image = 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&h=200&fit=crop'; newB.icon = '🖼️'; newB.url = ''; newB.openExternal = true; }
  if (type === 'minecraft') { newB.serverIp = 'play.hypixel.net'; newB.icon = '🎮'; newB.copyOnClick = true; }
  if (type === 'discord') { newB.lanyardId = ''; newB.icon = '👾'; }
  if (type === 'copy') { newB.valueToCopy = ''; newB.icon = '📋'; newB.toastMessage = 'Copied!'; }
  if (type === 'header') { newB.icon = '📌'; }
  if (type === 'text') { newB.icon = '📝'; newB.text = 'Your text here...'; }
  currentConfig.blocks.push(newB);
  renderBlocksList(currentConfig.blocks);
  syncPreview();
}

function updateProfileFromInputs() {
  pushState();
  currentConfig.profile.displayName = document.getElementById('cfg-displayName').value;
  currentConfig.profile.bio = document.getElementById('cfg-bio').value;
  currentConfig.profile.statusText = document.getElementById('cfg-statusText').value;
  currentConfig.profile.avatar = document.getElementById('cfg-avatar').value;
  currentConfig.profile.banner = document.getElementById('cfg-banner').value;
  currentConfig.profile.avatarFrame = document.getElementById('cfg-avatarFrame').value;
  currentConfig.profile.verified = document.getElementById('cfg-verified').checked;
  currentConfig.profile.typingBio = document.getElementById('cfg-typingBio').checked;
  currentConfig.profile.clickToEnter = document.getElementById('cfg-clickToEnter').checked;
  currentConfig.profile.bgMusic = document.getElementById('cfg-bgMusic').value;
  syncPreview();
}

function updateThemeFromInputs() {
  pushState();
  currentConfig.theme.bgColor = document.getElementById('cfg-bgColor').value;
  currentConfig.theme.textColor = document.getElementById('cfg-textColor').value;
  currentConfig.theme.cardBg = document.getElementById('cfg-cardBg').value;
  currentConfig.theme.cardBorder = document.getElementById('cfg-cardBorder').value;
  currentConfig.theme.accentColor = document.getElementById('cfg-accentColor').value;
  currentConfig.theme.borderRadius = parseInt(document.getElementById('cfg-borderRadius').value, 10);
  currentConfig.theme.maxWidth = parseInt(document.getElementById('cfg-maxWidth').value, 10);
  currentConfig.theme.fontFamily = document.getElementById('cfg-fontFamily').value;
  currentConfig.theme.customCss = document.getElementById('cfg-customCss').value;
  syncPreview();
}

async function changeAdminPassword() {
  const newPass = prompt('Enter new admin password (minimum 6 characters):');
  if (!newPass || newPass.length < 6) {
    alert('Password too short!');
    return;
  }
  currentConfig.adminPasswordHash = await sha256(newPass);
  saveLocalConfig();
  alert('Password updated! Be sure to commit changes to GitHub.');
}

function saveLocalConfig() {
  localStorage.setItem('orbitomen_config', JSON.stringify(currentConfig));
  alert('Saved to local browser storage! To publish changes globally to GitHub Pages, click "Download config.json" or use Direct GitHub Sync.');
}

function downloadConfigJson() {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(currentConfig, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute('href', dataStr);
  dlAnchor.setAttribute('download', 'config.json');
  document.body.appendChild(dlAnchor);
  dlAnchor.click();
  dlAnchor.remove();
}

async function commitToGitHub() {
  const token = document.getElementById('gh-token').value.trim();
  const repo = document.getElementById('gh-repo').value.trim();
  const branch = document.getElementById('gh-branch').value.trim() || 'main';
  const statusEl = document.getElementById('gh-sync-status');

  if (!token || !repo) {
    alert('Please enter both your GitHub Personal Access Token and Repository (e.g. username/my-bio).');
    return;
  }

  localStorage.setItem('orbitomen_gh_token', token);
  localStorage.setItem('orbitomen_gh_repo', repo);
  localStorage.setItem('orbitomen_gh_branch', branch);

  statusEl.style.display = 'block';
  statusEl.style.color = '#c084fc';
  statusEl.innerHTML = '⏳ [1/3] Fetching file SHA from GitHub...';

  try {
    let fileSha = null;
    const getRes = await fetch(`https://api.github.com/repos/${repo}/contents/config.json?ref=${encodeURIComponent(branch)}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (getRes.status === 200) {
      const fileData = await getRes.json();
      fileSha = fileData.sha;
    } else if (getRes.status === 401) {
      throw new Error('Invalid GitHub token. Check token expiration and permissions.');
    } else if (getRes.status === 404) {
      // File does not exist yet; will create
    } else {
      const err = await getRes.json().catch(() => ({}));
      throw new Error(err.message || `GitHub API error: ${getRes.status}`);
    }

    statusEl.innerHTML = `⏳ [2/3] Committing updated config.json to ${branch}...`;
    const jsonStr = JSON.stringify(currentConfig, null, 2);
    const base64Content = btoa(unescape(encodeURIComponent(jsonStr)));

    const putBody = {
      message: '✨ Update bio config via OrbitAdmin [skip ci]',
      content: base64Content,
      branch: branch
    };
    if (fileSha) putBody.sha = fileSha;

    const putRes = await fetch(`https://api.github.com/repos/${repo}/contents/config.json`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(putBody)
    });

    if (!putRes.ok) {
      const errData = await putRes.json().catch(() => ({}));
      throw new Error(errData.message || `Commit failed with HTTP ${putRes.status}`);
    }

    const commitData = await putRes.json();
    const shortSha = commitData.commit.sha.substring(0, 7);
    statusEl.style.color = '#4ade80';
    statusEl.innerHTML = `🚀 Successfully committed <code>${shortSha}</code> to <strong>${branch}</strong>! GitHub Actions will redeploy your bio automatically.`;
  } catch (err) {
    statusEl.style.color = '#f87171';
    statusEl.innerHTML = `❌ Failed: ${escapeHtml(err.message)}`;
  }
}

function loadGitHubSettings() {
  const token = localStorage.getItem('orbitomen_gh_token') || '';
  const repo = localStorage.getItem('orbitomen_gh_repo') || '';
  const branch = localStorage.getItem('orbitomen_gh_branch') || 'main';
  const elT = document.getElementById('gh-token');
  const elR = document.getElementById('gh-repo');
  const elB = document.getElementById('gh-branch');
  if (elT) elT.value = token;
  if (elR) elR.value = repo;
  if (elB) elB.value = branch;
}

function showSection(name) {
  document.querySelectorAll('.section-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const target = document.getElementById(`section-${name}`);
  if (target) target.classList.add('active');
  const nav = document.getElementById(`nav-${name}`);
  if (nav) nav.classList.add('active');
}

function setPreviewDevice(mode) {
  const frame = document.getElementById('preview-frame');
  document.querySelectorAll('.preview-controls button').forEach(b => b.classList.remove('active'));
  document.getElementById(`btn-preview-${mode}`).classList.add('active');
  if (mode === 'mobile') frame.style.width = '375px';
  if (mode === 'tablet') frame.style.width = '768px';
  if (mode === 'desktop') frame.style.width = '100%';
}

function logout() {
  sessionStorage.removeItem('orbitomen_auth');
  location.reload();
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
}

window.onload = init;
