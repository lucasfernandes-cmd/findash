/* ============================================================
   FINDASH — Financial Dashboard
   ============================================================ */

// ── SUPABASE ────────────────────────────────────────────────
const SUPABASE_URL = 'https://qnqcmrpkveprkvzecvwf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucWNtcnBrdmVwcmt2emVjdndmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNjY1MzMsImV4cCI6MjA4ODk0MjUzM30.tpaqSpUpqTOenkZhQfGwSQNH3a4dArYxbFRqnDLVG8c';
const _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ── GEMINI AI (OCR) ─────────────────────────────────────────
const GEMINI_API_KEY = 'AIzaSyADXc02tfF91hr-0yST9zIFnHB_7rI6sjY';

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
    if (data.theme && (data.theme === 'light' || data.theme === 'dark')) {
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
  'Mercado': '🛒',
};

// Categorias curadas por modo (para orçamento)
const BUDGET_CATS_EMPRESA = [
  'Aluguel','Contas e Utilidades','Salários','Fornecedores','Impostos',
  'Marketing','Software','Logística','Serviços Profissionais',
  'Material de Escritório','Treinamento','Viagem','Manutenção','Outros'
];
const BUDGET_CATS_PESSOAL = [
  'Alimentação','Mercado','Moradia','Transporte','Contas Residenciais','Saúde',
  'Educação','Lazer','Vestuário','Beleza','Pets',
  'Assinatura','Presentes','Delivery','Outros'
];
// Ícones extras para categorias de orçamento
const BUDGET_EXTRA_ICONS = {
  'Contas e Utilidades': '💡', 'Logística': '🚚', 'Serviços Profissionais': '📋',
  'Material de Escritório': '📎', 'Treinamento': '🎓', 'Manutenção': '🔧',
  'Contas Residenciais': '💡', 'Presentes': '🎁',
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

// ── PASSWORD TOGGLE ──────────────────────────────────────────
function pwdInputHtml(id, placeholder) {
  return `<div class="pwd-input-wrap"><input class="form-input" id="${id}" type="password" placeholder="${placeholder}"><button type="button" class="pwd-toggle" onclick="togglePasswordVisibility('${id}')">👁️</button></div>`;
}
function togglePasswordVisibility(inputId) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  const btn = inp.parentElement.querySelector('.pwd-toggle');
  if (inp.type === 'password') {
    inp.type = 'text';
    if (btn) btn.textContent = '🙈';
  } else {
    inp.type = 'password';
    if (btn) btn.textContent = '👁️';
  }
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
              ${pwdInputHtml('login_senha', 'Sua senha')}
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
    redirectTo: window.location.origin + '/'
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
              ${pwdInputHtml('reset_senha', 'Mínimo 8 caracteres')}
            </div>
          </div>
          <div class="form-row single">
            <div class="form-group">
              <label class="form-label">Confirmar senha</label>
              ${pwdInputHtml('reset_senha2', 'Repita a nova senha')}
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
    // Clean recovery hash from URL
    if (window.location.hash) history.replaceState(null, '', window.location.pathname);
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
              ${pwdInputHtml('reg_senha', 'Mínimo 8 caracteres')}
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

function handleResetFinancialData() {
  closeModal();
  showConfirm(
    '⚠️ Zerar dados financeiros',
    'Isso apagará TODAS as transações, compras, contas a pagar, dívidas e valores a receber do modo atual (' + state.activeMode + '). Bancos e cartões serão mantidos.',
    'Sim, apagar tudo',
    () => {
      // Second confirmation
      showConfirm(
        '🔴 Confirmar exclusão',
        'Tem CERTEZA? Esta ação não pode ser desfeita.',
        'Confirmar exclusão',
        () => {
          const mode = state.activeMode;
          state[mode].contasPagar = [];
          state[mode].dividas = [];
          state[mode].aReceber = [];
          state[mode].transacoes = [];
          state[mode].compras = [];
          // Reset saldo dos bancos para zero
          state[mode].bancos.forEach(b => b.saldo = 0);
          // Reset usado dos cartões para zero
          state[mode].cartoes.forEach(c => c.usado = 0);
          saveState();
          render();
        },
        'Bancos e cartões serão mantidos. Saldos serão zerados.'
      );
    },
    'Apenas o modo "' + (state.activeMode === 'empresa' ? 'Empresa' : 'Pessoal') + '" será afetado.'
  );
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
  _activeTab = 'home';
  if (!state) loadState();
  const now = new Date();
  document.getElementById('currentDate').textContent =
    now.toLocaleDateString('pt-BR', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });
  // Reset tab bar UI
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const homeBtn = document.getElementById('tabHome');
  if (homeBtn) homeBtn.classList.add('active');
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

// ── MONEY INPUT HELPERS ──────────────────────────────────────
function fmtMoney(n) {
  return Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseMoney(str) {
  if (!str) return 0;
  const clean = String(str).replace(/[^\d,.\-]/g, '').replace(/\./g, '').replace(',', '.');
  return parseFloat(clean) || 0;
}

function handleMoneyInput(el) {
  let raw = el.value.replace(/[^\d]/g, '');
  if (!raw) { el.value = ''; return; }
  // Remove leading zeros extras
  raw = raw.replace(/^0+(\d)/, '$1');
  const num = parseInt(raw, 10) / 100;
  el.value = num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function moneyInput(id, value, placeholder) {
  const formatted = value ? fmtMoney(value) : '';
  return `<input class="form-input" id="${id}" type="text" inputmode="decimal" data-monetary="true" value="${formatted}" placeholder="${placeholder || '0,00'}" oninput="handleMoneyInput(this)" autocomplete="off">`;
}

// ── TOAST NOTIFICATIONS ──────────────────────────────────────
function showToast(msg, type) {
  type = type || 'error';
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.textContent = msg;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ── CUSTOM PROMPT MODAL ──────────────────────────────────────
let _promptCallback = null;

function showPrompt(title, msg, defaultValue, callback, btnText) {
  _promptCallback = callback;
  document.getElementById('promptTitle').textContent = title;
  document.getElementById('promptMsg').textContent = msg;
  const input = document.getElementById('promptInput');
  input.value = defaultValue ? fmtMoney(defaultValue) : '';
  document.getElementById('promptBtn').textContent = btnText || 'Salvar';
  document.getElementById('promptOverlay').classList.remove('hidden');
  setTimeout(() => input.focus(), 100);
}

function closePrompt() {
  document.getElementById('promptOverlay').classList.add('hidden');
  _promptCallback = null;
}

function handlePromptOverlayClick(e) {
  if (e.target === document.getElementById('promptOverlay')) closePrompt();
}

function execPrompt() {
  const input = document.getElementById('promptInput');
  const valor = parseMoney(input.value);
  if (_promptCallback) {
    _promptCallback(valor);
  }
  closePrompt();
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
  const VALID = { pendente: 'Pendente', pago: 'Pago', recebido: 'Recebido', atrasado: 'Atrasado' };
  const safe = VALID[status] ? status : 'pendente';
  return `<span class="badge badge-${safe}">${VALID[safe]}</span>`;
}

function catIcon(cat) {
  const custom = (typeof activeData === 'function' ? activeData() : {}).customCategories || [];
  const c = custom.find(x => x.nome === cat);
  if (c) return c.emoji;
  return CATEGORIA_ICONS[cat] || BUDGET_EXTRA_ICONS[cat] || '📌';
}
function getCustomCategories() {
  return (typeof activeData === 'function' ? activeData() : {}).customCategories || [];
}
function getBudgetCategories() {
  const base = state.activeMode === 'empresa' ? BUDGET_CATS_EMPRESA : BUDGET_CATS_PESSOAL;
  const custom = getCustomCategories().map(c => c.nome);
  const withoutOutros = base.filter(c => c !== 'Outros');
  return [...withoutOutros, ...custom, 'Outros'];
}
function getFormCategories(baseList) {
  const custom = getCustomCategories().map(c => c.nome);
  const withoutOutros = baseList.filter(c => c !== 'Outros');
  return [...withoutOutros, ...custom, 'Outros'];
}
function gradCss(id)  { return GRAD_MAP[id] || GRADIENTS[0].css; }
function bankColor(name) { return BANK_COLORS[name] || '#6366f1'; }
function bankEmoji(name) { return BANK_EMOJIS[name] || '🏦'; }

function initials(name) {
  return (name || '?').split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();
}

// ── EMPTY STATE (used for new accounts) ──────────────────────
const STATE_COLLECTIONS = ['bancos','cartoes','contasPagar','dividas','aReceber','transacoes','compras','metas','orcamentos','customCategories'];

const META_TEMPLATES = [
  { tipo: 'economizar',    icon: '💰', titulo: 'Economizar valor',   desc: 'Guardar uma quantia específica até uma data' },
  { tipo: 'reduzir_gasto', icon: '📉', titulo: 'Reduzir gastos',     desc: 'Diminuir gastos em uma categoria' },
  { tipo: 'quitar_divida', icon: '🔗', titulo: 'Quitar dívida',      desc: 'Zerar uma dívida existente' },
  { tipo: 'sobra_mensal',  icon: '📊', titulo: 'Sobra mensal',       desc: 'Gastar menos do que recebe no mês' },
  { tipo: 'custom',        icon: '✏️', titulo: 'Meta personalizada', desc: 'Crie uma meta do seu jeito' },
];

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

// ── TAB NAVIGATION ──────────────────────────────────────────
let _activeTab = 'home';

function setTab(tab) {
  _activeTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const id = 'tab' + tab.charAt(0).toUpperCase() + tab.slice(1);
  const btn = document.getElementById(id);
  if (btn) btn.classList.add('active');
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleNovoMenu() {
  document.getElementById('novoMenuOverlay')?.classList.toggle('hidden');
}
function closeNovoMenu() {
  document.getElementById('novoMenuOverlay')?.classList.add('hidden');
}

// ── MODE DROPDOWN ───────────────────────────────────────────
function toggleModeDropdown() {
  const menu = document.getElementById('modeDropdownMenu');
  const dd = document.getElementById('modeDropdown');
  menu?.classList.toggle('hidden');
  dd?.classList.toggle('open');
}
function closeModeDropdown() {
  document.getElementById('modeDropdownMenu')?.classList.add('hidden');
  document.getElementById('modeDropdown')?.classList.remove('open');
}
document.addEventListener('click', (e) => {
  const dd = document.getElementById('modeDropdown');
  if (dd && !dd.contains(e.target)) closeModeDropdown();
});

function setMode(mode) {
  state.activeMode = mode;
  // Update dropdown display
  const icon = mode === 'empresa' ? '🏢' : '👤';
  const label = mode === 'empresa' ? 'Empresa' : 'Pessoal';
  const ddIcon = document.getElementById('modeDdIcon');
  const ddLabel = document.getElementById('modeDdLabel');
  if (ddIcon) ddIcon.textContent = icon;
  if (ddLabel) ddLabel.textContent = label;
  document.getElementById('ddOptEmpresa')?.classList.toggle('active', mode === 'empresa');
  document.getElementById('ddOptPessoal')?.classList.toggle('active', mode === 'pessoal');
  closeModeDropdown();
  saveState();
  render();
}

// ── RENDER ───────────────────────────────────────────────────
function render() {
  const summary = document.getElementById('summarySection');
  if (_activeTab === 'home') {
    if (summary) summary.style.display = '';
    renderSummary();
    renderHomeTab();
  } else if (_activeTab === 'gastos') {
    if (summary) summary.style.display = 'none';
    renderGastosTab();
  } else if (_activeTab === 'metas') {
    if (summary) summary.style.display = 'none';
    renderMetasTab();
  } else {
    if (summary) summary.style.display = 'none';
    renderPlaceholderTab(_activeTab);
  }
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

// ── TAB RENDERERS ────────────────────────────────────────────
function renderHomeTab() {
  const d = activeData();
  document.getElementById('dashboardContent').innerHTML = `
    ${renderBancosSection(d)}
    ${renderCartoesSection(d)}
    <div class="three-col-grid">
      ${renderContasPanel(d)}
      ${renderDividasPanel(d)}
      ${renderAReceberPanel(d)}
    </div>
  `;
}

function renderGastosTab() {
  const d = activeData();
  document.getElementById('dashboardContent').innerHTML = renderCategoriasSection(d);
}

function renderPlaceholderTab(tab) {
  const info = {
    metas: { icon: '🎯', title: 'Metas Financeiras', desc: 'Defina objetivos e acompanhe seu progresso financeiro.' },
    ia:    { icon: '🤖', title: 'Assistente IA',      desc: 'Análises inteligentes e insights sobre suas finanças.' }
  }[tab] || { icon: '🔮', title: 'Em breve', desc: '' };
  document.getElementById('dashboardContent').innerHTML = `
    <div class="placeholder-tab">
      <div class="placeholder-icon">${info.icon}</div>
      <h2 class="placeholder-title">${info.title}</h2>
      <p class="placeholder-desc">${info.desc}</p>
      <div class="placeholder-badge">Em breve</div>
    </div>
  `;
}

// Backward-compatible alias
function renderDashboard() { renderHomeTab(); }

// ── METAS FINANCEIRAS ────────────────────────────────────────

function gastoMesCategoria(categoria) {
  const d = activeData();
  const from = monthStart();
  const to = todayStr();
  let total = 0;
  d.contasPagar.filter(c => inDateRange(c.vencimento, from, to) && (c.categoria || 'Outros') === categoria)
    .forEach(c => { total += (c.valor || 0); });
  (d.transacoes || []).filter(t => t.tipo === 'saida' && inDateRange(t.data, from, to) && (t.categoria || 'Outros') === categoria)
    .forEach(t => { total += (t.valor || 0); });
  (d.compras || []).filter(c => inDateRange(c.data, from, to) && (c.categoria || 'Outros') === categoria)
    .forEach(c => { total += (c.valorTotal || 0); });
  return total;
}

// ── ORÇAMENTOS POR CATEGORIA ─────────────────────────────────

function getOrcamento(categoria) {
  const d = activeData();
  const orc = (d.orcamentos || []).find(o => o.categoria === categoria);
  return orc ? orc.limite : null;
}

function setOrcamento(categoria, valor) {
  const d = activeData();
  if (!d.orcamentos) d.orcamentos = [];
  const idx = d.orcamentos.findIndex(o => o.categoria === categoria);
  if (valor > 0) {
    if (idx >= 0) {
      d.orcamentos[idx].limite = valor;
    } else {
      d.orcamentos.push({ id: uid(), categoria, limite: valor });
    }
  } else {
    if (idx >= 0) d.orcamentos.splice(idx, 1);
  }
  saveState();
}

function toggleBudgetPicker() {
  const picker = document.getElementById('budgetPicker');
  const backdrop = document.getElementById('budgetBackdrop');
  if (!picker) return;
  const isHidden = picker.classList.contains('hidden');
  picker.classList.toggle('hidden');
  if (backdrop) backdrop.classList.toggle('hidden');
  if (isHidden) {
    picker.scrollTop = 0;
  }
}
function closeBudgetPicker() {
  const picker = document.getElementById('budgetPicker');
  const backdrop = document.getElementById('budgetBackdrop');
  if (picker) picker.classList.add('hidden');
  if (backdrop) backdrop.classList.add('hidden');
}
function openCustomCategoryModal() {
  openModal('customCategoria', state.activeMode);
}
function selectEmoji(el, emoji) {
  document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('f_catEmoji').value = emoji;
}

function promptOrcamento(categoria) {
  const atual = getOrcamento(categoria);
  showPrompt(
    `Limite: ${categoria}`,
    'Defina o limite mensal (0 para remover)',
    atual,
    (valor) => {
      if (valor < 0) return showToast('Valor inválido.');
      setOrcamento(categoria, valor);
      if (_activeTab === 'gastos') renderGastosTab();
    }
  );
}

function buildBudgetSummary() {
  const d = activeData();
  const orcamentos = d.orcamentos || [];
  if (orcamentos.length === 0) return '';

  const from = _catDateFrom || monthStart();
  const to = _catDateTo || todayStr();

  // Build cat spending map (same logic as buildCatGrid)
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

  let totalGasto = 0, totalLimite = 0, acima = 0, dentro = 0;
  orcamentos.forEach(o => {
    const gasto = catMap[o.categoria] || 0;
    totalGasto += gasto;
    totalLimite += o.limite;
    if (gasto > o.limite) acima++;
    else dentro++;
  });

  const pct = totalLimite > 0 ? Math.round((totalGasto / totalLimite) * 100) : 0;
  let barClass = 'budget-verde';
  if (pct >= 100) barClass = 'budget-vermelho';
  else if (pct >= 70) barClass = 'budget-amarelo';

  const barWidth = Math.min(pct, 100);

  return `
    <div class="budget-summary">
      <div class="budget-summary-header">
        <div class="budget-summary-title">💰 Orçamento mensal</div>
        <div class="budget-summary-total">${pct}%</div>
      </div>
      <div class="budget-summary-values">${fmt(totalGasto)} / ${fmt(totalLimite)}</div>
      <div class="budget-summary-bar">
        <div class="budget-summary-fill ${barClass}" style="width:${barWidth}%"></div>
      </div>
      <div class="budget-summary-stats">
        ${dentro > 0 ? `<span class="budget-stat-ok">✅ ${dentro} dentro do limite</span>` : ''}
        ${acima > 0 ? `<span class="budget-stat-warn">⚠️ ${acima} acima</span>` : ''}
      </div>
    </div>
  `;
}

function calcMetaProgress(meta) {
  const d = activeData();
  let atual = 0, alvo = meta.valorMeta || 0;

  if (meta.concluida) {
    return { atual: alvo, alvo, pct: 100, status: 'concluida' };
  }

  if (meta.tipo === 'economizar' || meta.tipo === 'custom') {
    atual = meta.valorAtual || 0;
  } else if (meta.tipo === 'reduzir_gasto') {
    const gasto = gastoMesCategoria(meta.categoria);
    // Invertido: menos gasto = melhor. pct = quanto falta p/ atingir o limite
    // Se alvo=1000 e gastou 600 => 40% do orçamento ainda livre => progresso = 40%
    // Se alvo=1000 e gastou 300 => 70% livre => progresso = 70%
    const pctUsado = alvo > 0 ? Math.min(gasto / alvo, 1) : 1;
    const pct = Math.max(0, (1 - pctUsado)) * 100;
    const prazoVencido = meta.prazo && meta.prazo < todayStr();
    let status = 'verde';
    if (pct < 40 || prazoVencido) status = 'vermelho';
    else if (pct < 70) status = 'amarelo';
    return { atual: gasto, alvo, pct: Math.round(pct), status, invertido: true };
  } else if (meta.tipo === 'quitar_divida') {
    const divida = d.dividas.find(dv => dv.id === meta.dividaId);
    if (divida) {
      atual = divida.valorPago || 0;
      alvo = divida.valorTotal || alvo;
    } else {
      atual = meta.valorAtual || 0;
    }
  } else if (meta.tipo === 'sobra_mensal') {
    const from = monthStart(), to = todayStr();
    // Receitas: transacoes tipo entrada
    const recebido = (d.transacoes || [])
      .filter(t => t.tipo === 'entrada' && inDateRange(t.data, from, to))
      .reduce((s, t) => s + (t.valor || 0), 0);
    // Recebidos (aReceber marcados como recebido no mês)
    const recebidos2 = (d.aReceber || [])
      .filter(r => r.status === 'recebido' && inDateRange(r.vencimento, from, to))
      .reduce((s, r) => s + (r.valor || 0), 0);
    // Gastos mês
    let gastoMes = 0;
    d.contasPagar.filter(c => inDateRange(c.vencimento, from, to))
      .forEach(c => { gastoMes += (c.valor || 0); });
    (d.transacoes || []).filter(t => t.tipo === 'saida' && inDateRange(t.data, from, to))
      .forEach(t => { gastoMes += (t.valor || 0); });
    (d.compras || []).filter(c => inDateRange(c.data, from, to))
      .forEach(c => { gastoMes += (c.valorTotal || 0); });
    atual = Math.max(0, (recebido + recebidos2) - gastoMes);
  }

  const pct = alvo > 0 ? Math.min(Math.round((atual / alvo) * 100), 100) : 0;
  const prazoVencido = meta.prazo && meta.prazo < todayStr();
  let status = 'verde';
  if (pct < 40 || prazoVencido) status = 'vermelho';
  else if (pct < 70) status = 'amarelo';
  return { atual, alvo, pct, status };
}

function metaTemplateIcon(tipo) {
  const t = META_TEMPLATES.find(m => m.tipo === tipo);
  return t ? t.icon : '🎯';
}

function renderMetasTab() {
  const d = activeData();
  const metas = d.metas || [];

  if (metas.length === 0) {
    // Welcome screen with templates
    const templateCards = META_TEMPLATES.map(t => `
      <div class="meta-template-card" onclick="openMetaFromTemplate('${t.tipo}')">
        <div class="meta-template-icon">${t.icon}</div>
        <div class="meta-template-title">${esc(t.titulo)}</div>
        <div class="meta-template-desc">${esc(t.desc)}</div>
      </div>
    `).join('');

    document.getElementById('dashboardContent').innerHTML = `
      <div class="metas-welcome">
        <div class="metas-welcome-icon">🎯</div>
        <h2 class="metas-welcome-title">Metas Financeiras</h2>
        <p class="metas-welcome-desc">Defina objetivos e acompanhe seu progresso. Escolha um tipo de meta para começar:</p>
        <div class="meta-templates-grid">${templateCards}</div>
      </div>
    `;
    return;
  }

  // Has metas — render cards
  const ativas = metas.filter(m => !m.concluida).length;
  const concluidas = metas.filter(m => m.concluida).length;

  const cards = metas.map(meta => {
    const prog = calcMetaProgress(meta);
    const icon = metaTemplateIcon(meta.tipo);
    const statusLabel = meta.concluida ? 'Concluída' :
      prog.status === 'verde' ? 'No caminho' :
      prog.status === 'amarelo' ? 'Atenção' : 'Em risco';
    const badgeClass = meta.concluida ? 'concluida' : prog.status;

    let infoLine = '';
    if (meta.tipo === 'reduzir_gasto') {
      infoLine = `${fmt(prog.atual)} gastos / ${fmt(prog.alvo)} limite`;
    } else {
      infoLine = `${fmt(prog.atual)} / ${fmt(prog.alvo)}`;
    }

    let prazoHtml = '';
    if (meta.prazo) {
      const prazoDate = new Date(meta.prazo + 'T00:00:00');
      const prazoFormatted = prazoDate.toLocaleDateString('pt-BR');
      const vencido = meta.prazo < todayStr() && !meta.concluida;
      prazoHtml = `<span class="meta-prazo ${vencido ? 'vencido' : ''}">
        ${vencido ? '⚠️ Vencido:' : '📅 Prazo:'} ${prazoFormatted}
      </span>`;
    }

    const catInfo = meta.categoria ? `<span class="meta-cat-info">${catIcon(meta.categoria)} ${esc(meta.categoria)}</span>` : '';

    const canUpdateValor = ['economizar', 'custom'].includes(meta.tipo) && !meta.concluida;

    return `
      <div class="meta-card ${meta.concluida ? 'concluida' : ''}">
        <div class="meta-card-header">
          <div class="meta-card-icon">${icon}</div>
          <div class="meta-card-title">${esc(meta.titulo)}</div>
          <span class="meta-card-badge ${badgeClass}">${statusLabel}</span>
        </div>
        ${meta.descricao ? `<div class="meta-card-desc">${esc(meta.descricao)}</div>` : ''}
        ${catInfo}
        <div class="meta-progress">
          <div class="meta-progress-bar">
            <div class="meta-progress-fill ${badgeClass}" style="width:${prog.pct}%"></div>
          </div>
          <div class="meta-progress-info">
            <span>${infoLine}</span>
            <span class="meta-progress-pct">${prog.pct}%</span>
          </div>
        </div>
        <div class="meta-card-footer">
          ${prazoHtml}
          <div class="meta-card-actions">
            ${canUpdateValor ? `<button class="icon-btn" onclick="promptUpdateMetaValor('${meta.id}')" title="Atualizar valor">💵</button>` : ''}
            ${!meta.concluida ? `<button class="icon-btn" onclick="toggleMetaConcluida('${meta.id}')" title="Marcar como concluída">✅</button>` : `<button class="icon-btn" onclick="toggleMetaConcluida('${meta.id}')" title="Reabrir meta">🔄</button>`}
            <button class="icon-btn" onclick="editMeta('${meta.id}')" title="Editar">✏️</button>
            <button class="icon-btn" onclick="deleteMeta('${meta.id}')" title="Excluir">🗑️</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Template grid for adding new
  const miniTemplates = META_TEMPLATES.map(t => `
    <div class="meta-template-card mini" onclick="openMetaFromTemplate('${t.tipo}')">
      <div class="meta-template-icon">${t.icon}</div>
      <div class="meta-template-title">${esc(t.titulo)}</div>
    </div>
  `).join('');

  document.getElementById('dashboardContent').innerHTML = `
    <div class="section-block">
      <div class="metas-header">
        <div class="metas-header-info">
          <div class="section-title"><div class="icon">🎯</div> Metas</div>
          <span class="metas-header-count">${ativas} ativa${ativas !== 1 ? 's' : ''}${concluidas > 0 ? ` · ${concluidas} concluída${concluidas !== 1 ? 's' : ''}` : ''}</span>
        </div>
        <button class="btn btn-primary btn-sm" onclick="openMetaTemplateChooser()">+ Nova Meta</button>
      </div>
      <div class="metas-list">${cards}</div>
      ${metas.length < 10 ? `
        <div class="metas-add-section">
          <p class="metas-add-label">Adicionar nova meta:</p>
          <div class="meta-templates-grid compact">${miniTemplates}</div>
        </div>
      ` : ''}
    </div>
  `;
}

// ── METAS: AÇÕES ─────────────────────────────────────────────

function openMetaFromTemplate(tipo) {
  _modalType = 'meta';
  _modalSection = state.activeMode;
  _modalEditId = null;
  document.getElementById('modalTitle').textContent = 'Nova Meta';
  document.getElementById('modalBody').innerHTML = buildMetaForm({ tipo }, false);
  document.getElementById('modalOverlay').classList.remove('hidden');
}

function openMetaTemplateChooser() {
  _modalType = 'meta_chooser';
  _modalSection = state.activeMode;
  _modalEditId = null;
  document.getElementById('modalTitle').textContent = 'Nova Meta';
  const templateCards = META_TEMPLATES.map(t => `
    <div class="meta-template-card" onclick="selectMetaTemplateInModal('${t.tipo}')">
      <div class="meta-template-icon">${t.icon}</div>
      <div class="meta-template-title">${esc(t.titulo)}</div>
      <div class="meta-template-desc">${esc(t.desc)}</div>
    </div>
  `).join('');
  document.getElementById('modalBody').innerHTML = `
    <p style="margin-bottom:12px;color:var(--text-dim);font-size:14px;">Escolha o tipo de meta:</p>
    <div class="meta-templates-grid">${templateCards}</div>
  `;
  document.getElementById('modalFooter').querySelector('.btn-primary').style.display = 'none';
  document.getElementById('modalOverlay').classList.remove('hidden');
}

function selectMetaTemplateInModal(tipo) {
  _modalType = 'meta';
  document.getElementById('modalTitle').textContent = 'Nova Meta';
  document.getElementById('modalBody').innerHTML = buildMetaForm({ tipo }, false);
  document.getElementById('modalFooter').querySelector('.btn-primary').style.display = '';
}

function editMeta(id) {
  const meta = (activeData().metas || []).find(m => m.id === id);
  if (!meta) return;
  _modalType = 'meta';
  _modalSection = state.activeMode;
  _modalEditId = id;
  document.getElementById('modalTitle').textContent = 'Editar Meta';
  document.getElementById('modalBody').innerHTML = buildMetaForm(meta, true);
  document.getElementById('modalOverlay').classList.remove('hidden');
}

function deleteMeta(id) {
  const meta = (activeData().metas || []).find(m => m.id === id);
  if (!meta) return;
  showConfirm(
    'Excluir meta',
    `Deseja excluir a meta "${meta.titulo}"?`,
    'Excluir',
    () => {
      const arr = activeData().metas;
      const idx = arr.findIndex(m => m.id === id);
      if (idx >= 0) arr.splice(idx, 1);
      saveState();
      render();
    }
  );
}

function toggleMetaConcluida(id) {
  const meta = (activeData().metas || []).find(m => m.id === id);
  if (!meta) return;
  meta.concluida = !meta.concluida;
  saveState();
  render();
}

function promptUpdateMetaValor(id) {
  const meta = (activeData().metas || []).find(m => m.id === id);
  if (!meta) return;
  showPrompt(
    'Atualizar meta',
    `Valor atual de "${meta.titulo}":`,
    meta.valorAtual || 0,
    (valor) => {
      if (valor < 0) return showToast('Valor inválido.');
      meta.valorAtual = valor;
      if (valor >= (meta.valorMeta || 0)) meta.concluida = true;
      saveState();
      render();
    }
  );
}

function buildMetaForm(item, isEdit) {
  const v = item || {};
  const tipo = v.tipo || 'custom';
  const tmpl = META_TEMPLATES.find(t => t.tipo === tipo) || META_TEMPLATES[4];

  const d = activeData();
  const allCatsForMeta = getFormCategories(Object.keys(CATEGORIA_ICONS));
  const catOptions = allCatsForMeta.map(c =>
    `<option value="${escAttr(c)}" ${v.categoria === c ? 'selected' : ''}>${esc(c)}</option>`
  ).join('');

  const dividaOptions = (d.dividas || []).map(dv =>
    `<option value="${escAttr(dv.id)}" ${v.dividaId === dv.id ? 'selected' : ''}>${esc(dv.credor)} — ${fmt(dv.valorTotal)}</option>`
  ).join('');

  const showCategoria = tipo === 'reduzir_gasto';
  const showDivida = tipo === 'quitar_divida';
  const showValorAtual = ['economizar', 'custom'].includes(tipo) && isEdit;
  const showValorMeta = true;

  let tituloDefault = v.titulo || '';
  if (!isEdit && !v.titulo) {
    tituloDefault = tmpl.titulo;
  }

  return `
    <input type="hidden" id="f_tipo" value="${escAttr(tipo)}">
    <div class="form">
      <div class="meta-form-type-badge">
        <span>${tmpl.icon}</span> ${esc(tmpl.titulo)}
      </div>
      <div class="form-row single">
        <div class="form-group">
          <label class="form-label">Título da meta</label>
          <input class="form-input" id="f_titulo" placeholder="Ex: ${escAttr(tmpl.titulo)}" value="${escAttr(tituloDefault)}">
        </div>
      </div>
      <div class="form-row single">
        <div class="form-group">
          <label class="form-label">Descrição (opcional)</label>
          <input class="form-input" id="f_descricao" placeholder="Detalhes sobre a meta" value="${escAttr(v.descricao || '')}">
        </div>
      </div>
      ${showCategoria ? `
      <div class="form-row single">
        <div class="form-group">
          <label class="form-label">Categoria alvo</label>
          <select class="form-input" id="f_categoria">
            <option value="">Selecione...</option>
            ${catOptions}
          </select>
        </div>
      </div>
      ` : ''}
      ${showDivida ? `
      <div class="form-row single">
        <div class="form-group">
          <label class="form-label">Dívida</label>
          <select class="form-input" id="f_dividaId">
            <option value="">Selecione uma dívida...</option>
            ${dividaOptions}
          </select>
        </div>
      </div>
      ` : ''}
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">${tipo === 'reduzir_gasto' ? 'Limite mensal (R$)' : 'Valor da meta (R$)'}</label>
          ${moneyInput('f_valorMeta', v.valorMeta)}
        </div>
        <div class="form-group">
          <label class="form-label">Prazo</label>
          <input class="form-input" id="f_prazo" type="date" value="${escAttr(v.prazo || '')}">
        </div>
      </div>
      ${showValorAtual ? `
      <div class="form-row single">
        <div class="form-group">
          <label class="form-label">Valor atual (R$)</label>
          ${moneyInput('f_valorAtual', v.valorAtual)}
        </div>
      </div>
      ` : ''}
      ${isEdit ? `
      <div class="form-row single">
        <div class="form-group" style="display:flex;align-items:center;gap:8px;">
          <input type="checkbox" id="f_concluida" ${v.concluida ? 'checked' : ''}>
          <label class="form-label" for="f_concluida" style="margin:0;">Meta concluída</label>
        </div>
      </div>
      ` : ''}
    </div>
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
    ${buildBudgetSummary()}
    <div class="section-block">
      <div class="section-header">
        <div class="section-title">
          <div class="icon">📊</div>
          Gastos por Categoria
        </div>
        <div class="filter-bar">
          <input type="date" class="filter-date" value="${_catDateFrom}" onchange="_catDateFrom=this.value;renderGastosTab()">
          <span class="filter-sep">até</span>
          <input type="date" class="filter-date" value="${_catDateTo}" onchange="_catDateTo=this.value;renderGastosTab()">
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

  // Injetar categorias com orçamento que não tiveram gasto
  (d.orcamentos || []).forEach(o => {
    if (!(o.categoria in catMap)) catMap[o.categoria] = 0;
  });

  const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  const maxVal = sorted.length > 0 ? sorted[0][1] : 1;
  const totalGastos = sorted.reduce((s, [, v]) => s + v, 0);

  if (sorted.length === 0) {
    // Sem gastos e sem orçamentos — botão para definir orçamentos
    const modeCats = getBudgetCategories();
    return `
      <div class="full-empty"><div class="e-icon">📊</div><div>Sem gastos no período</div></div>
      <div class="cat-add-budget-wrap" style="margin-top:14px">
        <button class="cat-add-budget-btn" onclick="toggleBudgetPicker()">+ Definir orçamento por categoria</button>
        <div class="cat-budget-backdrop hidden" id="budgetBackdrop" onclick="closeBudgetPicker()"></div>
        <div class="cat-budget-picker hidden" id="budgetPicker">
          ${modeCats.map(cat => `
            <button class="cat-picker-item" onclick="event.stopPropagation();closeBudgetPicker();promptOrcamento('${escAttr(cat)}')">
              <span class="cat-picker-icon">${catIcon(cat)}</span>
              <span>${esc(cat)}</span>
            </button>
          `).join('')}
          <button class="cat-picker-item cat-picker-custom" onclick="event.stopPropagation();closeBudgetPicker();openCustomCategoryModal()">
            <span class="cat-picker-icon">✨</span>
            <span>Personalizar</span>
          </button>
        </div>
      </div>
    `;
  }

  // Store categories for onclick reference
  window._catList = sorted.map(([cat]) => cat);

  const items = sorted.map(([cat, val], idx) => {
    const limite = getOrcamento(cat);
    const hasBudget = limite !== null && limite > 0;

    let barWidth, barClass, pctLabel, alertBadge = '', budgetLine = '';

    if (hasBudget) {
      const pctBudget = limite > 0 ? (val / limite) * 100 : 0;
      barWidth = Math.min(pctBudget, 100);
      if (pctBudget >= 100) barClass = 'budget-vermelho';
      else if (pctBudget >= 70) barClass = 'budget-amarelo';
      else barClass = 'budget-verde';
      pctLabel = `${Math.round(pctBudget)}% do orçamento`;
      if (pctBudget >= 100) {
        alertBadge = `<span class="cat-budget-alert">⚠️ Acima</span>`;
      }
      budgetLine = `
        <div class="cat-budget-line">
          <span>Limite: ${fmt(limite)}</span>
          <button class="cat-budget-btn" onclick="event.stopPropagation();promptOrcamento('${escAttr(cat)}')" title="Editar limite">✏️</button>
        </div>
      `;
    } else {
      const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
      const pctTotal = totalGastos > 0 ? (val / totalGastos) * 100 : 0;
      barWidth = pct;
      barClass = '';
      pctLabel = `${pctTotal.toFixed(1)}% do total`;
      budgetLine = `
        <div class="cat-budget-line">
          <button class="cat-set-budget" onclick="event.stopPropagation();promptOrcamento('${escAttr(cat)}')">Definir limite</button>
        </div>
      `;
    }

    const barStyle = hasBudget ? '' : `background:${CAT_COLORS[idx % CAT_COLORS.length]}`;

    return `
      <div class="cat-item clickable" onclick="openCategoryDetail(window._catList[${idx}])">
        <div class="cat-icon">${catIcon(cat)}</div>
        <div class="cat-body">
          <div class="cat-name-row">
            <span class="cat-name">${esc(cat)}</span>
            ${alertBadge}
          </div>
          <div class="cat-bar"><div class="cat-bar-fill ${barClass}" style="width:${barWidth.toFixed(1)}%;${barStyle}"></div></div>
          <div class="cat-pct-label">${pctLabel}</div>
          ${budgetLine}
        </div>
        <div class="cat-right">
          <div class="cat-value">${fmt(val)}</div>
        </div>
        <div class="cat-arrow">›</div>
      </div>
    `;
  }).join('');

  // Botão para adicionar orçamento em categorias que não estão no grid
  const catsInGrid = new Set(sorted.map(([cat]) => cat));
  const modeCats = getBudgetCategories();
  const remainingCats = modeCats.filter(cat => !catsInGrid.has(cat));
  const addBtnSection = `
    <div class="cat-add-budget-wrap">
      <button class="cat-add-budget-btn" onclick="toggleBudgetPicker()">+ Definir orçamento</button>
      <div class="cat-budget-backdrop hidden" id="budgetBackdrop" onclick="closeBudgetPicker()"></div>
      <div class="cat-budget-picker hidden" id="budgetPicker">
        ${remainingCats.map(cat => `
          <button class="cat-picker-item" onclick="event.stopPropagation();closeBudgetPicker();promptOrcamento('${escAttr(cat)}')">
            <span class="cat-picker-icon">${catIcon(cat)}</span>
            <span>${esc(cat)}</span>
          </button>
        `).join('')}
        <button class="cat-picker-item cat-picker-custom" onclick="event.stopPropagation();closeBudgetPicker();openCustomCategoryModal()">
          <span class="cat-picker-icon">✨</span>
          <span>Personalizar</span>
        </button>
      </div>
    </div>
  `;

  return `
    <div style="font-size:12px;font-weight:600;color:var(--text-muted);text-align:right;margin-bottom:6px">Total: ${fmt(totalGastos)}</div>
    <div class="categorias-grid">${items}</div>
    ${addBtnSection}
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

  const titles = { banco: 'Banco', cartao: 'Cartão de Crédito', conta: 'Conta a Pagar', divida: 'Dívida', receber: 'A Receber', transacao: 'Transação', compra: 'Compra', meta: 'Meta', customCategoria: 'Categoria' };
  const item = editId ? findItem(type, section, editId) : null;

  document.getElementById('modalTitle').textContent = (editId ? 'Editar ' : 'Adicionar ') + titles[type];
  if (type === 'meta') {
    document.getElementById('modalBody').innerHTML = buildMetaForm(item || {}, !!editId);
  } else {
    document.getElementById('modalBody').innerHTML = buildForm(type, item);
  }
  document.getElementById('modalOverlay').classList.remove('hidden');
}

function findItem(type, section, id) {
  const col = { banco: 'bancos', cartao: 'cartoes', conta: 'contasPagar', divida: 'dividas', receber: 'aReceber', transacao: 'transacoes', compra: 'compras', meta: 'metas' }[type];
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

  if (type === 'customCategoria') {
    const EMOJI_OPTIONS = [
      '🏠','🍔','🛒','🚗','💡','🏥','📚','🎮','📋','👔',
      '🏭','💻','📢','🛡️','💪','📺','📌','🔄','💰','💼',
      '📈','💎','🛍️','👕','✈️','🖊️','🔧','🤝','👥','🏡',
      '🛵','🐾','💅','⛽','🎁','🎓','🚚','📎','🎵','🏋️',
      '☕','🍕','🏖️','💊','🎨','📦','🔑','🧹','👶','💇'
    ];
    return `
      <div class="form">
        <div class="form-row single">
          <div class="form-group">
            <label class="form-label">Nome da categoria</label>
            <input class="form-input" id="f_catNome" placeholder="Ex: Supermercado" maxlength="30" autocomplete="off">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Ícone</label>
          <div class="emoji-grid" id="emojiGrid">
            ${EMOJI_OPTIONS.map((e, i) => `
              <button type="button" class="emoji-btn${i===0?' active':''}" onclick="selectEmoji(this,'${e}')">
                ${e}
              </button>
            `).join('')}
          </div>
          <input type="hidden" id="f_catEmoji" value="${EMOJI_OPTIONS[0]}">
        </div>
      </div>
    `;
  }

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
          ${moneyInput('f_saldo', v.saldo)}
        </div>
        <div class="form-group">
          <label class="form-label">Taxa mensal (0 = isento)</label>
          ${moneyInput('f_taxaMensal', v.taxaMensal)}
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
          ${moneyInput('f_limite', v.limite)}
        </div>
        <div class="form-group">
          <label class="form-label">Valor utilizado (R$)</label>
          ${moneyInput('f_usado', v.usado)}
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
    const categorias = getFormCategories(['Aluguel','Água','Luz','Internet','Telefone','Alimentação','Mercado','Transporte','Saúde','Educação','Lazer','Impostos','Salários','Fornecedores','Software','Marketing','Seguro','Academia','Assinatura','Outros']);
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
          ${moneyInput('f_valor', v.valor)}
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
          ${moneyInput('f_valorTotal', v.valorTotal)}
        </div>
        <div class="form-group">
          <label class="form-label">Valor já pago (R$)</label>
          ${moneyInput('f_valorPago', v.valorPago)}
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
          ${moneyInput('f_juros', v.juros)}
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
          ${moneyInput('f_valor', v.valor)}
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
    const categorias = getFormCategories(['Clientes','Salário','Freelance','Fornecedores','Aluguel','Investimentos','Rendimentos','Compras','Impostos','Transferência','Outros']);
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
          ${moneyInput('f_valor', v.valor)}
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
      <div class="profile-danger-zone">
        <div class="danger-zone-title">Zona de risco</div>
        <div class="danger-zone-desc">Apaga todas as transações, compras, contas a pagar, dívidas e valores a receber. Seus bancos e cartões serão mantidos.</div>
        <button type="button" class="btn btn-danger-outline" onclick="handleResetFinancialData()">🗑️ Zerar dados financeiros</button>
      </div>
      <div class="form-row single" style="margin-top:12px">
        <button type="button" class="btn btn-ghost login-logout-btn" onclick="handleLogout()">Sair da conta</button>
      </div>
    </div>`;
  }

  if (type === 'compra') {
    const categorias = getFormCategories(['Alimentação','Mercado','Eletrônicos','Eletrodomésticos','Vestuário','Viagem','Escritório','Equipamentos','Software','Assinatura','Saúde','Lazer','Outros']);
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
          ${moneyInput('f_valorTotal', v.valorTotal)}
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
      <div class="form-group">
        <label class="form-check">
          <input type="checkbox" id="f_recorrente" ${v.recorrente?'checked':''}>
          Compra recorrente (mensal)
        </label>
      </div>
    </div>`;
  }

  if (type === 'novacompra') {
    const d = activeData();
    const bancos = d.bancos || [];
    const cartoes = d.cartoes || [];
    const categorias = getFormCategories(['Alimentação','Mercado','Eletrônicos','Eletrodomésticos','Vestuário','Viagem','Escritório','Equipamentos','Software','Assinatura','Saúde','Lazer','Compras','Outros']);
    return `<div class="form">
      <div class="form-row single">
        <div class="form-group">
          <label class="form-label">Método de pagamento</label>
          <select class="form-select" id="f_metodo" onchange="onNovaCompraMetodoChange()">
            <option value="pix">PIX</option>
            <option value="debito">Débito</option>
            <option value="credito">Crédito</option>
          </select>
        </div>
      </div>
      <div class="form-row single" id="nc_banco_wrap">
        <div class="form-group">
          <label class="form-label">Conta bancária</label>
          <select class="form-select" id="f_bancoId">
            ${bancos.length === 0 ? '<option value="">Nenhum banco cadastrado</option>' : bancos.map(b => `<option value="${escAttr(b.id)}">${esc(b.nome)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row single" id="nc_cartao_wrap" style="display:none">
        <div class="form-group">
          <label class="form-label">Cartão de crédito</label>
          <select class="form-select" id="f_cartaoId">
            ${cartoes.length === 0 ? '<option value="">Nenhum cartão cadastrado</option>' : cartoes.map(c => `<option value="${escAttr(c.id)}">${esc(c.nome)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row single">
        <div class="form-group">
          <label class="form-label">Descrição</label>
          <input class="form-input" id="f_descricao" type="text" placeholder="Ex: Supermercado, Gasolina...">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Valor (R$)</label>
          ${moneyInput('f_valor', 0)}
        </div>
        <div class="form-group">
          <label class="form-label">Data</label>
          <input class="form-input" id="f_data" type="date" value="${todayStr()}">
        </div>
      </div>
      <div class="form-row single" id="nc_parcelas_wrap" style="display:none">
        <div class="form-group">
          <label class="form-label">Parcelas (1 = à vista)</label>
          <input class="form-input" id="f_parcelas" type="number" min="1" max="48" value="1">
        </div>
      </div>
      <div class="form-row single">
        <div class="form-group">
          <label class="form-label">Categoria</label>
          <select class="form-select" id="f_categoria">
            ${categorias.map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group" id="nc_recorrente_wrap" style="display:none">
        <label class="form-check">
          <input type="checkbox" id="f_recorrente">
          Compra recorrente (mensal)
        </label>
      </div>
      <div class="form-row single">
        <button type="button" class="btn-add btn-upload" onclick="triggerUpload('novacompra')" style="width:100%;justify-content:center"><span class="up-icon">📎</span> Importar foto/PDF</button>
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
  if (el.dataset && el.dataset.monetary) return parseMoney(el.value);
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

  if (t === 'customCategoria') {
    const si = (v, max) => sanitizeInput(v, max);
    const nome = si(g('f_catNome') || '', 30).trim();
    const emoji = g('f_catEmoji') || '📌';
    if (!nome) return showToast('Informe o nome da categoria.');
    const d = state[s];
    const allCats = [...Object.keys(CATEGORIA_ICONS), ...Object.keys(BUDGET_EXTRA_ICONS), ...(d.customCategories || []).map(c => c.nome)];
    if (allCats.some(c => c.toLowerCase() === nome.toLowerCase())) {
      return showToast('Essa categoria já existe.');
    }
    if (!d.customCategories) d.customCategories = [];
    d.customCategories.push({ id: uid(), nome, emoji });
    closeModal();
    saveState();
    render();
    showToast(`Categoria "${nome}" criada!`, 'success');
    return;
  }

  let item;
  const si = (v, max) => sanitizeInput(v, max);

  if (t === 'banco') {
    item = { nome: si(g('f_nome'), 100), tipo: si(g('f_tipo'), 50), saldo: g('f_saldo'), taxaMensal: g('f_taxaMensal'), agencia: si(g('f_agencia'), 20), conta: si(g('f_conta'), 20) };
    if (!item.nome) return showToast('Informe o nome do banco.');
    upsert('bancos', s, item);
  }
  else if (t === 'cartao') {
    item = { nome: si(g('f_nome'), 100), banco: si(g('f_banco'), 100), bandeira: si(g('f_bandeira'), 50), limite: g('f_limite'), usado: g('f_usado'), fechamento: g('f_fechamento'), vencimento: g('f_vencimento'), cor: si(g('f_cor'), 20) };
    if (!item.nome) return showToast('Informe o nome do cartão.');
    upsert('cartoes', s, item);
  }
  else if (t === 'conta') {
    item = { descricao: si(g('f_descricao'), 300), valor: g('f_valor'), vencimento: g('f_vencimento'), categoria: si(g('f_categoria'), 100), status: si(g('f_status'), 30), recorrente: g('f_recorrente') };
    if (!item.descricao) return showToast('Informe a descrição.');
    upsert('contasPagar', s, item);
  }
  else if (t === 'divida') {
    item = { credor: si(g('f_credor'), 200), valorTotal: g('f_valorTotal'), valorPago: g('f_valorPago'), parcelas: g('f_parcelas'), parcelaAtual: g('f_parcelaAtual'), proxVencimento: g('f_proxVencimento'), juros: g('f_juros'), obs: si(g('f_obs'), 500) };
    if (!item.credor) return showToast('Informe o nome do credor.');
    upsert('dividas', s, item);
  }
  else if (t === 'receber') {
    item = { devedor: si(g('f_devedor'), 200), descricao: si(g('f_descricao'), 300), valor: g('f_valor'), vencimento: g('f_vencimento'), status: si(g('f_status'), 30) };
    if (!item.devedor) return showToast('Informe o nome do devedor.');
    upsert('aReceber', s, item);
  }
  else if (t === 'transacao') {
    item = { bancoId: _detailParentId, tipo: si(g('f_tipo'), 30), descricao: si(g('f_descricao'), 300), valor: g('f_valor'), data: g('f_data'), categoria: si(g('f_categoria'), 100) };
    if (!item.descricao) return showToast('Informe a descrição.');
    upsert('transacoes', s, item);
  }
  else if (t === 'compra') {
    const parcelas = g('f_parcelas') || 1;
    const valorTotal = g('f_valorTotal') || 0;
    item = { cartaoId: _detailParentId, descricao: si(g('f_descricao'), 300), valorTotal: valorTotal, parcelas: parcelas, valorParcela: parcelas > 0 ? Math.round((valorTotal / parcelas) * 100) / 100 : valorTotal, data: g('f_data'), categoria: si(g('f_categoria'), 100), recorrente: g('f_recorrente') };
    if (!item.descricao) return showToast('Informe a descrição.');
    upsert('compras', s, item);
  }
  else if (t === 'novacompra') {
    const metodo = si(g('f_metodo'), 30);
    const descricao = si(g('f_descricao'), 300);
    const valor = g('f_valor') || 0;
    const data = g('f_data');
    const categoria = si(g('f_categoria'), 100);
    if (!descricao) return showToast('Informe a descrição.');
    if (valor <= 0) return showToast('Informe o valor.');

    if (metodo === 'credito') {
      const cartaoId = g('f_cartaoId');
      if (!cartaoId) return showToast('Selecione um cartão de crédito.');
      const parcelas = g('f_parcelas') || 1;
      item = { cartaoId, descricao, valorTotal: valor, parcelas, valorParcela: parcelas > 0 ? Math.round((valor / parcelas) * 100) / 100 : valor, data, categoria, recorrente: g('f_recorrente') };
      upsert('compras', s, item);
    } else {
      const bancoId = g('f_bancoId');
      if (!bancoId) return showToast('Selecione uma conta bancária.');
      item = { bancoId, tipo: 'saida', descricao, valor, data, categoria };
      upsert('transacoes', s, item);
    }
  }
  else if (t === 'meta') {
    item = {
      tipo: si(g('f_tipo'), 30),
      titulo: si(g('f_titulo'), 200),
      descricao: si(g('f_descricao'), 300),
      valorMeta: g('f_valorMeta'),
      valorAtual: g('f_valorAtual') || 0,
      categoria: si(g('f_categoria'), 100),
      dividaId: si(g('f_dividaId'), 50),
      prazo: g('f_prazo'),
      concluida: g('f_concluida') || false
    };
    if (!_modalEditId) item.criadoEm = todayStr();
    if (!item.titulo) return showToast('Informe o título da meta.');
    if (!item.valorMeta || item.valorMeta <= 0) return showToast('Informe o valor da meta.');
    if (item.tipo === 'reduzir_gasto' && !item.categoria) return showToast('Selecione a categoria alvo.');
    if (item.tipo === 'quitar_divida' && !item.dividaId) return showToast('Selecione uma dívida.');
    upsert('metas', s, item);
  }

  closeModal();
  saveState();
  render();
  // Refresh detail modal if open
  if (_detailType) renderDetailContent();
}

// ── NOVA COMPRA (QUICK ADD) ──────────────────────────────────
function openNovaCompra() {
  _modalType = 'novacompra';
  _modalSection = state.activeMode;
  _modalEditId = null;
  _detailParentId = null;
  document.getElementById('modalTitle').textContent = 'Nova Compra';
  document.getElementById('modalBody').innerHTML = buildForm('novacompra', null);
  document.getElementById('modalOverlay').classList.remove('hidden');
}

function onNovaCompraMetodoChange() {
  const metodo = document.getElementById('f_metodo')?.value;
  const bancoWrap = document.getElementById('nc_banco_wrap');
  const cartaoWrap = document.getElementById('nc_cartao_wrap');
  const parcelasWrap = document.getElementById('nc_parcelas_wrap');
  const recorrenteWrap = document.getElementById('nc_recorrente_wrap');
  if (bancoWrap) bancoWrap.style.display = (metodo === 'pix' || metodo === 'debito') ? '' : 'none';
  if (cartaoWrap) cartaoWrap.style.display = metodo === 'credito' ? '' : 'none';
  if (parcelasWrap) parcelasWrap.style.display = metodo === 'credito' ? '' : 'none';
  if (recorrenteWrap) recorrenteWrap.style.display = metodo === 'credito' ? '' : 'none';
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
    const cb = _confirmCallback;
    _confirmCallback = null;
    cb();
    // Only close if cb didn't open a new confirm (chained confirms)
    if (!_confirmCallback) closeConfirm();
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
  else if (_detailType === 'categoria') renderCategoryDetail(_detailParentId);
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
          <div class="di-name">${esc(c.descricao)}${c.recorrente ? ' <small style="color:var(--text-muted)">↻</small>' : ''}</div>
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

// ── CATEGORY DETAIL ─────────────────────────────────────────
function openCategoryDetail(cat) {
  _detailType = 'categoria';
  _detailParentId = cat;
  renderCategoryDetail(cat);
  document.getElementById('detailOverlay').classList.remove('hidden');
}

function renderCategoryDetail(cat) {
  const d = activeData();
  const from = _catDateFrom || monthStart();
  const to = _catDateTo || todayStr();

  // Collect all items in this category
  const items = [];

  // Contas a Pagar
  d.contasPagar.filter(c => (c.categoria || 'Outros') === cat && inDateRange(c.vencimento, from, to)).forEach(c => {
    items.push({
      descricao: c.descricao,
      valor: c.valor || 0,
      data: c.vencimento,
      metodo: 'Conta a Pagar',
      metodoIcon: '📤',
      tipo: 'saida',
      status: autoStatus(c),
      recorrente: c.recorrente,
      sourceType: 'conta',
      id: c.id
    });
  });

  // Transações (saída)
  (d.transacoes || []).filter(t => t.tipo === 'saida' && (t.categoria || 'Outros') === cat && inDateRange(t.data, from, to)).forEach(t => {
    const banco = d.bancos.find(b => b.id === t.bancoId);
    const metodoLabel = banco ? `${banco.nome} (${t.bancoId ? 'PIX/Débito' : 'Banco'})` : 'PIX/Débito';
    items.push({
      descricao: t.descricao,
      valor: t.valor || 0,
      data: t.data,
      metodo: metodoLabel,
      metodoIcon: '🏦',
      tipo: 'saida',
      recorrente: false,
      sourceType: 'transacao',
      id: t.id
    });
  });

  // Compras no cartão
  (d.compras || []).filter(c => (c.categoria || 'Outros') === cat && inDateRange(c.data, from, to)).forEach(c => {
    const cartao = d.cartoes.find(ct => ct.id === c.cartaoId);
    items.push({
      descricao: c.descricao,
      valor: c.valorTotal || 0,
      data: c.data,
      metodo: cartao ? `${cartao.nome} (Crédito)` : 'Cartão de Crédito',
      metodoIcon: '💳',
      tipo: 'credito',
      parcelas: c.parcelas,
      valorParcela: c.valorParcela,
      recorrente: c.recorrente,
      sourceType: 'compra',
      id: c.id
    });
  });

  items.sort((a, b) => (b.data || '').localeCompare(a.data || ''));

  const totalCat = items.reduce((s, i) => s + i.valor, 0);

  document.getElementById('detailTitle').textContent = `${catIcon(cat)} ${cat}`;

  const rows = items.map(item => {
    const parcelasInfo = item.parcelas && item.parcelas > 1
      ? `<span class="parcelas-tag">${item.parcelas}x de ${fmt(item.valorParcela)}</span>`
      : '';
    const statusBadge = item.status ? badgeHtml(item.status) : '';
    const recIcon = item.recorrente ? ' <small style="color:var(--text-muted)">↻</small>' : '';

    return `
      <div class="detail-item">
        <div class="di-icon">${item.metodoIcon}</div>
        <div class="di-body">
          <div class="di-name">${esc(item.descricao)}${recIcon}</div>
          <div class="di-sub">${fmtDate(item.data)} · <span class="metodo-tag">${esc(item.metodo)}</span></div>
        </div>
        <div class="di-right">
          <div class="di-value negative">- ${fmt(item.valor)}</div>
          ${parcelasInfo}${statusBadge}
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('detailBody').innerHTML = `
    <div class="detail-toolbar">
      <div class="detail-summary">
        <div class="ds-item"><div class="ds-label">Total</div><div class="ds-val negative">- ${fmt(totalCat)}</div></div>
        <div class="ds-item"><div class="ds-label">Itens</div><div class="ds-val">${items.length}</div></div>
      </div>
      <div class="detail-filter-row">
        <span style="font-size:11px;color:var(--text-muted)">Período: ${fmtDate(from)} — ${fmtDate(to)}</span>
      </div>
    </div>
    ${items.length === 0
      ? '<div class="detail-empty"><div class="de-icon">📊</div><div>Nenhum gasto nesta categoria</div></div>'
      : '<div class="detail-list">' + rows + '</div>'
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

async function validateFileMagic(file) {
  const buf = await file.slice(0, 8).arrayBuffer();
  const bytes = new Uint8Array(buf);
  // JPEG: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return 'image';
  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return 'image';
  // GIF: 47 49 46 38
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return 'image';
  // WebP: 52 49 46 46 ... 57 45 42 50
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) return 'image';
  // BMP: 42 4D
  if (bytes[0] === 0x42 && bytes[1] === 0x4D) return 'image';
  // PDF: 25 50 44 46
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return 'pdf';
  // Text-based (CSV, OFX, TXT) — check if mostly printable ASCII/UTF-8
  const printable = Array.from(bytes).every(b => b === 0x0A || b === 0x0D || b === 0x09 || (b >= 0x20 && b <= 0x7E) || b >= 0xC0);
  if (printable) return 'text';
  return null;
}

async function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
  if (file.size > MAX_FILE_SIZE) {
    showToast('Arquivo muito grande. O tamanho máximo é 10 MB.');
    return;
  }
  // Validate file magic bytes
  const magicType = await validateFileMagic(file);
  if (!magicType) {
    showToast('Tipo de arquivo não reconhecido. Use imagens (JPG, PNG), PDF, CSV, OFX ou TXT.');
    return;
  }
  showImportLoading();
  try {
    let items;
    const isImage = magicType === 'image';
    const isPdf = magicType === 'pdf';

    if (isImage) {
      // Imagens → Claude Vision AI (via Supabase Edge Function)
      updateImportStatus('Analisando imagem com IA...');
      items = await ocrWithAI(file, _uploadType);
    } else {
      // CSV, OFX, TXT, PDF → parsing local
      let text;
      if (isPdf) {
        updateImportStatus('Lendo PDF...');
        text = await readPdfText(file);
      } else {
        text = await readFileText(file);
      }
      updateImportStatus('Identificando transações...');
      if (_uploadType === 'extrato') {
        items = parseExtratoText(text);
      } else {
        items = parseComprasText(text);
      }
    }

    if (!items || items.length === 0) {
      closeModal();
      showToast('Não foi possível identificar transações. Verifique o formato ou qualidade.');
      return;
    }
    // Nova Compra: auto-fill the first item into the form
    if (_uploadType === 'novacompra') {
      closeModal();
      openNovaCompra();
      const first = items[0];
      // Auto-detect payment method
      if (first.metodo) {
        const metodoEl = document.getElementById('f_metodo');
        if (metodoEl) { metodoEl.value = first.metodo; onNovaCompraMetodoChange(); }
      }
      if (first.descricao) { const el = document.getElementById('f_descricao'); if (el) el.value = first.descricao; }
      if (first.valor || first.valorTotal) { const el = document.getElementById('f_valor'); if (el) el.value = first.valor || first.valorTotal || 0; }
      if (first.parcelas && first.parcelas > 1) { const el = document.getElementById('f_parcelas'); if (el) el.value = first.parcelas; }
      if (first.data) { const el = document.getElementById('f_data'); if (el) el.value = first.data; }
      if (first.categoria) { const el = document.getElementById('f_categoria'); if (el) el.value = first.categoria; }
      return;
    }
    _importItems = items;
    showImportPreview();
  } catch (err) {
    closeModal();
    console.error('File processing error:', err);
    const safeMsg = err.message?.startsWith('Erro ao analisar') || err.message?.startsWith('Chave da API')
      ? err.message
      : 'Erro ao processar arquivo. Verifique o formato e tente novamente.';
    showToast(safeMsg);
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

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsDataURL(file);
  });
}

async function ocrWithAI(file, uploadType) {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'COLE_SUA_CHAVE_AQUI') {
    throw new Error('Chave da API Gemini não configurada. Edite GEMINI_API_KEY no app.js');
  }

  const base64 = await fileToBase64(file);
  const mediaType = file.type || 'image/jpeg';

  let prompt;
  if (uploadType === 'extrato') {
    prompt = `Analise esta imagem de extrato bancário brasileiro. Extraia TODAS as transações visíveis.
Retorne APENAS um JSON array (sem markdown, sem explicação, sem \`\`\`). Cada item:
{"tipo":"entrada" ou "saida","descricao":"texto","valor":123.45,"data":"YYYY-MM-DD","categoria":"X"}
Categorias: Aluguel, Água, Luz, Internet, Telefone, Alimentação, Transporte, Saúde, Educação, Lazer, Salário, Freelance, Investimentos, Transferência, Compras, Streaming, Delivery, Combustível, Outros
Regras: valor SEMPRE positivo (número). tipo "entrada" = depósito/crédito/recebimento/salário. "saida" = débito/pagamento/compra. Se a imagem não contiver transações, retorne []`;
  } else if (uploadType === 'novacompra') {
    prompt = `Analise esta imagem de comprovante/nota/recibo de compra brasileiro. Extraia os dados da compra.
Retorne APENAS um JSON object (sem markdown, sem explicação, sem \`\`\`):
{"metodo":"pix" ou "debito" ou "credito","descricao":"texto","valor":123.45,"parcelas":1,"data":"YYYY-MM-DD","categoria":"X"}
Categorias: Alimentação, Eletrônicos, Eletrodomésticos, Vestuário, Viagem, Escritório, Equipamentos, Software, Assinatura, Saúde, Lazer, Compras, Delivery, Streaming, Combustível, Outros
Regras:
- metodo: "credito" se menciona cartão de crédito/parcelas/crédito. "debito" se menciona débito. "pix" se menciona PIX/transferência.
- valor SEMPRE positivo (número)
- parcelas: número de parcelas (1 se à vista ou não mencionado)
- Se a imagem não contiver dados de compra, retorne {}`;
  } else {
    prompt = `Analise esta imagem de fatura de cartão de crédito brasileiro. Extraia TODAS as compras visíveis.
Retorne APENAS um JSON array (sem markdown, sem explicação, sem \`\`\`). Cada item:
{"descricao":"texto","valorTotal":123.45,"parcelas":1,"valorParcela":123.45,"data":"YYYY-MM-DD","categoria":"X"}
Categorias: Alimentação, Eletrônicos, Eletrodomésticos, Vestuário, Viagem, Escritório, Equipamentos, Software, Assinatura, Saúde, Lazer, Compras, Delivery, Streaming, Combustível, Outros
Regras: valores SEMPRE positivos (números). parcelas: 1 se à vista. Se a imagem não contiver compras, retorne []`;
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [
          { inline_data: { mime_type: mediaType, data: base64 } },
          { text: prompt }
        ]}],
        generationConfig: { temperature: 0.1, maxOutputTokens: 4096 }
      })
    }
  );

  if (!response.ok) {
    console.error('Gemini API error:', response.status);
    throw new Error('Erro ao analisar imagem. Tente novamente.');
  }

  const result = await response.json();
  if (result.error) {
    console.error('Gemini API error:', result.error.message);
    throw new Error('Erro ao analisar imagem. Tente novamente.');
  }

  const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!text) throw new Error('Resposta vazia da IA');

  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleaned);
  // novacompra returns a single object, wrap in array for consistency
  let items;
  if (uploadType === 'novacompra' && !Array.isArray(parsed)) {
    items = Object.keys(parsed).length > 0 ? [parsed] : [];
  } else {
    items = Array.isArray(parsed) ? parsed : [parsed];
  }
  // Sanitize all AI-returned data before using
  return items.map(sanitizeAIItem);
}

function sanitizeAIItem(item) {
  if (!item || typeof item !== 'object') return {};
  const clean = {};
  const ALLOWED_TIPOS = ['entrada', 'saida'];
  const ALLOWED_METODOS = ['pix', 'debito', 'credito'];
  const ALLOWED_CATEGORIAS = [
    'Aluguel','Água','Luz','Internet','Telefone','Alimentação','Transporte',
    'Saúde','Educação','Lazer','Salário','Freelance','Investimentos',
    'Transferência','Compras','Streaming','Delivery','Combustível',
    'Eletrônicos','Eletrodomésticos','Vestuário','Viagem','Escritório',
    'Equipamentos','Software','Assinatura','Outros'
  ];
  for (const [k, v] of Object.entries(item)) {
    if (typeof v === 'string') {
      clean[k] = v.replace(/<[^>]*>/g, '').trim().slice(0, 300);
    } else if (typeof v === 'number') {
      clean[k] = isFinite(v) ? Math.abs(v) : 0;
    } else if (typeof v === 'boolean') {
      clean[k] = v;
    }
    // ignore any other types (arrays, objects, etc.)
  }
  // Validate enum fields
  if (clean.tipo && !ALLOWED_TIPOS.includes(clean.tipo)) clean.tipo = 'saida';
  if (clean.metodo && !ALLOWED_METODOS.includes(clean.metodo)) clean.metodo = 'pix';
  if (clean.categoria && !ALLOWED_CATEGORIAS.includes(clean.categoria)) clean.categoria = 'Outros';
  // Validate date format YYYY-MM-DD
  if (clean.data && !/^\d{4}-\d{2}-\d{2}$/.test(clean.data)) clean.data = todayStr();
  // Cap parcelas
  if (clean.parcelas !== undefined) clean.parcelas = Math.min(Math.max(Math.round(clean.parcelas), 1), 48);
  return clean;
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
        tipo: sanitizeInput(item.tipo, 30), descricao: sanitizeInput(item.descricao, 300),
        valor: Math.abs(Number(item.valor) || 0), data: sanitizeInput(item.data, 10), categoria: sanitizeInput(item.categoria, 100)
      });
    } else {
      if (!state[section].compras) state[section].compras = [];
      state[section].compras.push({
        id: uid(), cartaoId: parentId,
        descricao: sanitizeInput(item.descricao, 300), valorTotal: Math.abs(Number(item.valorTotal) || 0),
        parcelas: Math.min(Math.max(parseInt(item.parcelas) || 1, 1), 48),
        valorParcela: Math.abs(Number(item.valorParcela) || Number(item.valorTotal) || 0),
        data: sanitizeInput(item.data, 10), categoria: sanitizeInput(item.categoria, 100)
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
  // Load theme (validate to prevent injection)
  const rawTheme = localStorage.getItem('findash_theme');
  const savedTheme = (rawTheme === 'light' || rawTheme === 'dark') ? rawTheme : 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  document.getElementById('themeIcon').textContent = savedTheme === 'light' ? '🌙' : '☀️';

  // Fallback: detect recovery hash fragment in URL
  if (window.location.hash && window.location.hash.includes('type=recovery')) {
    // Supabase will pick this up via onAuthStateChange, but ensure we also handle it
    setTimeout(() => {
      const { data: { session: s } } = _sb.auth.getSession();
      if (s && !document.getElementById('loginScreen')?.querySelector('#reset_senha')) {
        showResetPasswordScreen();
      }
    }, 1500);
  }

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
