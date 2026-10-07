/*
  1. Configuração
  2. Dados
  3. DOM
  4. Tema / hero
  5. Navegação
  6. Treino / alunos
  7. Exercícios / filtros / modal
  8. FitLife IA
  9. Ações / eventos
  10. Inicialização
*/

/* 1. CONFIGURAÇÃO */

const DEFAULT_TAB = 'geral';
const DEFAULT_THEME = 'general';
const DEFAULT_WORKSPACE = 'alunos';
const CHAT_ENDPOINT = '/perguntar';
const STUDENTS_PER_PAGE = 6;
const EXERCISES_PER_PAGE = 10;

/* 2. DADOS */

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

const tabEnterHooks = {
  treino: () => showWorkspace(DEFAULT_WORKSPACE)
};

/* 3. DOM */

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
  newStudentModal: document.getElementById('modalNovoAluno'),

  exerciseTableBody: document.getElementById('exerciseTableBody'),
  exercisePager: document.getElementById('exercicioPager'),

  exerciseModal: document.getElementById('modalExercicio'),
  exerciseModalMedia: document.getElementById('exerciseModalMedia')
};

let studentPage = 0;
let exerciciosData = [];
let exercicioPage = 0;
let exercicioCategoria = '';

/* 4. TEMA / HERO */

function applyTheme(theme = DEFAULT_THEME) {
  document.body.dataset.theme = theme;
}

function updateHeroImage(imageUrl) {
  const { heroImg } = dom;

  if (!heroImg || !imageUrl) return;

  if (heroImg.getAttribute('src') === imageUrl) return;

  heroImg.classList.remove('is-error');
  heroImg.classList.add('is-loading');

  heroImg.onload = () => {
    requestAnimationFrame(() => {
      heroImg.classList.remove('is-loading');
    });
  };

  heroImg.onerror = () => {
    console.warn(`Não foi possível carregar: ${imageUrl}`);

    heroImg.classList.remove('is-loading');
    heroImg.classList.add('is-error');
  };

  heroImg.src = imageUrl;
}

function updateHero(profile) {
  if (!profile) return;

  applyTheme(profile.theme);
  updateHeroImage(profile.img);

  if (dom.heroTag) {
    dom.heroTag.textContent = profile.tag;
  }

  if (dom.heroName) {
    dom.heroName.textContent = profile.name;
  }

  if (dom.heroRole) {
    dom.heroRole.textContent = profile.role;
  }
}

/* 5. NAVEGAÇÃO */

function switchTab(tabName) {
  const targetTab = document.getElementById(`tab-${tabName}`);

  if (!targetTab) return;

  document
    .querySelectorAll('.ghost-btn[data-tab]')
    .forEach(button => {
      const isActive = button.dataset.tab === tabName;

      button.classList.toggle('active', isActive);

      if (isActive) {
        button.setAttribute('aria-current', 'page');
      } else {
        button.removeAttribute('aria-current');
      }
    });

  document
    .querySelectorAll('.tab-content')
    .forEach(tab => {
      tab.classList.toggle(
        'active',
        tab === targetTab
      );
    });

  updateHero(
    heroProfiles[tabName] ??
    heroProfiles[DEFAULT_TAB]
  );

  tabEnterHooks[tabName]?.();
}

/* 6. TREINO / ALUNOS */

function showWorkspace(workspaceName) {
  document
    .querySelectorAll('.workspace-btn')
    .forEach(button => {
      button.classList.toggle(
        'active',
        button.dataset.workspace === workspaceName
      );
    });

  document
    .querySelectorAll('.workspace-panel')
    .forEach(panel => {
      const isTarget =
        panel.id === `workspace-${workspaceName}`;

      panel.classList.toggle(
        'active',
        isTarget
      );

      panel.hidden = !isTarget;
    });

  if (workspaceName === 'alunos') {
    studentPage = 0;
    updateStudentPager();
  }
}

function fillFields(container, values) {
  container
    .querySelectorAll('[data-field]')
    .forEach(element => {
      const value =
        values[element.dataset.field];

      if (value !== undefined) {
        element.textContent = value;
      }
    });
}

