package handlers

import (
	"fmt"
	"net/http"
)

// TestPage serves the HTML test console for auth & user API testing.
// GET /test
func (h *Handler) TestPage(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	fmt.Fprint(w, testHTML)
}

const testHTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Pawly — Auth Test Console</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  :root {
    --bg-deep: #080F0D;
    --bg-surface: #0F1A17;
    --bg-card: #152220;
    --bg-input: #1A2D29;
    --border: #243833;
    --border-focus: #0D9B7A;
    --text-primary: #F1F5F3;
    --text-secondary: #8A9E97;
    --text-muted: #526B63;
    --accent: #0ECB81;
    --accent-hover: #0BAE6E;
    --accent-glow: rgba(14, 203, 129, 0.15);
    --orange: #FF7A42;
    --orange-glow: rgba(255, 122, 66, 0.15);
    --red: #EF4444;
    --red-glow: rgba(239, 68, 68, 0.1);
    --green: #10B981;
    --yellow: #F59E0B;
    --radius: 12px;
    --radius-sm: 8px;
  }

  body {
    background: var(--bg-deep);
    color: var(--text-primary);
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    min-height: 100vh;
    line-height: 1.5;
  }

  /* ── Header ── */
  header {
    background: linear-gradient(135deg, #0D5C4D 0%, #0A4A3E 100%);
    padding: 18px 28px;
    display: flex;
    align-items: center;
    gap: 14px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    position: sticky;
    top: 0;
    z-index: 100;
  }
  header h1 {
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.3px;
  }
  header .badge {
    background: var(--orange);
    color: #fff;
    padding: 3px 12px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  header .nav-links {
    margin-left: auto;
    display: flex;
    gap: 8px;
  }
  header .nav-links a {
    color: rgba(255,255,255,0.7);
    text-decoration: none;
    font-size: 13px;
    font-weight: 500;
    padding: 6px 14px;
    border-radius: var(--radius-sm);
    transition: all 0.2s;
  }
  header .nav-links a:hover {
    background: rgba(255,255,255,0.1);
    color: #fff;
  }

  /* ── Status Bar ── */
  .status-bar {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 10px 28px;
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border);
    font-size: 12px;
    color: var(--text-muted);
  }
  .status-dot {
    display: inline-block;
    width: 8px; height: 8px;
    border-radius: 50%;
    margin-right: 6px;
    animation: pulse 2s infinite;
  }
  .status-dot.ok { background: var(--green); box-shadow: 0 0 6px var(--green); }
  .status-dot.err { background: var(--red); box-shadow: 0 0 6px var(--red); }
  .status-dot.warn { background: var(--yellow); box-shadow: 0 0 6px var(--yellow); }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  /* ── Session Indicator ── */
  .session-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 28px;
    background: var(--accent-glow);
    border-bottom: 1px solid rgba(14, 203, 129, 0.2);
    font-size: 13px;
    color: var(--accent);
    font-weight: 500;
    transition: all 0.3s ease;
  }
  .session-bar.hidden {
    max-height: 0;
    padding: 0 28px;
    overflow: hidden;
    border: none;
  }
  .session-bar .session-id {
    font-family: 'Cascadia Code', 'Fira Code', monospace;
    background: rgba(14, 203, 129, 0.1);
    padding: 2px 10px;
    border-radius: 6px;
    font-size: 12px;
  }
  .session-bar button {
    margin-left: auto;
    background: transparent;
    border: 1px solid rgba(14, 203, 129, 0.3);
    color: var(--accent);
    padding: 4px 14px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    transition: all 0.2s;
  }
  .session-bar button:hover {
    background: rgba(14, 203, 129, 0.15);
  }

  /* ── Main Layout ── */
  .main-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    padding: 28px;
    max-width: 1400px;
    margin: 0 auto;
  }

  /* ── Cards ── */
  .card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .card:hover {
    border-color: rgba(14, 203, 129, 0.2);
    box-shadow: 0 4px 24px rgba(0,0,0,0.2);
  }
  .card-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 16px 20px;
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border);
  }
  .card-header .icon {
    font-size: 20px;
  }
  .card-header h2 {
    font-size: 15px;
    font-weight: 700;
    letter-spacing: -0.2px;
  }
  .card-header .tag {
    margin-left: auto;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    padding: 3px 10px;
    border-radius: 999px;
    border: 1px solid;
  }
  .tag.public {
    color: var(--accent);
    border-color: rgba(14, 203, 129, 0.3);
    background: var(--accent-glow);
  }
  .tag.protected {
    color: var(--orange);
    border-color: rgba(255, 122, 66, 0.3);
    background: var(--orange-glow);
  }
  .card-body {
    padding: 20px;
  }

  /* ── Form Elements ── */
  .form-group {
    margin-bottom: 16px;
  }
  .form-group label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .form-group input {
    width: 100%;
    background: var(--bg-input);
    border: 1px solid var(--border);
    color: var(--text-primary);
    padding: 10px 14px;
    border-radius: var(--radius-sm);
    font-family: inherit;
    font-size: 14px;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .form-group input:focus {
    outline: none;
    border-color: var(--border-focus);
    box-shadow: 0 0 0 3px rgba(13, 155, 122, 0.15);
  }
  .form-group input::placeholder {
    color: var(--text-muted);
  }
  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 12px 20px;
    border: none;
    border-radius: var(--radius-sm);
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  .btn-primary {
    background: linear-gradient(135deg, var(--accent) 0%, #0BA66A 100%);
    color: #fff;
    box-shadow: 0 2px 8px rgba(14, 203, 129, 0.25);
  }
  .btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(14, 203, 129, 0.35);
  }
  .btn-primary:active {
    transform: translateY(0);
  }
  .btn-orange {
    background: linear-gradient(135deg, var(--orange) 0%, #E5692F 100%);
    color: #fff;
    box-shadow: 0 2px 8px rgba(255, 122, 66, 0.25);
  }
  .btn-orange:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(255, 122, 66, 0.35);
  }
  .btn-ghost {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-secondary);
  }
  .btn-ghost:hover {
    background: var(--bg-input);
    color: var(--text-primary);
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
  }
  .btn .spinner {
    display: none;
    width: 16px; height: 16px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  .btn.loading .spinner { display: inline-block; }
  .btn.loading .btn-text { display: none; }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* ── Response Display ── */
  .response-area {
    margin-top: 16px;
    border-radius: var(--radius-sm);
    overflow: hidden;
    animation: slideUp 0.3s ease;
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .response-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 600;
  }
  .response-header.success {
    background: rgba(16, 185, 129, 0.1);
    color: var(--green);
    border: 1px solid rgba(16, 185, 129, 0.2);
    border-bottom: none;
    border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  }
  .response-header.error {
    background: var(--red-glow);
    color: #FCA5A5;
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-bottom: none;
    border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  }
  .response-body {
    background: var(--bg-deep);
    border: 1px solid var(--border);
    border-top: none;
    padding: 12px;
    border-radius: 0 0 var(--radius-sm) var(--radius-sm);
    font-family: 'Cascadia Code', 'Fira Code', monospace;
    font-size: 12px;
    line-height: 1.6;
    color: var(--text-secondary);
    max-height: 300px;
    overflow-y: auto;
    white-space: pre-wrap;
    word-break: break-word;
  }

  /* ── Endpoint Buttons ── */
  .endpoint-grid {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .endpoint-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: var(--bg-input);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
    color: var(--text-primary);
    font-family: inherit;
  }
  .endpoint-btn:hover {
    border-color: var(--border-focus);
    background: rgba(13, 155, 122, 0.05);
    transform: translateX(4px);
  }
  .endpoint-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none !important;
  }
  .endpoint-btn .method {
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    padding: 3px 8px;
    border-radius: 4px;
    min-width: 42px;
    text-align: center;
  }
  .method.get {
    background: rgba(14, 203, 129, 0.15);
    color: var(--accent);
  }
  .method.post {
    background: rgba(59, 130, 246, 0.15);
    color: #60A5FA;
  }
  .endpoint-btn .path {
    font-family: 'Cascadia Code', 'Fira Code', monospace;
    font-size: 13px;
    color: var(--text-secondary);
  }
  .endpoint-btn .desc {
    margin-left: auto;
    font-size: 11px;
    color: var(--text-muted);
  }

  /* ── Full-Width Section ── */
  .full-width {
    grid-column: 1 / -1;
  }

  /* ── Token Display ── */
  .token-display {
    background: var(--bg-deep);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 10px 14px;
    font-family: 'Cascadia Code', 'Fira Code', monospace;
    font-size: 11px;
    color: var(--accent);
    word-break: break-all;
    line-height: 1.5;
    max-height: 80px;
    overflow-y: auto;
  }

  /* ── Scrollbar ── */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

  /* ── Responsive ── */
  @media (max-width: 900px) {
    .main-grid { grid-template-columns: 1fr; }
  }
