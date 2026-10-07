/* ==========================================================================
   FITLIFE COACHING — app.js

   INDEX
   1. Configuration
   2. Data (hero profiles, students)
   3. DOM references
   4. Theme and hero
   5. Main navigation (areas)
   6. Training area (workspaces, student profile)
   7. Search filters
   8. AI chat (FitLife Copilot)
   9. Actions and event wiring
   10. Initialization

   Conventions
   - Identifiers are in English; area keys (geral, treino, nutricao...) are
     Portuguese because they match the ids in index.html (#tab-treino).
   - The HTML declares behavior with data-attributes:
       data-tab="treino"           -> show area #tab-treino
       data-workspace="alunos"     -> show panel #workspace-alunos
       data-student-id="1"         -> open that student's profile
       data-action="toggle-chat"   -> run a registered action (section 9)
       data-field="name"           -> text slot filled by fillFields()
   ========================================================================== */


/* ==========================================================================
   1. CONFIGURATION
   ========================================================================== */

const DEFAULT_TAB = 'geral';
const DEFAULT_THEME = 'general';
const DEFAULT_WORKSPACE = 'alunos';
const CHAT_ENDPOINT = '/perguntar';
const STUDENTS_PER_PAGE = 6;


/* ==========================================================================
   2. DATA
   Static for now. Later these can come from the API (same shape).
   ========================================================================== */

/**
 * Hero column content per area.
 * theme -> value of <body data-theme> (see "Area themes" in styles.css).
 * To add an area: add an entry here + a sidebar button + a #tab-{key} section.
 */
const heroProfiles = {
  geral: {
    tag: 'Equipe Multidisciplinar',
    name: 'Ecossistema FitLife',
    role: 'Treino, Nutrição e Psicologia integrados em um só lugar.',
    img: '/static/joao.png',
    theme: 'general'
  },

  treino: {
    tag: 'Educação Física & Biomecânica',
    name: 'Coach João Vitor',
    role: 'Especialista em Biomecânica, Grupos Especiais e Corrida de Rua.',
    img: '/static/joao.png',
    theme: 'fitness'
  },

  nutricao: {
    tag: 'Nutrição Esportiva & Clínica',
    name: 'Nutricionista',
    role: 'Planos alimentares personalizados, reeducação e metas nutricionais.',
    img: 'https://images.unsplash.com/photo-1594824813566-788530791a4d?auto=format&fit=crop&w=800&q=80',
    theme: 'nutrition'
  },

  psicologia: {
    tag: 'Psicologia & Comportamento',
    name: 'Psicóloga',
    role: 'Acompanhamento comportamental, gestão de ansiedade e saúde mental.',
    img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80',
    theme: 'psychology'
  },

  feed: {
    tag: 'Diário do Aluno',
    name: 'Feed Integrado',
    role: 'Acompanhe fotos, relatos de treino e rotina dos alunos.',
    img: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80',
    theme: 'feed'
  },

  financeiro: {
    tag: 'Gestão & Contratos',
    name: 'Financeiro FitLife',
    role: 'Organização de contratos, receitas e serviços da equipe.',
    img: '/static/joao.png',
    theme: 'finance'
  }
};

/** Students, keyed by the id used in data-student-id. */
const students = {
  1: {
    initials: 'JS',
    name: 'João Silva',
    goal: 'Hipertrofia',
    plan: 'Plano Trimestral',
    status: 'Ativo'
  },

  2: {
    initials: 'MS',
    name: 'Maria Souza',
    goal: 'Emagrecimento',
    plan: 'Plano Semestral',
    status: 'Ativo'
  },

  3: {
    initials: 'CE',
    name: 'Carlos Eduardo',
    goal: 'Performance',
    plan: 'Plano Trimestral',
    status: 'Ativo'
  }
};

/** Extra steps to run when an area is opened. */
const tabEnterHooks = {
  treino: () => showWorkspace(DEFAULT_WORKSPACE)
};


/* ==========================================================================
   3. DOM REFERENCES
   (script is loaded with `defer`, so the DOM is already available)
   ========================================================================== */