function openStudentProfile(studentId) {
  const student = students[studentId];

  const profilePanel =
    document.getElementById(
      'workspace-aluno-perfil'
    );

  if (!student || !profilePanel) return;

  fillFields(profilePanel, {
    ...student,
    summary:
      `${student.goal} • ${student.plan}`
  });

  showWorkspace('aluno-perfil');
}

function renderStudentCards() {
  if (!dom.studentGrid) return;

  dom.studentGrid.innerHTML =
    Object.entries(students)
      .map(([id, student]) => `
        <article class="student-card">
          <div
            class="student-avatar"
            aria-hidden="true"
          >
            ${escapeHtml(student.initials)}
          </div>

          <div class="student-info">
            <h3>
              ${escapeHtml(student.name)}
            </h3>

            <span>
              ${escapeHtml(student.goal)}
              •
              ${escapeHtml(student.plan)}
            </span>
          </div>

          <span
            class="status-dot active"
            role="img"
            aria-label="Aluno ativo"
          ></span>

          <button
            type="button"
            class="secondary-btn"
            data-student-id="${escapeHtml(id)}"
          >
            Ver perfil
          </button>
        </article>
      `)
      .join('');
}

function updateStudentPager() {
  if (!dom.studentGrid) return;

  const input =
    document.querySelector(
      '#workspace-alunos input[type="search"]'
    );

  const query =
    input?.value
      .toLowerCase()
      .trim() ?? '';

  const cards =
    Array.from(
      dom.studentGrid.querySelectorAll(
        '.student-card'
      )
    );

  const matchingCards =
    cards.filter(card =>
      card.textContent
        .toLowerCase()
        .includes(query)
    );

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        matchingCards.length /
        STUDENTS_PER_PAGE
      )
    );

  studentPage =
    Math.min(
      studentPage,
      totalPages - 1
    );

  cards.forEach(card => {
    card.hidden = true;
  });

  matchingCards
    .slice(
      studentPage * STUDENTS_PER_PAGE,
      (studentPage + 1) *
      STUDENTS_PER_PAGE
    )
    .forEach(card => {
      card.hidden = false;
    });

  if (dom.studentPager) {
    dom.studentPager.hidden =
      matchingCards.length <=
      STUDENTS_PER_PAGE;
  }

  if (dom.studentPagerLabel) {
    dom.studentPagerLabel.textContent =
      `${studentPage + 1} / ${totalPages}`;
  }
}

function bindStudentSearch() {
  const input =
    document.querySelector(
      '#workspace-alunos input[type="search"]'
    );

  if (!input) return;

  input.addEventListener(
    'input',
    () => {
      studentPage = 0;
      updateStudentPager();
    }
  );
}

function changeStudentPage(direction) {
  const input =
    document.querySelector(
      '#workspace-alunos input[type="search"]'
    );

  const query =
    input?.value
      .toLowerCase()
      .trim() ?? '';

  const matches =
    Array.from(
      dom.studentGrid
        ?.querySelectorAll(
          '.student-card'
        ) ?? []
    ).filter(card =>
      card.textContent
        .toLowerCase()
        .includes(query)
    ).length;

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        matches /
        STUDENTS_PER_PAGE
      )
    );

  studentPage =
    Math.max(
      0,
      Math.min(
        studentPage + direction,
        totalPages - 1
      )
    );

  updateStudentPager();
}

/* 7. EXERCÍCIOS / FILTROS / MODAL */

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getExerciseValue(
  exercise,
  keys,
  fallback = '—'
) {
  for (const key of keys) {
    const value = exercise?.[key];

    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ''
    ) {
      return String(value).trim();
    }
  }

  return fallback;
}

async function loadExercicios(
  categoria = exercicioCategoria
) {
  exercicioCategoria =
    categoria || '';

  const url =
    exercicioCategoria
      ? `/exercicios/categoria/${encodeURIComponent(
          exercicioCategoria
        )}`
      : '/exercicios';

  try {
    const response =
      await fetch(url);

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    const data =
      await response.json();

    exerciciosData =
      Array.isArray(data)
        ? data
        : [];

    exercicioPage = 0;

    renderExercicios();

  } catch (error) {
    console.error(
      'Erro ao carregar exercícios:',
      error
    );

    exerciciosData = [];

    renderExercicios();
  }
}

