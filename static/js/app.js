/* FitLife Coaching — app.js (refatorado) */

const DEFAULT_TAB = 'geral';
const DEFAULT_WORKSPACE = 'alunos';
const CHAT_ENDPOINT = '/perguntar';
const STUDENTS_PER_PAGE = 9;
const EXERCISES_PER_PAGE = 10;

/* ========== DADOS ========== */

const heroProfiles = {
  geral: { tag: 'Equipe Multidisciplinar', name: 'Ecossistema FitLife', role: 'Treino, Nutrição e Psicologia integrados em um só lugar.', img: '/static/joao.png', theme: 'general' },
  treino: { tag: 'Educação Física & Biomecânica', name: 'Coach João Vitor', role: 'Especialista em Biomecânica, Grupos Especiais e Corrida de Rua.', img: '/static/joao.png', theme: 'fitness' },
  nutricao: { tag: 'Nutrição Esportiva & Clínica', name: 'Nutricionista', role: 'Planos alimentares personalizados, reeducação e metas nutricionais.', img: 'https://images.unsplash.com/photo-1594824813566-788530791a4d?auto=format&fit=crop&w=800&q=80', theme: 'nutrition' },
  psicologia: { tag: 'Psicologia & Comportamento', name: 'Psicóloga', role: 'Acompanhamento comportamental, gestão de ansiedade e saúde mental.', img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80', theme: 'psychology' },
  feed: { tag: 'Diário do Aluno', name: 'Feed Integrado', role: 'Acompanhe fotos, relatos de treino e rotina dos alunos.', img: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80', theme: 'feed' },
  financeiro: { tag: 'Gestão & Contratos', name: 'Financeiro FitLife', role: 'Organização de contratos, receitas e serviços da equipe.', img: '/static/joao.png', theme: 'finance' }
};

/* ========== ESTADO ========== */

const state = {
  studentPage: 0,
  studentFilter: 'todos',
  studentStatus: 'ativos',
  selectedStudentId: null,
  studentEditMode: false,
  alunosData: [],           // alunos carregados da API
  exerciciosData: [],
  exercicioPage: 0,
  exercicioCategoria: ''
};

/* ========== DOM ========== */

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const dom = {
  heroImg: $('#heroImg'),
  heroTag: $('#heroTag'),
  heroName: $('#heroName'),
  heroRole: $('#heroRole'),
  chatDrawer: $('#chatDrawer'),
  chatBody: $('#drawerBody'),
  chatForm: $('#chatForm'),
  chatInput: $('#drawerInput'),
  trainingWorkspace: $('#trainingWorkspace'),
  workspaceFocusLabel: $('#workspaceFocusLabel'),
  workspaceFocusTitle: $('#workspaceFocusTitle'),
  studentGrid: $('#studentGrid'),
  studentPager: $('#studentPager'),
  studentPagerLabel: $('#studentPagerLabel'),
  studentForm: $('#presencialStudentForm'),
  newStudentModal: $('#modalNovoAluno'),
  exerciseTableBody: $('#exerciseTableBody'),
  exercisePager: $('#exercicioPager'),
  exerciseModal: $('#modalExercicio'),
  exerciseModalMedia: $('#exerciseModalMedia')
};

/* ========== HELPERS ========== */

const escapeHtml = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');

const getExerciseValue = (ex, keys, fallback = '—') => {
  for (const k of keys) {
    const v = ex?.[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return fallback;
};

const fillFields = (container, values) => {
  $$('[data-field]', container).forEach(el => {
    if (values[el.dataset.field] !== undefined) el.textContent = values[el.dataset.field];
  });
};

/* ========== TEMA / HERO ========== */

function applyTheme(theme = 'general') {
  document.body.dataset.theme = theme;
}

function updateHero(profile) {
  if (!profile) return;
  applyTheme(profile.theme);

  if (dom.heroImg && profile.img && dom.heroImg.getAttribute('src') !== profile.img) {
    dom.heroImg.classList.remove('is-error');
    dom.heroImg.classList.add('is-loading');
    dom.heroImg.onload = () => requestAnimationFrame(() => dom.heroImg.classList.remove('is-loading'));
    dom.heroImg.onerror = () => { console.warn(`Não foi possível carregar: ${profile.img}`); dom.heroImg.classList.remove('is-loading'); dom.heroImg.classList.add('is-error'); };
    dom.heroImg.src = profile.img;
  }

  if (dom.heroTag) dom.heroTag.textContent = profile.tag;
  if (dom.heroName) dom.heroName.textContent = profile.name;
  if (dom.heroRole) dom.heroRole.textContent = profile.role;
}

/* ========== NAVEGAÇÃO ========== */

function switchTab(tabName) {
  const target = $(`#tab-${tabName}`);
  if (!target) return;

  $$('.ghost-btn[data-tab]').forEach(btn => {
    const active = btn.dataset.tab === tabName;
    btn.classList.toggle('active', active);
    active ? btn.setAttribute('aria-current', 'page') : btn.removeAttribute('aria-current');
  });

  $$('.tab-content').forEach(tab => tab.classList.toggle('active', tab === target));
  updateHero(heroProfiles[tabName] ?? heroProfiles[DEFAULT_TAB]);

  if (tabName === 'treino') showTrainingLanding();
}

function showTrainingLanding() {
  if (!dom.trainingWorkspace) return;
  dom.trainingWorkspace.classList.remove('is-focused');
  $$('.workspace-btn[data-workspace]').forEach(b => b.classList.remove('active'));
  $$('.workspace-panel').forEach(p => { p.classList.remove('active'); p.hidden = true; });
  closeAllMenus();
}

function showWorkspace(name) {
  if (!dom.trainingWorkspace) return;
  dom.trainingWorkspace.classList.add('is-focused');

  $$('.workspace-btn[data-workspace]').forEach(b => b.classList.toggle('active', b.dataset.workspace === name));
  $$('.workspace-panel').forEach(p => {
    const isTarget = p.id === `workspace-${name}`;
    p.classList.toggle('active', isTarget);
    p.hidden = !isTarget;
  });

  closeAllMenus();

  if (name === 'alunos') {
    state.studentPage = 0;
    if (dom.workspaceFocusLabel) dom.workspaceFocusLabel.textContent = 'Gestão de alunos';
    if (dom.workspaceFocusTitle) dom.workspaceFocusTitle.textContent = 'Alunos';
    loadAlunosFromAPI(); // carrega do banco
  }

  if (name === 'exercicios') {
    if (dom.workspaceFocusLabel) dom.workspaceFocusLabel.textContent = 'Biblioteca';
    if (dom.workspaceFocusTitle) dom.workspaceFocusTitle.textContent = 'Exercícios';
    loadExercicios(state.exercicioCategoria);
  }
}

/* ========== ALUNOS — API ========== */

async function loadAlunosFromAPI() {
  try {
    const res = await fetch('/alunos');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.alunosData = Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Erro ao carregar alunos:', err);
    state.alunosData = [];
  }
  renderStudentCards();
}

function getFilteredStudents() {
  const query = ($('#workspace-alunos input[type="search"]')?.value || '').toLowerCase().trim();

  return state.alunosData.filter(a => {
    if (state.studentStatus === 'ativos' && !a.ativo) return false;
    if (state.studentStatus === 'excluidos' && a.ativo) return false;
    if (state.studentFilter !== 'todos' && String(a.modalidade || '').toLowerCase() !== state.studentFilter) return false;
    if (!query) return true;
    return [a.nome, a.objetivo, a.plano, a.modalidade].filter(Boolean).join(' ').toLowerCase().includes(query);
  });
}

function renderStudentCards() {
  if (!dom.studentGrid) return;

  const filtered = getFilteredStudents();
  const totalPages = Math.max(1, Math.ceil(filtered.length / STUDENTS_PER_PAGE));
  state.studentPage = Math.min(state.studentPage, totalPages - 1);

  const page = filtered.slice(state.studentPage * STUDENTS_PER_PAGE, (state.studentPage + 1) * STUDENTS_PER_PAGE);

  dom.studentGrid.innerHTML = page.map(a => {
    const initials = a.nome.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
    return `
      <article class="student-card ${!a.ativo ? 'is-deleted' : ''}" data-student-id="${a.id}" tabindex="0" role="button" aria-label="Abrir perfil de ${escapeHtml(a.nome)}">
        <div class="student-avatar" aria-hidden="true">${escapeHtml(initials)}</div>
        <div class="student-info">
          <h3>${escapeHtml(a.nome)}</h3>
          <span>${escapeHtml(a.objetivo ?? '—')} • ${escapeHtml(a.plano ?? '—')}</span>
          <small>${escapeHtml(a.modalidade ?? 'Modalidade não informada')}</small>
        </div>
        <span class="status-dot ${a.ativo ? 'active' : 'inactive'}" role="img" aria-label="Aluno ${a.ativo ? 'ativo' : 'inativo'}"></span>
        <button type="button" class="student-card-menu" data-action="student-card-menu" data-student-id="${a.id}" aria-label="Ações de ${escapeHtml(a.nome)}" aria-expanded="false">⋮</button>
        <div class="student-card-actions" data-student-card-menu hidden>
          ${!a.ativo
            ? `<button type="button" data-action="restore-student" data-student-id="${a.id}">Restaurar aluno</button>`
            : `<button type="button" data-action="edit-student" data-student-id="${a.id}">Editar aluno</button>
               <button type="button" data-action="delete-student" data-student-id="${a.id}">Excluir aluno</button>`}
        </div>
      </article>`;
  }).join('');

  updateStudentPager(filtered.length);
}

function updateStudentPager(total = getFilteredStudents().length) {
  if (!dom.studentPager) return;
  const totalPages = Math.max(1, Math.ceil(total / STUDENTS_PER_PAGE));
  state.studentPage = Math.max(0, Math.min(state.studentPage, totalPages - 1));

  dom.studentPager.hidden = total <= STUDENTS_PER_PAGE;
  if (dom.studentPagerLabel) dom.studentPagerLabel.textContent = `${state.studentPage + 1} / ${totalPages}`;

  const prev = $('[data-student-page="prev"]', dom.studentPager);
  const next = $('[data-student-page="next"]', dom.studentPager);
  if (prev) prev.disabled = state.studentPage === 0;
  if (next) next.disabled = state.studentPage >= totalPages - 1;
}

function openStudentProfile(id) {
  const aluno = state.alunosData.find(a => String(a.id) === String(id));
  const panel = $('#workspace-aluno-perfil');
  if (!aluno || !panel || !aluno.ativo) return;

  state.selectedStudentId = String(id);
  fillFields(panel, {
    name: aluno.nome,
    goal: aluno.objetivo ?? '—',
    plan: aluno.plano ?? '—',
    status: aluno.ativo ? 'Ativo' : 'Inativo',
    modality: aluno.modalidade ?? 'Não informado',
    summary: `${aluno.objetivo ?? '—'} • ${aluno.plano ?? '—'}`
  });

  closeAllMenus();
  $$('.workspace-panel').forEach(p => { p.classList.remove('active'); p.hidden = true; });
  panel.classList.add('active');
  panel.hidden = false;
  dom.trainingWorkspace?.classList.add('is-focused');
}

async function deleteStudent(id = state.selectedStudentId) {
  const aluno = state.alunosData.find(a => String(a.id) === String(id));
  if (!aluno || !aluno.ativo) return;
  if (!confirm(`Excluir o aluno "${aluno.nome}"? O aluno será arquivado e poderá ser restaurado.`)) return;

  try {
    const res = await fetch(`/alunos/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    closeAllMenus();
    if (String(state.selectedStudentId) === String(id)) {
      state.selectedStudentId = null;
      showWorkspace('alunos');
    }
    await loadAlunosFromAPI();
  } catch (err) {
    console.error('Erro ao excluir aluno:', err);
  }
}

async function restoreStudent(id) {
  try {
    const res = await fetch(`/alunos/${id}/reativar`, { method: 'PATCH' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await loadAlunosFromAPI();
  } catch (err) {
    console.error('Erro ao restaurar aluno:', err);
  }
}

function editStudent(id = state.selectedStudentId) {
  const aluno = state.alunosData.find(a => String(a.id) === String(id));
  if (!aluno || !dom.newStudentModal) return;

  state.studentEditMode = true;
  state.selectedStudentId = String(id);

  const title = $('#modalNovoAlunoTitle', dom.newStudentModal);
  const label = $('.profile-label', dom.newStudentModal);
  const submit = $('button[type="submit"]', dom.newStudentModal);

  if (title) title.textContent = 'Editar aluno';
  if (label) label.textContent = 'Dados do aluno';
  if (submit) submit.textContent = 'Salvar alterações';

  if (dom.studentForm) {
    dom.studentForm.nome.value = aluno.nome || '';
    dom.studentForm.email.value = aluno.email || '';
    dom.studentForm.telefone.value = aluno.telefone || '';
    dom.studentForm.objetivo.value = aluno.objetivo || '';
    dom.studentForm.modalidade.value = aluno.modalidade || 'presencial';
    dom.studentForm.data_nascimento.value = aluno.data_nascimento ?? '';
  }

  openPresencialModal();
}

function changeStudentPage(dir) {
  const totalPages = Math.max(1, Math.ceil(getFilteredStudents().length / STUDENTS_PER_PAGE));
  state.studentPage = Math.max(0, Math.min(state.studentPage + dir, totalPages - 1));
  renderStudentCards();
}

/* ========== EXERCÍCIOS ========== */

async function loadExercicios(categoria = state.exercicioCategoria) {
  state.exercicioCategoria = categoria || '';
  const url = state.exercicioCategoria ? `/exercicios/categoria/${encodeURIComponent(state.exercicioCategoria)}` : '/exercicios';

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.exerciciosData = Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Erro ao carregar exercícios:', err);
    state.exerciciosData = [];
  }

  state.exercicioPage = 0;
  renderExercicios();
}

function getFilteredExercises() {
  const q = ($('#workspace-exercicios input[type="search"]')?.value || '').toLowerCase().trim();
  if (!q) return state.exerciciosData;
  return state.exerciciosData.filter(ex =>
    [ex.nome, ex.musculo_alvo, ex.categoria, ex.nivel, ex.equipamento, ex.tipo_articular].filter(Boolean).join(' ').toLowerCase().includes(q)
  );
}

function renderExercicios() {
  if (!dom.exerciseTableBody) return;

  const filtered = getFilteredExercises();
  const totalPages = Math.max(1, Math.ceil(filtered.length / EXERCISES_PER_PAGE));
  state.exercicioPage = Math.min(state.exercicioPage, totalPages - 1);

  const page = filtered.slice(state.exercicioPage * EXERCISES_PER_PAGE, (state.exercicioPage + 1) * EXERCISES_PER_PAGE);

  dom.exerciseTableBody.innerHTML = page.map(ex => `
    <tr>
      <th scope="row">${escapeHtml(ex.nome)}</th>
      <td>${escapeHtml(ex.musculo_alvo)}</td>
      <td>${escapeHtml(getExerciseValue(ex, ['tipo_articular']))}</td>
      <td><button type="button" class="table-btn" data-exercise-id="${escapeHtml(ex.id)}">Ver</button></td>
    </tr>`).join('');

  renderExercisePager(totalPages, filtered.length);
}

function renderExercisePager(totalPages, totalItems) {
  if (!dom.exercisePager) return;

  const buttons = Array.from({ length: totalPages }, (_, i) =>
    `<button type="button" class="page-btn ${i === state.exercicioPage ? 'active' : ''}" data-exercise-page="${i}" aria-label="Página ${i + 1}">${i + 1}</button>`
  ).join('');

  dom.exercisePager.innerHTML = `
    <button type="button" class="page-btn" data-exercise-page="prev" aria-label="Anterior" ${state.exercicioPage === 0 ? 'disabled' : ''}>&lsaquo;</button>
    ${buttons}
    <button type="button" class="page-btn" data-exercise-page="next" aria-label="Próximo" ${state.exercicioPage === totalPages - 1 ? 'disabled' : ''}>&rsaquo;</button>`;

  dom.exercisePager.hidden = totalItems <= EXERCISES_PER_PAGE;
}

function goToExercicioPage(page) {
  const totalPages = Math.max(1, Math.ceil(getFilteredExercises().length / EXERCISES_PER_PAGE));
  state.exercicioPage = Math.max(0, Math.min(Number(page), totalPages - 1));
  renderExercicios();
}

function openExerciseModal(id) {
  const ex = state.exerciciosData.find(e => String(e.id) === String(id));
  if (!ex || !dom.exerciseModal) return;

  $$('[data-exercise-field]', dom.exerciseModal).forEach(el => {
    const map = { name: getExerciseValue(ex, ['nome']), muscle: getExerciseValue(ex, ['musculo_alvo'], ''), equipment: getExerciseValue(ex, ['equipamento'], ''), type: getExerciseValue(ex, ['tipo_articular'], '') };
    if (map[el.dataset.exerciseField] !== undefined) el.textContent = map[el.dataset.exerciseField] || '—';
  });

  renderExerciseMedia(ex);
  dom.exerciseModal.hidden = false;
  document.body.classList.add('modal-open');
  $('.modal-close-btn', dom.exerciseModal)?.focus();
}

function closeExerciseModal() {
  if (!dom.exerciseModal) return;
  dom.exerciseModal.hidden = true;
  document.body.classList.remove('modal-open');

  if (dom.exerciseModalMedia) {
    dom.exerciseModalMedia.innerHTML = `
      <div class="exercise-media-placeholder">
        <div class="exercise-media-icon" aria-hidden="true">▶</div>
        <strong>GIF ou vídeo demonstrativo</strong>
        <span>Mídia de aproximadamente 10 segundos</span>
      </div>`;
  }
}

function renderExerciseMedia(ex) {
  if (!dom.exerciseModalMedia) return;
  const name = getExerciseValue(ex, ['nome'], 'Exercício');
  const url = getExerciseValue(ex, ['video_url', 'gif_url', 'midia_url', 'media_url'], '');

  if (!url) {
    dom.exerciseModalMedia.innerHTML = `
      <div class="exercise-media-placeholder">
        <div class="exercise-media-icon" aria-hidden="true">▶</div>
        <strong>GIF ou vídeo demonstrativo</strong>
        <span>Mídia de aproximadamente 10 segundos</span>
      </div>`;
    return;
  }

  if (/\.(mp4|webm|ogg)(\?|#|$)/i.test(url)) {
    const video = document.createElement('video');
    Object.assign(video, { src: url, autoplay: true, loop: true, muted: true, playsInline: true, controls: true });
    video.setAttribute('aria-label', `Demonstração de ${name}`);
    dom.exerciseModalMedia.replaceChildren(video);
  } else {
    const img = document.createElement('img');
    img.src = url;
    img.alt = `Demonstração de ${name}`;
    dom.exerciseModalMedia.replaceChildren(img);
  }
}

/* ========== MODAL ALUNO ========== */

async function openPresencialModal() {
  if (!dom.newStudentModal) return;
  dom.newStudentModal.hidden = false;

  // Carrega os planos da API e popula o select
  const select = $('#selectPlano', dom.newStudentModal);
  if (select) {
    try {
      const res = await fetch('/planos');
      const planos = await res.json();
      select.innerHTML = planos.map(p =>
        `<option value="${p.id}">${p.nome} — R$ ${Number(p.preco).toFixed(2)}</option>`
      ).join('');
    } catch {
      select.innerHTML = '<option value="">Erro ao carregar planos</option>';
    }
  }

  $('input', dom.newStudentModal)?.focus();
}

function closePresencialModal() {
  if (!dom.newStudentModal) return;
  dom.newStudentModal.hidden = true;
  dom.studentForm?.reset();
  resetStudentModalMode();
}

function resetStudentModalMode() {
  state.studentEditMode = false;
  state.selectedStudentId = null;

  const title = $('#modalNovoAlunoTitle', dom.newStudentModal);
  const label = $('.profile-label', dom.newStudentModal);
  const submit = $('button[type="submit"]', dom.newStudentModal);

  if (title) title.textContent = 'Novo aluno presencial';
  if (label) label.textContent = 'Cadastro rápido';
  if (submit) submit.textContent = 'Cadastrar aluno';
}

async function handleStudentFormSubmit(e) {
  e.preventDefault();

  const fd = new FormData(dom.studentForm);
  const payload = {
  nome: String(fd.get('nome') ?? '').trim(),
  email: String(fd.get('email') ?? '').trim(),
  telefone: String(fd.get('telefone') ?? '').trim(),
  objetivo: String(fd.get('objetivo') ?? '').trim(),
  modalidade: String(fd.get('modalidade') ?? 'presencial'),
  plano_id: parseInt(fd.get('plano_id') ?? '1'),
  data_nascimento: fd.get('data_nascimento') || null
};

  if (!payload.nome || !payload.email || !payload.telefone || !payload.objetivo) return;

  const msgDiv = $('#modalFormMsg');

  // MODO EDIÇÃO
  if (state.studentEditMode && state.selectedStudentId) {
    try {
      const res = await fetch(`/alunos/${state.selectedStudentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        if (msgDiv) { msgDiv.style.display = 'block'; msgDiv.style.color = '#8cc63f'; msgDiv.textContent = `✅ ${payload.nome} atualizado com sucesso!`; }
        setTimeout(async () => {
          closePresencialModal();
          if (msgDiv) msgDiv.style.display = 'none';
          await loadAlunosFromAPI();
        }, 1500);
      } else {
        if (msgDiv) { msgDiv.style.display = 'block'; msgDiv.style.color = '#f37021'; msgDiv.textContent = '❌ Erro ao atualizar aluno.'; }
      }
    } catch (err) {
      console.error('Erro ao atualizar aluno:', err);
    }
    return;
  }

  // MODO CADASTRO
  try {
    const res = await fetch('/alunos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      if (msgDiv) { msgDiv.style.display = 'block'; msgDiv.style.color = '#8cc63f'; msgDiv.textContent = `✅ ${payload.nome} cadastrado com sucesso!`; }
      dom.studentForm.reset();
      setTimeout(async () => {
        closePresencialModal();
        if (msgDiv) msgDiv.style.display = 'none';
        await loadAlunosFromAPI();
      }, 1500);
    } else {
      if (msgDiv) { msgDiv.style.display = 'block'; msgDiv.style.color = '#f37021'; msgDiv.textContent = '❌ Erro ao cadastrar aluno.'; }
    }
  } catch (err) {
    console.error('Erro ao cadastrar aluno:', err);
  }
}

async function copySelfRegistrationLink() {
  const link = `${location.origin}/cadastro`;
  try {
    await navigator.clipboard.writeText(link);
    alert('Link de cadastro copiado.');
  } catch {
    prompt('Copie o link de cadastro:', link);
  }
}

/* ========== MENUS ========== */

function closeAllMenus() {
  $$('[data-student-card-menu]').forEach(m => m.hidden = true);
  $$('[data-action="student-card-menu"]').forEach(b => b.setAttribute('aria-expanded', 'false'));

  const profileMenu = $('[data-profile-menu]');
  const profileBtn = $('[data-action="student-profile-menu"]');
  if (profileMenu) profileMenu.hidden = true;
  if (profileBtn) profileBtn.setAttribute('aria-expanded', 'false');
}

function toggleStudentCardMenu(id, btn) {
  const card = btn.closest('.student-card');
  const menu = card?.querySelector('[data-student-card-menu]');
  if (!menu) return;

  const wasOpen = !menu.hidden;
  closeAllMenus();
  if (!wasOpen) {
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
  }
}

function toggleProfileMenu() {
  const menu = $('[data-profile-menu]');
  const btn = $('[data-action="student-profile-menu"]');
  if (!menu || !btn) return;

  const wasOpen = !menu.hidden;
  closeAllMenus();
  menu.hidden = wasOpen;
  btn.setAttribute('aria-expanded', String(!wasOpen));
}

/* ========== CHAT IA ========== */

function toggleChat() {
  if (!dom.chatDrawer) return;
  const open = dom.chatDrawer.classList.toggle('open');
  $('.floating-chat-toggle')?.setAttribute('aria-expanded', String(open));
}

function appendChatMessage(role, text) {
  const msg = document.createElement('div');
  msg.className = `chat-msg ${role}`;
  msg.textContent = text;
  dom.chatBody.appendChild(msg);
  dom.chatBody.scrollTop = dom.chatBody.scrollHeight;
  return msg;
}

async function sendChatMessage(e) {
  e.preventDefault();
  const text = dom.chatInput.value.trim();
  if (!text) return;

  appendChatMessage('user', text);
  dom.chatInput.value = '';
  const loading = appendChatMessage('bot', '🤔 Pensando...');

  try {
    const res = await fetch(CHAT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pergunta: text })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.resposta) {
      loading.innerHTML = typeof marked !== 'undefined' ? marked.parse(data.resposta) : data.resposta;
    } else {
      loading.textContent = 'Erro na resposta do servidor.';
    }
  } catch (err) {
    console.error('Erro ao consultar a API:', err);
    loading.textContent = '⚠️ Erro ao conectar ao servidor.';
  }

  dom.chatBody.scrollTop = dom.chatBody.scrollHeight;
}

/* ========== EVENTOS ========== */

const actions = {
  'toggle-chat': toggleChat,
  'back-to-workspace': showTrainingLanding,
  'back-to-students': () => showWorkspace(DEFAULT_WORKSPACE),
  'open-modal-presencial': openPresencialModal,
  'close-modal-presencial': closePresencialModal,
  'copy-self-registration-link': copySelfRegistrationLink,
  'student-profile-menu': toggleProfileMenu,
  'student-card-menu': (_, t) => toggleStudentCardMenu(t.dataset.studentId, t),
  'contact-student': (_, t) => contactStudent(t.dataset.studentId || state.selectedStudentId),
  'edit-student': (_, t) => editStudent(t.dataset.studentId || state.selectedStudentId),
  'delete-student': (_, t) => deleteStudent(t.dataset.studentId || state.selectedStudentId),
  'restore-student': (_, t) => restoreStudent(t.dataset.studentId),
  'student-page-prev': () => changeStudentPage(-1),
  'student-page-next': () => changeStudentPage(1),
  'close-modal-exercicio': closeExerciseModal,
  'new-assessment': () => console.log('TODO: nova avaliação física'),
  'new-workout': () => console.log('TODO: novo treino'),
  'new-exercise': () => console.log('TODO: novo exercício')
};

function handleClick(e) {
  if (e.target === dom.newStudentModal) return closePresencialModal();
  if (e.target === dom.exerciseModal) return closeExerciseModal();
  if (e.target.closest('.brand')) return switchTab('geral');

  const profileMenu = $('[data-profile-menu]');
  if (profileMenu && !profileMenu.hidden && !e.target.closest('[data-profile-menu], [data-action="student-profile-menu"]')) {
    closeAllMenus();
  }

  const t = e.target.closest('[data-tab], [data-workspace], [data-student-id], [data-exercise-id], [data-action], [data-student-page], [data-exercise-page]');
  if (!t) {
    if (!e.target.closest('.student-card')) closeAllMenus();
    return;
  }

  const { tab, workspace, studentId, exerciseId, action, studentPage, exercisePage } = t.dataset;

  if (tab) return switchTab(tab);
  if (workspace) return showWorkspace(workspace);
  if (action) return actions[action]?.(e, t);
  if (exerciseId) return openExerciseModal(exerciseId);

  if (studentId && !t.closest('[data-student-card-menu], .student-card-actions')) {
    return openStudentProfile(studentId);
  }

  if (studentPage) return actions[`student-page-${studentPage}`]?.();
  if (exercisePage === 'prev') return goToExercicioPage(state.exercicioPage - 1);
  if (exercisePage === 'next') return goToExercicioPage(state.exercicioPage + 1);
  if (exercisePage !== undefined) return goToExercicioPage(Number(exercisePage));
}

function handleKeydown(e) {
  if (e.key === 'Escape') {
    if (dom.exerciseModal && !dom.exerciseModal.hidden) return closeExerciseModal();
    if (dom.newStudentModal && !dom.newStudentModal.hidden) return closePresencialModal();
    return closeAllMenus();
  }

  const card = e.target.closest('.student-card');
  if (!card || (e.key !== 'Enter' && e.key !== ' ')) return;
  if (e.target.closest('button, a, input, select, textarea')) return;
  e.preventDefault();
  if (card.dataset.studentId) openStudentProfile(card.dataset.studentId);
}

/* ========== INIT ========== */

function init() {
  applyTheme('general');
  showTrainingLanding();

  // Busca e filtros de alunos
  $('#workspace-alunos input[type="search"]')?.addEventListener('input', () => { state.studentPage = 0; renderStudentCards(); });
  $$('[data-student-filter]').forEach(b => b.addEventListener('click', () => {
    state.studentFilter = b.dataset.studentFilter || 'todos';
    state.studentPage = 0;
    $$('[data-student-filter]').forEach(x => x.classList.toggle('active', x === b));
    renderStudentCards();
  }));
  $$('[data-student-status]').forEach(b => b.addEventListener('click', () => {
    state.studentStatus = b.dataset.studentStatus || 'ativos';
    state.studentPage = 0;
    $$('[data-student-status]').forEach(x => x.classList.toggle('active', x === b));
    renderStudentCards();
  }));

  // Busca e filtro de exercícios
  $('#workspace-exercicios input[type="search"]')?.addEventListener('input', () => { state.exercicioPage = 0; renderExercicios(); });
  $('#workspace-exercicios select')?.addEventListener('change', e => loadExercicios(e.target.value));

  // Filtros financeiros
  $$('.finance-filter[data-fin-role]').forEach(b => b.addEventListener('click', () => {
    const role = b.dataset.finRole;
    $$('.finance-filter').forEach(x => x.classList.toggle('active', x === b));
    $$('#financeTable tbody tr').forEach(row => { row.hidden = role !== 'todos' && row.dataset.finRole !== role; });
  }));

  loadExercicios();

  document.addEventListener('click', handleClick);
  document.addEventListener('keydown', handleKeydown);
  dom.chatForm?.addEventListener('submit', sendChatMessage);
  dom.studentForm?.addEventListener('submit', handleStudentFormSubmit);
}

document.addEventListener('DOMContentLoaded', init);