const dom = {
  heroImg: document.getElementById('heroImg'),
  heroTag: document.getElementById('heroTag'),
  heroName: document.getElementById('heroName'),
  heroRole: document.getElementById('heroRole'),

  chatDrawer: document.getElementById('chatDrawer'),
  chatBody: document.getElementById('drawerBody'),
  chatForm: document.getElementById('chatForm'),
  chatInput: document.getElementById('drawerInput'),

  studentGrid: document.getElementById('studentGrid'),
  studentPager: document.getElementById('studentPager'),
  studentPagerLabel: document.getElementById('studentPagerLabel'),
  studentForm: document.getElementById('presencialStudentForm'),
  newStudentModal: document.getElementById('modalNovoAluno')
};

let studentPage = 0;


/* ==========================================================================
   4. THEME AND HERO
   ========================================================================== */

/** Sets the color theme (CSS reads it from <body data-theme>). */
function applyTheme(theme = DEFAULT_THEME) {
  document.body.dataset.theme = theme;
}

/**
 * Swaps the hero photo with a fade.
 * Fade state is controlled by CSS classes (.is-loading / .is-error).
 */
function updateHeroImage(imageUrl) {
  const { heroImg } = dom;

  if (!heroImg || !imageUrl) return;

  // Same photo (e.g. Home -> Training): nothing to reload
  if (heroImg.getAttribute('src') === imageUrl) return;

  heroImg.classList.remove('is-error');
  heroImg.classList.add('is-loading');

  heroImg.onload = () => {
    requestAnimationFrame(() => heroImg.classList.remove('is-loading'));
  };

  heroImg.onerror = () => {
    console.warn(`Não foi possível carregar: ${imageUrl}`);
    heroImg.classList.remove('is-loading');
    heroImg.classList.add('is-error');
  };

  heroImg.src = imageUrl;
}

/** Applies a hero profile: theme, photo and texts. */
function updateHero(profile) {
  if (!profile) return;

  applyTheme(profile.theme);
  updateHeroImage(profile.img);

  if (dom.heroTag) dom.heroTag.textContent = profile.tag;
  if (dom.heroName) dom.heroName.textContent = profile.name;
  if (dom.heroRole) dom.heroRole.textContent = profile.role;
}


/* ==========================================================================
   5. MAIN NAVIGATION (areas)
   ========================================================================== */

/** Shows the area #tab-{tabName}, highlights its sidebar button and updates the hero. */
function switchTab(tabName) {
  const targetTab = document.getElementById(`tab-${tabName}`);

  if (!targetTab) return;

  // Sidebar buttons only (quick-action cards also carry data-tab but are not nav items)
  document.querySelectorAll('.ghost-btn[data-tab]').forEach(button => {
    const isActive = button.dataset.tab === tabName;

    button.classList.toggle('active', isActive);

    if (isActive) {
      button.setAttribute('aria-current', 'page');
    } else {
      button.removeAttribute('aria-current');
    }
  });

  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.toggle('active', tab === targetTab);
  });

  updateHero(heroProfiles[tabName] ?? heroProfiles[DEFAULT_TAB]);

  tabEnterHooks[tabName]?.();
}


/* ==========================================================================
   6. TRAINING AREA
   ========================================================================== */

/** Shows the workspace panel #workspace-{name} (students, exercises, student profile). */
function showWorkspace(workspaceName) {
  document.querySelectorAll('.workspace-btn').forEach(button => {
    button.classList.toggle(
      'active',
      button.dataset.workspace === workspaceName
    );
  });

  document.querySelectorAll('.workspace-panel').forEach(panel => {
    const isTarget = panel.id === `workspace-${workspaceName}`;

    panel.classList.toggle('active', isTarget);
    panel.hidden = !isTarget;
  });
}

/** Fills every [data-field="key"] inside `container` with values[key]. */
function fillFields(container, values) {
  container.querySelectorAll('[data-field]').forEach(element => {
    const value = values[element.dataset.field];

    if (value !== undefined) {
      element.textContent = value;
    }
  });
}

/** Opens the profile screen for one student. */
function openStudentProfile(studentId) {
  const student = students[studentId];
  const profilePanel = document.getElementById('workspace-aluno-perfil');

  if (!student || !profilePanel) return;

  fillFields(profilePanel, {
    ...student,
    summary: `${student.goal} • ${student.plan}`
  });

  showWorkspace('aluno-perfil');
}


/* ==========================================================================
   7. SEARCH FILTERS
   ========================================================================== */