function getExerciseSearchValue() {
  const input =
    document.querySelector(
      '#workspace-exercicios input[type="search"]'
    );

  return (
    input?.value
      .toLowerCase()
      .trim() ?? ''
  );
}

function getFilteredExercises() {
  const filtro =
    getExerciseSearchValue();

  if (!filtro) {
    return exerciciosData;
  }

  return exerciciosData.filter(
    exercise => {
      const text = [
        exercise.nome,
        exercise.musculo_alvo,
        exercise.categoria,
        exercise.nivel,
        exercise.equipamento,
        exercise.tipo_articular
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return text.includes(filtro);
    }
  );
}

function renderExercicios() {
  const tbody =
    dom.exerciseTableBody;

  if (!tbody) return;

  const filtrados =
    getFilteredExercises();

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filtrados.length /
        EXERCISES_PER_PAGE
      )
    );

  exercicioPage =
    Math.min(
      exercicioPage,
      totalPages - 1
    );

  const inicio =
    exercicioPage *
    EXERCISES_PER_PAGE;

  const pagina =
    filtrados.slice(
      inicio,
      inicio + EXERCISES_PER_PAGE
    );

  tbody.innerHTML =
    pagina
      .map(exercise => `
        <tr>
          <th scope="row">
            ${escapeHtml(
              exercise.nome
            )}
          </th>

          <td>
            ${escapeHtml(
              exercise.musculo_alvo
            )}
          </td>

          <td>
            ${escapeHtml(
              getExerciseValue(
                exercise,
                ['tipo_articular']
              )
            )}
          </td>

          <td>
            <button
              type="button"
              class="table-btn"
              data-exercise-id="${escapeHtml(
                exercise.id
              )}"
            >
              Ver
            </button>
          </td>
        </tr>
      `)
      .join('');

  renderExercisePager(
    totalPages,
    filtrados.length
  );
}

function renderExercisePager(
  totalPages,
  totalItems
) {
  const pager =
    dom.exercisePager;

  if (!pager) return;

  const buttons =
    Array.from(
      { length: totalPages },
      (_, index) => `
        <button
          type="button"
          class="page-btn ${
            index === exercicioPage
              ? 'active'
              : ''
          }"
          data-exercise-page="${index}"
          aria-label="Página ${
            index + 1
          }"
        >
          ${index + 1}
        </button>
      `
    )
    .join('');

  pager.innerHTML = `
    <button
      type="button"
      class="page-btn"
      data-exercise-page="prev"
      aria-label="Exercícios anteriores"
      ${exercicioPage === 0 ? 'disabled' : ''}
    >
      &lsaquo;
    </button>

    ${buttons}

    <button
      type="button"
      class="page-btn"
      data-exercise-page="next"
      aria-label="Próximos exercícios"
      ${
        exercicioPage ===
        totalPages - 1
          ? 'disabled'
          : ''
      }
    >
      &rsaquo;
    </button>
  `;

  pager.hidden =
    totalItems <=
    EXERCISES_PER_PAGE;
}

function goToExercicioPage(page) {
  const totalPages =
    Math.max(
      1,
      Math.ceil(
        getFilteredExercises().length /
        EXERCISES_PER_PAGE
      )
    );

  exercicioPage =
    Math.max(
      0,
      Math.min(
        Number(page),
        totalPages - 1
      )
    );

  renderExercicios();
}

function renderExerciseMedia(
  exercise
) {
  if (!dom.exerciseModalMedia) {
    return;
  }

  const name =
    getExerciseValue(
      exercise,
      ['nome'],
      'Exercício'
    );

  const mediaUrl =
    getExerciseValue(
      exercise,
      [
        'video_url',
        'gif_url',
        'midia_url',
        'media_url'
      ],
      ''
    );

  if (!mediaUrl) {
    dom.exerciseModalMedia.innerHTML = `
      <div class="exercise-media-placeholder">

        <div
          class="exercise-media-icon"
          aria-hidden="true"
        >
          ▶
        </div>

        <strong>
          GIF ou vídeo demonstrativo
        </strong>

        <span>
          Mídia de aproximadamente
          10 segundos
        </span>

      </div>
    `;

    return;
  }

  const isVideo =
    /\.(mp4|webm|ogg)(\?|#|$)/i.test(
      mediaUrl
    );

  if (isVideo) {
    const video =
      document.createElement(
        'video'
      );

    video.src = mediaUrl;
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.controls = true;

    video.setAttribute(
      'aria-label',
      `Demonstração de ${name}`
    );

    dom.exerciseModalMedia.replaceChildren(
      video
    );

    return;
  }

  const image =
    document.createElement(
      'img'
    );

  image.src = mediaUrl;

  image.alt =
    `Demonstração de ${name}`;

  dom.exerciseModalMedia.replaceChildren(
    image
  );
}

