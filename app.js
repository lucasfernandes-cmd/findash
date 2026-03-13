/* ============================================================
   FINDASH — Financial Dashboard
   ============================================================ */

// ── SUPABASE ────────────────────────────────────────────────
const SUPABASE_URL = 'https://qnqcmrpkveprkvzecvwf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucWNtcnBrdmVwcmt2emVjdndmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNjY1MzMsImV4cCI6MjA4ODk0MjUzM30.tpaqSpUpqTOenkZhQfGwSQNH3a4dArYxbFRqnDLVG8c';
const _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let _cloudSaveTimer = null;

async function saveToCloud() {
  try {
    const { data: { session } } = await _sb.auth.getSession();
    if (!session) return;
    await _sb.from('user_data').upsert({
      user_id: session.user.id,
      profile: JSON.stringify(profile),
      state: JSON.stringify(state),
      theme: localStorage.getItem('findash_theme') || 'dark',
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
  } catch (e) { /* cloud save failed */ }
}

function debouncedCloudSave() {
  clearTimeout(_cloudSaveTimer);
  _cloudSaveTimer = setTimeout(saveToCloud, 1500);
}

async function loadFromCloud() {
  try {
    const { data: { session } } = await _sb.auth.getSession();
    if (!session) return false;
    const { data, error } = await _sb.from('user_data')
      .select('*')
      .eq('user_id', session.user.id)
      .single();
    if (error || !data) return false;
    if (data.profile) {
      const p = typeof data.profile === 'string' ? JSON.parse(data.profile) : data.profile;
      profile = sanitizeProfile(p);
    }
    if (data.state) {
      const raw = typeof data.state === 'string' ? JSON.parse(data.state) : data.state;
      state = sanitizeCloudState(raw);
    }
    if (data.theme) {
      localStorage.setItem('findash_theme', data.theme);
      document.documentElement.setAttribute('data-theme', data.theme);
      document.getElementById('themeIcon').textContent = data.theme === 'light' ? '🌙' : '☀️';
    }
    return true;
  } catch (e) { /* cloud load failed */ return false; }
}

// ── GRADIENTS / COLORS ──────────────────────────────────────
const GRADIENTS = [
  { id: 'purple',  css: 'linear-gradient(135deg,#6366f1,#8b5cf6)',  label: 'Índigo'  },
  { id: 'blue',    css: 'linear-gradient(135deg,#3b82f6,#06b6d4)',  label: 'Azul'    },
  { id: 'rose',    css: 'linear-gradient(135deg,#f43f5e,#ec4899)',  label: 'Rosa'    },
  { id: 'green',   css: 'linear-gradient(135deg,#10b981,#059669)',  label: 'Verde'   },
  { id: 'amber',   css: 'linear-gradient(135deg,#f59e0b,#f97316)',  label: 'Âmbar'  },
  { id: 'slate',   css: 'linear-gradient(135deg,#475569,#334155)',  label: 'Grafite' },
  { id: 'cyan',    css: 'linear-gradient(135deg,#06b6d4,#0ea5e9)',  label: 'Ciano'   },
  { id: 'indigo',  css: 'linear-gradient(135deg,#4f46e5,#7c3aed)',  label: 'Roxo'    },
];

const GRAD_MAP = Object.fromEntries(GRADIENTS.map(g => [g.id, g.css]));

const CATEGORIA_ICONS = {
  'Aluguel': '🏠', 'Água': '💧', 'Luz': '⚡', 'Internet': '📡',
  'Telefone': '📱', 'Alimentação': '🍔', 'Transporte': '🚗',
  'Saúde': '🏥', 'Educação': '📚', 'Lazer': '🎮', 'Impostos': '📋',
  'Salários': '👔', 'Fornecedores': '🏭', 'Software': '💻',
  'Marketing': '📢', 'Seguro': '🛡️', 'Academia': '💪',
  'Assinatura': '📺', 'Outros': '📌',
  'Transferência': '🔄', 'Salário': '💰', 'Freelance': '💼',
  'Investimentos': '📈', 'Rendimentos': '💎', 'Compras': '🛍️',
  'Eletrônicos': '📱', 'Eletrodomésticos': '🔌', 'Vestuário': '👕',
  'Viagem': '✈️', 'Escritório': '🖊️', 'Equipamentos': '🔧',
  'Clientes': '🤝', 'Funcionários': '👥', 'Moradia': '🏡',
  'Streaming': '📺', 'Delivery': '🛵', 'Pets': '🐾',
  'Beleza': '💅', 'Combustível': '⛽', 'Estacionamento': '🅿️',
};

const CAT_COLORS = [
  '#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444',
  '#8b5cf6','#06b6d4','#ec4899','#f97316','#14b8a6',
  '#84cc16','#a855f7','#0ea5e9','#f43f5e','#22d3ee',
];

const BANK_COLORS = {
  'Nubank': '#8a05be', 'Itaú': '#003d7c', 'Bradesco': '#cc0000',
  'Santander': '#ec0000', 'Banco do Brasil': '#f9d600', 'Caixa': '#005697',
  'C6 Bank': '#242424', 'Inter': '#ff7a00', 'PicPay': '#11c76f',
  'Sicoob': '#006b3f', 'XP': '#1c1c1c', 'BTG': '#c8a849', 'Neon': '#00c1e3',
  'Pan': '#0058a6', 'Mercado Pago': '#00bcff',
};

const BANK_EMOJIS = {
  'Nubank': '💜', 'Itaú': '🔵', 'Bradesco': '🔴',
  'Santander': '🔴', 'Banco do Brasil': '🟡', 'Caixa': '🔵',
  'C6 Bank': '⬛', 'Inter': '🟠', 'PicPay': '💚', 'Neon': '💙',
  'XP': '⬛', 'BTG': '🟡',
};

// ── SECURITY UTILITIES ──────────────────────────────────────
function esc(str) {
  if (str === null || str === undefined) return '';
  const s = String(str);
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
function escAttr(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function sanitizeInput(val, maxLen = 500) {
  if (typeof val !== 'string') return val;
  return val.replace(/<[^>]*>/g, '').trim().slice(0, maxLen);
}

// ── PROFILE ──────────────────────────────────────────────────
const PROFILE_KEY = 'findash_profile';
let profile = { nome: '', email: '', telefone: '', empresa: '' };

function loadProfile() {
  try {
    const r = localStorage.getItem(PROFILE_KEY);
    if (r) profile = sanitizeProfile(JSON.parse(r));
  } catch {}
}
function saveProfile() {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  debouncedCloudSave();
}

function updateHeaderProfile() {
  const el = document.getElementById('profileInitials');
  if (profile.nome) {
    el.textContent = profile.nome.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  } else {
    el.textContent = '👤';
  }
  // Update mode button sub-labels
  const subEmpresa = document.getElementById('modeSubEmpresa');
  const subPessoal = document.getElementById('modeSubPessoal');
  if (subEmpresa) {
    subEmpresa.textContent = profile.empresa || '';
    subEmpresa.style.display = profile.empresa ? '' : 'none';
  }
  if (subPessoal) {
    subPessoal.textContent = profile.nome || '';
    subPessoal.style.display = profile.nome ? '' : 'none';
  }
}

// ── PASSWORD VALIDATION ──────────────────────────────────────
function validatePassword(pwd) {
  if (pwd.length < 8) return 'A senha deve ter pelo menos 8 caracteres.';
  if (!/[A-Z]/.test(pwd)) return 'A senha deve ter pelo menos uma letra maiúscula.';
  if (!/[a-z]/.test(pwd)) return 'A senha deve ter pelo menos uma letra minúscula.';
  if (!/[0-9]/.test(pwd)) return 'A senha deve ter pelo menos um número.';
  const common = ['12345678','password','qwerty123','abc12345','admin123'];
  if (common.includes(pwd.toLowerCase())) return 'Senha muito comum. Escolha outra.';
  return null;
}

// ── RATE LIMITING (persisted in localStorage) ────────────────
function _getLoginLock() {
  try {
    const r = JSON.parse(localStorage.getItem('findash_login_lock') || '{}');
    return { attempts: r.attempts || 0, lockUntil: r.lockUntil || 0 };
  } catch { return { attempts: 0, lockUntil: 0 }; }
}
function _setLoginLock(attempts, lockUntil) {
  localStorage.setItem('findash_login_lock', JSON.stringify({ attempts, lockUntil }));
}

// ── ERROR MAPPING ────────────────────────────────────────────
function friendlyError(error) {
  const map = {
    'Invalid login credentials': 'E-mail ou senha incorretos.',
    'User already registered': 'Este e-mail já está cadastrado.',
    'Email not confirmed': 'Confirme seu e-mail antes de entrar.',
    'Password should be at least': 'A senha não atende aos requisitos mínimos.',
    'rate limit': 'Muitas tentativas. Aguarde alguns minutos.',
    'Email rate limit exceeded': 'Muitas tentativas. Aguarde alguns minutos.',
  };
  for (const [key, msg] of Object.entries(map)) {
    if (error.message?.toLowerCase().includes(key.toLowerCase())) return msg;
  }
  return 'Ocorreu um erro inesperado. Tente novamente.';
}

// ── LOGIN / REGISTER / LOGOUT ────────────────────────────────
function showLoginScreen() {
  const existing = document.getElementById('loginScreen');
  if (existing) existing.remove();

  const screen = document.createElement('div');
  screen.id = 'loginScreen';
  screen.className = 'login-screen';
  screen.innerHTML = `
    <div class="login-container">
      <div class="login-logo">
        <div class="login-logo-icon">◈</div>
        <div class="login-logo-text">
          <span class="login-brand">FinDash</span>
          <span class="login-tagline">Organização Financeira</span>
        </div>
      </div>
      <div class="login-card">
        <h2 class="login-title">Entrar na sua conta</h2>
        <p class="login-subtitle">Acesse seu painel financeiro</p>
        <div id="loginError" class="login-error hidden"></div>
        <div class="form">
          <div class="form-row single">
            <div class="form-group">
              <label class="form-label">E-mail</label>
              <input class="form-input" id="login_email" type="email" placeholder="seu@email.com">
            </div>
          </div>
          <div class="form-row single">
            <div class="form-group">
              <div class="login-label-row">
                <label class="form-label">Senha</label>
                <a class="login-forgot" onclick="showForgotScreen()">Esqueceu a senha?</a>
              </div>
              <input class="form-input" id="login_senha" type="password" placeholder="Sua senha">
            </div>
          </div>
        </div>
        <button class="btn btn-primary login-submit" onclick="handleLogin()" id="loginBtn">Entrar</button>
      </div>
      <div class="login-footer">
        Não tem conta? <a class="login-link" onclick="showRegisterScreen()">Cadastre-se</a>
      </div>
    </div>
  `;
  document.body.appendChild(screen);
  // Enter key
  screen.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
}

// ── FORGOT / RESET PASSWORD ───────────────────────────────────
function showForgotScreen() {
  const existing = document.getElementById('loginScreen');
  if (existing) existing.remove();

  const screen = document.createElement('div');
  screen.id = 'loginScreen';
  screen.className = 'login-screen';
  screen.innerHTML = `
    <div class="login-container">
      <div class="login-logo">
        <div class="login-logo-icon">◈</div>
        <div class="login-logo-text">
          <span class="login-brand">FinDash</span>
          <span class="login-tagline">Organização Financeira</span>
        </div>
      </div>
      <div class="login-card">
        <h2 class="login-title">Recuperar senha</h2>
        <p class="login-subtitle">Enviaremos um link de redefinição para o seu e-mail</p>
        <div id="loginError" class="login-error hidden"></div>
        <div id="forgotSuccess" class="login-success hidden"></div>
        <div class="form">
          <div class="form-row single">
            <div class="form-group">
              <label class="form-label">E-mail</label>
              <input class="form-input" id="forgot_email" type="email" placeholder="seu@email.com">
            </div>
          </div>
        </div>
        <button class="btn btn-primary login-submit" onclick="handleForgotPassword()" id="forgotBtn">Enviar link de recuperação</button>
        <div style="text-align:center; margin-top:16px;">
          <a class="login-link" onclick="showLoginScreen()">← Voltar ao login</a>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(screen);
  screen.addEventListener('keydown', e => { if (e.key === 'Enter') handleForgotPassword(); });
}

async function handleForgotPassword() {
  const email = document.getElementById('forgot_email')?.value?.trim();
  const btn = document.getElementById('forgotBtn');
  const errEl = document.getElementById('loginError');
  const successEl = document.getElementById('forgotSuccess');

  if (!email) { showLoginError('Digite seu e-mail'); return; }

  btn.disabled = true;
  btn.textContent = 'Enviando...';

  const { error } = await _sb.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname
  });

  btn.disabled = false;
  btn.textContent = 'Enviar link de recuperação';

  if (error) {
    showLoginError('Erro ao enviar e-mail. Verifique o endereço informado.');
  } else {
    errEl.classList.add('hidden');
    successEl.classList.remove('hidden');
    successEl.textContent = '✅ Link enviado! Verifique sua caixa de entrada.';
    btn.disabled = true;
    btn.style.opacity = '0.5';
  }
}

function showResetPasswordScreen() {
  const existing = document.getElementById('loginScreen');
  if (existing) existing.remove();
  // also close dashboard if open
  document.getElementById('app')?.style.setProperty('display', 'none');

  const screen = document.createElement('div');
  screen.id = 'loginScreen';
  screen.className = 'login-screen';
  screen.innerHTML = `
    <div class="login-container">
      <div class="login-logo">
        <div class="login-logo-icon">◈</div>
        <div class="login-logo-text">
          <span class="login-brand">FinDash</span>
          <span class="login-tagline">Organização Financeira</span>
        </div>
      </div>
      <div class="login-card">
        <h2 class="login-title">Definir nova senha</h2>
        <p class="login-subtitle">Escolha uma senha segura para a sua conta</p>
        <div id="loginError" class="login-error hidden"></div>
        <div class="form">
          <div class="form-row single">
            <div class="form-group">
              <label class="form-label">Nova senha</label>
              <input class="form-input" id="reset_senha" type="password" placeholder="Mínimo 6 caracteres">
            </div>
          </div>
          <div class="form-row single">
            <div class="form-group">
              <label class="form-label">Confirmar senha</label>
              <input class="form-input" id="reset_senha2" type="password" placeholder="Repita a nova senha">
            </div>
          </div>
        </div>
        <button class="btn btn-primary login-submit" onclick="handleResetPassword()" id="resetBtn">Salvar nova senha</button>
      </div>
    </div>
  `;
  document.body.appendChild(screen);
  screen.addEventListener('keydown', e => { if (e.key === 'Enter') handleResetPassword(); });
}

async function handleResetPassword() {
  const senha = document.getElementById('reset_senha')?.value;
  const senha2 = document.getElementById('reset_senha2')?.value;
  const btn = document.getElementById('resetBtn');

  const pwdErr = validatePassword(senha || '');
  if (pwdErr) { showLoginError(pwdErr); return; }
  if (senha !== senha2) { showLoginError('As senhas não coincidem'); return; }

  btn.disabled = true;
  btn.textContent = 'Salvando...';

  const { error } = await _sb.auth.updateUser({ password: senha });

  if (error) {
    btn.disabled = false;
    btn.textContent = 'Salvar nova senha';
    showLoginError(friendlyError(error));
  } else {
    document.getElementById('app').style.removeProperty('display');
    document.getElementById('loginScreen')?.remove();
    const loaded = await loadFromCloud();
    if (!loaded) { loadProfile(); loadState(); }
    updateHeaderProfile();
    startDashboard();
  }
}

function showRegisterScreen() {
  const existing = document.getElementById('loginScreen');
  if (existing) existing.remove();

  const screen = document.createElement('div');
  screen.id = 'loginScreen';
  screen.className = 'login-screen';
  screen.innerHTML = `
    <div class="login-container">
      <div class="login-logo">
        <div class="login-logo-icon">◈</div>
        <div class="login-logo-text">
          <span class="login-brand">FinDash</span>
          <span class="login-tagline">Organização Financeira</span>
        </div>
      </div>
      <div class="login-card">
        <h2 class="login-title">Criar sua conta</h2>
        <p class="login-subtitle">Preencha seus dados para começar</p>
        <div id="loginError" class="login-error hidden"></div>
        <div class="form">
          <div class="form-row single">
            <div class="form-group">
              <label class="form-label">Nome completo *</label>
              <input class="form-input" id="reg_nome" type="text" placeholder="Ex: João Silva">
            </div>
          </div>
          <div class="form-row single">
            <div class="form-group">
              <label class="form-label">E-mail *</label>
              <input class="form-input" id="reg_email" type="email" placeholder="seu@email.com">
            </div>
          </div>
          <div class="form-row single">
            <div class="form-group">
              <label class="form-label">Telefone *</label>
              <input class="form-input" id="reg_telefone" type="tel" placeholder="(11) 99999-0000">
            </div>
          </div>
          <div class="form-row single">
            <div class="form-group">
              <label class="form-label">Senha *</label>
              <input class="form-input" id="reg_senha" type="password" placeholder="Mínimo 6 caracteres">
            </div>
          </div>
          <div class="form-row single">
            <label class="form-check">
              <input type="checkbox" id="reg_showEmpresa" onchange="toggleRegEmpresa()">
              <span>Deseja adicionar sua empresa?</span>
            </label>
          </div>
          <div class="form-row single" id="regEmpresaRow" style="display:none">
            <div class="form-group">
              <label class="form-label">Nome da empresa</label>
              <input class="form-input" id="reg_empresa" type="text" placeholder="Ex: Tech Solutions Ltda">
            </div>
          </div>
        </div>
        <button class="btn btn-primary login-submit" onclick="handleRegister()" id="registerBtn">Criar conta</button>
      </div>
      <div class="login-footer">
        Já tem conta? <a class="login-link" onclick="showLoginScreen()">Fazer login</a>
      </div>
    </div>
  `;
  document.body.appendChild(screen);
  screen.addEventListener('keydown', e => { if (e.key === 'Enter') handleRegister(); });
}

function toggleRegEmpresa() {
  const row = document.getElementById('regEmpresaRow');
  const checked = document.getElementById('reg_showEmpresa').checked;
  row.style.display = checked ? '' : 'none';
}

function showLoginError(msg) {
  const el = document.getElementById('loginError');
  if (el) { el.textContent = msg; el.classList.remove('hidden'); }
}

async function handleLogin() {
  const now = Date.now();
  const lock = _getLoginLock();
  if (now < lock.lockUntil) {
    const secs = Math.ceil((lock.lockUntil - now) / 1000);
    return showLoginError(`Muitas tentativas. Tente novamente em ${secs}s.`);
  }

  const email = document.getElementById('login_email').value.trim();
  const senha = document.getElementById('login_senha').value;
  if (!email) return showLoginError('Informe seu e-mail.');
  if (!senha) return showLoginError('Informe sua senha.');

  const btn = document.getElementById('loginBtn');
  btn.textContent = 'Entrando...'; btn.disabled = true;

  const { data, error } = await _sb.auth.signInWithPassword({ email, password: senha });
  if (error) {
    btn.textContent = 'Entrar'; btn.disabled = false;
    const attempts = lock.attempts + 1;
    if (attempts >= 5) {
      _setLoginLock(0, now + 30000);
      return showLoginError('Muitas tentativas falhas. Aguarde 30 segundos.');
    }
    _setLoginLock(attempts, 0);
    return showLoginError(friendlyError(error));
  }
  _setLoginLock(0, 0);

  // Load user data from cloud
  const loaded = await loadFromCloud();
  if (!loaded) {
    loadState();
  }
  loadProfile();
  updateHeaderProfile();

  const loginScreen = document.getElementById('loginScreen');
  if (loginScreen) loginScreen.remove();
  startDashboard();
}

async function handleRegister() {
  const nome = document.getElementById('reg_nome').value.trim();
  const email = document.getElementById('reg_email').value.trim();
  const telefone = document.getElementById('reg_telefone').value.trim();
  const senha = document.getElementById('reg_senha').value;
  const empresa = document.getElementById('reg_empresa')?.value.trim() || '';

  if (!nome) return showLoginError('Informe seu nome.');
  if (!email) return showLoginError('Informe seu e-mail.');
  if (!telefone) return showLoginError('Informe seu telefone.');
  const pwdErr = validatePassword(senha || '');
  if (pwdErr) return showLoginError(pwdErr);

  const btn = document.getElementById('registerBtn');
  btn.textContent = 'Criando conta...'; btn.disabled = true;

  const { data, error } = await _sb.auth.signUp({ email, password: senha });
  if (error) {
    btn.textContent = 'Criar conta'; btn.disabled = false;
    return showLoginError(friendlyError(error));
  }

  // Save profile
  profile = { nome, email, telefone, empresa };
  saveProfile();
  updateHeaderProfile();

  // Init empty state for new user
  state = buildEmptyState();
  saveState();

  // Save to cloud
  await saveToCloud();

  const loginScreen = document.getElementById('loginScreen');
  if (loginScreen) loginScreen.remove();
  startDashboard();
}

function handleLogout() {
  closeModal();
  showConfirm(
    'Sair da conta',
    'Tem certeza que deseja sair?',
    'Sair',
    async () => {
      await _sb.auth.signOut();
      profile = { nome: '', email: '', telefone: '', empresa: '' };
      state = buildEmptyState();
      localStorage.removeItem(PROFILE_KEY);
      localStorage.removeItem(STORAGE_KEY);
      showLoginScreen();
    },
    'Seus dados estão salvos na nuvem.'
  );
}

function startDashboard() {
  _catDateFrom = monthStart();
  _catDateTo = todayStr();
  if (!state) loadState();
  const now = new Date();
  document.getElementById('currentDate').textContent =
    now.toLocaleDateString('pt-BR', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });
  setMode(state.activeMode);
}

// ── FILTERS ──────────────────────────────────────────────────
function monthStart() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-01`;
}

let _catDateFrom = null;
let _catDateTo = null;
let _extratoDateFrom = null;
let _extratoDateTo = null;
let _comprasMesOffset = 0;

function inDateRange(dateStr, from, to) {
  if (!dateStr) return true;
  if (from && dateStr < from) return false;
  if (to && dateStr > to) return false;
  return true;
}

function getComprasMesRange() {
  const now = new Date();
  now.setMonth(now.getMonth() + _comprasMesOffset);
  const y = now.getFullYear();
  const m = now.getMonth();
  const from = `${y}-${String(m + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m + 1, 0).getDate();
  const to = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  const label = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return { from, to, label };
}

// ── UTILITIES ───────────────────────────────────────────────
function uid() {
  if (crypto && crypto.randomUUID) return crypto.randomUUID();
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

function fmt(n) {
  return 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  const [y,m,d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function todayStr() {
  return new Date().toISOString().slice(0,10);
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = Math.round((new Date(dateStr + 'T00:00:00') - new Date(todayStr() + 'T00:00:00')) / 86400000);
  return diff;
}

function daysChip(dateStr, status) {
  if (!dateStr || status === 'pago' || status === 'recebido') return '';
  const d = daysUntil(dateStr);
  if (d < 0)  return `<span class="days-chip late">${Math.abs(d)}d atrasado</span>`;
  if (d === 0) return `<span class="days-chip late">Vence hoje</span>`;
  if (d <= 7)  return `<span class="days-chip soon">Em ${d}d</span>`;
  return `<span class="days-chip ok">Em ${d}d</span>`;
}

function autoStatus(item) {
  if (item.status === 'pago' || item.status === 'recebido') return item.status;
  if (item.vencimento && daysUntil(item.vencimento) < 0) return 'atrasado';
  return item.status || 'pendente';
}

function badgeHtml(status) {
  const map = { pendente: 'Pendente', pago: 'Pago', recebido: 'Recebido', atrasado: 'Atrasado' };
  return `<span class="badge badge-${status}">${map[status] || status}</span>`;
}

function catIcon(cat) { return CATEGORIA_ICONS[cat] || '📌'; }
function gradCss(id)  { return GRAD_MAP[id] || GRADIENTS[0].css; }
function bankColor(name) { return BANK_COLORS[name] || '#6366f1'; }
function bankEmoji(name) { return BANK_EMOJIS[name] || '🏦'; }

function initials(name) {
  return (name || '?').split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();
}

// ── EMPTY STATE (used for new accounts) ──────────────────────
const STATE_COLLECTIONS = ['bancos','cartoes','contasPagar','dividas','aReceber','transacoes','compras'];

function buildEmptyState() {
  const empty = {};
  STATE_COLLECTIONS.forEach(c => empty[c] = []);
  return { activeMode: 'empresa', empresa: { ...empty }, pessoal: { ...empty } };
}

function validateState(obj) {
  if (!obj || typeof obj !== 'object') return false;
  if (!['empresa','pessoal'].includes(obj.activeMode)) return false;
  for (const mode of ['empresa','pessoal']) {
    if (!obj[mode] || typeof obj[mode] !== 'object') return false;
    for (const col of STATE_COLLECTIONS) {
      if (!Array.isArray(obj[mode][col])) return false;
    }
  }
  return true;
}

function sanitizeCloudState(s) {
  if (!s || typeof s !== 'object' || !validateState(s)) return buildEmptyState();
  for (const mode of ['empresa','pessoal']) {
    for (const col of STATE_COLLECTIONS) {
      s[mode][col] = s[mode][col].map(item => {
        const clean = {};
        for (const [k, v] of Object.entries(item)) {
          if (typeof v === 'string') clean[k] = v.replace(/<[^>]*>/g, '').slice(0, 500);
          else clean[k] = v;
        }
        return clean;
      });
    }
  }
  return s;
}

function sanitizeProfile(p) {
  if (!p || typeof p !== 'object') return { nome: '', email: '', telefone: '', empresa: '' };
  return {
    nome: String(p.nome || '').replace(/<[^>]*>/g, '').slice(0, 200),
    email: String(p.email || '').replace(/<[^>]*>/g, '').slice(0, 200),
    telefone: String(p.telefone || '').replace(/<[^>]*>/g, '').slice(0, 50),
    empresa: String(p.empresa || '').replace(/<[^>]*>/g, '').slice(0, 200),
  };
}

// ── DEFAULT STATE (removed — demo data not included in production) ──

// ── STATE MANAGEMENT ─────────────────────────────────────────
const STORAGE_KEY = 'findash_v1';
let state;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) { state = buildEmptyState(); return; }
    const parsed = JSON.parse(raw);
    state = validateState(parsed) ? parsed : buildEmptyState();
  } catch {
    state = buildEmptyState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  debouncedCloudSave();
}

function activeData() { return state[state.activeMode]; }

// ── MODE ─────────────────────────────────────────────────────
function setMode(mode) {
  state.activeMode = mode;
  document.getElementById('btnEmpresa').classList.toggle('active', mode === 'empresa');
  document.getElementById('btnPessoal').classList.toggle('active', mode === 'pessoal');
  saveState();
  render();
}

// ── RENDER ───────────────────────────────────────────────────
function render() {
  renderSummary();
  renderDashboard();
}

// ── SUMMARY ──────────────────────────────────────────────────
function renderSummary() {
  const d = activeData();

  const saldoBancos = d.bancos.reduce((s, b) => s + (b.saldo || 0), 0);
  const limiteDisp  = d.cartoes.reduce((s, c) => s + ((c.limite || 0) - (c.usado || 0)), 0);
  const totalUsado  = d.cartoes.reduce((s, c) => s + (c.usado || 0), 0);

  const aPagar = d.contasPagar
    .filter(x => autoStatus(x) !== 'pago')
    .reduce((s, x) => s + (x.valor || 0), 0);

  const dividas = d.dividas.reduce((s, x) => s + ((x.valorTotal || 0) - (x.valorPago || 0)), 0);

  const aReceber = d.aReceber
    .filter(x => autoStatus(x) !== 'recebido')
    .reduce((s, x) => s + (x.valor || 0), 0);

  const metrics = [
    { icon: '🏦', label: 'Saldo em Bancos',       value: fmt(saldoBancos), color: 'blue',   sub: `${d.bancos.length} banco${d.bancos.length !== 1 ? 's' : ''}` },
    { icon: '💳', label: 'Crédito Disponível',     value: fmt(limiteDisp),  color: 'purple', sub: `Utilizado: ${fmt(totalUsado)}` },
    { icon: '📤', label: 'A Pagar',                value: fmt(aPagar),      color: 'red',    sub: `${d.contasPagar.filter(x => autoStatus(x) === 'atrasado').length} em atraso` },
    { icon: '🔗', label: 'Dívidas Restantes',      value: fmt(dividas),     color: 'yellow', sub: `${d.dividas.length} dívida${d.dividas.length !== 1 ? 's' : ''}` },
    { icon: '📥', label: 'A Receber',              value: fmt(aReceber),    color: 'green',  sub: `${d.aReceber.filter(x => autoStatus(x) === 'atrasado').length} em atraso` },
  ];

  document.getElementById('summarySection').innerHTML = metrics.map(m => `
    <div class="metric-card ${m.color}">
      <div class="metric-icon">${m.icon}</div>
      <div class="metric-content">
        <div class="metric-label">${m.label}</div>
        <div class="metric-value">${m.value}</div>
        <div class="metric-sub">${m.sub}</div>
      </div>
    </div>
  `).join('');
}

// ── DASHBOARD ─────────────────────────────────────────────────
function renderDashboard() {
  const d = activeData();
  document.getElementById('dashboardContent').innerHTML = `
    ${renderBancosSection(d)}
    ${renderCartoesSection(d)}
    <div class="three-col-grid">
      ${renderContasPanel(d)}
      ${renderDividasPanel(d)}
      ${renderAReceberPanel(d)}
    </div>
    ${renderCategoriasSection(d)}
  `;
}

// ── BANCOS ────────────────────────────────────────────────────
function renderBancosSection(d) {
  const cards = d.bancos.map(b => {
    const color = bankColor(b.nome);
    const emoji = bankEmoji(b.nome);
    const neg = b.saldo < 0;
    const tipoLabel = { corrente: 'Conta Corrente', poupança: 'Poupança', digital: 'Conta Digital', investimento: 'Investimentos' }[b.tipo] || b.tipo;

    return `
      <div class="banco-card">
        <div class="banco-avatar" style="background:${color}">${emoji}</div>
        <div class="banco-main">
          <div class="banco-header-row">
            <div class="banco-info">
              <div class="banco-name">${esc(b.nome)}</div>
              <div class="banco-tipo">${esc(tipoLabel)}${b.agencia ? ` · Ag ${esc(b.agencia)}` : ''}${b.conta ? ` · Cc ${esc(b.conta)}` : ''}</div>
            </div>
            <div class="banco-actions">
              <button class="icon-btn" onclick="openDetail('extrato','${b.id}')" title="Extrato">📋</button>
              <button class="icon-btn" onclick="openModal('banco','${state.activeMode}','${b.id}')" title="Editar">✏️</button>
              <button class="icon-btn danger" onclick="openConfirm('bancos','${state.activeMode}','${b.id}')" title="Excluir">🗑️</button>
            </div>
          </div>
          <div class="banco-saldo-row">
            <div>
              <div class="banco-saldo-label">Saldo atual</div>
              <div class="banco-saldo-value ${neg ? 'negative' : ''}">${fmt(b.saldo)}</div>
            </div>
            <div class="banco-taxa">
              Manutenção: ${b.taxaMensal === 0 ? '<span class="isento">Isento</span>' : `<span class="taxa">${fmt(b.taxaMensal)}/mês</span>`}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="section-block">
      <div class="section-header">
        <div class="section-title">
          <div class="icon">🏦</div>
          Bancos
          <span class="section-count">${d.bancos.length}</span>
        </div>
        <button class="btn-add" onclick="openModal('banco','${state.activeMode}')">+ Adicionar banco</button>
      </div>
      ${d.bancos.length === 0
        ? `<div class="full-empty"><div class="e-icon">🏦</div><div>Nenhum banco cadastrado</div></div>`
        : `<div class="bancos-grid">${cards}</div>`
      }
    </div>
  `;
}

// ── CARTÕES ───────────────────────────────────────────────────
function renderCartoesSection(d) {
  const cards = d.cartoes.map(c => {
    const pct = c.limite > 0 ? (c.usado / c.limite) * 100 : 0;
    const fillClass = pct > 80 ? 'alert' : pct > 50 ? 'warn' : '';
    const gradCss   = gradCss_safe(c.cor);

    return `
      <div class="credit-card-wrapper">
        <div class="credit-card" style="background:${gradCss}">
          <div class="card-top">
            <div class="card-bank-name">${esc(c.banco || c.nome)}</div>
            <div class="card-flag">${flagEmoji(c.bandeira)}</div>
          </div>
          <div class="card-chip"></div>
          <div class="card-bottom">
            <div class="card-limits">
              <div>
                <div class="card-limit-label">Limite total</div>
                <div class="card-limit-value">${fmt(c.limite)}</div>
              </div>
              <div style="text-align:right">
                <div class="card-limit-label">Disponível</div>
                <div class="card-limit-value">${fmt(c.limite - c.usado)}</div>
              </div>
            </div>
            <div class="card-progress-bar">
              <div class="card-progress-fill ${fillClass}" style="width:${pct.toFixed(1)}%"></div>
            </div>
            <div class="card-meta">
              <div class="card-holder">${esc(c.nome)}</div>
              <div class="card-dates">
                Fecha dia ${c.fechamento || '—'}<br>
                Vence dia ${c.vencimento || '—'}
              </div>
            </div>
          </div>
        </div>
        <div class="credit-card-info">
          <div class="card-info-row">
            <span>Utilizado</span>
            <span class="val">${fmt(c.usado)} <small style="color:var(--text-muted)">(${pct.toFixed(0)}%)</small></span>
          </div>
          <div class="card-actions">
            <button class="icon-btn" onclick="openDetail('compras','${c.id}')" title="Compras">🛒</button>
            <button class="icon-btn" onclick="openModal('cartao','${state.activeMode}','${c.id}')" title="Editar">✏️</button>
            <button class="icon-btn danger" onclick="openConfirm('cartoes','${state.activeMode}','${c.id}')" title="Excluir">🗑️</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="section-block">
      <div class="section-header">
        <div class="section-title">
          <div class="icon">💳</div>
          Cartões de Crédito
          <span class="section-count">${d.cartoes.length}</span>
        </div>
        <button class="btn-add" onclick="openModal('cartao','${state.activeMode}')">+ Adicionar cartão</button>
      </div>
      ${d.cartoes.length === 0
        ? `<div class="full-empty"><div class="e-icon">💳</div><div>Nenhum cartão cadastrado</div></div>`
        : `<div class="cartoes-scroll">${cards}</div>`
      }
    </div>
  `;
}

function flagEmoji(bandeira) {
  const m = { 'Visa': '🔵', 'Mastercard': '🟠', 'Elo': '🟢', 'Amex': '💎', 'Hipercard': '🔴' };
  return m[bandeira] || '💳';
}

function gradCss_safe(id) { return GRAD_MAP[id] || GRADIENTS[0].css; }

// ── CONTAS A PAGAR PANEL ──────────────────────────────────────
function renderContasPanel(d) {
  const sorted = [...d.contasPagar].sort((a,b) => {
    const sa = autoStatus(a), sb = autoStatus(b);
    if (sa === 'atrasado' && sb !== 'atrasado') return -1;
    if (sb === 'atrasado' && sa !== 'atrasado') return 1;
    return (a.vencimento || '').localeCompare(b.vencimento || '');
  });

  const atrasadas = d.contasPagar.filter(x => autoStatus(x) === 'atrasado').length;
  const pendentes = d.contasPagar.filter(x => autoStatus(x) === 'pendente').length;

  const items = sorted.map(c => {
    const s = autoStatus(c);
    return `
      <div class="list-item">
        <div class="item-icon">${catIcon(c.categoria)}</div>
        <div class="item-body">
          <div class="item-name">${esc(c.descricao)}${c.recorrente ? ' <small style="color:var(--text-muted)">↻</small>' : ''}</div>
          <div class="item-sub">${esc(c.categoria)} · Vence ${fmtDate(c.vencimento)} ${daysChip(c.vencimento, s)}</div>
        </div>
        <div class="item-right">
          <div class="item-value ${s === 'atrasado' ? 'negative' : ''}">${fmt(c.valor)}</div>
          ${badgeHtml(s)}
          <div class="item-actions">
            <button class="icon-btn" onclick="openModal('conta','${state.activeMode}','${c.id}')" title="Editar">✏️</button>
            <button class="icon-btn danger" onclick="openConfirm('contasPagar','${state.activeMode}','${c.id}')" title="Excluir">🗑️</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="list-panel">
      <div class="panel-header">
        <div class="panel-title">
          <div class="panel-icon">📤</div>
          Contas a Pagar
          ${atrasadas > 0 ? `<span class="panel-badge red">${atrasadas} atras.</span>` : ''}
          ${pendentes > 0 ? `<span class="panel-badge yellow">${pendentes} pend.</span>` : ''}
        </div>
        <button class="btn-add" onclick="openModal('conta','${state.activeMode}')">+</button>
      </div>
      <div class="panel-body">
        ${sorted.length === 0
          ? `<div class="panel-empty"><div class="empty-icon">✅</div><div>Sem contas a pagar</div></div>`
          : items
        }
      </div>
    </div>
  `;
}

// ── DÍVIDAS PANEL ─────────────────────────────────────────────
function renderDividasPanel(d) {
  const items = d.dividas.map(dv => {
    const pct = dv.valorTotal > 0 ? (dv.valorPago / dv.valorTotal) * 100 : 0;
    const fillClass = pct >= 75 ? 'high' : pct >= 40 ? 'mid' : '';
    const restante = dv.valorTotal - dv.valorPago;

    return `
      <div class="list-item">
        <div class="item-icon">🔗</div>
        <div class="item-body">
          <div class="item-name">${esc(dv.credor)}</div>
          <div class="item-sub">Parc. ${dv.parcelaAtual}/${dv.parcelas} · Próx. ${fmtDate(dv.proxVencimento)}${dv.juros ? ` · ${dv.juros}% a.m.` : ''}</div>
          <div class="progress-wrap">
            <div class="progress-label">
              <span>Quitado: ${fmt(dv.valorPago)}</span>
              <span>${pct.toFixed(0)}%</span>
            </div>
            <div class="progress-bar"><div class="progress-fill ${fillClass}" style="width:${pct.toFixed(1)}%"></div></div>
          </div>
        </div>
        <div class="item-right">
          <div class="item-value negative">${fmt(restante)}</div>
          <div style="font-size:10px;color:var(--text-muted)">restante</div>
          <div class="item-actions">
            <button class="icon-btn" onclick="openModal('divida','${state.activeMode}','${dv.id}')" title="Editar">✏️</button>
            <button class="icon-btn danger" onclick="openConfirm('dividas','${state.activeMode}','${dv.id}')" title="Excluir">🗑️</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="list-panel">
      <div class="panel-header">
        <div class="panel-title">
          <div class="panel-icon">🔗</div>
          Dívidas
          ${d.dividas.length > 0 ? `<span class="panel-badge yellow">${d.dividas.length}</span>` : ''}
        </div>
        <button class="btn-add" onclick="openModal('divida','${state.activeMode}')">+</button>
      </div>
      <div class="panel-body">
        ${d.dividas.length === 0
          ? `<div class="panel-empty"><div class="empty-icon">🎉</div><div>Sem dívidas</div></div>`
          : items
        }
      </div>
    </div>
  `;
}

// ── A RECEBER PANEL ───────────────────────────────────────────
function renderAReceberPanel(d) {
  const sorted = [...d.aReceber].sort((a,b) => {
    const sa = autoStatus(a), sb = autoStatus(b);
    if (sa === 'atrasado' && sb !== 'atrasado') return -1;
    if (sb === 'atrasado' && sa !== 'atrasado') return 1;
    return (a.vencimento || '').localeCompare(b.vencimento || '');
  });

  const atrasados = d.aReceber.filter(x => autoStatus(x) === 'atrasado').length;

  const items = sorted.map(r => {
    const s = autoStatus(r);
    return `
      <div class="list-item">
        <div class="item-icon">👤</div>
        <div class="item-body">
          <div class="item-name">${esc(r.devedor)}</div>
          <div class="item-sub">${esc(r.descricao)} · ${fmtDate(r.vencimento)} ${daysChip(r.vencimento, s)}</div>
        </div>
        <div class="item-right">
          <div class="item-value positive">${fmt(r.valor)}</div>
          ${badgeHtml(s)}
          <div class="item-actions">
            <button class="icon-btn" onclick="openModal('receber','${state.activeMode}','${r.id}')" title="Editar">✏️</button>
            <button class="icon-btn danger" onclick="openConfirm('aReceber','${state.activeMode}','${r.id}')" title="Excluir">🗑️</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="list-panel">
      <div class="panel-header">
        <div class="panel-title">
          <div class="panel-icon">📥</div>
          A Receber
          ${atrasados > 0 ? `<span class="panel-badge red">${atrasados} atras.</span>` : ''}
        </div>
        <button class="btn-add" onclick="openModal('receber','${state.activeMode}')">+</button>
      </div>
      <div class="panel-body">
        ${sorted.length === 0
          ? `<div class="panel-empty"><div class="empty-icon">💸</div><div>Sem valores a receber</div></div>`
          : items
        }
      </div>
    </div>
  `;
}

// ── CATEGORIAS SECTION ───────────────────────────────────────
function renderCategoriasSection(d) {
  if (!_catDateFrom) _catDateFrom = monthStart();
  if (!_catDateTo) _catDateTo = todayStr();

  return `
    <div class="section-block">
      <div class="section-header">
        <div class="section-title">
          <div class="icon">📊</div>
          Gastos por Categoria
        </div>
        <div class="filter-bar">
          <input type="date" class="filter-date" value="${_catDateFrom}" onchange="_catDateFrom=this.value;document.getElementById('catGrid').innerHTML=buildCatGrid()">
          <span class="filter-sep">até</span>
          <input type="date" class="filter-date" value="${_catDateTo}" onchange="_catDateTo=this.value;document.getElementById('catGrid').innerHTML=buildCatGrid()">
        </div>
      </div>
      <div id="catGrid">${buildCatGrid()}</div>
    </div>
  `;
}

function buildCatGrid() {
  const d = activeData();
  const from = _catDateFrom, to = _catDateTo;
  const catMap = {};

  d.contasPagar.filter(c => inDateRange(c.vencimento, from, to)).forEach(c => {
    const cat = c.categoria || 'Outros';
    catMap[cat] = (catMap[cat] || 0) + (c.valor || 0);
  });

  (d.transacoes || []).filter(t => t.tipo === 'saida' && inDateRange(t.data, from, to)).forEach(t => {
    const cat = t.categoria || 'Outros';
    catMap[cat] = (catMap[cat] || 0) + (t.valor || 0);
  });

  (d.compras || []).filter(c => inDateRange(c.data, from, to)).forEach(c => {
    const cat = c.categoria || 'Outros';
    catMap[cat] = (catMap[cat] || 0) + (c.valorTotal || 0);
  });

  const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  const maxVal = sorted.length > 0 ? sorted[0][1] : 1;
  const totalGastos = sorted.reduce((s, [, v]) => s + v, 0);

  if (sorted.length === 0) {
    return `<div class="full-empty"><div class="e-icon">📊</div><div>Sem gastos no período</div></div>`;
  }

  const items = sorted.map(([cat, val], idx) => {
    const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
    const pctTotal = totalGastos > 0 ? (val / totalGastos) * 100 : 0;
    const barColor = CAT_COLORS[idx % CAT_COLORS.length];
    return `
      <div class="cat-item">
        <div class="cat-icon">${catIcon(cat)}</div>
        <div class="cat-body">
          <div class="cat-name">${esc(cat)}</div>
          <div class="cat-bar"><div class="cat-bar-fill" style="width:${pct.toFixed(1)}%;background:${barColor}"></div></div>
        </div>
        <div class="cat-right">
          <div class="cat-value">${fmt(val)}</div>
          <div class="cat-pct">${pctTotal.toFixed(1)}%</div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div style="font-size:12px;font-weight:600;color:var(--text-muted);text-align:right;margin-bottom:6px">Total: ${fmt(totalGastos)}</div>
    <div class="categorias-grid">${items}</div>
  `;
}

// ── MODAL ─────────────────────────────────────────────────────
let _modalType   = null;
let _modalSection= null;
let _modalEditId = null;

function openModal(type, section, editId = null) {
  _modalType    = type;
  _modalSection = section;
  _modalEditId  = editId;

  if (type === 'profile') {
    document.getElementById('modalTitle').textContent = 'Perfil & Configurações';
    document.getElementById('modalBody').innerHTML = buildForm('profile', null);
    document.getElementById('modalOverlay').classList.remove('hidden');
    return;
  }

  const titles = { banco: 'Banco', cartao: 'Cartão de Crédito', conta: 'Conta a Pagar', divida: 'Dívida', receber: 'A Receber', transacao: 'Transação', compra: 'Compra' };
  const item = editId ? findItem(type, section, editId) : null;

  document.getElementById('modalTitle').textContent = (editId ? 'Editar ' : 'Adicionar ') + titles[type];
  document.getElementById('modalBody').innerHTML = buildForm(type, item);
  document.getElementById('modalOverlay').classList.remove('hidden');
}

function findItem(type, section, id) {
  const col = { banco: 'bancos', cartao: 'cartoes', conta: 'contasPagar', divida: 'dividas', receber: 'aReceber', transacao: 'transacoes', compra: 'compras' }[type];
  return state[section][col].find(x => x.id === id) || null;
}

function closeModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
  _modalType = _modalSection = _modalEditId = null;
  _importItems = [];
  document.getElementById('modalFooter').innerHTML = `
    <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="submitModal()">Salvar</button>
  `;
}

function handleOverlayClick(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
}

function buildForm(type, item) {
  const v = item || {};

  if (type === 'banco') {
    const tipoOptions = ['corrente','poupança','digital','investimento'];
    const bankNames = ['Nubank','Itaú','Bradesco','Santander','Banco do Brasil','Caixa','C6 Bank','Inter','PicPay','Sicoob','XP','BTG','Neon','Pan','Mercado Pago','Outro'];
    return `<div class="form">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Nome do banco</label>
          <select class="form-select" id="f_nome">
            ${bankNames.map(n => `<option value="${n}" ${v.nome===n?'selected':''}>${n}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Tipo de conta</label>
          <select class="form-select" id="f_tipo">
            ${tipoOptions.map(t => `<option value="${t}" ${v.tipo===t?'selected':''}>${t.charAt(0).toUpperCase()+t.slice(1)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Saldo atual (R$)</label>
          <input class="form-input" id="f_saldo" type="number" step="0.01" value="${v.saldo||0}" placeholder="0,00" autocomplete="off">
        </div>
        <div class="form-group">
          <label class="form-label">Taxa mensal (0 = isento)</label>
          <input class="form-input" id="f_taxaMensal" type="number" step="0.01" min="0" value="${v.taxaMensal||0}" placeholder="0,00">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Agência (opcional)</label>
          <input class="form-input" id="f_agencia" type="text" value="${escAttr(v.agencia)}" placeholder="0000" autocomplete="off" maxlength="20">
        </div>
        <div class="form-group">
          <label class="form-label">Conta (opcional)</label>
          <input class="form-input" id="f_conta" type="text" value="${escAttr(v.conta)}" placeholder="00000-0" autocomplete="off" maxlength="20">
        </div>
      </div>
    </div>`;
  }

  if (type === 'cartao') {
    const bandeiras = ['Visa','Mastercard','Elo','Amex','Hipercard'];
    const swatches = GRADIENTS.map(g => `
      <div class="color-swatch ${v.cor===g.id?'active':''}" data-grad="${g.id}" style="background:${g.css}" onclick="selectGrad(this,'${g.id}')" title="${g.label}"></div>
    `).join('');

    return `<div class="form">
      <div class="form-row single">
        <div class="form-group">
          <label class="form-label">Nome do cartão</label>
          <input class="form-input" id="f_nome" type="text" value="${escAttr(v.nome)}" placeholder="Ex: Nubank Platinum">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Banco</label>
          <input class="form-input" id="f_banco" type="text" value="${escAttr(v.banco)}" placeholder="Ex: Nubank">
        </div>
        <div class="form-group">
          <label class="form-label">Bandeira</label>
          <select class="form-select" id="f_bandeira">
            ${bandeiras.map(b => `<option value="${b}" ${v.bandeira===b?'selected':''}>${b}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Limite total (R$)</label>
          <input class="form-input" id="f_limite" type="number" step="0.01" min="0" value="${v.limite||0}" autocomplete="off">
        </div>
        <div class="form-group">
          <label class="form-label">Valor utilizado (R$)</label>
          <input class="form-input" id="f_usado" type="number" step="0.01" min="0" value="${v.usado||0}" autocomplete="off">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Dia de fechamento</label>
          <input class="form-input" id="f_fechamento" type="number" min="1" max="31" value="${v.fechamento||1}">
        </div>
        <div class="form-group">
          <label class="form-label">Dia de vencimento</label>
          <input class="form-input" id="f_vencimento" type="number" min="1" max="31" value="${v.vencimento||10}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Cor do cartão</label>
        <div class="color-swatches">${swatches}</div>
        <input type="hidden" id="f_cor" value="${v.cor||'purple'}">
      </div>
    </div>`;
  }

  if (type === 'conta') {
    const categorias = ['Aluguel','Água','Luz','Internet','Telefone','Alimentação','Transporte','Saúde','Educação','Lazer','Impostos','Salários','Fornecedores','Software','Marketing','Seguro','Academia','Assinatura','Outros'];
    const statuses   = ['pendente','pago','atrasado'];

    return `<div class="form">
      <div class="form-row single">
        <div class="form-group">
          <label class="form-label">Descrição</label>
          <input class="form-input" id="f_descricao" type="text" value="${escAttr(v.descricao)}" placeholder="Ex: Aluguel escritório">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Valor (R$)</label>
          <input class="form-input" id="f_valor" type="number" step="0.01" min="0" value="${v.valor||0}">
        </div>
        <div class="form-group">
          <label class="form-label">Vencimento</label>
          <input class="form-input" id="f_vencimento" type="date" value="${v.vencimento||todayStr()}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Categoria</label>
          <select class="form-select" id="f_categoria">
            ${categorias.map(c => `<option value="${c}" ${v.categoria===c?'selected':''}>${c}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-select" id="f_status">
            ${statuses.map(s => `<option value="${s}" ${v.status===s?'selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-check">
          <input type="checkbox" id="f_recorrente" ${v.recorrente?'checked':''}>
          Conta recorrente (mensal)
        </label>
      </div>
    </div>`;
  }

  if (type === 'divida') {
    return `<div class="form">
      <div class="form-row single">
        <div class="form-group">
          <label class="form-label">Credor</label>
          <input class="form-input" id="f_credor" type="text" value="${escAttr(v.credor)}" placeholder="Ex: Banco Itaú">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Valor total (R$)</label>
          <input class="form-input" id="f_valorTotal" type="number" step="0.01" min="0" value="${v.valorTotal||0}">
        </div>
        <div class="form-group">
          <label class="form-label">Valor já pago (R$)</label>
          <input class="form-input" id="f_valorPago" type="number" step="0.01" min="0" value="${v.valorPago||0}">
        </div>
      </div>
      <div class="form-row triple">
        <div class="form-group">
          <label class="form-label">Total de parcelas</label>
          <input class="form-input" id="f_parcelas" type="number" min="1" value="${v.parcelas||1}">
        </div>
        <div class="form-group">
          <label class="form-label">Parcela atual</label>
          <input class="form-input" id="f_parcelaAtual" type="number" min="1" value="${v.parcelaAtual||1}">
        </div>
        <div class="form-group">
          <label class="form-label">Juros (% a.m.)</label>
          <input class="form-input" id="f_juros" type="number" step="0.01" min="0" value="${v.juros||0}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Próx. vencimento</label>
          <input class="form-input" id="f_proxVencimento" type="date" value="${v.proxVencimento||todayStr()}">
        </div>
        <div class="form-group">
          <label class="form-label">Observações</label>
          <input class="form-input" id="f_obs" type="text" value="${escAttr(v.obs)}" placeholder="Opcional">
        </div>
      </div>
    </div>`;
  }

  if (type === 'receber') {
    const statuses = ['pendente','recebido','atrasado'];
    return `<div class="form">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Devedor</label>
          <input class="form-input" id="f_devedor" type="text" value="${escAttr(v.devedor)}" placeholder="Ex: João Silva">
        </div>
        <div class="form-group">
          <label class="form-label">Valor (R$)</label>
          <input class="form-input" id="f_valor" type="number" step="0.01" min="0" value="${v.valor||0}">
        </div>
      </div>
      <div class="form-row single">
        <div class="form-group">
          <label class="form-label">Descrição</label>
          <input class="form-input" id="f_descricao" type="text" value="${escAttr(v.descricao)}" placeholder="Ex: NF 1234 — Consultoria">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Vencimento</label>
          <input class="form-input" id="f_vencimento" type="date" value="${v.vencimento||todayStr()}">
        </div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-select" id="f_status">
            ${statuses.map(s => `<option value="${s}" ${v.status===s?'selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>`;
  }

  if (type === 'transacao') {
    const categorias = ['Clientes','Salário','Freelance','Fornecedores','Aluguel','Investimentos','Rendimentos','Compras','Impostos','Transferência','Outros'];
    return `<div class="form">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Tipo</label>
          <select class="form-select" id="f_tipo">
            <option value="entrada" ${v.tipo==='entrada'?'selected':''}>Entrada (recebimento)</option>
            <option value="saida" ${v.tipo==='saida'?'selected':''}>Saída (pagamento)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Valor (R$)</label>
          <input class="form-input" id="f_valor" type="number" step="0.01" min="0" value="${v.valor||0}">
        </div>
      </div>
      <div class="form-row single">
        <div class="form-group">
          <label class="form-label">Descrição</label>
          <input class="form-input" id="f_descricao" type="text" value="${escAttr(v.descricao)}" placeholder="Ex: PIX recebido — Cliente ABC">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Data</label>
          <input class="form-input" id="f_data" type="date" value="${v.data||todayStr()}">
        </div>
        <div class="form-group">
          <label class="form-label">Categoria</label>
          <select class="form-select" id="f_categoria">
            ${categorias.map(c => `<option value="${c}" ${v.categoria===c?'selected':''}>${c}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>`;
  }

  if (type === 'profile') {
    return `<div class="form">
      <div class="profile-preview">
        <div class="profile-avatar-lg">${profile.nome ? profile.nome.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase() : '👤'}</div>
        <div class="profile-info">
          <div class="profile-info-name">${esc(profile.nome || 'Usuário')}</div>
          <div class="profile-info-email">${esc(profile.email || '')}</div>
        </div>
      </div>
      <div class="form-row single">
        <div class="form-group">
          <label class="form-label">Nome</label>
          <input class="form-input" id="f_nome" type="text" value="${escAttr(profile.nome)}" placeholder="Ex: João Silva">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">E-mail</label>
          <input class="form-input" id="f_email" type="email" value="${escAttr(profile.email)}" readonly style="opacity:0.6;cursor:not-allowed" title="E-mail não pode ser alterado">
        </div>
        <div class="form-group">
          <label class="form-label">Telefone</label>
          <input class="form-input" id="f_telefone" type="tel" value="${escAttr(profile.telefone)}" placeholder="(11) 99999-0000">
        </div>
      </div>
      <div class="form-row single">
        <div class="form-group">
          <label class="form-label">Nome da empresa</label>
          <input class="form-input" id="f_empresa" type="text" value="${escAttr(profile.empresa)}" placeholder="Ex: Tech Solutions Ltda">
        </div>
      </div>
      <div class="form-row single" style="margin-top:12px">
        <button type="button" class="btn btn-ghost login-logout-btn" onclick="handleLogout()">Sair da conta</button>
      </div>
    </div>`;
  }

  if (type === 'compra') {
    const categorias = ['Alimentação','Eletrônicos','Eletrodomésticos','Vestuário','Viagem','Escritório','Equipamentos','Software','Assinatura','Saúde','Lazer','Outros'];
    return `<div class="form">
      <div class="form-row single">
        <div class="form-group">
          <label class="form-label">Descrição</label>
          <input class="form-input" id="f_descricao" type="text" value="${escAttr(v.descricao)}" placeholder="Ex: iPhone 15 Pro Max">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Valor total (R$)</label>
          <input class="form-input" id="f_valorTotal" type="number" step="0.01" min="0" value="${v.valorTotal||0}">
        </div>
        <div class="form-group">
          <label class="form-label">Parcelas (1 = à vista)</label>
          <input class="form-input" id="f_parcelas" type="number" min="1" max="48" value="${v.parcelas||1}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Data da compra</label>
          <input class="form-input" id="f_data" type="date" value="${v.data||todayStr()}">
        </div>
        <div class="form-group">
          <label class="form-label">Categoria</label>
          <select class="form-select" id="f_categoria">
            ${categorias.map(c => `<option value="${c}" ${v.categoria===c?'selected':''}>${c}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>`;
  }

  return '';
}

function selectGrad(el, id) {
  document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('f_cor').value = id;
}

function g(id) {
  const el = document.getElementById(id);
  if (!el) return undefined;
  if (el.type === 'checkbox') return el.checked;
  if (el.type === 'number')   return parseFloat(el.value) || 0;
  return el.value;
}

function submitModal() {
  const t = _modalType;
  const s = _modalSection;

  if (t === 'profile') {
    profile.nome = sanitizeInput(g('f_nome') || '', 200);
    profile.telefone = sanitizeInput(g('f_telefone') || '', 50);
    profile.empresa = sanitizeInput(g('f_empresa') || '', 200);
    saveProfile();
    updateHeaderProfile();
    closeModal();
    return;
  }

  let item;
  const si = (v, max) => sanitizeInput(v, max);

  if (t === 'banco') {
    item = { nome: si(g('f_nome'), 100), tipo: si(g('f_tipo'), 50), saldo: g('f_saldo'), taxaMensal: g('f_taxaMensal'), agencia: si(g('f_agencia'), 20), conta: si(g('f_conta'), 20) };
    if (!item.nome) return alert('Informe o nome do banco.');
    upsert('bancos', s, item);
  }
  else if (t === 'cartao') {
    item = { nome: si(g('f_nome'), 100), banco: si(g('f_banco'), 100), bandeira: si(g('f_bandeira'), 50), limite: g('f_limite'), usado: g('f_usado'), fechamento: g('f_fechamento'), vencimento: g('f_vencimento'), cor: si(g('f_cor'), 20) };
    if (!item.nome) return alert('Informe o nome do cartão.');
    upsert('cartoes', s, item);
  }
  else if (t === 'conta') {
    item = { descricao: si(g('f_descricao'), 300), valor: g('f_valor'), vencimento: g('f_vencimento'), categoria: si(g('f_categoria'), 100), status: si(g('f_status'), 30), recorrente: g('f_recorrente') };
    if (!item.descricao) return alert('Informe a descrição.');
    upsert('contasPagar', s, item);
  }
  else if (t === 'divida') {
    item = { credor: si(g('f_credor'), 200), valorTotal: g('f_valorTotal'), valorPago: g('f_valorPago'), parcelas: g('f_parcelas'), parcelaAtual: g('f_parcelaAtual'), proxVencimento: g('f_proxVencimento'), juros: g('f_juros'), obs: si(g('f_obs'), 500) };
    if (!item.credor) return alert('Informe o nome do credor.');
    upsert('dividas', s, item);
  }
  else if (t === 'receber') {
    item = { devedor: si(g('f_devedor'), 200), descricao: si(g('f_descricao'), 300), valor: g('f_valor'), vencimento: g('f_vencimento'), status: si(g('f_status'), 30) };
    if (!item.devedor) return alert('Informe o nome do devedor.');
    upsert('aReceber', s, item);
  }
  else if (t === 'transacao') {
    item = { bancoId: _detailParentId, tipo: si(g('f_tipo'), 30), descricao: si(g('f_descricao'), 300), valor: g('f_valor'), data: g('f_data'), categoria: si(g('f_categoria'), 100) };
    if (!item.descricao) return alert('Informe a descrição.');
    upsert('transacoes', s, item);
  }
  else if (t === 'compra') {
    const parcelas = g('f_parcelas') || 1;
    const valorTotal = g('f_valorTotal') || 0;
    item = { cartaoId: _detailParentId, descricao: si(g('f_descricao'), 300), valorTotal: valorTotal, parcelas: parcelas, valorParcela: parcelas > 0 ? Math.round((valorTotal / parcelas) * 100) / 100 : valorTotal, data: g('f_data'), categoria: si(g('f_categoria'), 100) };
    if (!item.descricao) return alert('Informe a descrição.');
    upsert('compras', s, item);
  }

  closeModal();
  saveState();
  render();
  // Refresh detail modal if open
  if (_detailType) renderDetailContent();
}

function upsert(col, section, item) {
  if (!state[section][col]) state[section][col] = [];
  const arr = state[section][col];
  if (_modalEditId) {
    const idx = arr.findIndex(x => x.id === _modalEditId);
    if (idx >= 0) arr[idx] = { ...arr[idx], ...item };
  } else {
    arr.push({ id: uid(), ...item });
  }
}

// ── CONFIRM (genérico) ───────────────────────────────────────
let _delCol, _delSection, _delId;
let _confirmCallback = null;

function openConfirm(col, section, id) {
  _delCol = col; _delSection = section; _delId = id;
  _confirmCallback = null;
  document.getElementById('confirmTitle').textContent = 'Confirmar exclusão';
  const msgEl = document.getElementById('confirmMsg');
  msgEl.textContent = 'Tem certeza que deseja excluir este item?';
  const sm = document.createElement('small');
  sm.style.color = 'var(--text-muted)';
  sm.textContent = 'Esta ação não pode ser desfeita.';
  msgEl.appendChild(document.createElement('br'));
  msgEl.appendChild(sm);
  document.getElementById('confirmBtn').textContent = 'Excluir';
  document.getElementById('confirmOverlay').classList.remove('hidden');
}

function showConfirm(title, msg, btnText, callback, subMsg) {
  _delCol = _delSection = _delId = null;
  _confirmCallback = callback;
  document.getElementById('confirmTitle').textContent = title;
  const msgEl = document.getElementById('confirmMsg');
  msgEl.textContent = msg;
  if (subMsg) {
    const sm = document.createElement('small');
    sm.style.color = 'var(--text-muted)';
    sm.textContent = subMsg;
    msgEl.appendChild(document.createElement('br'));
    msgEl.appendChild(sm);
  }
  document.getElementById('confirmBtn').textContent = btnText;
  document.getElementById('confirmOverlay').classList.remove('hidden');
}

function closeConfirm() {
  document.getElementById('confirmOverlay').classList.add('hidden');
  _delCol = _delSection = _delId = null;
  _confirmCallback = null;
}

function handleConfirmOverlayClick(e) {
  if (e.target === document.getElementById('confirmOverlay')) closeConfirm();
}

function execConfirm() {
  if (_confirmCallback) {
    _confirmCallback();
    closeConfirm();
    return;
  }
  // fallback: delete
  const arr = state[_delSection][_delCol];
  if (arr) {
    const idx = arr.findIndex(x => x.id === _delId);
    if (idx >= 0) arr.splice(idx, 1);
  }
  closeConfirm();
  saveState();
  render();
  if (_detailType) renderDetailContent();
}

// ── DETAIL MODAL (Extrato / Compras) ─────────────────────────
let _detailType = null;   // 'extrato' | 'compras'
let _detailParentId = null;

function openDetail(tipo, parentId) {
  _detailType = tipo;
  _detailParentId = parentId;
  // Reset filters on open
  if (tipo === 'extrato') {
    _extratoDateFrom = monthStart();
    _extratoDateTo = todayStr();
  } else if (tipo === 'compras') {
    _comprasMesOffset = 0;
  }
  renderDetailContent();
  document.getElementById('detailOverlay').classList.remove('hidden');
}

function closeDetail() {
  document.getElementById('detailOverlay').classList.add('hidden');
  _detailType = _detailParentId = null;
}

function handleDetailOverlayClick(e) {
  if (e.target === document.getElementById('detailOverlay')) closeDetail();
}

function renderDetailContent() {
  if (_detailType === 'extrato') renderExtrato();
  else if (_detailType === 'compras') renderComprasCartao();
}

function renderExtrato() {
  const d = activeData();
  const banco = d.bancos.find(b => b.id === _detailParentId);
  if (!banco) return;

  if (!_extratoDateFrom) _extratoDateFrom = monthStart();
  if (!_extratoDateTo) _extratoDateTo = todayStr();

  const allTxs = (d.transacoes || []).filter(t => t.bancoId === _detailParentId);
  const txs = allTxs
    .filter(t => inDateRange(t.data, _extratoDateFrom, _extratoDateTo))
    .sort((a,b) => (b.data || '').localeCompare(a.data || ''));

  const entradas = txs.filter(t => t.tipo === 'entrada').reduce((s,t) => s + (t.valor||0), 0);
  const saidas   = txs.filter(t => t.tipo === 'saida').reduce((s,t) => s + (t.valor||0), 0);

  document.getElementById('detailTitle').textContent = `Extrato — ${banco.nome}`;

  const items = txs.map(t => `
    <div class="detail-item">
      <div class="di-icon ${t.tipo}">${t.tipo === 'entrada' ? '↓' : '↑'}</div>
      <div class="di-body">
        <div class="di-name">${esc(t.descricao)}</div>
        <div class="di-sub">${esc(t.categoria || '')} · ${fmtDate(t.data)}</div>
      </div>
      <div class="di-right">
        <div class="di-value ${t.tipo === 'entrada' ? 'positive' : 'negative'}">${t.tipo === 'entrada' ? '+' : '-'} ${fmt(t.valor)}</div>
        <span class="tipo-tag ${t.tipo}">${t.tipo === 'entrada' ? 'Entrada' : 'Saída'}</span>
        <div class="item-actions">
          <button class="icon-btn" onclick="editFromDetail('transacao','${t.id}')" title="Editar">✏️</button>
          <button class="icon-btn danger" onclick="openConfirm('transacoes','${state.activeMode}','${t.id}')" title="Excluir">🗑️</button>
        </div>
      </div>
    </div>
  `).join('');

  document.getElementById('detailBody').innerHTML = `
    <div class="detail-toolbar">
      <div class="detail-summary">
        <div class="ds-item"><div class="ds-label">Entradas</div><div class="ds-val positive">+ ${fmt(entradas)}</div></div>
        <div class="ds-item"><div class="ds-label">Saídas</div><div class="ds-val negative">- ${fmt(saidas)}</div></div>
      </div>
      <div class="detail-toolbar-actions">
        <button class="btn-add btn-upload" onclick="triggerUpload('extrato')"><span class="up-icon">📎</span> Importar</button>
        <button class="btn-add" onclick="addFromDetail('transacao')">+ Adicionar</button>
      </div>
      <div class="detail-filter-row">
        <div class="filter-bar">
          <input type="date" class="filter-date" value="${_extratoDateFrom}" onchange="_extratoDateFrom=this.value;renderDetailContent()">
          <span class="filter-sep">até</span>
          <input type="date" class="filter-date" value="${_extratoDateTo}" onchange="_extratoDateTo=this.value;renderDetailContent()">
        </div>
        <span style="font-size:11px;color:var(--text-muted)">${txs.length} de ${allTxs.length} transações</span>
      </div>
    </div>
    ${txs.length === 0
      ? `<div class="detail-empty"><div class="de-icon">📋</div><div>Nenhuma transação no período</div></div>`
      : `<div class="detail-list">${items}</div>`
    }
  `;
}

function renderComprasCartao() {
  const d = activeData();
  const cartao = d.cartoes.find(c => c.id === _detailParentId);
  if (!cartao) return;

  const mesRange = getComprasMesRange();
  const allCompras = (d.compras || []).filter(c => c.cartaoId === _detailParentId);
  const compras = allCompras
    .filter(c => inDateRange(c.data, mesRange.from, mesRange.to))
    .sort((a,b) => (b.data || '').localeCompare(a.data || ''));

  const totalCompras = compras.reduce((s,c) => s + (c.valorTotal||0), 0);
  const totalParcelas = compras.reduce((s,c) => s + (c.valorParcela||c.valorTotal||0), 0);

  document.getElementById('detailTitle').textContent = `Compras — ${cartao.nome}`;

  const items = compras.map(c => {
    const avista = c.parcelas <= 1;
    return `
      <div class="detail-item">
        <div class="di-icon compra">🛒</div>
        <div class="di-body">
          <div class="di-name">${esc(c.descricao)}</div>
          <div class="di-sub">${esc(c.categoria || '')} · ${fmtDate(c.data)}</div>
        </div>
        <div class="di-right">
          <div class="di-value">${fmt(c.valorTotal)}</div>
          <span class="parcelas-tag ${avista ? 'avista' : ''}">${avista ? 'À vista' : `${c.parcelas}x de ${fmt(c.valorParcela)}`}</span>
          <div class="item-actions">
            <button class="icon-btn" onclick="editFromDetail('compra','${c.id}')" title="Editar">✏️</button>
            <button class="icon-btn danger" onclick="openConfirm('compras','${state.activeMode}','${c.id}')" title="Excluir">🗑️</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('detailBody').innerHTML = `
    <div class="detail-toolbar">
      <div class="detail-summary">
        <div class="ds-item"><div class="ds-label">Total compras</div><div class="ds-val">${fmt(totalCompras)}</div></div>
        <div class="ds-item"><div class="ds-label">Valor parcelas</div><div class="ds-val">${fmt(totalParcelas)}</div></div>
        <div class="ds-item"><div class="ds-label">Itens</div><div class="ds-val">${compras.length}</div></div>
      </div>
      <div class="detail-toolbar-actions">
        <button class="btn-add btn-upload" onclick="triggerUpload('compras')"><span class="up-icon">📎</span> Importar</button>
        <button class="btn-add" onclick="addFromDetail('compra')">+ Adicionar</button>
      </div>
      <div class="detail-filter-row">
        <div class="month-nav">
          <button class="month-nav-btn" onclick="_comprasMesOffset--;renderDetailContent()">◀</button>
          <span class="month-nav-label">${mesRange.label}</span>
          <button class="month-nav-btn" onclick="_comprasMesOffset++;renderDetailContent()">▶</button>
        </div>
        <span style="font-size:11px;color:var(--text-muted)">${compras.length} de ${allCompras.length} compras</span>
      </div>
    </div>
    ${compras.length === 0
      ? `<div class="detail-empty"><div class="de-icon">🛒</div><div>Nenhuma compra neste mês</div></div>`
      : `<div class="detail-list">${items}</div>`
    }
  `;
}

function addFromDetail(type) {
  _modalType = type;
  _modalSection = state.activeMode;
  _modalEditId = null;
  const titles = { transacao: 'Transação', compra: 'Compra no Cartão' };
  document.getElementById('modalTitle').textContent = 'Adicionar ' + titles[type];
  document.getElementById('modalBody').innerHTML = buildForm(type, null);
  document.getElementById('modalOverlay').classList.remove('hidden');
}

function editFromDetail(type, id) {
  _modalType = type;
  _modalSection = state.activeMode;
  _modalEditId = id;
  const col = type === 'transacao' ? 'transacoes' : 'compras';
  const item = state[state.activeMode][col].find(x => x.id === id) || null;
  const titles = { transacao: 'Transação', compra: 'Compra no Cartão' };
  document.getElementById('modalTitle').textContent = 'Editar ' + titles[type];
  document.getElementById('modalBody').innerHTML = buildForm(type, item);
  document.getElementById('modalOverlay').classList.remove('hidden');
}

// ── FILE UPLOAD & IMPORT ─────────────────────────────────────
let _uploadType = null;
let _importItems = [];

function triggerUpload(type) {
  _uploadType = type;
  let inp = document.getElementById('_fileInput');
  if (!inp) {
    inp = document.createElement('input');
    inp.type = 'file';
    inp.id = '_fileInput';
    inp.style.display = 'none';
    inp.accept = 'image/*,.csv,.ofx,.txt,.pdf,application/pdf';
    inp.addEventListener('change', handleFileUpload);
    document.body.appendChild(inp);
  }
  inp.value = '';
  inp.click();
}

async function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
  if (file.size > MAX_FILE_SIZE) {
    alert('Arquivo muito grande. O tamanho máximo é 10 MB.');
    return;
  }
  showImportLoading();
  try {
    let text;
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (isImage) {
      updateImportStatus('Executando OCR na imagem...');
      text = await ocrImage(file);
    } else if (isPdf) {
      updateImportStatus('Lendo PDF...');
      text = await readPdfText(file);
    } else {
      text = await readFileText(file);
    }
    updateImportStatus('Identificando transações...');
    let items;
    if (_uploadType === 'extrato') {
      items = parseExtratoText(text);
    } else {
      items = parseComprasText(text);
    }
    if (items.length === 0) {
      closeModal();
      alert('Não foi possível identificar transações no arquivo.\nVerifique o formato ou a qualidade da imagem.');
      return;
    }
    _importItems = items;
    showImportPreview();
  } catch (err) {
    closeModal();
    alert('Não foi possível processar o arquivo. Verifique o formato e tente novamente.');
  }
}

function readFileText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsText(file, 'UTF-8');
  });
}

async function ocrImage(file) {
  const worker = await Tesseract.createWorker('por');
  const { data: { text } } = await worker.recognize(file);
  await worker.terminate();
  return text;
}

async function readPdfText(file) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    updateImportStatus(`Lendo página ${i} de ${pdf.numPages}...`);
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    fullText += pageText + '\n';
  }
  return fullText;
}

function showImportLoading() {
  document.getElementById('modalTitle').textContent = 'Processando arquivo...';
  document.getElementById('modalBody').innerHTML = `
    <div class="import-loading">
      <div class="import-spinner"></div>
      <div class="import-loading-text">Analisando documento...</div>
      <div class="import-loading-sub">Isso pode levar alguns segundos</div>
    </div>
  `;
  document.getElementById('modalFooter').innerHTML = `
    <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
  `;
  document.getElementById('modalOverlay').classList.remove('hidden');
}

function updateImportStatus(msg) {
  const el = document.querySelector('.import-loading-text');
  if (el) el.textContent = msg;
}

function showImportPreview() {
  const type = _uploadType;
  const isExtrato = type === 'extrato';
  document.getElementById('modalTitle').textContent =
    `Importar ${isExtrato ? 'Transações' : 'Compras'} — ${_importItems.length} encontrada${_importItems.length !== 1 ? 's' : ''}`;

  const rows = _importItems.map((item, i) => {
    if (isExtrato) {
      return `
        <div class="import-item">
          <label class="import-check"><input type="checkbox" checked data-idx="${i}"></label>
          <div class="import-item-icon ${item.tipo}">${item.tipo === 'entrada' ? '↓' : '↑'}</div>
          <div class="import-item-body">
            <div class="import-item-name">${esc(item.descricao)}</div>
            <div class="import-item-sub">${fmtDate(item.data)} · ${esc(item.categoria)}</div>
          </div>
          <div class="import-item-value ${item.tipo === 'entrada' ? 'positive' : 'negative'}">
            ${item.tipo === 'entrada' ? '+' : '−'} ${fmt(item.valor)}
          </div>
        </div>`;
    } else {
      const avista = (item.parcelas || 1) <= 1;
      return `
        <div class="import-item">
          <label class="import-check"><input type="checkbox" checked data-idx="${i}"></label>
          <div class="import-item-icon compra">🛒</div>
          <div class="import-item-body">
            <div class="import-item-name">${esc(item.descricao)}</div>
            <div class="import-item-sub">${fmtDate(item.data)} · ${avista ? 'À vista' : item.parcelas + 'x de ' + fmt(item.valorParcela)} · ${esc(item.categoria)}</div>
          </div>
          <div class="import-item-value">${fmt(item.valorTotal)}</div>
        </div>`;
    }
  }).join('');

  document.getElementById('modalBody').innerHTML = `
    <div class="import-preview">
      <div class="import-info">Revise os itens abaixo. Desmarque os que não deseja importar.</div>
      <div class="import-select-all">
        <label class="import-check"><input type="checkbox" checked id="importSelectAll" onchange="toggleAllImports(this.checked)"> Selecionar todos</label>
      </div>
      <div class="import-list">${rows}</div>
    </div>
  `;

  document.getElementById('modalFooter').innerHTML = `
    <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="confirmImport()">✔ Importar selecionados</button>
  `;
  document.getElementById('modalOverlay').classList.remove('hidden');
}

function toggleAllImports(checked) {
  document.querySelectorAll('.import-list input[type=checkbox]').forEach(cb => cb.checked = checked);
}

function confirmImport() {
  const checkboxes = document.querySelectorAll('.import-list input[type=checkbox]');
  const section = state.activeMode;
  const parentId = _detailParentId;
  let count = 0;

  checkboxes.forEach(cb => {
    if (!cb.checked) return;
    const idx = parseInt(cb.dataset.idx);
    const item = _importItems[idx];
    if (!item) return;

    if (_uploadType === 'extrato') {
      if (!state[section].transacoes) state[section].transacoes = [];
      state[section].transacoes.push({
        id: uid(), bancoId: parentId,
        tipo: item.tipo, descricao: item.descricao,
        valor: item.valor, data: item.data, categoria: item.categoria
      });
    } else {
      if (!state[section].compras) state[section].compras = [];
      state[section].compras.push({
        id: uid(), cartaoId: parentId,
        descricao: item.descricao, valorTotal: item.valorTotal,
        parcelas: item.parcelas || 1,
        valorParcela: item.valorParcela || item.valorTotal,
        data: item.data, categoria: item.categoria
      });
    }
    count++;
  });

  closeModal();
  saveState();
  render();
  if (_detailType) renderDetailContent();
}

// ── PARSERS ──────────────────────────────────────────────────
function parseExtratoText(text) {
  if (text.includes('<OFX') || text.includes('<STMTTRN>')) {
    const r = parseOFX(text);
    if (r.length) return r;
  }
  if (hasCSVStructure(text)) {
    const r = parseCSVExtrato(text);
    if (r.length) return r;
  }
  return parseLineExtrato(text);
}

function parseComprasText(text) {
  if (hasCSVStructure(text)) {
    const r = parseCSVCompras(text);
    if (r.length) return r;
  }
  return parseLineCompras(text);
}

function hasCSVStructure(text) {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return false;
  const sep = lines[0].includes(';') ? ';' : ',';
  const c0 = lines[0].split(sep).length;
  const c1 = lines[1].split(sep).length;
  return c0 >= 2 && c0 === c1;
}

/* ---- OFX parser ---- */
function parseOFX(text) {
  const items = [];
  const re = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    const b = m[1];
    const amt = tagVal(b, 'TRNAMT');
    if (!amt) continue;
    let valor = parseFloat(amt.replace(',', '.'));
    const tipo = valor >= 0 ? 'entrada' : 'saida';
    const desc = tagVal(b, 'MEMO') || tagVal(b, 'NAME') || 'Transação importada';
    const ds = tagVal(b, 'DTPOSTED') || '';
    const data = ds.length >= 8 ? `${ds.slice(0,4)}-${ds.slice(4,6)}-${ds.slice(6,8)}` : todayStr();
    items.push({ tipo, descricao: cleanDesc(desc), valor: Math.abs(valor), data, categoria: catTx(desc) });
  }
  return items;
}

function tagVal(block, tag) {
  const openTag = '<' + tag + '>';
  const idx = block.toUpperCase().indexOf(openTag.toUpperCase());
  if (idx < 0) return null;
  const start = idx + openTag.length;
  const endLt = block.indexOf('<', start);
  const endNl = block.indexOf('\n', start);
  const stop = Math.min(endLt >= 0 ? endLt : Infinity, endNl >= 0 ? endNl : Infinity);
  return stop < Infinity ? block.substring(start, stop).trim() : block.substring(start).trim();
}

/* ---- CSV parsers ---- */
function detectSep(line) { return line.includes(';') ? ';' : ','; }

function parseCSVExtrato(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const sep = detectSep(lines[0]);
  const hdr = lines[0].split(sep).map(h => h.replace(/"/g, '').trim().toLowerCase());
  const iDate = hdr.findIndex(h => /data|date/.test(h));
  const iDesc = hdr.findIndex(h => /descri|hist[oó]|lan[cç]|memo|name/.test(h));
  const iVal  = hdr.findIndex(h => /valor|value|amount|quantia/.test(h));
  if (iDate < 0 || iVal < 0) return [];
  const items = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map(c => c.replace(/"/g, '').trim());
    const v = parseBRValue(cols[iVal]);
    if (v === null) continue;
    const desc = iDesc >= 0 ? cols[iDesc] : 'Transação importada';
    items.push({
      tipo: v >= 0 ? 'entrada' : 'saida',
      descricao: cleanDesc(desc), valor: Math.abs(v),
      data: parseDateFlex(cols[iDate]), categoria: catTx(desc)
    });
  }
  return items;
}

function parseCSVCompras(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const sep = detectSep(lines[0]);
  const hdr = lines[0].split(sep).map(h => h.replace(/"/g, '').trim().toLowerCase());
  const iDate = hdr.findIndex(h => /data|date/.test(h));
  const iDesc = hdr.findIndex(h => /descri|hist|estabelec|loja|memo/.test(h));
  const iVal  = hdr.findIndex(h => /valor|value|amount/.test(h));
  const iParc = hdr.findIndex(h => /parcela|installment/.test(h));
  if (iDate < 0 || iVal < 0) return [];
  const items = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map(c => c.replace(/"/g, '').trim());
    const v = parseBRValue(cols[iVal]);
    if (v === null) continue;
    const desc = iDesc >= 0 ? cols[iDesc] : 'Compra importada';
    let parcelas = 1;
    if (iParc >= 0) {
      const pm = cols[iParc].match(/(\d+)/);
      if (pm) parcelas = parseInt(pm[1]) || 1;
    }
    const vt = Math.abs(v);
    items.push({
      descricao: cleanDesc(desc), valorTotal: vt,
      parcelas, valorParcela: parcelas > 0 ? round2(vt / parcelas) : vt,
      data: parseDateFlex(cols[iDate]), categoria: catPurchase(desc)
    });
  }
  return items;
}

/* ---- Line-by-line parsers ---- */
function parseLineExtrato(text) {
  const items = [];
  const lines = text.split('\n');
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.length < 8) continue;
    const dm = line.match(/(\d{2}\/\d{2}(?:\/\d{2,4})?)/);
    if (!dm) continue;
    const vals = [...line.matchAll(/[-+]?\s*(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/g)];
    if (vals.length === 0) continue;
    const vm = vals[vals.length - 1];
    const vStr = vm[0];
    const v = parseBRValue(vStr);
    if (v === null || v === 0) continue;

    const dateEnd = line.indexOf(dm[0]) + dm[0].length;
    const valStart = line.lastIndexOf(vm[0]);
    let desc = line.substring(dateEnd, valStart).replace(/^[\s\-\|:]+/, '').replace(/[\s\-\|:]+$/, '').trim();
    if (!desc) desc = 'Transação importada';

    let tipo = 'saida';
    const after = line.substring(valStart).toUpperCase();
    if (vStr.includes('+') || after.includes(' C') || /RECEB|CR[ÉE]D|DEP[ÓO]S/.test(line.toUpperCase())) tipo = 'entrada';
    if (vStr.startsWith('-') || /D[ÉE]B/.test(after)) tipo = 'saida';
    if (v < 0) tipo = 'saida';
    if (v > 0 && !vStr.includes('-')) {
      const upper = line.toUpperCase();
      if (/RECEB|ENTRADA|CR[ÉE]DITO|DEP[ÓO]SITO|RENDIMENTO/.test(upper)) tipo = 'entrada';
    }

    items.push({
      tipo, descricao: cleanDesc(desc), valor: Math.abs(v),
      data: parseDateFlex(dm[1]), categoria: catTx(desc)
    });
  }
  return items;
}

function parseLineCompras(text) {
  const items = [];
  const lines = text.split('\n');
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.length < 8) continue;
    const dm = line.match(/(\d{2}\/\d{2}(?:\/\d{2,4})?)/);
    if (!dm) continue;
    const vals = [...line.matchAll(/(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/g)];
    if (vals.length === 0) continue;
    const vm = vals[vals.length - 1];
    const v = parseBRValue(vm[0]);
    if (v === null || v === 0) continue;

    const dateEnd = line.indexOf(dm[0]) + dm[0].length;
    const valStart = line.lastIndexOf(vm[0]);
    let desc = line.substring(dateEnd, valStart).replace(/^[\s\-\|:]+/, '').replace(/[\s\-\|:]+$/, '').trim();
    if (!desc) desc = 'Compra importada';

    let parcelas = 1;
    const pm = desc.match(/(?:PARC(?:ELA)?\.?\s*)?(\d{1,2})\s*[\/de]\s*(\d{1,2})/i);
    if (pm) {
      parcelas = parseInt(pm[2]) || 1;
      desc = desc.replace(pm[0], '').trim();
    }

    const vt = Math.abs(v);
    items.push({
      descricao: cleanDesc(desc), valorTotal: vt,
      parcelas, valorParcela: parcelas > 0 ? round2(vt / parcelas) : vt,
      data: parseDateFlex(dm[1]), categoria: catPurchase(desc)
    });
  }
  return items;
}

/* ---- Helpers ---- */
function parseBRValue(s) {
  if (!s) return null;
  const clean = s.replace(/[R$\s]/g, '');
  const neg = clean.includes('-');
  const num = parseFloat(clean.replace(/[+\-]/g, '').replace(/\./g, '').replace(',', '.'));
  return isNaN(num) ? null : (neg ? -num : num);
}

function parseDateFlex(s) {
  if (!s) return todayStr();
  const p = s.split('/');
  const day = p[0] || '01';
  const month = p[1] || '01';
  let year = p[2];
  if (!year) year = String(new Date().getFullYear());
  else if (year.length === 2) year = '20' + year;
  return `${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`;
}

function round2(n) { return Math.round(n * 100) / 100; }

function cleanDesc(s) {
  s = (s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 500);
  return s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function catTx(desc) {
  const u = (desc || '').toUpperCase();
  if (/PIX|TED|DOC|TRANSF/.test(u)) return 'Transferência';
  if (/SAL[ÁA]RIO/.test(u)) return 'Salário';
  if (/ALUGU[EÉ]L/.test(u)) return 'Aluguel';
  if (/LUZ|ENERG|CEMIG|ENEL|CPFL/.test(u)) return 'Luz';
  if (/[ÁA]GUA|SABESP|SANEA/.test(u)) return 'Água';
  if (/INTERNET|TELEFON|CLARO|VIVO|TIM|OI\b/.test(u)) return 'Internet';
  if (/INVEST|CDB|TESOURO|RENDA FIXA|LCI|LCA/.test(u)) return 'Investimentos';
  if (/RENDIMENTO|JUROS/.test(u)) return 'Rendimentos';
  if (/IMPOSTO|DAS\b|DARF|IPTU|IPVA|ISS\b/.test(u)) return 'Impostos';
  if (/FORNEC/.test(u)) return 'Fornecedores';
  return 'Outros';
}

function catPurchase(desc) {
  const u = (desc || '').toUpperCase();
  if (/MERCADO|SUPERM|EXTRA\b|CARREFOUR|P[ÃA]O|PADARIA|HORTIFRUTI/.test(u)) return 'Alimentação';
  if (/RESTAUR|OUTBACK|IFOOD|UBER\s*EATS|LANCHON|BURGER|PIZZA|SUSHI|MC\s*DON/.test(u)) return 'Alimentação';
  if (/AMAZON|MERCADO\s*LIVRE|MAGALU|AMERICANAS|KABUM|SHOPEE|ALIEXPRESS/.test(u)) return 'Eletrônicos';
  if (/SPOTIFY|NETFLIX|DISNEY|HBO|YOUTUBE|APPLE|GOOGLE\s*ONE|PRIME\s*VIDEO/.test(u)) return 'Assinatura';
  if (/FARM[ÁA]CIA|DROGA|RAIA|PANVEL/.test(u)) return 'Saúde';
  if (/POSTO|SHELL|IPIRANGA|UBER\b|99\b|COMBUST|ESTACION/.test(u)) return 'Transporte';
  if (/T[ÊE]NIS|NIKE|ADIDAS|ZARA|RENNER|C&A|RIACHUELO|SHEIN|HERING/.test(u)) return 'Vestuário';
  if (/GELADEIRA|FOG[ÃA]O|M[ÁA]QUINA|ELETRO|BRASTEMP|ELECTROLUX/.test(u)) return 'Eletrodomésticos';
  if (/VIAGEM|PASSAGEM|HOTEL|BOOKING|AIRBNB|LATAM|GOL\b|AZUL\b/.test(u)) return 'Viagem';
  return 'Outros';
}

// ── THEME ─────────────────────────────────────────────────────
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('findash_theme', next);
  document.getElementById('themeIcon').textContent = next === 'light' ? '🌙' : '☀️';
}

// ── INIT ──────────────────────────────────────────────────────
async function init() {
  // Load theme
  const savedTheme = localStorage.getItem('findash_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  document.getElementById('themeIcon').textContent = savedTheme === 'light' ? '🌙' : '☀️';

  // Listen for password recovery redirect
  _sb.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      showResetPasswordScreen();
    }
    if (event === 'SIGNED_OUT') {
      profile = { nome: '', email: '', telefone: '', empresa: '' };
      state = buildEmptyState();
      localStorage.removeItem(PROFILE_KEY);
      localStorage.removeItem(STORAGE_KEY);
      showLoginScreen();
    }
    if (event === 'TOKEN_REFRESHED') {
      debouncedCloudSave();
    }
  });

  // Check Supabase session
  const { data: { session } } = await _sb.auth.getSession();
  if (!session) {
    showLoginScreen();
    return;
  }

  // Has session — load from cloud, fallback to local
  const loaded = await loadFromCloud();
  if (!loaded) {
    loadProfile();
    loadState();
  }
  updateHeaderProfile();
  startDashboard();
}

init();
