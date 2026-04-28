// ─── Auth Utilities ───────────────────────────────────────

const PAGES = {
  login:     'index.html',
  dashboard: 'dashboard.html',
  students:  'students.html',
  fees:      'fees.html'
};

// Hide page body until auth is resolved — prevents unauthenticated flash
(function guardPage() {
  document.documentElement.style.opacity = '0';
  document.documentElement.style.pointerEvents = 'none';
})();

function _showPage() {
  document.documentElement.style.transition = 'opacity 0.2s ease';
  document.documentElement.style.opacity = '1';
  document.documentElement.style.pointerEvents = '';
}

// Redirect to login if not authenticated
function requireAuth() {
  auth.onAuthStateChanged(user => {
    if (!user) {
      window.location.replace(PAGES.login);
    } else {
      _showPage();
    }
  });
}

// Redirect to dashboard if already logged in
function redirectIfAuth() {
  auth.onAuthStateChanged(user => {
    if (user) {
      window.location.replace(PAGES.dashboard);
    } else {
      _showPage();
    }
  });
}

// Login
async function login(email, password) {
  return auth.signInWithEmailAndPassword(email, password);
}

// Logout
async function logout() {
  await auth.signOut();
  window.location.href = PAGES.login;
}

// Get current user
function currentUser() {
  return auth.currentUser;
}

// ─── Toast Notifications ──────────────────────────────────
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || '✅'}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 350);
  }, 3200);
}

// ─── Modal Helpers ────────────────────────────────────────
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

// ─── Format Currency ──────────────────────────────────────
function fmtLKR(amount) {
  return 'LKR ' + Number(amount).toLocaleString('en-LK', { minimumFractionDigits: 0 });
}

// ─── Format Month ─────────────────────────────────────────
function fmtMonth(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m,10)-1]} ${y}`;
}

// Current month string YYYY-MM
function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

// Grade label
function gradeLabel(g) {
  return g ? `Grade ${g}` : '—';
}
