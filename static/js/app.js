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
  exercicioCategoria: '',
  editingAssessmentId: null,
  anamneseOnly: false
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
    modality: aluno.modalidade ? `${aluno.modalidade.trim().charAt(0).toLocaleUpperCase('pt-BR')}${aluno.modalidade.trim().slice(1).toLocaleLowerCase('pt-BR')}` : 'Não informado',
    summary: `${aluno.objetivo ?? '—'} • ${aluno.plano ?? '—'}`
  });

  closeAllMenus();
  $$('.workspace-panel').forEach(p => { p.classList.remove('active'); p.hidden = true; });
  panel.classList.add('active');
  panel.hidden = false;
  dom.trainingWorkspace?.classList.add('is-focused');
  loadStudentRecords(id);
}

async function deleteStudent(id = state.selectedStudentId) {
  const aluno = state.alunosData.find(a => String(a.id) === String(id));
  if (!aluno || !aluno.ativo) return;
  closeAllMenus();
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
  closeAllMenus();

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
        const editedId = String(state.selectedStudentId);
        if (msgDiv) { msgDiv.style.display = 'block'; msgDiv.style.color = '#8cc63f'; msgDiv.textContent = `✅ ${payload.nome} atualizado com sucesso!`; }
        setTimeout(async () => {
          closePresencialModal();
          if (msgDiv) msgDiv.style.display = 'none';
          await loadAlunosFromAPI();
          openStudentProfile(editedId);
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

const anamneseFields = [
  ['pratica_atividade','Pratica atividade física?','bool'], ['atividade_qual','Qual atividade pratica?'], ['frequencia_semanal','Frequência semanal'],
  ['treinou_personal','Já treinou com personal?','bool'], ['nivel_condicionamento','Nível de condicionamento'], ['doenca_diagnosticada','Doenças diagnosticadas'],
  ['medicamentos','Medicamentos em uso'], ['historico_cirurgia_lesao','Cirurgias ou lesões anteriores'], ['dores_articulares','Dores ou desconfortos'],
  ['restricao_medica','Possui restrição médica?','bool'], ['medico_liberou','Liberação médica'], ['qualidade_sono','Qualidade do sono'], ['horas_sono','Horas de sono','number'],
  ['nivel_estresse','Nível de estresse'], ['bebida_alcoolica','Consumo de bebida alcoólica'], ['fumante','Tabagismo'], ['suplementos','Suplementos'],
  ['acompanhamento_nutricional','Acompanhamento nutricional?','bool'], ['restricao_alimentar','Restrições alimentares'], ['refeicoes_por_dia','Refeições por dia','number'],
  ['objetivo_principal','Objetivo principal'], ['prazo_resultado','Prazo desejado'], ['regiao_priorizar','Região a priorizar'], ['ja_tentou','O que já tentou?'], ['disponibilidade','Disponibilidade']
];
const basicAssessmentFields = [
  ['data_avaliacao','Data da avaliação','date'], ['data_avaliacao_anterior','Data da avaliação anterior','date'], ['peso_kg','Peso (kg)','number'], ['altura_m','Altura (m)','number'], ['imc','IMC','number'], ['percentual_gordura','Gordura corporal (%)','number'], ['massa_gorda_kg','Massa gorda (kg)','number'], ['massa_magra_kg','Massa magra (kg)','number'],
  ['observacoes_profissional','Observações do profissional','textarea'], ['mensagem_aluno','Mensagem ao aluno','textarea'], ['recomendacoes','Recomendações','textarea'], ['frequencia_ideal','Frequência ideal semanal','number'], ['foco_proximo_bloco','Foco do próximo bloco','textarea'], ['indicacao_nutricional','Indicação nutricional?','bool'], ['proxima_reavaliacao','Próxima reavaliação','date']
];
const premiumAssessmentFields = [
  ['circ_ombro','Circunferência do ombro (cm)','number'], ['circ_peitoral','Circunferência peitoral (cm)','number'], ['circ_cintura','Circunferência da cintura (cm)','number'], ['circ_abdomen','Circunferência do abdômen (cm)','number'], ['circ_quadril','Circunferência do quadril (cm)','number'], ['circ_braco_dir','Braço direito (cm)','number'], ['circ_braco_esq','Braço esquerdo (cm)','number'], ['circ_coxa_dir','Coxa direita (cm)','number'], ['circ_coxa_esq','Coxa esquerda (cm)','number'], ['circ_panturrilha_dir','Panturrilha direita (cm)','number'], ['circ_panturrilha_esq','Panturrilha esquerda (cm)','number'],
  ['dobra_peitoral','Dobra peitoral (mm)','number'], ['dobra_abdominal','Dobra abdominal (mm)','number'], ['dobra_coxa','Dobra da coxa (mm)','number'], ['dobra_triceps','Dobra do tríceps (mm)','number'], ['dobra_subescapular','Dobra subescapular (mm)','number'], ['dobra_suprailiaca','Dobra supra-ilíaca (mm)','number'], ['dobra_axilar_medial','Dobra axilar média (mm)','number'], ['dobra_somatorio','Somatório das dobras (mm)','number'], ['dobra_percentual_gordura','Gordura por dobras (%)','number'],
  ['postural_cabeca','Postura da cabeça'], ['postural_ombros','Postura dos ombros'], ['postural_coluna_toracica','Coluna torácica'], ['postural_coluna_lombar','Coluna lombar'], ['postural_pelve','Pelve'], ['postural_joelhos','Joelhos'], ['postural_pes','Pés'], ['postural_observacoes','Observações posturais','textarea'], ['dinam_mao_dir','Dinamometria mão direita','number'], ['dinam_mao_esq','Dinamometria mão esquerda','number']
];
const performanceAssessmentFields = [
  ['func_flexao_braco','Flexões de braço','number'], ['func_agachamento','Agachamentos no teste','number'], ['func_prancha_seg','Prancha (segundos)','number'], ['vo2_distancia_m','Distância do teste VO₂ (m)','number'], ['vo2_maximo','VO₂ máximo','number'], ['vo2_classificacao','Classificação VO₂'],
  ['perf_forca_inf_1','Força inferior — teste 1'], ['perf_forca_inf_2','Força inferior — teste 2'], ['perf_forca_inf_3','Força inferior — teste 3'], ['perf_forca_sup_1','Força superior — teste 1'], ['perf_forca_sup_2','Força superior — teste 2'], ['perf_forca_sup_3','Força superior — teste 3'], ['perf_potencia_1','Potência — teste 1'], ['perf_potencia_2','Potência — teste 2'], ['perf_potencia_3','Potência — teste 3'], ['perf_pontos_fortes','Pontos fortes','textarea'], ['perf_limitadores','Limitadores','textarea'], ['perf_protocolo','Protocolo utilizado','textarea'], ['perf_periodizacao','Planejamento / periodização','textarea']
];

function inputFieldsMarkup(fields) {
  return fields.map(([key, label, type]) => {
    const control = type === 'bool'
      ? `<select name="${key}"><option value="">Não informado</option><option value="true">Sim</option><option value="false">Não</option></select>`
      : type === 'textarea' ? `<textarea name="${key}" rows="2"></textarea>` : `<input name="${key}" type="${type || 'text'}" ${type === 'number' ? 'step="any"' : ''}>`;
    return `<label>${escapeHtml(label)}${control}</label>`;
  }).join('');
}

function renderInputFields(container, fields) {
  container.innerHTML = inputFieldsMarkup(fields);
}

function assessmentGroupMarkup(title, description, fields, number) {
  if (!fields.length) return '';
  return `<section class="assessment-group" aria-labelledby="assessment-group-${number}">
    <header class="assessment-group-heading"><span class="assessment-group-number">${number}</span><div><h4 id="assessment-group-${number}">${escapeHtml(title)}</h4><p>${escapeHtml(description)}</p></div></header>
    <div class="form-field-grid">${inputFieldsMarkup(fields)}</div>
  </section>`;
}

function renderAssessmentFields(type) {
  const groups = [
    ['Medidas básicas e composição corporal', 'Dados antropométricos e composição corporal do aluno.', basicAssessmentFields.slice(0, 8)]
  ];

  groups.push(
    ['Perimetria (circunferências)', 'Medidas corporais para acompanhar as mudanças ao longo do tempo.', premiumAssessmentFields.slice(0, 11)],
    ['Dobras cutâneas', 'Medidas de dobras e estimativas da composição corporal.', premiumAssessmentFields.slice(11, 20)]
  );

  if (type === 'premium' || type === 'performance') {
    groups.push(
      ['Avaliação postural', 'Observação dos principais segmentos e alinhamentos corporais.', premiumAssessmentFields.slice(20, 28)],
      ['Dinamometria manual', 'Avaliação da força de preensão da mão direita e esquerda.', premiumAssessmentFields.slice(28, 30)]
    );
  }

  if (type === 'performance') {
    groups.push(
      ['Testes funcionais', 'Resultados dos testes selecionados para avaliar a capacidade funcional.', performanceAssessmentFields.slice(0, 3)],
      ['Capacidade cardiorrespiratória — VO₂', 'Distância, estimativa e classificação do teste cardiorrespiratório.', performanceAssessmentFields.slice(3, 6)],
      ['Testes de força', 'Resultados dos testes de força dos membros inferiores e superiores.', performanceAssessmentFields.slice(6, 12)],
      ['Testes de potência', 'Resultados dos testes de potência realizados.', performanceAssessmentFields.slice(12, 15)],
      ['Síntese de desempenho', 'Pontos fortes, limitadores, protocolo e planejamento.', performanceAssessmentFields.slice(15)]
    );
  }

  groups.push(['Análise profissional e próximos passos', 'Observações, recomendações e planejamento de acompanhamento.', basicAssessmentFields.slice(8)]);

  const container = $('#assessmentFields');
  container.className = 'assessment-field-sections';
  container.innerHTML = groups.map((group, index) => assessmentGroupMarkup(...group, index + 1)).join('');
}

function openAssessmentModal(studentId = null, mode = 'create') {
  const modal = $('#assessmentModal');
  const form = $('#assessmentForm');
  if (!modal || !form) return;
  state.editingAssessmentId = mode === 'edit' ? state.editingAssessmentId : null;
  state.anamneseOnly = mode === 'anamnese';
  form.reset();
  const studentSelect = $('#assessmentStudent');
  studentSelect.innerHTML = '<option value="">Selecione um aluno</option>' + state.alunosData.filter(a => a.ativo).map(a => `<option value="${a.id}">${escapeHtml(a.nome)}</option>`).join('');
  if (studentId) studentSelect.value = String(studentId);
  updateAssessmentStudentAge();
  studentSelect.disabled = Boolean(studentId);
  $('#assessmentModalTitle').textContent = mode === 'edit' ? 'Editar avaliação física' : state.anamneseOnly ? 'Nova anamnese' : 'Nova avaliação física';
  $('#anamneseFields').parentElement.hidden = !state.anamneseOnly;
  $('#assessmentFields').parentElement.hidden = state.anamneseOnly;
  $('#assessmentType').parentElement.hidden = mode === 'edit' || state.anamneseOnly;
  $('#assessmentForm button[type="submit"]').textContent = state.anamneseOnly ? 'Salvar anamnese' : mode === 'edit' ? 'Salvar alterações' : 'Salvar avaliação';
  const anamFields = [...anamneseFields];
  renderInputFields($('#anamneseFields'), anamFields);
  renderAssessmentFields($('#assessmentType').value || 'essencial');
  $('#assessmentFormMsg').textContent = '';
  modal.hidden = false;
}

function updateAssessmentStudentAge() {
  const student = state.alunosData.find(a => String(a.id) === String($('#assessmentStudent')?.value));
  const output = $('#assessmentStudentAge');
  if (!output) return;
  if (!student?.data_nascimento) { output.textContent = 'Idade não informada no cadastro.'; return; }
  const born = new Date(`${student.data_nascimento}T00:00:00`);
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  if (now.getMonth() < born.getMonth() || (now.getMonth() === born.getMonth() && now.getDate() < born.getDate())) age--;
  output.textContent = `Idade: ${age} anos`;
}

function collectFields(container) {
  const data = {};
  $$('input[name], select[name], textarea[name]', container).forEach(el => {
    if (el.value === '') return;
    data[el.name] = el.type === 'number' ? Number(el.value) : el.tagName === 'SELECT' && ['true','false'].includes(el.value) ? el.value === 'true' : el.value;
  });
  return data;
}

function closeAssessmentModal() {
  const modal = $('#assessmentModal');
  if (modal) modal.hidden = true;
  state.editingAssessmentId = null;
  state.anamneseOnly = false;
  const anamSection = $('#anamneseFields')?.parentElement;
  if (anamSection) anamSection.hidden = false;
  $('#assessmentStudent')?.removeAttribute('disabled');
}

async function handleAssessmentSubmit(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const msg = $('#assessmentFormMsg');
  const studentId = $('#assessmentStudent').value || state.selectedStudentId;
  if (!studentId) { msg.textContent = 'Selecione um aluno.'; return; }
  const tipo = $('#assessmentType').value;
  const dadosAvaliacao = collectFields($('#assessmentFields'));
  try {
    if (state.anamneseOnly) {
      const dadosAnamnese = collectFields($('#anamneseFields'));
      if (!Object.keys(dadosAnamnese).length) throw new Error('Preencha ao menos uma resposta da anamnese.');
      const res = await fetch(`/alunos/${studentId}/anamneses`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({dados:dadosAnamnese})});
      if (!res.ok) throw new Error((await res.json()).detail || 'Falha ao salvar a anamnese.');
    } else if (state.editingAssessmentId) {
      const res = await fetch(`/avaliacoes/${state.editingAssessmentId}`, {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({tipo, dados:dadosAvaliacao})});
      if (!res.ok) throw new Error((await res.json()).detail || 'Não foi possível atualizar.');
    } else {
      const res = await fetch(`/alunos/${studentId}/avaliacoes`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({tipo, dados:dadosAvaliacao})});
      if (!res.ok) throw new Error((await res.json()).detail || 'Falha ao salvar a avaliação.');
    }
    msg.textContent = state.anamneseOnly ? 'Anamnese salva.' : state.editingAssessmentId ? 'Avaliação atualizada.' : 'Avaliação salva.';
    await loadStudentRecords(studentId);
    setTimeout(closeAssessmentModal, 450);
  } catch (err) { msg.textContent = err.message || 'Erro ao salvar os registros.'; }
}

async function loadStudentRecords(studentId) {
  try {
    const [ar, nr] = await Promise.all([fetch(`/alunos/${studentId}/avaliacoes`), fetch(`/alunos/${studentId}/anamneses`)]);
    if (!ar.ok || !nr.ok) throw new Error('Falha ao carregar histórico');
    const [assessments, anamneses] = await Promise.all([ar.json(), nr.json()]);
    $('#assessmentHistory').innerHTML = assessments.length ? assessments.map(a => `<article class="record-row"><div><strong>${escapeHtml(a.tipo)} · ${escapeHtml(a.data_avaliacao)}</strong><small>${a.peso_kg ? `${escapeHtml(a.peso_kg)} kg` : 'Medidas registradas'}</small></div><span><button type="button" class="table-btn" data-action="edit-assessment" data-record-id="${a.id}">Editar</button><button type="button" class="table-btn" data-action="delete-assessment" data-record-id="${a.id}">Excluir</button></span></article>`).join('') : '<div class="empty-state">Nenhuma avaliação cadastrada.</div>';
    $('#anamneseHistory').innerHTML = anamneses.length ? anamneses.map(a => `<article class="record-row"><div><strong>Anamnese · ${escapeHtml(a.criada_em?.slice(0,10) || '')}</strong><small>Questionário de saúde e objetivos</small></div><span><button type="button" class="table-btn" data-action="view-anamnesis" data-record-id="${a.id}">Visualizar</button><button type="button" class="table-btn" data-action="send-anamnesis" data-record-id="${a.id}">Enviar</button><button type="button" class="table-btn" data-action="delete-anamnesis" data-record-id="${a.id}">Excluir</button></span></article>`).join('') : '<div class="empty-state">Nenhuma anamnese registrada.</div>';
  } catch (err) { console.error(err); }
}

async function editAssessment(id) {
  const res = await fetch(`/avaliacoes/${id}`); if (!res.ok) return;
  const record = await res.json(); state.editingAssessmentId = id; openAssessmentModal(record.aluno_id, 'edit');
  $('#assessmentType').value = record.tipo; renderAssessmentFields(record.tipo);
  Object.entries(record).forEach(([k,v]) => { const el = $(`[name="${k}"]`, $('#assessmentFields')); if (el && v != null) el.value = String(v).slice(0,10); });
}

async function deleteAssessment(id) {
  if (!confirm('Excluir esta avaliação física?')) return;
  const res = await fetch(`/avaliacoes/${id}`, {method:'DELETE'}); if (res.ok) await loadStudentRecords(state.selectedStudentId);
}

async function viewAnamnesis(id, send = false) {
  const res = await fetch(`/anamneses/${id}`); if (!res.ok) return;
  const data = await res.json();
  const pairs = anamneseFields.filter(([key]) => data[key] !== null && data[key] !== undefined).map(([key,label]) => `${label}: ${data[key] === true ? 'Sim' : data[key] === false ? 'Não' : data[key]}`);
  const text = `Anamnese FitLife\n${pairs.join('\n')}`;
  if (!send) { alert(text); return; }
  const student = state.alunosData.find(a => String(a.id) === String(state.selectedStudentId));
  let phone = (student?.telefone || '').replace(/\D/g, '');
  if (phone.length === 10 || phone.length === 11) phone = `55${phone}`;
  if (!phone) { await navigator.clipboard.writeText(text); alert('Anamnese copiada. O aluno não tem telefone cadastrado.'); return; }
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener');
}

async function deleteAnamnesis(id) {
  if (!confirm('Excluir esta anamnese?')) return;
  const res = await fetch(`/anamneses/${id}`, {method:'DELETE'}); if (res.ok) await loadStudentRecords(state.selectedStudentId);
}

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
  'new-assessment': async () => { if (!state.alunosData.length) await loadAlunosFromAPI(); openAssessmentModal(state.selectedStudentId); },
  'new-anamnesis': () => openAssessmentModal(state.selectedStudentId, 'anamnese'),
  'close-assessment': closeAssessmentModal,
  'edit-assessment': (_, t) => editAssessment(t.dataset.recordId),
  'delete-assessment': (_, t) => deleteAssessment(t.dataset.recordId),
  'view-anamnesis': (_, t) => viewAnamnesis(t.dataset.recordId),
  'send-anamnesis': (_, t) => viewAnamnesis(t.dataset.recordId, true),
  'delete-anamnesis': (_, t) => deleteAnamnesis(t.dataset.recordId),
  'new-workout': () => console.log('TODO: novo treino'),
  'new-exercise': () => console.log('TODO: novo exercício')
};

function handleClick(e) {
  if (e.target === dom.newStudentModal) return closePresencialModal();
  if (e.target === dom.exerciseModal) return closeExerciseModal();
  if (e.target === $('#assessmentModal')) return closeAssessmentModal();
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
    if ($('#assessmentModal') && !$('#assessmentModal').hidden) return closeAssessmentModal();
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
  $('#assessmentForm')?.addEventListener('submit', handleAssessmentSubmit);
  $('#assessmentType')?.addEventListener('change', e => renderAssessmentFields(e.target.value));
  $('#assessmentStudent')?.addEventListener('change', updateAssessmentStudentAge);
}

document.addEventListener('DOMContentLoaded', init);