function renderStudentCards() {
  if (!dom.studentGrid) return;

  dom.studentGrid.innerHTML = Object.entries(students)
    .map(([id, student]) => `
      <article class="student-card">
        <div class="student-avatar" aria-hidden="true">
          ${student.initials}
        </div>

        <div class="student-info">
          <h3>${student.name}</h3>
          <span>${student.goal} • ${student.plan}</span>
        </div>

        <span
          class="status-dot active"
          role="img"
          aria-label="Aluno ativo">
        </span>

        <button
          type="button"
          class="secondary-btn"
          data-student-id="${id}">
          Ver perfil
        </button>
      </article>
    `)
    .join('');
}

function updateStudentPager() {
  const input = document.querySelector(
    '#workspace-alunos input[type="search"]'
  );

  const query =
    input?.value.toLowerCase().trim() ?? '';

  const allCards = Array.from(
    document.querySelectorAll(
      '#workspace-alunos .student-card'
    )
  );

  const matchingCards = allCards.filter(card =>
    card.textContent.toLowerCase().includes(query)
  );

  const totalPages = Math.max(
    1,
    Math.ceil(
      matchingCards.length / STUDENTS_PER_PAGE
    )
  );

  studentPage = Math.min(
    studentPage,
    totalPages - 1
  );

  allCards.forEach(card => {
    card.hidden = true;
  });

  const pageStart =
    studentPage * STUDENTS_PER_PAGE;

  matchingCards
    .slice(
      pageStart,
      pageStart + STUDENTS_PER_PAGE
    )
    .forEach(card => {
      card.hidden = false;
    });

  if (dom.studentPager) {
    dom.studentPager.hidden =
      matchingCards.length <= STUDENTS_PER_PAGE;
  }

  if (dom.studentPagerLabel) {
    dom.studentPagerLabel.textContent =
      `${studentPage + 1} / ${totalPages}`;
  }
}

function bindStudentSearch() {
  const input = document.querySelector(
    '#workspace-alunos input[type="search"]'
  );

  if (!input) return;

  input.addEventListener('input', () => {
    studentPage = 0;
    updateStudentPager();
  });
}

function changeStudentPage(direction) {
  const input = document.querySelector(
    '#workspace-alunos input[type="search"]'
  );

  const query =
    input?.value.toLowerCase().trim() ?? '';

  const totalMatches = Array.from(
    document.querySelectorAll(
      '#workspace-alunos .student-card'
    )
  ).filter(card =>
    card.textContent.toLowerCase().includes(query)
  ).length;

  const totalPages = Math.max(
    1,
    Math.ceil(
      totalMatches / STUDENTS_PER_PAGE
    )
  );

  studentPage = Math.max(
    0,
    Math.min(
      studentPage + direction,
      totalPages - 1
    )
  );

  updateStudentPager();
}

function bindExerciseSearch() {
  const input = document.querySelector(
    '#workspace-exercicios input[type="search"]'
  );

  if (!input) return;

  input.addEventListener('input', () => {
    exercicioPage = 0;
    renderExercicios(input.value.trim());
  });
}

function bindFinancialFilters() {
  document
    .querySelectorAll(
      '.finance-filter[data-fin-role]'
    )
    .forEach(button => {
      button.addEventListener('click', () => {
        const role =
          button.dataset.finRole;

        document
          .querySelectorAll('.finance-filter')
          .forEach(filter => {
            filter.classList.toggle(
              'active',
              filter === button
            );
          });

        document
          .querySelectorAll(
            '#financeTable tbody tr'
          )
          .forEach(row => {
            row.hidden =
              role !== 'todos' &&
              row.dataset.finRole !== role;
          });
      });
    });
}

// --- EXERCÍCIOS DA API ---
const EXERCISES_PER_PAGE = 10;
let exerciciosData = [];
let exercicioPage = 0;

async function loadExercicios(categoria = null) {
  const url = categoria
    ? `/exercicios/categoria/${encodeURIComponent(categoria)}`
    : '/exercicios';

  try {
    const response = await fetch(url);
    exerciciosData = await response.json();
    exercicioPage = 0;
    renderExercicios();
  } catch (error) {
    console.error('Erro ao carregar exercícios:', error);
  }
}

