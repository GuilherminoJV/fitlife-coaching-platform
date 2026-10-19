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
  editingAssessmentId: null,
  assessmentsData: [],
  anamneseOnly: false,
  viewingAssessment: false,
  selectedWorkoutId: null,
  treinosData: [],
  homeSummary: null,
  activeTrainingSessions: {},
  editingAnamnesisId: null,
  draggedWorkoutExercise: null
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
  chatSendButton: $('#chatSendButton'),
  chatBackdrop: $('#chatBackdrop'),
  trainingWorkspace: $('#trainingWorkspace'),
  workspaceFocusLabel: $('#workspaceFocusLabel'),
  workspaceFocusTitle: $('#workspaceFocusTitle'),
  studentGrid: $('#studentGrid'),
  studentPager: $('#studentPager'),
  studentPagerLabel: $('#studentPagerLabel'),
  homeStudentCount: $('[data-metric="active-students"]'),
  homeStudentCountStatus: $('[data-metric-status="active-students"]'),
  homeStudentsTableBody: $('#homeStudentsTableBody'),
  homeAttentionContent: $('#homeAttentionContent'),
  studentForm: $('#presencialStudentForm'),
  newStudentModal: $('#modalNovoAluno'),
  exerciseTableBody: $('#exerciseTableBody'),
  exercisePager: $('#exercicioPager'),
  exerciseModal: $('#modalExercicio'),
  exerciseModalMedia: $('#exerciseModalMedia'),
  newExerciseModal: $('#modalNovoExercicio'),
  exerciseForm: $('#exerciseForm')
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
  if ($('#backToStudentsButton')) $('#backToStudentsButton').hidden = true;
  $$('.workspace-btn[data-workspace]').forEach(b => b.classList.remove('active'));
  $$('.workspace-panel').forEach(p => { p.classList.remove('active'); p.hidden = true; });
  closeAllMenus();
}

function showWorkspace(name) {
  if (!dom.trainingWorkspace) return;
  dom.trainingWorkspace.classList.add('is-focused');
  if ($('#backToStudentsButton')) $('#backToStudentsButton').hidden = true;

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
    loadExercicios();
  }
}

/* ========== ALUNOS — API ========== */

function renderHomeStudentsTableState(message, stateName) {
  if (!dom.homeStudentsTableBody) return;
  dom.homeStudentsTableBody.innerHTML = `<tr><td class="home-table-state" colspan="4" data-state="${stateName}">${escapeHtml(message)}</td></tr>`;
}

const homePendingReasonLabels = {
  reavaliacao_vencida: 'Reavaliação vencida',
  treino_vencido: 'Treino vencido',
  sem_treino_ativo: 'Sem treino ativo'
};

function homePendingStudents(summary) {
  return new Map((summary?.alunos_pendentes || []).map(item => [
    String(item.aluno_id),
    Array.isArray(item.motivos) ? item.motivos : []
  ]));
}

function renderHomeStudentsTable(students, summary, summaryError = false) {
  if (!dom.homeStudentsTableBody) return;
  if (!students.length) {
    renderHomeStudentsTableState('Nenhum aluno ativo encontrado.', 'empty');
    return;
  }

  const pending = homePendingStudents(summary);
  const activeTrainings = new Map((summary?.treinos?.ativos || []).map(training => [
    String(training.aluno_id), training
  ]));
  dom.homeStudentsTableBody.innerHTML = students.map(student => `
    <tr>
      <th scope="row">${escapeHtml(student.nome || 'Aluno sem nome')}</th>
      <td>${summaryError
        ? '<span class="home-table-neutral">Indisponível</span>'
        : activeTrainings.has(String(student.id))
          ? activeTrainings.get(String(student.id)).data_fim
            ? `<span class="home-table-neutral">${escapeHtml(formatWorkoutDate(activeTrainings.get(String(student.id)).data_fim))}</span>`
            : '<span class="home-table-upcoming">Sem prazo</span>'
          : '<span class="home-table-neutral">—</span>'}</td>
      <td><span class="home-table-upcoming">Em breve</span></td>
      <td>${summaryError
        ? '<span class="home-table-neutral">Indisponível</span>'
        : pending.has(String(student.id))
          ? `<span class="home-table-exception home-table-exception-pending">Pendente</span><small class="home-table-reason">${escapeHtml(pending.get(String(student.id)).map(reason => homePendingReasonLabels[reason] || reason).join(' · '))}</small>`
          : '<span class="home-table-neutral">Em dia</span>'}</td>
    </tr>
  `).join('');
}

function uniqueAttentionPeople(...groups) {
  const people = new Map();
  groups.flat().forEach(person => {
    if (person?.aluno_id == null) return;
    people.set(String(person.aluno_id), person);
  });
  return [...people.values()];
}

function renderAttentionNames(people) {
  const visible = people.slice(0, 3).map(person =>
    `<button type="button" class="home-student-link" data-action="open-home-student" data-student-id="${escapeHtml(person.aluno_id)}">${escapeHtml(person.nome || 'Aluno')}</button>`
  );
  const extra = people.length - visible.length;
  if (extra > 0) visible.push(`<span class="attention-more">e mais ${extra}</span>`);
  return visible.length ? visible.join('<span class="attention-name-separator" aria-hidden="true"> · </span>') : '—';
}

function renderAttentionCard({ title, people, tone = 'neutral', detail = '' }) {
  const classes = ['attention-item'];
  if (tone === 'urgent') classes.push('attention-item-urgent');
  if (tone === 'warning') classes.push('attention-item-warning');
  const count = people.length;
  return `
    <article class="${classes.join(' ')}">
      <span class="attention-indicator" aria-hidden="true"></span>
      <div class="attention-copy">
        <div class="attention-card-heading"><strong>${escapeHtml(title)}</strong><span class="attention-count">${count} ${count === 1 ? 'aluno' : 'alunos'}</span></div>
        ${detail ? `<small class="attention-detail">${escapeHtml(detail)}</small>` : ''}
        <small class="attention-people">${renderAttentionNames(people)}</small>
      </div>
    </article>`;
}

function renderAttentionLine({ title, people }) {
  return `<div class="attention-minor-row"><strong>${escapeHtml(title)} <span>${people.length}</span></strong><small>${renderAttentionNames(people)}</small></div>`;
}

function renderHomeAttention(summary, error = false) {
  const container = dom.homeAttentionContent;
  if (!container) return;
  container.setAttribute('aria-busy', 'false');
  if (error || !summary || !summary.reavaliacoes || !summary.treinos) {
    container.innerHTML = '<p class="attention-state" data-state="error">Não foi possível carregar as pendências. Tente novamente mais tarde.</p>';
    return;
  }

  const reavaliacoes = summary.reavaliacoes;
  const treinos = summary.treinos;
  const vencidos = uniqueAttentionPeople(reavaliacoes.vencidas || [], treinos.vencidos || []);
  const semTreino = uniqueAttentionPeople(treinos.alunos_sem_treino_ativo || []);
  const reavaliacoesProximas = uniqueAttentionPeople(reavaliacoes.proximas || []);
  const treinosProximos = uniqueAttentionPeople(treinos.proximos_do_fim || []);
  const semData = uniqueAttentionPeople(reavaliacoes.sem_proxima_data || []);
  const semAvaliacao = uniqueAttentionPeople(reavaliacoes.alunos_sem_avaliacao || []);
  const semAnamnese = uniqueAttentionPeople(summary.alunos_sem_anamnese || []);
  const detailVencidos = [
    (reavaliacoes.vencidas || []).length ? `${reavaliacoes.vencidas.length} ${reavaliacoes.vencidas.length === 1 ? 'reavaliação' : 'reavaliações'}` : '',
    (treinos.vencidos || []).length ? `${treinos.vencidos.length} ${treinos.vencidos.length === 1 ? 'treino' : 'treinos'}` : ''
  ].filter(Boolean).join(' · ');

  const cards = [];
  if (vencidos.length) cards.push(renderAttentionCard({ title: 'Vencidos', people: vencidos, tone: 'urgent', detail: detailVencidos }));
  if (semTreino.length) cards.push(renderAttentionCard({ title: 'Alunos sem treino ativo', people: semTreino, tone: 'warning' }));
  if (reavaliacoesProximas.length) cards.push(renderAttentionCard({ title: 'Reavaliações próximas', people: reavaliacoesProximas }));
  if (treinosProximos.length) cards.push(renderAttentionCard({ title: 'Treinos próximos do fim', people: treinosProximos }));

  const linhas = [
    semData.length ? renderAttentionLine({ title: 'Sem data de reavaliação', people: semData }) : '',
    semAvaliacao.length ? renderAttentionLine({ title: 'Sem avaliação', people: semAvaliacao }) : '',
    semAnamnese.length ? renderAttentionLine({ title: 'Sem anamnese', people: semAnamnese }) : ''
  ].filter(Boolean);

  if (!cards.length && !linhas.length) {
    container.innerHTML = '<p class="attention-state attention-state-positive" data-state="empty">Nenhuma pendência hoje</p>';
    return;
  }

  container.innerHTML = `${cards.length ? `<div class="attention-grid">${cards.join('')}</div>` : ''}${linhas.length ? `<div class="attention-minor-list">${linhas.join('')}</div>` : ''}`;
}