function openExerciseModal(
  exerciseId
) {
  const exercise =
    exerciciosData.find(
      item =>
        String(item.id) ===
        String(exerciseId)
    );

  if (
    !exercise ||
    !dom.exerciseModal
  ) {
    return;
  }

  const fields = {
    name: getExerciseValue(
      exercise,
      ['nome']
    ),

    muscle: getExerciseValue(
      exercise,
      ['musculo_alvo'],
      ''
    ),

    equipment: getExerciseValue(
      exercise,
      ['equipamento'],
      ''
    ),

    type: getExerciseValue(
      exercise,
      ['tipo_articular'],
      ''
    )
  };

  dom.exerciseModal
    .querySelectorAll(
      '[data-exercise-field]'
    )
    .forEach(element => {
      const field =
        element.dataset
          .exerciseField;

      if (!(field in fields)) {
        return;
      }

      element.textContent =
        fields[field] || '—';
    });

  renderExerciseMedia(
    exercise
  );

  dom.exerciseModal.hidden =
    false;

  dom.exerciseModal.classList.add(
    'open'
  );

  document.body.classList.add(
    'modal-open'
  );

  dom.exerciseModal
    .querySelector(
      '.modal-close-btn'
    )
    ?.focus();
}

function closeExerciseModal() {
  if (!dom.exerciseModal) {
    return;
  }

  dom.exerciseModal.classList.remove(
    'open'
  );

  dom.exerciseModal.hidden =
    true;

  document.body.classList.remove(
    'modal-open'
  );

  if (dom.exerciseModalMedia) {
    dom.exerciseModalMedia.innerHTML = `
      <div class="exercise-media-placeholder">

        <div
          class="exercise-media-icon"
          aria-hidden="true"
        >
          ▶
        </div>

        <strong>
          GIF ou vídeo demonstrativo
        </strong>

        <span>
          Mídia de aproximadamente
          10 segundos
        </span>

      </div>
    `;
  }
}

function bindExerciseSearch() {
  const input =
    document.querySelector(
      '#workspace-exercicios input[type="search"]'
    );

  if (!input) return;

  input.addEventListener(
    'input',
    () => {
      exercicioPage = 0;
      renderExercicios();
    }
  );
}

function bindExerciseCategoryFilter() {
  const select =
    document.querySelector(
      '#workspace-exercicios select'
    );

  if (!select) return;

  select.addEventListener(
    'change',
    () => {
      loadExercicios(
        select.value
      );
    }
  );
}

function bindFinancialFilters() {
  document
    .querySelectorAll(
      '.finance-filter[data-fin-role]'
    )
    .forEach(button => {
      button.addEventListener(
        'click',
        () => {
          const role =
            button.dataset.finRole;

          document
            .querySelectorAll(
              '.finance-filter'
            )
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
                row.dataset.finRole !==
                  role;
            });
        }
      );
    });
}

/* 8. FITLIFE IA */