function renderExercicios(filtro = '') {
  const tbody = document.querySelector('#workspace-exercicios tbody');
  const pager = document.getElementById('exercicioPager');

  if (!tbody) return;

  // Filtra pelo nome se houver busca
  const filtrados = exerciciosData.filter(e =>
    e.nome.toLowerCase().includes(filtro.toLowerCase()) ||
    e.musculo_alvo.toLowerCase().includes(filtro.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtrados.length / EXERCISES_PER_PAGE));
  exercicioPage = Math.min(exercicioPage, totalPages - 1);

  const inicio = exercicioPage * EXERCISES_PER_PAGE;
  const pagina = filtrados.slice(inicio, inicio + EXERCISES_PER_PAGE);

  // Renderiza as linhas
  tbody.innerHTML = pagina.map(e => `
    <tr>
      <td><strong>${e.nome}</strong></td>
      <td>${e.musculo_alvo}</td>
      <td>${e.categoria}</td>
      <td>
        <button class="secondary-btn" onclick="verExercicio(${e.id})">
          Ver
        </button>
      </td>
    </tr>
  `).join('');

  // Renderiza os botões de página
  if (pager) {
    const botoes = Array.from({ length: totalPages }, (_, i) => `
      <button
        class="page-btn ${i === exercicioPage ? 'active' : ''}"
        onclick="goToExercicioPage(${i})">
        ${i + 1}
      </button>
    `).join('');

    pager.innerHTML = `
      <button class="page-btn" onclick="goToExercicioPage(${exercicioPage - 1})" ${exercicioPage === 0 ? 'disabled' : ''}>&lsaquo;</button>
      ${botoes}
      <button class="page-btn" onclick="goToExercicioPage(${exercicioPage + 1})" ${exercicioPage === totalPages - 1 ? 'disabled' : ''}>&rsaquo;</button>
    `;

    pager.hidden = filtrados.length <= EXERCISES_PER_PAGE;
  }
}

function goToExercicioPage(page) {
  const input = document.querySelector('#workspace-exercicios input[type="search"]');
  const filtro = input?.value.trim() ?? '';
  const totalPages = Math.max(1, Math.ceil(exerciciosData.length / EXERCISES_PER_PAGE));

  exercicioPage = Math.max(0, Math.min(page, totalPages - 1));
  renderExercicios(filtro);
}

function verExercicio(id) {
  console.log('TODO: abrir detalhe do exercício', id);
}

/* ==========================================================================
   8. AI CHAT (FitLife Copilot)
   ========================================================================== */

function toggleChat() {
  if (!dom.chatDrawer) return;

  const isOpen =
    dom.chatDrawer.classList.toggle('open');

  document
    .querySelector('.floating-chat-toggle')
    ?.setAttribute(
      'aria-expanded',
      String(isOpen)
    );
}

function scrollChatToBottom() {
  if (dom.chatBody) {
    dom.chatBody.scrollTop =
      dom.chatBody.scrollHeight;
  }
}

/** Adds a message bubble. role: 'user' | 'bot'. Returns the element. */
function appendChatMessage(role, text) {
  const message =
    document.createElement('div');

  message.classList.add(
    'chat-msg',
    role
  );

  message.textContent = text;

  dom.chatBody.appendChild(message);

  scrollChatToBottom();

  return message;
}

/** Renders the AI answer as Markdown (falls back to plain text if marked.js is missing). */
function renderBotAnswer(
  messageElement,
  markdown
) {
  if (typeof marked !== 'undefined') {
    messageElement.innerHTML =
      marked.parse(markdown);
  } else {
    messageElement.textContent =
      markdown;
  }
}