async function fetchHomeJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function loadHomeDashboard() {
  if (dom.homeStudentCount) dom.homeStudentCount.textContent = '…';
  if (dom.homeStudentCountStatus) dom.homeStudentCountStatus.textContent = 'Carregando alunos ativos';
  if (dom.homeAttentionContent) {
    dom.homeAttentionContent.setAttribute('aria-busy', 'true');
    dom.homeAttentionContent.innerHTML = '<p class="attention-state" data-state="loading">Carregando informações…</p>';
  }
  renderHomeStudentsTableState('Carregando alunos…', 'loading');

  const [studentsResult, summaryResult] = await Promise.allSettled([
    fetchHomeJson('/alunos?apenas_ativos=true'),
    fetchHomeJson('/home/resumo')
  ]);
  const students = studentsResult.status === 'fulfilled' ? studentsResult.value : null;
  const summary = summaryResult.status === 'fulfilled' ? summaryResult.value : null;

  if (Array.isArray(students)) {
    state.alunosData = students;
    if (dom.homeStudentCount && !summary) dom.homeStudentCount.textContent = String(students.length);
    if (dom.homeStudentCountStatus && !summary) {
      dom.homeStudentCountStatus.textContent = students.length === 1 ? '1 aluno ativo' : `${students.length} alunos ativos`;
    }
  } else {
    console.error('Erro ao carregar alunos da Home:', studentsResult.reason);
  }

  if (summary && Number.isFinite(Number(summary.indicadores?.alunos_ativos))) {
    state.homeSummary = summary;
    if (dom.homeStudentCount) dom.homeStudentCount.textContent = String(summary.indicadores.alunos_ativos);
    if (dom.homeStudentCountStatus) {
      const count = Number(summary.indicadores.alunos_ativos);
      dom.homeStudentCountStatus.textContent = count === 1 ? '1 aluno ativo' : `${count} alunos ativos`;
    }
    renderHomeAttention(summary);
  } else {
    state.homeSummary = null;
    console.error('Erro ao carregar resumo da Home:', summaryResult.status === 'rejected' ? summaryResult.reason : 'Resposta inválida da API');
    renderHomeAttention(null, true);
    if (!Array.isArray(students)) {
      if (dom.homeStudentCount) dom.homeStudentCount.textContent = '—';
      if (dom.homeStudentCountStatus) dom.homeStudentCountStatus.textContent = 'Não foi possível carregar';
    }
  }

  if (Array.isArray(students)) {
    renderHomeStudentsTable(students, summary, !summary);
  } else {
    renderHomeStudentsTableState('Não foi possível carregar os alunos. Tente novamente mais tarde.', 'error');
  }
}

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
            ? `<button type="button" data-action="restore-student" data-student-id="${a.id}">Reativar aluno</button>`
            : `<button type="button" data-action="edit-student" data-student-id="${a.id}">Editar aluno</button>
               <button type="button" data-action="delete-student" data-student-id="${a.id}">Desativar aluno</button>`}
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
  if ($('#backToStudentsButton')) $('#backToStudentsButton').hidden = false;
  dom.trainingWorkspace?.classList.add('is-focused');
  loadStudentRecords(id);
}

async function deleteStudent(id = state.selectedStudentId) {
  const aluno = state.alunosData.find(a => String(a.id) === String(id));
  if (!aluno || !aluno.ativo) return;
  closeAllMenus();
  if (!confirm(`Desativar o aluno "${aluno.nome}"? Ele ficará inativo e poderá ser reativado depois.`)) return;

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
    console.error('Erro ao desativar aluno:', err);
  }
}