function toggleChat() {
  if (!dom.chatDrawer) return;

  const isOpen =
    dom.chatDrawer.classList.toggle(
      'open'
    );

  document
    .querySelector(
      '.floating-chat-toggle'
    )
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

function appendChatMessage(
  role,
  text
) {
  const message =
    document.createElement(
      'div'
    );

  message.classList.add(
    'chat-msg',
    role
  );

  message.textContent =
    text;

  dom.chatBody.appendChild(
    message
  );

  scrollChatToBottom();

  return message;
}

function renderBotAnswer(
  messageElement,
  markdown
) {
  if (
    typeof marked !==
    'undefined'
  ) {
    messageElement.innerHTML =
      marked.parse(
        markdown
      );
  } else {
    messageElement.textContent =
      markdown;
  }
}

async function fetchAnswer(
  question
) {
  const response =
    await fetch(
      CHAT_ENDPOINT,
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json'
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

async function sendChatMessage(
  event
) {
  event.preventDefault();

  const text =
    dom.chatInput.value
      .trim();

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

/* 9. AÇÕES / EVENTOS */

function openPresencialModal() {
  if (!dom.newStudentModal) return;

  dom.newStudentModal.hidden =
    false;

  dom.newStudentModal.classList.add(
    'open'
  );

  dom.newStudentModal
    .querySelector('input')
    ?.focus();
}

function closePresencialModal() {
  if (!dom.newStudentModal) return;

  dom.newStudentModal.classList.remove(
    'open'
  );

  dom.newStudentModal.hidden = true;
}

async function copySelfRegistrationLink() {
  const link =
    `${window.location.origin}/cadastro`;

  try {
    await navigator.clipboard.writeText(
      link
    );

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
  'toggle-chat':
    toggleChat,

  'back-to-students':
    () =>
      showWorkspace(
        DEFAULT_WORKSPACE
      ),

  'open-modal-presencial':
    openPresencialModal,

  'close-modal-presencial':
    closePresencialModal,

  'copy-self-registration-link':
    copySelfRegistrationLink,

  'student-page-prev':
    () =>
      changeStudentPage(-1),

  'student-page-next':
    () =>
      changeStudentPage(1),

  'close-modal-exercicio':
    closeExerciseModal,

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

function handleDocumentClick(event) {
  if (
    event.target ===
    dom.newStudentModal
  ) {
    closePresencialModal();
    return;
  }

  if (
    event.target ===
    dom.exerciseModal
  ) {
    closeExerciseModal();
    return;
  }

  const trigger =
    event.target.closest(
      '[data-tab], [data-workspace], [data-student-id], [data-exercise-id], [data-action], [data-student-page], [data-exercise-page]'
    );

  if (!trigger) return;

  const {
    tab,
    workspace,
    studentId,
    exerciseId,
    action,
    studentPage: studentPageAction,
    exercisePage
  } = trigger.dataset;

  if (tab) {
    switchTab(tab);

  } else if (workspace) {
    showWorkspace(workspace);

  } else if (studentId) {
    openStudentProfile(
      studentId
    );

  } else if (exerciseId) {
    openExerciseModal(
      exerciseId
    );

  } else if (action) {
    actionHandlers[action]?.();

  } else if (studentPageAction) {
    actionHandlers[
      `student-page-${studentPageAction}`
    ]?.();

  } else if (
    exercisePage === 'prev'
  ) {
    goToExercicioPage(
      exercicioPage - 1
    );

  } else if (
    exercisePage === 'next'
  ) {
    goToExercicioPage(
      exercicioPage + 1
    );

  } else if (
    exercisePage !== undefined
  ) {
    goToExercicioPage(
      Number(exercisePage)
    );
  }
}

function handleDocumentKeydown(
  event
) {
  if (event.key !== 'Escape') {
    return;
  }

  if (
    dom.exerciseModal &&
    !dom.exerciseModal.hidden
  ) {
    closeExerciseModal();
  }

  if (
    dom.newStudentModal &&
    !dom.newStudentModal.hidden
  ) {
    closePresencialModal();
  }
}

/* 10. INICIALIZAÇÃO */

function init() {
  applyTheme(
    DEFAULT_THEME
  );

  showWorkspace(
    DEFAULT_WORKSPACE
  );

  renderStudentCards();

  bindStudentSearch();

  bindExerciseSearch();

  bindExerciseCategoryFilter();

  bindFinancialFilters();

  updateStudentPager();

  loadExercicios();

  document.addEventListener(
    'click',
    handleDocumentClick
  );

  document.addEventListener(
    'keydown',
    handleDocumentKeydown
  );

  dom.chatForm?.addEventListener(
    'submit',
    sendChatMessage
  );

  dom.studentForm?.addEventListener(
    'submit',
    event => {
      event.preventDefault();

      const formData =
        new FormData(
          dom.studentForm
        );

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

      if (
        !name ||
        !goal ||
        !plan
      ) {
        return;
      }

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
              part[0]
                .toUpperCase()
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
          (
            Object.keys(
              students
            ).length - 1
          ) /
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