/** Sends the question to the backend and returns the answer text (may be undefined). */
async function fetchAnswer(question) {
  const response = await fetch(
    CHAT_ENDPOINT,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        pergunta: question
      })
    }
  );

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status}`
    );
  }

  const data =
    await response.json();

  return data.resposta;
}

/** Handles the chat form submit: shows the question, waits for the answer, shows it. */
async function sendChatMessage(event) {
  event.preventDefault();

  const text =
    dom.chatInput.value.trim();

  if (!text) return;

  appendChatMessage(
    'user',
    text
  );

  dom.chatInput.value = '';

  const loadingMessage =
    appendChatMessage(
      'bot',
      '🤔 Pensando...'
    );

  try {
    const answer =
      await fetchAnswer(text);

    if (answer) {
      renderBotAnswer(
        loadingMessage,
        answer
      );
    } else {
      loadingMessage.textContent =
        'Erro na resposta do servidor.';
    }
  } catch (error) {
    console.error(
      'Erro ao consultar a API:',
      error
    );

    loadingMessage.textContent =
      '⚠️ Erro ao conectar ao servidor.';
  }

  scrollChatToBottom();
}


/* ==========================================================================
   9. ACTIONS AND EVENT WIRING
   ========================================================================== */

/**
 * Registry for data-action="...". To add an action, add a line here.
 * The three "new-*" entries are placeholders until their forms exist.
 */

function openPresencialModal() {
  if (!dom.newStudentModal) return;

  dom.newStudentModal.hidden = false;
  dom.newStudentModal.classList.add('open');

  dom.newStudentModal
    .querySelector('input')
    ?.focus();
}

function closePresencialModal() {
  if (!dom.newStudentModal) return;

  dom.newStudentModal.classList.remove('open');
  dom.newStudentModal.hidden = true;
}

async function copySelfRegistrationLink() {
  const link =
    `${window.location.origin}/cadastro`;

  try {
    await navigator.clipboard.writeText(link);

    console.info(
      `Link de cadastro copiado: ${link}`
    );
  } catch (error) {
    console.warn(
      'Não foi possível copiar o link de cadastro.',
      error
    );
  }
}

const actionHandlers = {
  'toggle-chat': toggleChat,

  'back-to-students': () =>
    showWorkspace(DEFAULT_WORKSPACE),

  'open-modal-presencial':
    openPresencialModal,

  'close-modal-presencial':
    closePresencialModal,

  'copy-self-registration-link':
    copySelfRegistrationLink,

  'student-page-prev':
    () => changeStudentPage(-1),

  'student-page-next':
    () => changeStudentPage(1),

  'new-assessment':
    () =>
      console.log(
        'TODO: nova avaliação física'
      ),

  'new-workout':
    () =>
      console.log(
        'TODO: novo treino'
      ),

  'new-exercise':
    () =>
      console.log(
        'TODO: novo exercício'
      )
};

/**
 * One delegated click listener for the whole page.
 * Also works for elements that are rendered later (lists coming from the API).
 */
function handleDocumentClick(event) {
  if (event.target === dom.newStudentModal) {
    closePresencialModal();
    return;
  }

  const trigger =
    event.target.closest(
      '[data-tab], [data-workspace], [data-student-id], [data-action], [data-student-page]'
    );

  if (!trigger) return;

  const {
    tab,
    workspace,
    studentId,
    action,
    studentPage: pageAction
  } = trigger.dataset;

  if (tab) {
    switchTab(tab);

  } else if (workspace) {
    showWorkspace(workspace);

  } else if (studentId) {
    openStudentProfile(studentId);

  } else if (action) {
    actionHandlers[action]?.();

  } else if (pageAction) {
    actionHandlers[
      `student-page-${pageAction}`
    ]?.();
  }
}


/* ==========================================================================
   10. INITIALIZATION
   ========================================================================== */

function init() {
  applyTheme(DEFAULT_THEME);
  showWorkspace(DEFAULT_WORKSPACE);
  loadExercicios();

  document.addEventListener(
    'click',
    handleDocumentClick
  );

  dom.chatForm?.addEventListener(
    'submit',
    sendChatMessage
  );

  renderStudentCards();
  bindStudentSearch();
  bindExerciseSearch();
  bindFinancialFilters();
  updateStudentPager();

  dom.studentForm?.addEventListener(
    'submit',
    event => {
      event.preventDefault();

      const formData =
        new FormData(dom.studentForm);

      const name =
        String(
          formData.get('name') ?? ''
        ).trim();

      const goal =
        String(
          formData.get('goal') ?? ''
        ).trim();

      const plan =
        String(
          formData.get('plan') ?? ''
        ).trim();

      if (!name || !goal || !plan) return;

      const nextId =
        Math.max(
          ...Object.keys(students)
            .map(Number),
          0
        ) + 1;

      const initials =
        name
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map(
            part =>
              part[0].toUpperCase()
          )
          .join('');

      students[nextId] = {
        initials,
        name,
        goal,
        plan,
        status: 'Ativo'
      };

      dom.studentForm.reset();

      closePresencialModal();

      studentPage =
        Math.floor(
          (Object.keys(students).length - 1) /
          STUDENTS_PER_PAGE
        );

      renderStudentCards();
      updateStudentPager();
    }
  );
}

document.addEventListener(
  'DOMContentLoaded',
  init
);