async function restoreStudent(id) {
  try {
    const res = await fetch(`/alunos/${id}/reativar`, { method: 'PATCH' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await loadAlunosFromAPI();
  } catch (err) {
    console.error('Erro ao reativar aluno:', err);
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
    dom.studentForm.sexo.value = aluno.sexo ?? '';
  }

  openPresencialModal();
}

function changeStudentPage(dir) {
  const totalPages = Math.max(1, Math.ceil(getFilteredStudents().length / STUDENTS_PER_PAGE));
  state.studentPage = Math.max(0, Math.min(state.studentPage + dir, totalPages - 1));
  renderStudentCards();
}

/* ========== EXERCÍCIOS ========== */

async function loadExercicios() {
  try {
    const res = await fetch('/exercicios');
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
  const group = $('#exerciseGroupFilter')?.value || '';
  const category = $('#exerciseCategoryFilter')?.value || '';
  return state.exerciciosData.filter(ex => {
    const matchesGroup = !group || ex.musculo_alvo === group;
    const matchesCategory = !category || ex.categoria === category;
    const matchesSearch = !q || [ex.nome, ex.musculo_alvo, ex.categoria].filter(Boolean).join(' ').toLowerCase().includes(q);
    return matchesGroup && matchesCategory && matchesSearch;
  });
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
      <td>${escapeHtml(getExerciseValue(ex, ['categoria']))}</td>
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
    const map = { name: getExerciseValue(ex, ['nome']), muscle: getExerciseValue(ex, ['musculo_alvo'], ''), category: getExerciseValue(ex, ['categoria'], '') };
    if (map[el.dataset.exerciseField] !== undefined) el.textContent = map[el.dataset.exerciseField] || '—';
  });

  renderExerciseMedia(ex);
  dom.exerciseModal.hidden = false;
  document.body.classList.add('modal-open');
  $('.modal-close-btn', dom.exerciseModal)?.focus();
}

function openNewExerciseModal() {
  if (!dom.newExerciseModal) return;
  dom.exerciseForm?.reset();
  const message = $('#exerciseFormMessage');
  if (message) message.textContent = '';
  dom.newExerciseModal.hidden = false;
  document.body.classList.add('modal-open');
  $('input[name="nome"]', dom.exerciseForm)?.focus();
}

function closeNewExerciseModal() {
  if (!dom.newExerciseModal) return;
  dom.newExerciseModal.hidden = true;
  dom.exerciseForm?.reset();
  document.body.classList.remove('modal-open');
}

async function handleExerciseFormSubmit(event) {
  event.preventDefault();
  const message = $('#exerciseFormMessage');
  const submit = $('button[type="submit"]', dom.exerciseForm);
  const form = new FormData(dom.exerciseForm);
  const payload = Object.fromEntries(form.entries());
  payload.nome = payload.nome.trim();
  payload.musculo_alvo = payload.musculo_alvo.trim();
  payload.midia_url = payload.midia_url.trim() || null;
  if (message) message.textContent = 'Salvando exercício…';
  if (submit) submit.disabled = true;

  try {
    const response = await fetch('/exercicios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.detail || result.erro || 'Não foi possível salvar o exercício.');
    closeNewExerciseModal();
    const groupFilter = $('#exerciseGroupFilter');
    const categoryFilter = $('#exerciseCategoryFilter');
    if (groupFilter) groupFilter.value = '';
    if (categoryFilter) categoryFilter.value = '';
    await loadExercicios();
  } catch (error) {
    if (message) message.textContent = error.message || 'Erro ao salvar o exercício.';
  } finally {
    if (submit) submit.disabled = false;
  }
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

  let parsedUrl;
  try { parsedUrl = new URL(url); } catch { parsedUrl = null; }
  if (!parsedUrl || !['https:', 'http:'].includes(parsedUrl.protocol)) return;

  let embedUrl = '';
  const host = parsedUrl.hostname.toLowerCase().replace(/^www\./, '');
  if (host === 'youtu.be') {
    embedUrl = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(parsedUrl.pathname.slice(1))}`;
  } else if (host === 'youtube.com' || host === 'm.youtube.com') {
    const videoId = parsedUrl.searchParams.get('v');
    if (videoId) embedUrl = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`;
    else if (parsedUrl.pathname.startsWith('/embed/')) embedUrl = `https://www.youtube-nocookie.com${parsedUrl.pathname}`;
  } else if (host === 'vimeo.com') {
    const videoId = parsedUrl.pathname.split('/').filter(Boolean)[0];
    if (videoId && /^\d+$/.test(videoId)) embedUrl = `https://player.vimeo.com/video/${videoId}`;
  }

  if (embedUrl) {
    const frame = document.createElement('iframe');
    frame.src = embedUrl;
    frame.title = `Demonstração de ${name}`;
    frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    dom.exerciseModalMedia.replaceChildren(frame);
  } else if (/\.(mp4|webm|ogg)(\?|#|$)/i.test(url)) {
    const video = document.createElement('video');
    Object.assign(video, { src: url, loop: true, muted: true, playsInline: true, controls: true });
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
  data_nascimento: fd.get('data_nascimento') || null,
  sexo: fd.get('sexo') || null
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

function setChatOpen(open) {
  if (!dom.chatDrawer) return;
  const trigger = $('.sidebar-chat-toggle');
  dom.chatDrawer.classList.toggle('open', open);
  dom.chatDrawer.setAttribute('aria-hidden', String(!open));
  dom.chatDrawer.inert = !open;
  dom.chatBackdrop?.classList.toggle('open', open);
  trigger?.setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('chat-open', open);
  if (open) requestAnimationFrame(() => dom.chatInput?.focus());
  else trigger?.focus({ preventScroll: true });
}

function toggleChat() {
  setChatOpen(!dom.chatDrawer?.classList.contains('open'));
}

function closeChat() {
  if (dom.chatDrawer?.classList.contains('open')) setChatOpen(false);
}

function appendChatMessage(role, text) {
  const msg = document.createElement('div');
  msg.className = `chat-msg ${role}`;
  if (role === 'bot') msg.setAttribute('aria-label', 'Resposta do FitLife IA');
  msg.textContent = text;
  dom.chatBody.appendChild(msg);
  dom.chatBody.scrollTop = dom.chatBody.scrollHeight;
  return msg;
}

function resizeChatInput() {
  if (!dom.chatInput) return;
  dom.chatInput.style.height = 'auto';
  const lineHeight = Number.parseFloat(getComputedStyle(dom.chatInput).lineHeight) || 22;
  dom.chatInput.style.height = `${Math.min(dom.chatInput.scrollHeight, lineHeight * 5 + 20)}px`;
  if (dom.chatSendButton) dom.chatSendButton.disabled = !dom.chatInput.value.trim() || dom.chatDrawer?.getAttribute('aria-busy') === 'true';
}

function showChatTyping() {
  const typing = document.createElement('div');
  typing.className = 'chat-msg bot chat-typing';
  typing.setAttribute('aria-label', 'FitLife IA está digitando');
  typing.innerHTML = '<span class="sr-only">FitLife IA está digitando</span><span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span>';
  dom.chatBody.appendChild(typing);
  dom.chatBody.scrollTop = dom.chatBody.scrollHeight;
  return typing;
}

function showChatError(node, prompt) {
  node.classList.add('chat-error');
  node.removeAttribute('aria-label');
  node.replaceChildren();
  const message = document.createElement('p');
  message.textContent = 'Não consegui obter uma resposta agora.';
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'chat-retry-btn';
  retry.dataset.action = 'retry-chat';
  retry.dataset.prompt = prompt;
  retry.textContent = 'Tentar novamente';
  node.append(message, retry);
}

async function submitChatQuestion(question, { appendUser = true, responseNode = null } = {}) {
  const text = question.trim();
  if (!text || dom.chatDrawer?.getAttribute('aria-busy') === 'true') return;
  $('#chatEmptyState')?.remove();
  if (appendUser) appendChatMessage('user', text);
  if (dom.chatInput) { dom.chatInput.value = ''; resizeChatInput(); }
  const response = responseNode || showChatTyping();
  response.className = 'chat-msg bot chat-typing';
  response.setAttribute('aria-label', 'FitLife IA está digitando');
  response.innerHTML = '<span class="sr-only">FitLife IA está digitando</span><span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span>';
  dom.chatDrawer?.setAttribute('aria-busy', 'true');
  if (dom.chatSendButton) dom.chatSendButton.disabled = true;
  if (dom.chatInput) dom.chatInput.disabled = true;
  const newChat = $('[data-action="new-chat"]');
  if (newChat) newChat.disabled = true;
  $('#chatSubtitle').textContent = 'Preparando sua resposta…';

  try {
    const res = await fetch(CHAT_ENDPOINT, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pergunta: text })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.resposta) throw new Error('Resposta vazia');
    response.className = 'chat-msg bot';
    response.removeAttribute('aria-label');
    response.innerHTML = typeof marked !== 'undefined' ? marked.parse(data.resposta) : escapeHtml(data.resposta).replace(/\n/g, '<br>');
  } catch (err) {
    console.error('Erro ao consultar a API:', err);
    showChatError(response, text);
  } finally {
    dom.chatDrawer?.removeAttribute('aria-busy');
    if (dom.chatInput) dom.chatInput.disabled = false;
    if (newChat) newChat.disabled = false;
    $('#chatSubtitle').textContent = 'Pronto para ajudar';
    resizeChatInput();
  }
  dom.chatBody.scrollTop = dom.chatBody.scrollHeight;
}

function sendChatMessage(e) {
  e.preventDefault();
  if (!dom.chatInput?.value.trim()) return;
  submitChatQuestion(dom.chatInput.value);
}

function startNewChat() {
  if (dom.chatDrawer?.getAttribute('aria-busy') === 'true') return;
  dom.chatBody.innerHTML = `
    <section class="chat-empty-state" id="chatEmptyState" aria-labelledby="chatGreeting">
      <img class="chat-empty-mascot" src="/static/mascote_fitlife.png" alt="Mascote FitLife IA">
      <h3 id="chatGreeting">Olá, Coach! 👋</h3>
      <p>Como posso ajudar no cuidado e na evolução dos seus alunos?</p>
      <div class="chat-suggestions" aria-label="Sugestões de perguntas">
        <button type="button" class="chat-suggestion" data-action="chat-suggestion" data-prompt="Montar um treino de hipertrofia para iniciante">Montar um treino de hipertrofia para iniciante</button>
        <button type="button" class="chat-suggestion" data-action="chat-suggestion" data-prompt="Adaptar exercícios para quem tem dor no joelho">Adaptar exercícios para quem tem dor no joelho</button>
        <button type="button" class="chat-suggestion" data-action="chat-suggestion" data-prompt="Quais cuidados considerar no treino de uma pessoa idosa?">Cuidados no treino de uma pessoa idosa</button>
        <button type="button" class="chat-suggestion" data-action="chat-suggestion" data-prompt="Como organizar a progressão de carga de um aluno?">Como organizar a progressão de carga?</button>
      </div>
    </section>`;
  if (dom.chatInput) dom.chatInput.value = '';
  resizeChatInput();
  dom.chatInput?.focus();
}

function trapChatFocus(e) {
  if (e.key !== 'Tab' || !dom.chatDrawer?.classList.contains('open')) return;
  const focusable = $$('button:not(:disabled), textarea:not(:disabled)', dom.chatDrawer).filter(el => !el.hidden);
  if (!focusable.length) return;
  const first = focusable[0], last = focusable[focusable.length - 1];
  if (e.shiftKey && (document.activeElement === first || !dom.chatDrawer.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && (document.activeElement === last || !dom.chatDrawer.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
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
  ['data_avaliacao','Data da avaliação','date'], ['peso_kg','Peso (kg)','number'], ['altura_m','Altura (m)','number'], ['percentual_gordura','Gordura corporal estimada por Pollock (%)','number'], ['massa_gorda_kg','Massa gorda (kg)','number'], ['massa_magra_kg','Massa magra (kg)','number']
];
const perimetryFields = [
  ['circ_ombro','Circunferência do ombro (cm)','number'], ['circ_peitoral','Circunferência peitoral (cm)','number'], ['circ_cintura','Circunferência da cintura (cm)','number'], ['circ_abdomen','Circunferência do abdômen (cm)','number'], ['circ_quadril','Circunferência do quadril (cm)','number'], ['circ_braco_dir','Braço direito (cm)','number'], ['circ_braco_esq','Braço esquerdo (cm)','number'], ['circ_coxa_dir','Coxa direita (cm)','number'], ['circ_coxa_esq','Coxa esquerda (cm)','number'], ['circ_panturrilha_dir','Panturrilha direita (cm)','number'], ['circ_panturrilha_esq','Panturrilha esquerda (cm)','number']
];
const skinfoldFields = [
  ['dobra_peitoral','Dobra peitoral (mm)','number'], ['dobra_abdominal','Dobra abdominal (mm)','number'], ['dobra_triceps','Dobra do tríceps (mm)','number'], ['dobra_subescapular','Dobra subescapular (mm)','number'], ['dobra_suprailiaca','Dobra supra-ilíaca (mm)','number'], ['dobra_axilar_medial','Dobra axilar média (mm)','number'], ['dobra_coxa','Dobra da coxa (mm)','number']
];
const postureFields = [
  ['postural_cabeca','Postura da cabeça'], ['postural_ombros','Postura dos ombros'], ['postural_coluna_toracica','Coluna torácica'], ['postural_coluna_lombar','Coluna lombar'], ['postural_pelve','Pelve'], ['postural_joelhos','Joelhos'], ['postural_pes','Pés'], ['postural_observacoes','Observações posturais','textarea']
];
const dynamometryFields = [['dinam_mao_dir','Dinamometria mão direita','number'], ['dinam_mao_esq','Dinamometria mão esquerda','number']];
const analysisFields = [
  ['observacoes_profissional','Observações do profissional','textarea'], ['frequencia_ideal','Frequência ideal semanal','number'], ['foco_proximo_bloco','Foco do próximo bloco','textarea'], ['indicacao_nutricional','Indicação nutricional?','select'], ['proxima_reavaliacao','Próxima reavaliação','date']
];
const performanceAssessmentFields = [
  ['func_flexao_braco','Flexões de braço','number'], ['func_agachamento','Agachamentos no teste','number'], ['func_prancha_seg','Prancha (segundos)','number'], ['vo2_distancia_m','Distância do teste VO₂ (m)','number'], ['vo2_maximo','VO₂ máximo','number'], ['vo2_classificacao','Classificação VO₂'],
  ['perf_forca_inf_1','Força inferior — teste 1'], ['perf_forca_inf_2','Força inferior — teste 2'], ['perf_forca_inf_3','Força inferior — teste 3'], ['perf_forca_sup_1','Força superior — teste 1'], ['perf_forca_sup_2','Força superior — teste 2'], ['perf_forca_sup_3','Força superior — teste 3'], ['perf_potencia_1','Potência — teste 1'], ['perf_potencia_2','Potência — teste 2'], ['perf_potencia_3','Potência — teste 3'], ['perf_pontos_fortes','Pontos fortes','textarea'], ['perf_limitadores','Limitadores','textarea'], ['perf_protocolo','Protocolo utilizado','textarea'], ['perf_periodizacao','Planejamento / periodização','textarea']
];

function inputFieldsMarkup(fields) {
  return fields.map(([key, label, type]) => {
    const control = type === 'bool'
      ? `<select name="${key}"><option value="">Não informado</option><option value="true">Sim</option><option value="false">Não</option></select>`
      : type === 'select' ? `<select name="${key}"><option value="">Não informado</option><option value="true">Sim</option><option value="false">Não</option></select>`
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
    <div class="form-field-grid ${title.startsWith('Perimetria') ? 'perimetry-fields' : ''}">${inputFieldsMarkup(fields)}</div>
    ${title.startsWith('Perimetria') ? '<div class="assessment-sum-footer"><span>Somatório da perimetria</span><output id="perimetry-total-footer">—</output></div>' : ''}
    ${title.startsWith('Dobras') ? '<div class="assessment-sum-footer"><span>Somatório das dobras</span><output id="skinfold-total-footer">—</output></div>' : ''}
  </section>`;
}

function calculatedFieldMarkup(name, label) {
  return `<label>${label}<output id="result-${name}" class="calculated-result">—</output><input type="hidden" name="${name}"></label>`;
}

function resultsMarkup(number) {
  return `<section class="assessment-group" aria-labelledby="assessment-group-${number}">
    <header class="assessment-group-heading"><span class="assessment-group-number">${number}</span><div><h4 id="assessment-group-${number}">Resultados e Análise Profissional</h4><p>Indicadores calculados automaticamente e plano de acompanhamento.</p></div></header>
    <div class="form-field-grid results-grid">
      ${calculatedFieldMarkup('imc','IMC — classificação OMS')}
      ${calculatedFieldMarkup('rcq','RCQ — classificação por sexo')}
      ${calculatedFieldMarkup('circ_somatorio','Soma da perimetria (cm)')}
      ${calculatedFieldMarkup('dobra_somatorio','Soma das dobras (mm)')}
      <label>Meta de gordura corporal (%)<input name="percentual_gordura_ideal" type="number" min="0" max="75" step="0.1" placeholder="Definida pelo profissional"></label>
      ${calculatedFieldMarkup('gordura_ideal_kg','Gordura ideal estimada (kg)')}
      ${calculatedFieldMarkup('massa_magra_ideal_kg','Massa magra ideal estimada (kg)')}
      ${calculatedFieldMarkup('peso_ideal_kg','Peso ideal estimado (kg)')}
      ${calculatedFieldMarkup('gordura_excedente_kg','Gordura excedente estimada (kg)')}
      <input type="hidden" name="imc_classificacao"><input type="hidden" name="rcq_classificacao">
      ${inputFieldsMarkup(analysisFields)}
    </div>
  </section>`;
}

function renderAssessmentFields(type) {
  const groups = [
    ['Medidas básicas e composição corporal', 'Dados antropométricos e composição corporal do aluno.', basicAssessmentFields]
  ];

  groups.push(
    ['Perimetria (circunferências)', 'Medidas corporais para acompanhar as mudanças ao longo do tempo.', perimetryFields],
    ['Dobras cutâneas', 'Sete sítios anatômicos para estimar o percentual de gordura pelo protocolo de Pollock.', skinfoldFields]
  );

  if (type === 'premium' || type === 'performance') {
    groups.push(
      ['Avaliação postural', 'Observação dos principais segmentos e alinhamentos corporais.', postureFields, 'P'],
      ['Dinamometria manual', 'Avaliação da força de preensão da mão direita e esquerda.', dynamometryFields, 'P']
    );
  }

  if (type === 'performance') {
    groups.push(
      ['Testes funcionais', 'Resultados dos testes selecionados para avaliar a capacidade funcional.', performanceAssessmentFields.slice(0, 3), 'D'],
      ['Capacidade cardiorrespiratória — VO₂', 'Distância, estimativa e classificação do teste cardiorrespiratório.', performanceAssessmentFields.slice(3, 6), 'D'],
      ['Testes de força', 'Resultados dos testes de força dos membros inferiores e superiores.', performanceAssessmentFields.slice(6, 12), 'D'],
      ['Testes de potência', 'Resultados dos testes de potência realizados.', performanceAssessmentFields.slice(12, 15), 'D'],
      ['Síntese de desempenho', 'Pontos fortes, limitadores, protocolo e planejamento.', performanceAssessmentFields.slice(15), 'D']
    );
  }

  const container = $('#assessmentFields');
  container.className = 'assessment-field-sections';
  container.innerHTML = groups.map((group, index) => assessmentGroupMarkup(group[0], group[1], group[2], group[3] ?? index + 1)).join('') + resultsMarkup(4);
  const percent = $('[name="percentual_gordura"]', container);
  if (percent) { percent.readOnly = false; percent.title = 'Calculado automaticamente por Pollock quando idade, sexo e as sete dobras estiverem preenchidos.'; }
}

function openAssessmentModal(studentId = null, mode = 'create', assessmentType = null) {
  const modal = $('#assessmentModal');
  const form = $('#assessmentForm');
  if (!modal || !form) return;
  state.editingAssessmentId = mode === 'edit' ? state.editingAssessmentId : null;
  state.anamneseOnly = mode === 'anamnese' || mode === 'edit-anamnese';
  state.editingAnamnesisId = mode === 'edit-anamnese' ? state.editingAnamnesisId : null;
  state.viewingAssessment = mode === 'view';
  form.reset();
  if (assessmentType) $('#assessmentType').value = assessmentType;
  const studentSelect = $('#assessmentStudent');
  studentSelect.innerHTML = '<option value="">Selecione um aluno</option>' + state.alunosData.filter(a => a.ativo).map(a => `<option value="${a.id}">${escapeHtml(a.nome)}</option>`).join('');
  if (studentId) studentSelect.value = String(studentId);
  updateAssessmentStudentAge();
  studentSelect.disabled = Boolean(studentId);
  $('#assessmentModalTitle').textContent = mode === 'edit' ? 'Editar avaliação física' : mode === 'view' ? 'Visualizar avaliação' : mode === 'edit-anamnese' ? 'Editar anamnese' : state.anamneseOnly ? 'Nova anamnese' : 'Nova avaliação física';
  $('#anamneseFields').parentElement.hidden = !state.anamneseOnly;
  $('#assessmentFields').parentElement.hidden = state.anamneseOnly;
  $('#assessmentType').parentElement.hidden = mode === 'edit' || mode === 'view' || state.anamneseOnly;
  $('#assessmentForm button[type="submit"]').textContent = state.anamneseOnly ? (state.editingAnamnesisId ? 'Salvar alterações' : 'Salvar anamnese') : mode === 'edit' ? 'Salvar alterações' : 'Salvar avaliação';
  $('#assessmentForm button[type="submit"]').hidden = state.viewingAssessment;
  const anamFields = [...anamneseFields];
  renderInputFields($('#anamneseFields'), anamFields);
  renderAssessmentFields($('#assessmentType').value || 'essencial');
  updateAssessmentCalculations();
  $('#assessmentForm').classList.toggle('is-readonly', state.viewingAssessment);
  $('#assessmentForm').querySelectorAll('input,select,textarea').forEach(el => { el.disabled = state.viewingAssessment; });
  $('#assessmentFormMsg').textContent = '';
  modal.hidden = false;
}

function updateAssessmentStudentAge() {
  const student = state.alunosData.find(a => String(a.id) === String($('#assessmentStudent')?.value));
  const output = $('#assessmentStudentAge');
  if (!output) return;
  if (!student?.data_nascimento) { output.textContent = `Idade não informada no cadastro.${student?.sexo ? ` · ${student.sexo === 'masculino' ? 'Masculino' : 'Feminino'}` : ''}`; updateAssessmentCalculations(); return; }
  const born = new Date(`${student.data_nascimento}T00:00:00`);
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  if (now.getMonth() < born.getMonth() || (now.getMonth() === born.getMonth() && now.getDate() < born.getDate())) age--;
  output.textContent = `Idade: ${age} anos${student.sexo ? ` · ${student.sexo === 'masculino' ? 'Masculino' : 'Feminino'}` : ' · sexo não informado'}`;
  updateAssessmentCalculations();
}

function updateAssessmentCalculations() {
  const root = $('#assessmentFields');
  if (!root) return;
  const value = name => {
    const raw = $(`[name="${name}"]`, root)?.value;
    return raw === '' || raw == null ? null : Number(raw);
  };
  const set = (name, number, label = '') => {
    const output = $(`#result-${name}`, root);
    const hidden = $(`[name="${name}"]`, root);
    const formatted = Number.isFinite(number) ? number.toFixed(2) : '';
    if (output) output.textContent = formatted ? `${formatted}${label}` : '—';
    if (hidden) hidden.value = formatted;
  };
  const student = state.alunosData.find(a => String(a.id) === String($('#assessmentStudent')?.value));
  const weight = value('peso_kg');
  const height = value('altura_m');
  const waist = value('circ_cintura');
  const hip = value('circ_quadril');
  const hasPerimetry = perimetryFields.some(([key]) => value(key) != null);
  const perimetryTotal = perimetryFields.reduce((sum, [key]) => sum + (value(key) ?? 0), 0);
  const folds = skinfoldFields.map(([key]) => value(key));
  const foldsComplete = folds.every(n => n != null && n > 0);
  const foldTotal = folds.reduce((sum, n) => sum + (n ?? 0), 0);
  set('circ_somatorio', hasPerimetry ? perimetryTotal : null);
  set('dobra_somatorio', folds.some(n => n != null) ? foldTotal : null);
  if ($('#perimetry-total-footer', root)) $('#perimetry-total-footer', root).textContent = hasPerimetry ? perimetryTotal.toFixed(2) : '—';
  if ($('#skinfold-total-footer', root)) $('#skinfold-total-footer', root).textContent = folds.some(n => n != null) ? foldTotal.toFixed(2) : '—';

  const ageText = $('#assessmentStudentAge')?.textContent.match(/Idade: (\d+) anos/);
  const age = ageText ? Number(ageText[1]) : null;
  const percentField = $('[name="percentual_gordura"]', root);
  const pollockReady = foldsComplete && age && student?.sexo;
  if (percentField) percentField.readOnly = Boolean(pollockReady);
  if (pollockReady) {
    const sum = foldTotal;
    const density = student.sexo === 'masculino'
      ? 1.112 - 0.00043499 * sum + 0.00000055 * sum ** 2 - 0.00028826 * age
      : 1.097 - 0.00046971 * sum + 0.00000056 * sum ** 2 - 0.00012828 * age;
    const pollockPercent = 495 / density - 450;
    if (percentField && Number.isFinite(pollockPercent)) percentField.value = pollockPercent.toFixed(2);
  }

  const bmi = weight > 0 && height > 0 ? weight / (height ** 2) : null;
  let bmiClass = '';
  if (bmi != null) bmiClass = bmi < 18.5 ? 'Abaixo do peso' : bmi < 25 ? 'Peso normal' : bmi < 30 ? 'Sobrepeso' : bmi < 35 ? 'Obesidade I' : bmi < 40 ? 'Obesidade II' : 'Obesidade III';
  set('imc', bmi);
  const bmiClassificationField = $('[name="imc_classificacao"]', root);
  if (bmiClassificationField) bmiClassificationField.value = bmiClass;
  if (bmi != null) $('#result-imc', root).textContent = `${bmi.toFixed(2)} · ${bmiClass}`;
  const rcq = waist > 0 && hip > 0 ? waist / hip : null;
  const sex = student?.sexo;
  const rcqClass = rcq == null ? '' : !sex ? 'Sexo pendente' : sex === 'masculino' ? (rcq < .90 ? 'Baixo' : rcq <= .95 ? 'Moderado' : 'Alto') : (rcq < .80 ? 'Baixo' : rcq <= .85 ? 'Moderado' : 'Alto');
  set('rcq', rcq);
  const rcqClassificationField = $('[name="rcq_classificacao"]', root);
  if (rcqClassificationField) rcqClassificationField.value = rcqClass;
  if (rcq != null) $('#result-rcq', root).textContent = `${rcq.toFixed(2)}${rcqClass ? ` · ${rcqClass === 'Sexo pendente' ? 'Informe o sexo no cadastro para classificar' : rcqClass}` : ''}`;

  const currentPercent = value('percentual_gordura');
  const currentFat = weight != null && currentPercent != null ? weight * currentPercent / 100 : value('massa_gorda_kg');
  const targetPercent = value('percentual_gordura_ideal');
  const lean = weight != null && currentFat != null ? weight - currentFat : null;
  const idealWeight = lean != null && targetPercent != null && targetPercent >= 0 && targetPercent < 100 ? lean / (1 - targetPercent / 100) : null;
  const idealFat = idealWeight != null && targetPercent != null ? idealWeight * targetPercent / 100 : null;
  set('gordura_ideal_kg', idealFat);
  set('massa_magra_ideal_kg', lean);
  set('peso_ideal_kg', idealWeight);
  set('gordura_excedente_kg', currentFat != null && idealFat != null ? currentFat - idealFat : null);
}

function collectFields(container, includeEmpty = false) {
  const data = {};
  $$('input[name], select[name], textarea[name]', container).forEach(el => {
    if (el.value === '' && !includeEmpty) return;
    if (el.value === '' && includeEmpty) { data[el.name] = null; return; }
    data[el.name] = el.type === 'number' ? Number(el.value) : el.tagName === 'SELECT' && ['true','false'].includes(el.value) ? el.value === 'true' : el.value;
  });
  return data;
}

function closeAssessmentModal() {
  const modal = $('#assessmentModal');
  if (modal) modal.hidden = true;
  state.editingAssessmentId = null;
  state.editingAnamnesisId = null;
  state.anamneseOnly = false;
  state.viewingAssessment = false;
  $('#assessmentForm button[type="submit"]')?.removeAttribute('hidden');
  $('#assessmentForm')?.classList.remove('is-readonly');
  $('#assessmentForm')?.querySelectorAll('input,select,textarea').forEach(el => { el.disabled = false; });
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
  const dadosAvaliacao = collectFields($('#assessmentFields'), Boolean(state.editingAssessmentId));
  try {
    if (state.anamneseOnly) {
      const dadosAnamnese = collectFields($('#anamneseFields'), Boolean(state.editingAnamnesisId));
      if (!Object.keys(dadosAnamnese).length) throw new Error('Preencha ao menos uma resposta da anamnese.');
      const endpoint = state.editingAnamnesisId ? `/anamneses/${state.editingAnamnesisId}` : `/alunos/${studentId}/anamneses`;
      const res = await fetch(endpoint, {method:state.editingAnamnesisId ? 'PUT' : 'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({dados:dadosAnamnese})});
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

// TODO: adicionar gráfico de evolução comparando avaliações anteriores
// Sugestão: Chart.js com linha de evolução de peso, IMC e % gordura
async function loadStudentRecords(studentId) {
  try {
    const [ar, nr, wr] = await Promise.all([fetch(`/alunos/${studentId}/avaliacoes`), fetch(`/alunos/${studentId}/anamneses`), fetch(`/alunos/${studentId}/treinos`)]);
    if (!ar.ok || !nr.ok) throw new Error('Falha ao carregar histórico');
    const [assessments, anamneses, treinos] = await Promise.all([ar.json(), nr.json(), wr.ok ? wr.json() : Promise.resolve([])]);
    state.assessmentsData = assessments;
    const compareButton = $('#compareAssessmentsButton');
    if (compareButton) compareButton.disabled = assessments.length < 2;
    $('#assessmentHistory').innerHTML = assessments.length ? assessments.map(a => {
      const typeLabel = ({ essencial: 'Essencial', premium: 'Premium', performance: 'Performance' })[a.tipo] || 'Física';
      const date = a.data_avaliacao ? new Date(`${String(a.data_avaliacao).slice(0, 10)}T00:00:00`).toLocaleDateString('pt-BR') : 'Data não informada';
      return `<article class="record-row assessment-record"><button type="button" class="assessment-card-main" data-action="view-assessment" data-record-id="${a.id}"><strong>Avaliação ${typeLabel}</strong><small>Realizada em ${date}</small></button><details class="record-actions-menu"><summary aria-label="Opções da avaliação">⋮</summary><div class="record-actions-popover"><button type="button" data-action="edit-assessment" data-record-id="${a.id}">Editar</button><button type="button" data-action="delete-assessment" data-record-id="${a.id}">Excluir</button></div></details></article>`;
    }).join('') : '<div class="empty-state">Nenhuma avaliação cadastrada.</div>';
    $('#anamneseHistory').innerHTML = anamneses.length ? anamneses.map(a => `<article class="record-row anamnesis-record"><div><strong>Anamnese · ${escapeHtml(a.criada_em?.slice(0,10) || '')}</strong><small>Questionário e histórico de saúde</small></div><details class="record-actions-menu"><summary aria-label="Opções da anamnese">⋮</summary><div class="record-actions-popover"><button type="button" data-action="view-anamnesis" data-record-id="${a.id}">Visualizar</button><button type="button" data-action="edit-anamnesis" data-record-id="${a.id}">Editar</button><button type="button" data-action="send-anamnesis" data-record-id="${a.id}">Enviar</button><button type="button" data-action="delete-anamnesis" data-record-id="${a.id}">Excluir</button></div></details></article>`).join('') : '<div class="empty-state compact-empty-state">Nenhuma anamnese registrada.</div>';
    renderWorkoutRecords(treinos);
  } catch (err) { console.error(err); }
}

const comparisonMetrics = [
  { key: 'peso_kg', label: 'Peso', unit: 'kg', decimals: 2 },
  { key: 'percentual_gordura', label: '% de gordura', unit: '%', decimals: 2 },
  { key: 'massa_magra_kg', label: 'Massa magra', unit: 'kg', decimals: 2 },
  { key: 'massa_gorda_kg', label: 'Massa gorda', unit: 'kg', decimals: 2 },
  { key: 'imc', label: 'IMC', unit: '', decimals: 2, classification: 'imc_classificacao' },
  { key: 'circ_somatorio', label: 'Soma da perimetria', unit: 'cm', decimals: 2 },
  { key: 'dobra_somatorio', label: 'Soma das dobras', unit: 'mm', decimals: 2 },
  { key: 'rcq', label: 'RCQ', unit: '', decimals: 2, classification: 'rcq_classificacao' }
];

function formatComparisonNumber(value, decimals) {
  const number = Number(value);
  return Number.isFinite(number) ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(number) : '—';
}

function formatComparisonDate(value) {
  if (!value) return 'Data não informada';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? 'Data não informada' : date.toLocaleDateString('pt-BR');
}

function comparisonNumber(record, key) {
  const stored = record?.[key];
  if (stored != null && stored !== '' && Number.isFinite(Number(stored))) return Number(stored);
  const weight = Number(record?.peso_kg);
  const percent = Number(record?.percentual_gordura);
  const fat = Number(record?.massa_gorda_kg);
  const circumferenceKeys = ['circ_ombro', 'circ_peitoral', 'circ_cintura', 'circ_abdomen', 'circ_quadril', 'circ_braco_dir', 'circ_braco_esq', 'circ_coxa_dir', 'circ_coxa_esq', 'circ_panturrilha_dir', 'circ_panturrilha_esq'];
  const skinfoldKeys = ['dobra_peitoral', 'dobra_abdominal', 'dobra_triceps', 'dobra_subescapular', 'dobra_suprailiaca', 'dobra_axilar_medial', 'dobra_coxa'];
  if (key === 'massa_gorda_kg' && Number.isFinite(weight) && weight > 0 && Number.isFinite(percent)) return weight * percent / 100;
  if (key === 'massa_magra_kg' && Number.isFinite(weight) && weight > 0) {
    const fatMass = Number.isFinite(fat) ? fat : Number.isFinite(percent) ? weight * percent / 100 : NaN;
    return Number.isFinite(fatMass) ? weight - fatMass : null;
  }
  if (key === 'circ_somatorio' || key === 'dobra_somatorio') {
    const keys = key === 'circ_somatorio' ? circumferenceKeys : skinfoldKeys;
    const values = keys.map(field => record?.[field]).filter(value => value != null && value !== '' && Number.isFinite(Number(value))).map(Number);
    return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
  }
  if (key === 'imc') {
    const height = Number(record?.altura_m);
    return Number.isFinite(weight) && weight > 0 && Number.isFinite(height) && height > 0 ? weight / (height ** 2) : null;
  }
  if (key === 'rcq') {
    const waist = Number(record?.circ_cintura);
    const hip = Number(record?.circ_quadril);
    return Number.isFinite(waist) && waist > 0 && Number.isFinite(hip) && hip > 0 ? waist / hip : null;
  }
  return null;
}

function comparisonValue(record, metric) {
  const numeric = comparisonNumber(record, metric.key);
  if (numeric == null) return '—';
  const value = `${formatComparisonNumber(numeric, metric.decimals)}${metric.unit ? ` ${metric.unit}` : ''}`;
  let classificationValue = metric.classification ? record?.[metric.classification] : '';
  if (!classificationValue && metric.key === 'imc') classificationValue = numeric < 18.5 ? 'Abaixo do peso' : numeric < 25 ? 'Peso normal' : numeric < 30 ? 'Sobrepeso' : numeric < 35 ? 'Obesidade I' : numeric < 40 ? 'Obesidade II' : 'Obesidade III';
  if (!classificationValue && metric.key === 'rcq') {
    const sex = String(state.alunosData.find(student => String(student.id) === String(state.selectedStudentId))?.sexo || '').toLocaleLowerCase('pt-BR');
    if (sex === 'masculino') classificationValue = numeric < .9 ? 'Baixo' : numeric <= .95 ? 'Moderado' : 'Alto';
    if (sex === 'feminino') classificationValue = numeric < .8 ? 'Baixo' : numeric <= .85 ? 'Moderado' : 'Alto';
  }
  const classification = classificationValue ? ` · ${escapeHtml(classificationValue)}` : '';
  return `${value}${classification}`;
}

function updateAssessmentComparison() {
  const previousId = $('#compareAssessmentPrevious')?.value;
  const currentId = $('#compareAssessmentCurrent')?.value;
  const previousSummary = state.assessmentsData.find(item => String(item.id) === String(previousId));
  const currentSummary = state.assessmentsData.find(item => String(item.id) === String(currentId));
  $('#comparePreviousDate').textContent = previousSummary ? formatComparisonDate(previousSummary.data_avaliacao) : 'Avaliação anterior';
  $('#compareCurrentDate').textContent = currentSummary ? formatComparisonDate(currentSummary.data_avaliacao) : 'Avaliação atual';
  const previous = state.assessmentComparisonRecords?.previous;
  const current = state.assessmentComparisonRecords?.current;
  const ready = previous && current && String(previous.id) === String(previousId) && String(current.id) === String(currentId);
  $('#assessmentComparisonResults').innerHTML = comparisonMetrics.map(metric => {
    const left = ready ? comparisonNumber(previous, metric.key) : null;
    const right = ready ? comparisonNumber(current, metric.key) : null;
    let delta = '—';
    if (left != null && right != null && Number.isFinite(Number(left)) && Number.isFinite(Number(right))) {
      const difference = Number(right) - Number(left);
      const rounded = Math.abs(difference) < (0.5 * (10 ** -metric.decimals)) ? 0 : difference;
      const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : '';
      delta = `${sign}${formatComparisonNumber(Math.abs(rounded), metric.decimals)}${metric.unit ? ` ${metric.unit}` : ''}`;
    }
    return `<tr><th scope="row">${metric.label}</th><td>${ready ? comparisonValue(previous, metric) : '—'}</td><td>${ready ? comparisonValue(current, metric) : '—'}</td><td class="comparison-delta">${delta}</td></tr>`;
  }).join('');
}

async function openAssessmentComparison() {
  if (state.assessmentsData.length < 2) return;
  const previousSelect = $('#compareAssessmentPrevious');
  const currentSelect = $('#compareAssessmentCurrent');
  const options = state.assessmentsData.map(item => {
    const label = `${formatComparisonDate(item.data_avaliacao)} · ${({ essencial: 'Essencial', premium: 'Premium', performance: 'Performance' })[item.tipo] || 'Física'}`;
    return `<option value="${item.id}">${escapeHtml(label)}</option>`;
  }).join('');
  previousSelect.innerHTML = options;
  currentSelect.innerHTML = options;
  previousSelect.value = String(state.assessmentsData[1].id);
  currentSelect.value = String(state.assessmentsData[0].id);
  state.assessmentComparisonRecords = { previous: null, current: null };
  $('#assessmentComparisonResults').innerHTML = comparisonMetrics.map(metric => `<tr><th scope="row">${metric.label}</th><td>Carregando…</td><td>Carregando…</td><td>—</td></tr>`).join('');
  $('#assessmentCompareModal').hidden = false;
  document.body.classList.add('modal-open');
  await loadAssessmentComparisonRecords();
}

async function loadAssessmentComparisonRecords() {
  const previousId = $('#compareAssessmentPrevious').value;
  const currentId = $('#compareAssessmentCurrent').value;
  state.assessmentComparisonRecords = null;
  $('#comparePreviousDate').textContent = formatComparisonDate(state.assessmentsData.find(item => String(item.id) === String(previousId))?.data_avaliacao);
  $('#compareCurrentDate').textContent = formatComparisonDate(state.assessmentsData.find(item => String(item.id) === String(currentId))?.data_avaliacao);
  if (!previousId || !currentId || previousId === currentId) {
    $('#assessmentComparisonResults').innerHTML = `<tr><td colspan="4" class="comparison-empty">Escolha duas avaliações diferentes.</td></tr>`;
    return;
  }
  $('#assessmentComparisonResults').innerHTML = comparisonMetrics.map(metric => `<tr><th scope="row">${metric.label}</th><td colspan="2">Carregando…</td><td>—</td></tr>`).join('');
  try {
    const [previousResponse, currentResponse] = await Promise.all([fetch(`/avaliacoes/${previousId}`), fetch(`/avaliacoes/${currentId}`)]);
    if (!previousResponse.ok || !currentResponse.ok) throw new Error('Não foi possível carregar as avaliações.');
    const records = { previous: await previousResponse.json(), current: await currentResponse.json() };
    if ($('#compareAssessmentPrevious').value !== previousId || $('#compareAssessmentCurrent').value !== currentId) return;
    state.assessmentComparisonRecords = records;
    updateAssessmentComparison();
  } catch (error) {
    $('#assessmentComparisonResults').innerHTML = `<tr><td colspan="4" class="comparison-empty">${escapeHtml(error.message)}</td></tr>`;
  }
}

function closeAssessmentComparison() {
  const modal = $('#assessmentCompareModal');
  if (modal) modal.hidden = true;
  document.body.classList.remove('modal-open');
}

async function editAssessment(id) {
  const res = await fetch(`/avaliacoes/${id}`); if (!res.ok) return;
  const record = await res.json(); state.editingAssessmentId = id; openAssessmentModal(record.aluno_id, 'edit');
  $('#assessmentType').value = record.tipo; renderAssessmentFields(record.tipo);
  Object.entries(record).forEach(([k,v]) => { const el = $(`[name="${k}"]`, $('#assessmentFields')); if (el && v != null) el.value = String(v).slice(0,10); });
  updateAssessmentCalculations();
}

async function editAnamnesis(id) {
  const res = await fetch(`/anamneses/${id}`);
  if (!res.ok) return;
  const record = await res.json();
  state.editingAnamnesisId = id;
  openAssessmentModal(state.selectedStudentId, 'edit-anamnese');
  Object.entries(record).forEach(([key, value]) => {
    const field = $(`[name="${key}"]`, $('#anamneseFields'));
    if (field && value != null) field.value = String(value);
  });
}

async function viewAssessment(id) {
  const res = await fetch(`/avaliacoes/${id}`); if (!res.ok) return;
  const record = await res.json();
  openAssessmentModal(record.aluno_id, 'view', record.tipo);
  Object.entries(record).forEach(([key, value]) => {
    const el = $(`[name="${key}"]`, $('#assessmentFields'));
    if (el && value != null) el.value = String(value).slice(0, 10);
  });
  updateAssessmentCalculations();
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

function formatWorkoutDate(value) {
  if (!value) return '—';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR');
}

function isWorkoutActive(workout) {
  if (workout.encerrado_em) return false;
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const dataInicio = String(workout.data_inicio || '').slice(0, 10);
  const dataFim = workout.data_fim ? String(workout.data_fim).slice(0, 10) : null;
  return dataInicio <= today && (dataFim === null || dataFim >= today);
}

function renderWorkoutRecords(treinos) {
  const container = $('.workout-list');
  if (!container) return;
  state.treinosData = treinos;
  const ativos = treinos.filter(t => !t.encerrado_em).sort((a, b) => Number(isWorkoutActive(b)) - Number(isWorkoutActive(a)));
  const arquivados = treinos.filter(t => Boolean(t.encerrado_em)).sort((a, b) =>
    String(b.encerrado_em).localeCompare(String(a.encerrado_em))
  );
  const renderCard = (t, archived = false) => {
    const orientacoes = t.orientacoes_gerais ? `<p class="workout-record-guidance">${escapeHtml(t.orientacoes_gerais)}</p>` : '';
    const sessoes = t.sessoes || [];
    const activeId = state.activeTrainingSessions[t.id] && sessoes.some(s => String(s.id) === String(state.activeTrainingSessions[t.id]))
      ? String(state.activeTrainingSessions[t.id]) : String(sessoes[0]?.id || '');
    if (activeId) state.activeTrainingSessions[t.id] = activeId;
    const tabs = sessoes.map(s => `<button type="button" class="workout-session-tab ${String(s.id) === activeId ? 'active' : ''}" role="tab" aria-selected="${String(s.id) === activeId}" data-action="select-workout-session" data-workout-id="${t.id}" data-session-id="${s.id}">${escapeHtml(s.nome)}</button>`).join('');
    const sessaoAtiva = sessoes.find(s => String(s.id) === activeId);
    const exercicios = sessaoAtiva?.exercicios?.length ? sessaoAtiva.exercicios.map(ex => `
      <article class="workout-exercise-item" draggable="true" data-item-id="${ex.id}" data-session-id="${sessaoAtiva.id}">
        <div class="workout-exercise-row-main">
          <span class="workout-drag-handle" aria-label="Arraste para reordenar" title="Arraste para reordenar">⠿</span>
          <button type="button" class="workout-exercise-toggle" data-action="toggle-workout-exercise" data-item-id="${ex.id}" aria-expanded="false"><span>${escapeHtml(ex.nome)}</span><span class="exercise-chevron">⌄</span></button>
          <details class="record-actions-menu"><summary aria-label="Opções do exercício">⋮</summary><div class="record-actions-popover"><button type="button" data-action="delete-workout-exercise" data-record-id="${ex.id}">Excluir exercício</button></div></details>
        </div>
        <div class="workout-exercise-expanded" data-exercise-details="${ex.id}" hidden>
          <div class="workout-exercise-prescription"><span><b>Séries</b>${ex.series}</span><span><b>Repetições</b>${escapeHtml(ex.repeticoes)}</span><span><b>Descanso</b>${ex.descanso_segundos}s</span></div>
          ${ex.observacoes ? `<p><b>Observações:</b> ${escapeHtml(ex.observacoes)}</p>` : ''}
          ${ex.descricao ? `<p>${escapeHtml(ex.descricao)}</p>` : ''}
          ${ex.midia_url ? `<a href="${escapeHtml(ex.midia_url)}" target="_blank" rel="noopener noreferrer">Ver vídeo/demonstração</a>` : ''}
        </div>
      </article>`).join('') : '<div class="empty-state compact-empty-state">Nenhum exercício nesta sessão.</div>';
    return `<article class="workout-record${archived ? ' is-archived' : ''}">
      <div class="workout-record-header"><div class="workout-record-title">${archived ? '<span class="workout-archive-badge">Arquivado</span>' : ''}<strong>${escapeHtml(t.nome)}</strong><small>${formatWorkoutDate(t.data_inicio)} a ${archived ? formatWorkoutDate(t.data_fim) : (t.data_fim ? formatWorkoutDate(t.data_fim) : 'Sem prazo')}</small></div><div class="workout-record-actions">${!archived && isWorkoutActive(t) ? `<button type="button" class="table-btn" data-action="add-workout-session" data-record-id="${t.id}">+ Adicionar sessão</button>` : ''}<details class="record-actions-menu workout-actions-menu"><summary aria-label="Mais ações do treino">⋯</summary><div class="record-actions-popover">${archived ? `<button type="button" data-action="reactivate-workout" data-record-id="${t.id}">Reativar treino</button><hr>` : (isWorkoutActive(t) ? `<button type="button" data-action="end-workout" data-record-id="${t.id}">Arquivar treino</button><hr>` : '')}<button type="button" class="danger-action" data-action="delete-workout" data-record-id="${t.id}">Excluir treino</button></div></details></div></div>
      <p class="workout-record-meta">${escapeHtml(t.objetivo)} · ${escapeHtml(t.dificuldade)}</p>
      ${orientacoes}
      <div class="workout-session-tabs" role="tablist" aria-label="Sessões do ${escapeHtml(t.nome)}">${tabs}</div>
      ${sessaoAtiva ? `<section class="workout-session-panel" role="tabpanel"><div class="workout-session-panel-heading"><h4>${escapeHtml(sessaoAtiva.nome)}</h4><span>${sessaoAtiva.exercicios.length} exercício(s)</span></div><div class="workout-session-exercises" data-session-list="${sessaoAtiva.id}">${exercicios}</div></section>` : '<div class="empty-state compact-empty-state">Adicione sessões como “Inferior” ou “Costas” para organizar o treino.</div>'}
    </article>`;
  };
  if (!treinos.length) {
    container.innerHTML = '<div class="empty-state">Nenhum treino criado para este aluno.</div>';
    return;
  }
  container.innerHTML = `${ativos.map(t => renderCard(t)).join('')}\n    ${arquivados.length ? `<details class="archived-workouts-section"><summary>Arquivados (${arquivados.length})</summary><div class="archived-workouts-list">${arquivados.map(t => renderCard(t, true)).join('')}</div></details>` : ''}`;
}

async function openWorkoutModal() {
  const modal = $('#workoutModal');
  const form = $('#workoutForm');
  if (!modal || !form || !state.selectedStudentId) return;

  const student = state.alunosData.find(a => String(a.id) === String(state.selectedStudentId));
  $('#workoutStudentName').textContent = student ? `Aluno: ${student.nome}` : '';
  form.reset();
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  $('[name="data_inicio"]', form).value = today;
  $('[name="remover_apos_vencimento"]', form).value = 'true';
  $('[name="ocultar_antes_inicio"]', form).value = 'true';
  $('#workoutFormMessage').textContent = '';
  modal.hidden = false;
  document.body.classList.add('modal-open');
  $('[name="nome"]', form).focus();
}

function createWorkoutExerciseRow(exerciseId = null) {
  const row = document.createElement('div');
  row.className = 'workout-exercise-row';
  row.innerHTML = `
    <label class="workout-exercise-choice">Exercício<div class="workout-exercise-search-wrap"><input class="workout-exercise-search" type="search" placeholder="Digite para buscar..." autocomplete="off" required><input name="exercicio_id" type="hidden" required><div class="workout-exercise-suggestions" hidden></div></div></label>
    <label>Séries<input name="series" type="number" min="1" max="20" value="3" required></label>
    <label>Repetições<input name="repeticoes" type="text" maxlength="40" value="8–12" placeholder="Ex.: 8–12" required></label>
    <label>Descanso (s)<input name="descanso_segundos" type="number" min="0" max="3600" value="60" required></label>
    <label class="workout-exercise-observation">Observações<input name="observacoes" type="text" maxlength="500" placeholder="Ex.: manter amplitude confortável"></label>
    <button type="button" class="remove-workout-exercise" aria-label="Remover exercício">Remover</button>`;
  const search = $('.workout-exercise-search', row);
  search.addEventListener('input', () => {
    $('[name="exercicio_id"]', row).value = '';
    renderWorkoutExerciseSuggestions(row);
  });
  if (exerciseId) selectExerciseForRow(row, exerciseId);
  $('.remove-workout-exercise', row).addEventListener('click', () => {
    const container = $('#workoutExerciseRows');
    if (container.children.length > 1) row.remove();
    else $('#workoutExercisesMessage').textContent = 'Adicione pelo menos um exercício ao treino.';
  });
  return row;
}

function renderWorkoutExerciseSuggestions(row) {
  const input = $('.workout-exercise-search', row);
  const box = $('.workout-exercise-suggestions', row);
  const query = input.value.trim().toLocaleLowerCase('pt-BR');
  if (!query) { box.hidden = true; box.innerHTML = ''; return; }
  const results = state.exerciciosData.filter(ex => ex.nome.toLocaleLowerCase('pt-BR').includes(query)).slice(0, 7);
  box.innerHTML = results.length ? results.map(ex => `<button type="button" data-workout-exercise-option="${ex.id}">${escapeHtml(ex.nome)}</button>`).join('') : '<span class="exercise-no-results">Nenhum exercício encontrado.</span>';
  box.hidden = false;
  $$('button[data-workout-exercise-option]', box).forEach(button => button.addEventListener('click', () => selectExerciseForRow(row, button.dataset.workoutExerciseOption)));
}

function selectExerciseForRow(row, exerciseId) {
  const exercise = state.exerciciosData.find(item => String(item.id) === String(exerciseId));
  if (!exercise) return;
  $('.workout-exercise-search', row).value = exercise.nome;
  $('[name="exercicio_id"]', row).value = exercise.id;
  $('.workout-exercise-suggestions', row).hidden = true;
}

function renderExercisePickerResults() {
  const root = $('#exercisePickerResults');
  if (!root) return;
  const query = ($('#exercisePickerSearch')?.value || '').trim().toLocaleLowerCase('pt-BR');
  const results = state.exerciciosData.filter(ex => !query || ex.nome.toLocaleLowerCase('pt-BR').includes(query));
  root.innerHTML = results.length ? results.map(ex => `<div class="exercise-picker-item"><span>${escapeHtml(ex.nome)}</span><details class="record-actions-menu"><summary aria-label="Opções de ${escapeHtml(ex.nome)}">⋮</summary><div class="record-actions-popover"><button type="button" data-action="pick-library-exercise" data-exercise-id="${ex.id}">Adicionar à sessão</button></div></details></div>`).join('') : '<div class="exercise-no-results">Nenhum exercício encontrado.</div>';
}

function addExerciseFromLibrary(exerciseId) {
  const exercise = state.exerciciosData.find(item => String(item.id) === String(exerciseId));
  if (!exercise) return;
  $('#workoutExerciseRows').appendChild(createWorkoutExerciseRow(exercise.id));
}

function selectWorkoutSession(workoutId, sessionId) {
  state.activeTrainingSessions[workoutId] = sessionId;
  renderWorkoutRecords(state.treinosData);
}

function toggleWorkoutExercise(itemId) {
  const details = $(`[data-exercise-details="${itemId}"]`);
  const toggle = $$('[data-action="toggle-workout-exercise"]').find(button => button.dataset.itemId === String(itemId));
  if (!details || !toggle) return;
  details.hidden = !details.hidden;
  toggle.setAttribute('aria-expanded', String(!details.hidden));
}

async function deleteWorkoutExercise(itemId) {
  if (!confirm('Excluir este exercício da sessão?')) return;
  const response = await fetch(`/treino-exercicios/${itemId}`, { method: 'DELETE' });
  if (!response.ok) { alert('Não foi possível excluir o exercício.'); return; }
  await loadStudentRecords(state.selectedStudentId);
}

async function endWorkout(workoutId) {
  const response = await fetch(`/treinos/${workoutId}/encerrar`, { method: 'PATCH' });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    alert(result.detail || 'Não foi possível encerrar o treino.');
    return;
  }
  await loadStudentRecords(state.selectedStudentId);
  await loadHomeDashboard();
  announceWorkoutAction('Treino arquivado');
}

async function reactivateWorkout(workoutId) {
  const response = await fetch(`/treinos/${workoutId}/reativar`, { method: 'PATCH' });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    alert(result.detail || 'Não foi possível reativar o treino.');
    return;
  }
  await loadStudentRecords(state.selectedStudentId);
  await loadHomeDashboard();
  announceWorkoutAction('Treino reativado');
}

function announceWorkoutAction(message) {
  const status = $('#workoutActionStatus');
  if (!status) return;
  status.textContent = message;
  status.hidden = false;
}

async function deleteWorkout(workoutId) {
  if (!confirm('Essa ação não pode ser desfeita. Deseja excluir este treino e todas as sessões e exercícios?')) return;
  const response = await fetch(`/treinos/${workoutId}`, { method: 'DELETE' });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    alert(result.detail || 'Não foi possível excluir o treino.');
    return;
  }
  await loadStudentRecords(state.selectedStudentId);
  await loadHomeDashboard();
}

function handleWorkoutExerciseDragStart(event) {
  const item = event.target.closest('.workout-exercise-item');
  if (!item) return;
  state.draggedWorkoutExercise = item;
  item.classList.add('is-dragging');
  event.dataTransfer.effectAllowed = 'move';
}

function handleWorkoutExerciseDragOver(event) {
  const target = event.target.closest('.workout-exercise-item');
  const dragged = state.draggedWorkoutExercise;
  if (!target || !dragged || target === dragged || target.dataset.sessionId !== dragged.dataset.sessionId) return;
  event.preventDefault();
  const bounds = target.getBoundingClientRect();
  const after = event.clientY > bounds.top + bounds.height / 2;
  target.parentElement.insertBefore(dragged, after ? target.nextSibling : target);
}

async function handleWorkoutExerciseDragEnd(event) {
  const dragged = state.draggedWorkoutExercise;
  if (!dragged) return;
  dragged.classList.remove('is-dragging');
  state.draggedWorkoutExercise = null;
  const list = dragged.closest('[data-session-list]');
  const ids = $$('.workout-exercise-item', list).map(item => Number(item.dataset.itemId));
  try {
    const response = await fetch(`/sessoes/${list.dataset.sessionList}/exercicios/ordem`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids })
    });
    if (!response.ok) throw new Error('A ordem não foi salva.');
  } catch (error) {
    alert(error.message || 'Não foi possível atualizar a ordem.');
    await loadStudentRecords(state.selectedStudentId);
  }
}

async function openAddWorkoutExercisesModal(workoutId) {
  if (!state.exerciciosData.length) await loadExercicios();
  const trigger = $$('[data-action="add-workout-session"]').find(button => button.dataset.recordId === String(workoutId));
  const workout = trigger?.closest('.workout-record');
  if (!workout) return;
  state.selectedWorkoutId = String(workoutId);
  const workoutName = $('strong', workout)?.textContent || 'Treino';
  $('#workoutExercisesSubtitle').textContent = `Planejamento: ${workoutName}`;
  $('#workoutExercisesForm').reset();
  $('[name="sessao_nome"]', $('#workoutExercisesForm')).value = '';
  $('#workoutExerciseRows').innerHTML = '';
  $('#workoutExercisesMessage').textContent = '';
  $('#exercisePickerPanel').hidden = true;
  $('#exercisePickerSearch').value = '';
  $('#workoutExerciseRows').appendChild(createWorkoutExerciseRow());
  $('#workoutExercisesModal').hidden = false;
  document.body.classList.add('modal-open');
}

function closeWorkoutExercisesModal() {
  const modal = $('#workoutExercisesModal');
  if (!modal) return;
  modal.hidden = true;
  $('#workoutExercisesForm')?.reset();
  $('#exercisePickerPanel').hidden = true;
  state.selectedWorkoutId = null;
  document.body.classList.remove('modal-open');
}

function closeWorkoutModal() {
  const modal = $('#workoutModal');
  if (!modal) return;
  modal.hidden = true;
  $('#workoutForm')?.reset();
  document.body.classList.remove('modal-open');
}

async function handleWorkoutSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const message = $('#workoutFormMessage');
  const submit = $('button[type="submit"]', form);
  const formData = Object.fromEntries(new FormData(form).entries());
  const payload = {
    nome: formData.nome.trim(),
    objetivo: formData.objetivo.trim(),
    dificuldade: formData.dificuldade,
    orientacoes_gerais: formData.orientacoes_gerais.trim() || null,
    data_inicio: formData.data_inicio,
    data_fim: formData.data_fim || null,
    remover_apos_vencimento: formData.remover_apos_vencimento === 'true',
    ocultar_antes_inicio: formData.ocultar_antes_inicio === 'true',
  };
  message.textContent = 'Salvando treino…';
  submit.disabled = true;
  try {
    const response = await fetch(`/alunos/${state.selectedStudentId}/treinos`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.detail || 'Não foi possível salvar o treino.');
    closeWorkoutModal();
    await loadStudentRecords(state.selectedStudentId);
  } catch (error) {
    message.textContent = error.message || 'Erro ao salvar o treino.';
  } finally {
    submit.disabled = false;
  }
}

async function handleWorkoutExercisesSubmit(event) {
  event.preventDefault();
  const message = $('#workoutExercisesMessage');
  const submit = $('button[type="submit"]', event.currentTarget);
  const sessionName = $('[name="sessao_nome"]', event.currentTarget).value.trim();
  const exercicios = $$('.workout-exercise-row', $('#workoutExerciseRows')).map(row => ({
    exercicio_id: Number($('[name="exercicio_id"]', row).value),
    series: Number($('[name="series"]', row).value),
    repeticoes: $('[name="repeticoes"]', row).value.trim(),
    descanso_segundos: Number($('[name="descanso_segundos"]', row).value),
    observacoes: $('[name="observacoes"]', row).value.trim() || null
  }));
  if (exercicios.some(ex => !ex.exercicio_id)) {
    message.textContent = 'Selecione um exercício da lista para cada item adicionado.';
    return;
  }
  message.textContent = 'Salvando sessão de treino…';
  submit.disabled = true;
  try {
    const response = await fetch(`/treinos/${state.selectedWorkoutId}/sessoes`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: sessionName, exercicios })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.detail || 'Não foi possível salvar a sessão.');
    const studentId = state.selectedStudentId;
    const treinoId = state.selectedWorkoutId;
    state.activeTrainingSessions[treinoId] = result.id;
    closeWorkoutExercisesModal();
    if (studentId) await loadStudentRecords(studentId);
  } catch (error) {
    message.textContent = error.message || 'Erro ao salvar a sessão de treino.';
  } finally {
    submit.disabled = false;
  }
}

const actions = {
  'toggle-chat': toggleChat,
  'close-chat': closeChat,
  'new-chat': startNewChat,
  'chat-suggestion': (_, t) => submitChatQuestion(t.dataset.prompt || ''),
  'retry-chat': (_, t) => submitChatQuestion(t.dataset.prompt || '', { appendUser: false, responseNode: t.closest('.chat-msg') }),
  'back-to-workspace': showTrainingLanding,
  'back-to-students': () => showWorkspace(DEFAULT_WORKSPACE),
  'open-modal-presencial': openPresencialModal,
  'close-modal-presencial': closePresencialModal,
  'copy-self-registration-link': copySelfRegistrationLink,
  'student-profile-menu': toggleProfileMenu,
  'student-card-menu': (_, t) => toggleStudentCardMenu(t.dataset.studentId, t),
  'open-home-student': (_, t) => {
    switchTab('treino');
    openStudentProfile(t.dataset.studentId);
  },
  'contact-student': (_, t) => contactStudent(t.dataset.studentId || state.selectedStudentId),
  'edit-student': (_, t) => editStudent(t.dataset.studentId || state.selectedStudentId),
  'delete-student': (_, t) => deleteStudent(t.dataset.studentId || state.selectedStudentId),
  'restore-student': (_, t) => restoreStudent(t.dataset.studentId),
  'student-page-prev': () => changeStudentPage(-1),
  'student-page-next': () => changeStudentPage(1),
  'close-modal-exercicio': closeExerciseModal,
  'new-exercise': openNewExerciseModal,
  'close-new-exercise': closeNewExerciseModal,
  'new-assessment': async () => { if (!state.alunosData.length) await loadAlunosFromAPI(); openAssessmentModal(state.selectedStudentId); },
  'new-anamnesis': () => openAssessmentModal(state.selectedStudentId, 'anamnese'),
  'close-assessment': closeAssessmentModal,
  'edit-assessment': (_, t) => editAssessment(t.dataset.recordId),
  'view-assessment': (_, t) => viewAssessment(t.dataset.recordId),
  'delete-assessment': (_, t) => deleteAssessment(t.dataset.recordId),
  'compare-assessments': openAssessmentComparison,
  'close-assessment-comparison': closeAssessmentComparison,
  'view-anamnesis': (_, t) => viewAnamnesis(t.dataset.recordId),
  'edit-anamnesis': (_, t) => editAnamnesis(t.dataset.recordId),
  'send-anamnesis': (_, t) => viewAnamnesis(t.dataset.recordId, true),
  'delete-anamnesis': (_, t) => deleteAnamnesis(t.dataset.recordId),
  'new-workout': openWorkoutModal,
  'close-workout': closeWorkoutModal,
  'add-workout-session': (_, t) => openAddWorkoutExercisesModal(t.dataset.recordId),
  'end-workout': (_, t) => endWorkout(t.dataset.recordId),
  'reactivate-workout': (_, t) => reactivateWorkout(t.dataset.recordId),
  'delete-workout': (_, t) => deleteWorkout(t.dataset.recordId),
  'close-workout-exercises': closeWorkoutExercisesModal,
  'select-workout-session': (_, t) => selectWorkoutSession(t.dataset.workoutId, t.dataset.sessionId),
  'toggle-workout-exercise': (_, t) => toggleWorkoutExercise(t.dataset.itemId),
  'delete-workout-exercise': (_, t) => deleteWorkoutExercise(t.dataset.recordId),
  'pick-library-exercise': (_, t) => addExerciseFromLibrary(t.dataset.exerciseId)
};

function handleClick(e) {
  if (e.target === dom.newStudentModal) return closePresencialModal();
  if (e.target === dom.exerciseModal) return closeExerciseModal();
  if (e.target === dom.newExerciseModal) return closeNewExerciseModal();
  if (e.target === $('#workoutModal')) return closeWorkoutModal();
  if (e.target === $('#workoutExercisesModal')) return closeWorkoutExercisesModal();
  if (e.target === $('#assessmentModal')) return closeAssessmentModal();
  if (e.target === $('#assessmentCompareModal')) return closeAssessmentComparison();
  if (e.target.closest('.brand')) return switchTab('geral');

  const profileMenu = $('[data-profile-menu]');
  if (profileMenu && !profileMenu.hidden && !e.target.closest('[data-profile-menu], [data-action="student-profile-menu"]')) {
    closeAllMenus();
  }
  if (!e.target.closest('.record-actions-menu')) $$('.record-actions-menu[open]').forEach(menu => { menu.open = false; });

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
    if (dom.chatDrawer?.classList.contains('open')) { e.preventDefault(); return closeChat(); }
    if ($('#workoutModal') && !$('#workoutModal').hidden) return closeWorkoutModal();
    if ($('#workoutExercisesModal') && !$('#workoutExercisesModal').hidden) return closeWorkoutExercisesModal();
    if ($('#assessmentModal') && !$('#assessmentModal').hidden) return closeAssessmentModal();
    if ($('#assessmentCompareModal') && !$('#assessmentCompareModal').hidden) return closeAssessmentComparison();
    if (dom.exerciseModal && !dom.exerciseModal.hidden) return closeExerciseModal();
    if (dom.newExerciseModal && !dom.newExerciseModal.hidden) return closeNewExerciseModal();
    if (dom.newStudentModal && !dom.newStudentModal.hidden) return closePresencialModal();
    const openRecordMenus = $$('.record-actions-menu[open]');
    if (openRecordMenus.length) {
      e.preventDefault();
      openRecordMenus.forEach(menu => {
        menu.open = false;
        $('summary', menu)?.focus();
      });
      return;
    }
    return closeAllMenus();
  }

  trapChatFocus(e);

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
  $('#exerciseGroupFilter')?.addEventListener('change', () => { state.exercicioPage = 0; renderExercicios(); });
  $('#exerciseCategoryFilter')?.addEventListener('change', () => { state.exercicioPage = 0; renderExercicios(); });

  // Filtros financeiros
  $$('.finance-filter[data-fin-role]').forEach(b => b.addEventListener('click', () => {
    const role = b.dataset.finRole;
    $$('.finance-filter').forEach(x => x.classList.toggle('active', x === b));
    $$('#financeTable tbody tr').forEach(row => { row.hidden = role !== 'todos' && row.dataset.finRole !== role; });
  }));

  loadExercicios();
  loadHomeDashboard();

  document.addEventListener('click', handleClick);
  document.addEventListener('keydown', handleKeydown);
  dom.chatForm?.addEventListener('submit', sendChatMessage);
  dom.chatInput?.addEventListener('input', resizeChatInput);
  dom.chatInput?.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!dom.chatSendButton?.disabled) dom.chatForm?.requestSubmit();
    }
  });
  dom.studentForm?.addEventListener('submit', handleStudentFormSubmit);
  dom.exerciseForm?.addEventListener('submit', handleExerciseFormSubmit);
  $('#assessmentForm')?.addEventListener('submit', handleAssessmentSubmit);
  $('#workoutForm')?.addEventListener('submit', handleWorkoutSubmit);
  $('#workoutExercisesForm')?.addEventListener('submit', handleWorkoutExercisesSubmit);
  $('#addWorkoutExercise')?.addEventListener('click', () => $('#workoutExerciseRows')?.appendChild(createWorkoutExerciseRow()));
  $('#openExercisePicker')?.addEventListener('click', () => {
    const panel = $('#exercisePickerPanel');
    panel.hidden = !panel.hidden;
    if (!panel.hidden) { renderExercisePickerResults(); $('#exercisePickerSearch').focus(); }
  });
  $('#closeExercisePicker')?.addEventListener('click', () => { $('#exercisePickerPanel').hidden = true; });
  $('#exercisePickerSearch')?.addEventListener('input', renderExercisePickerResults);
  $('#exercisePickerResults')?.addEventListener('click', event => {
    const option = event.target.closest('[data-action="pick-library-exercise"]');
    if (option) event.preventDefault();
  });
  const workoutList = $('.workout-list');
  workoutList?.addEventListener('dragstart', handleWorkoutExerciseDragStart);
  workoutList?.addEventListener('dragover', handleWorkoutExerciseDragOver);
  workoutList?.addEventListener('dragend', handleWorkoutExerciseDragEnd);
  $('#assessmentType')?.addEventListener('change', e => renderAssessmentFields(e.target.value));
  $('#compareAssessmentPrevious')?.addEventListener('change', loadAssessmentComparisonRecords);
  $('#compareAssessmentCurrent')?.addEventListener('change', loadAssessmentComparisonRecords);
  $('#assessmentForm')?.addEventListener('input', updateAssessmentCalculations);
  $('#assessmentForm')?.addEventListener('change', e => { if (e.target.id === 'assessmentStudent') updateAssessmentStudentAge(); else updateAssessmentCalculations(); });
  $('#assessmentStudent')?.addEventListener('change', updateAssessmentStudentAge);
}

document.addEventListener('DOMContentLoaded', init);