</style>
</head>
<body>

<header>
  <h1>Pawly — Auth Test Console</h1>
  <span class="badge">Test</span>
  <nav class="nav-links">
    <a href="/debug">Debug Console</a>
    <a href="/health">Health</a>
  </nav>
</header>

<div class="status-bar" id="statusBar">Checking server status...</div>

<div class="session-bar hidden" id="sessionBar">
  <span>🔐 Authenticated as User</span>
  <span class="session-id" id="sessionUserId"></span>
  <button onclick="logout()">Sign Out</button>
</div>

<div class="main-grid">

  <!-- ═══ Register Card ═══ -->
  <div class="card">
    <div class="card-header">
      <span class="icon">📝</span>
      <h2>Register Account</h2>
      <span class="tag public">Public</span>
    </div>
    <div class="card-body">
      <div class="form-group">
        <label>Owner Name</label>
        <input type="text" id="regName" placeholder="e.g. Ahmed">
      </div>
      <div class="form-group">
        <label>Email</label>
        <input type="email" id="regEmail" placeholder="e.g. ahmed@example.com">
      </div>
      <div class="form-group">
        <label>Password (min 8 chars)</label>
        <input type="password" id="regPassword" placeholder="••••••••">
      </div>
      <button class="btn btn-primary" id="registerBtn" onclick="register()">
        <span class="spinner"></span>
        <span class="btn-text">Create Account</span>
      </button>
      <div id="registerResult"></div>
    </div>
  </div>

  <!-- ═══ Login Card ═══ -->
  <div class="card">
    <div class="card-header">
      <span class="icon">🔑</span>
      <h2>Login</h2>
      <span class="tag public">Public</span>
    </div>
    <div class="card-body">
      <div class="form-group">
        <label>Email</label>
        <input type="email" id="loginEmail" placeholder="e.g. ahmed@example.com">
      </div>
      <div class="form-group">
        <label>Password</label>
        <input type="password" id="loginPassword" placeholder="••••••••">
      </div>
      <button class="btn btn-orange" id="loginBtn" onclick="login()">
        <span class="spinner"></span>
        <span class="btn-text">Sign In</span>
      </button>
      <div id="loginResult"></div>
    </div>
  </div>

  <!-- ═══ Current Token ═══ -->
  <div class="card full-width" id="tokenCard" style="display:none;">
    <div class="card-header">
      <span class="icon">🎟️</span>
      <h2>Active JWT Token</h2>
      <span class="tag protected">Session</span>
    </div>
    <div class="card-body">
      <div class="token-display" id="tokenDisplay"></div>
      <div style="margin-top:12px; font-size: 12px; color: var(--text-muted);">
        <strong style="color:var(--text-secondary);">Decoded Payload:</strong>
        <pre id="tokenPayload" style="margin-top:6px; color: var(--text-secondary);"></pre>
      </div>
    </div>
  </div>

  <!-- ═══ Protected Endpoints ═══ -->
  <div class="card full-width">
    <div class="card-header">
      <span class="icon">🔒</span>
      <h2>Protected Endpoints</h2>
      <span class="tag protected">JWT Required</span>
    </div>
    <div class="card-body">
      <div class="endpoint-grid" id="endpointGrid">
        <button class="endpoint-btn" onclick="callEndpoint('GET', '/me')" disabled id="ep-me">
          <span class="method get">GET</span>
          <span class="path">/me</span>
          <span class="desc">My basic info</span>
        </button>
        <button class="endpoint-btn" onclick="callEndpoint('GET', '/me/profile')" disabled id="ep-profile">
          <span class="method get">GET</span>
          <span class="path">/me/profile</span>
          <span class="desc">My full profile</span>
        </button>
        <button class="endpoint-btn" onclick="callEndpoint('GET', '/me/bio')" disabled id="ep-bio">
          <span class="method get">GET</span>
          <span class="path">/me/bio</span>
          <span class="desc">My pets & preferences</span>
        </button>
        <button class="endpoint-btn" onclick="callEndpoint('GET', '/connections')" disabled id="ep-connections">
          <span class="method get">GET</span>
          <span class="path">/connections</span>
          <span class="desc">My connections</span>
        </button>
        <button class="endpoint-btn" onclick="callEndpoint('GET', '/recommendations')" disabled id="ep-recs">
          <span class="method get">GET</span>
          <span class="path">/recommendations</span>
          <span class="desc">Suggested matches</span>
        </button>
        <button class="endpoint-btn" onclick="callEndpoint('GET', '/health')" id="ep-health">
          <span class="method get">GET</span>
          <span class="path">/health</span>
          <span class="desc">Server health (public)</span>
        </button>
      </div>
      <div id="endpointResult"></div>
    </div>
  </div>

  <!-- ═══ Lookup User by ID ═══ -->
  <div class="card full-width">
    <div class="card-header">
      <span class="icon">🔍</span>
      <h2>Lookup User by ID</h2>
      <span class="tag protected">JWT Required</span>
    </div>
    <div class="card-body">
      <div class="form-row">
        <div class="form-group">
          <label>User ID</label>
          <input type="number" id="lookupId" placeholder="e.g. 1" min="1">
        </div>
        <div class="form-group">
          <label>Endpoint</label>
          <select id="lookupEndpoint" style="
            width:100%; background:var(--bg-input); border:1px solid var(--border);
            color:var(--text-primary); padding:10px 14px; border-radius:var(--radius-sm);
            font-family:inherit; font-size:14px;
          ">
            <option value="/users/{id}">/users/{id} — Basic info</option>
            <option value="/users/{id}/profile">/users/{id}/profile — Full profile</option>
            <option value="/users/{id}/bio">/users/{id}/bio — Pets & bio</option>
          </select>
        </div>
      </div>
      <button class="btn btn-ghost" onclick="lookupUser()" disabled id="lookupBtn">
        <span class="btn-text">Lookup User</span>
      </button>
      <div id="lookupResult"></div>
    </div>
  </div>

</div>

<script>
  // ── State ──
  let authToken = null;
  let authUserId = null;

  // ── Init ──
  async function init() {
    try {
      const health = await fetch('/health').then(r => r.json());
      const bar = document.getElementById('statusBar');
      const dbOk = health.database === 'connected';
      bar.innerHTML =
        '<span><span class="status-dot ok"></span>Server: running</span>' +
        '<span><span class="status-dot ' + (dbOk ? 'ok' : 'err') + '"></span>Database: ' + health.database + '</span>';
    } catch(e) {
      document.getElementById('statusBar').innerHTML =
        '<span><span class="status-dot err"></span>Server: unreachable</span>';
    }
  }

  // ── Auth Helpers ──
  function setAuth(id, token) {
    authToken = token;
    authUserId = id;

    // Show session bar
    const bar = document.getElementById('sessionBar');
    bar.classList.remove('hidden');
    document.getElementById('sessionUserId').textContent = 'ID: ' + id;

    // Show token card
    const tokenCard = document.getElementById('tokenCard');
    tokenCard.style.display = '';
    document.getElementById('tokenDisplay').textContent = token;

    // Decode and show payload
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      payload.exp_readable = new Date(payload.exp * 1000).toLocaleString();
      payload.iat_readable = new Date(payload.iat * 1000).toLocaleString();
      document.getElementById('tokenPayload').textContent = JSON.stringify(payload, null, 2);
    } catch(e) {
      document.getElementById('tokenPayload').textContent = 'Could not decode token';
    }

    // Enable protected endpoints
    document.querySelectorAll('.endpoint-btn').forEach(b => b.disabled = false);
    document.getElementById('lookupBtn').disabled = false;
  }

  function logout() {
    authToken = null;
    authUserId = null;
    document.getElementById('sessionBar').classList.add('hidden');
    document.getElementById('tokenCard').style.display = 'none';
    document.querySelectorAll('.endpoint-btn').forEach(b => {
      if (b.id !== 'ep-health') b.disabled = true;
    });
    document.getElementById('lookupBtn').disabled = true;
  }

  // ── Response Rendering ──
  function renderResponse(containerId, status, data) {
    const isOk = status >= 200 && status < 300;
    const container = document.getElementById(containerId);
    container.innerHTML =
      '<div class="response-area">' +
      '  <div class="response-header ' + (isOk ? 'success' : 'error') + '">' +
      '    <span>' + (isOk ? '✓' : '✗') + '</span>' +
      '    <span>HTTP ' + status + '</span>' +
      '  </div>' +
      '  <div class="response-body">' + escapeHtml(JSON.stringify(data, null, 2)) + '</div>' +
      '</div>';
  }

  function setLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    if (loading) {
      btn.classList.add('loading');
      btn.disabled = true;
    } else {
      btn.classList.remove('loading');
      btn.disabled = false;
    }
  }

  // ── Register ──
  async function register() {
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;

    if (!email || !password) {
      renderResponse('registerResult', 400, { error: 'Email and password are required' });
      return;
    }

    setLoading('registerBtn', true);
    try {
      const res = await fetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_name: name || 'Anonymous',
          email: email,
          password: password,
        })
      });
      const data = await res.json();
      renderResponse('registerResult', res.status, data);

      if (res.ok && data.token) {
        setAuth(data.id, data.token);
        // Pre-fill login form for convenience
        document.getElementById('loginEmail').value = email;
        document.getElementById('loginPassword').value = password;
      }
    } catch(e) {
      renderResponse('registerResult', 0, { error: 'Network error: ' + e.message });
    }
    setLoading('registerBtn', false);
  }

  // ── Login ──
  async function login() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
      renderResponse('loginResult', 400, { error: 'Email and password are required' });
      return;
    }

    setLoading('loginBtn', true);
    try {
      const res = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      renderResponse('loginResult', res.status, data);

      if (res.ok && data.token) {
        setAuth(data.id, data.token);
      }
    } catch(e) {
      renderResponse('loginResult', 0, { error: 'Network error: ' + e.message });
    }
    setLoading('loginBtn', false);
  }

  // ── Call Protected Endpoint ──
  async function callEndpoint(method, path) {
    const headers = {};
    if (authToken) {
      headers['Authorization'] = 'Bearer ' + authToken;
    }

    try {
      const res = await fetch(path, { method, headers });
      const data = await res.json();
      renderResponse('endpointResult', res.status, data);
    } catch(e) {
      renderResponse('endpointResult', 0, { error: 'Network error: ' + e.message });
    }
  }

  // ── Lookup User ──
  async function lookupUser() {
    const id = document.getElementById('lookupId').value;
    const template = document.getElementById('lookupEndpoint').value;
    if (!id) {
      renderResponse('lookupResult', 400, { error: 'Enter a user ID' });
      return;
    }

    const path = template.replace('{id}', id);
    const headers = {};
    if (authToken) {
      headers['Authorization'] = 'Bearer ' + authToken;
    }

    try {
      const res = await fetch(path, { method: 'GET', headers });
      const data = await res.json();
      renderResponse('lookupResult', res.status, data);
    } catch(e) {
      renderResponse('lookupResult', 0, { error: 'Network error: ' + e.message });
    }
  }

  // ── Escape HTML ──
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Enter key handling ──
  document.addEventListener('keydown', function(e) {
    if (e.key !== 'Enter') return;
    const active = document.activeElement;
    if (!active) return;

    if (active.id === 'regName' || active.id === 'regEmail' || active.id === 'regPassword') {
      e.preventDefault();
      register();
    } else if (active.id === 'loginEmail' || active.id === 'loginPassword') {
      e.preventDefault();
      login();
    } else if (active.id === 'lookupId') {
      e.preventDefault();
      lookupUser();
    }
  });

  init();
</script>
</body>
</html>`
