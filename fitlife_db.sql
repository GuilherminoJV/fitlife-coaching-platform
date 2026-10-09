-- ================================
-- FITLIFE COACHING - BANCO DE DADOS
-- ================================

-- 1. APAGAR TABELAS EXISTENTES (ordem importa por causa das FK)
DROP TABLE IF EXISTS historico_chat;
DROP TABLE IF EXISTS avaliacoes;
DROP TABLE IF EXISTS anamnese_respostas;
DROP TABLE IF EXISTS anamneses;
DROP TABLE IF EXISTS alunos;
DROP TABLE IF EXISTS planos;

-- 2. TABELA DE PLANOS
CREATE TABLE planos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(50) NOT NULL,
    preco NUMERIC(10,2) NOT NULL
);

-- 3. TABELA DE ALUNOS
CREATE TABLE alunos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    telefone VARCHAR(20),
    data_cadastro DATE DEFAULT CURRENT_DATE,
    plano_id INTEGER REFERENCES planos(id),
    objetivo VARCHAR(200),
    modalidade VARCHAR(80),
    data_nascimento DATE,
    ativo BOOLEAN NOT NULL DEFAULT TRUE
);

-- 4. TABELA DE ANAMNESES
CREATE TABLE anamneses (
    id SERIAL PRIMARY KEY,
    aluno_id INTEGER REFERENCES alunos(id),
    idade INTEGER,
    altura_cm NUMERIC(5,2),
    peso_kg NUMERIC(5,2),
    objetivo VARCHAR(200),
    historico_saude TEXT,
    historico_lesoes TEXT,
    data_avaliacao DATE DEFAULT CURRENT_DATE
);

-- Respostas do questionário ficam separadas dos registros de medidas físicas.
CREATE TABLE anamnese_respostas (
    id SERIAL PRIMARY KEY,
    aluno_id INTEGER NOT NULL REFERENCES alunos(id),
    pratica_atividade BOOLEAN,
    atividade_qual TEXT,
    frequencia_semanal VARCHAR(50),
    treinou_personal BOOLEAN,
    nivel_condicionamento VARCHAR(20),
    doenca_diagnosticada TEXT,
    medicamentos TEXT,
    historico_cirurgia_lesao TEXT,
    dores_articulares TEXT,
    restricao_medica BOOLEAN,
    medico_liberou VARCHAR(20),
    qualidade_sono VARCHAR(20),
    horas_sono NUMERIC(4,1),
    nivel_estresse VARCHAR(20),
    bebida_alcoolica VARCHAR(20),
    fumante VARCHAR(20),
    suplementos TEXT,
    acompanhamento_nutricional BOOLEAN,
    restricao_alimentar TEXT,
    refeicoes_por_dia INTEGER,
    objetivo_principal VARCHAR(50),
    prazo_resultado TEXT,
    regiao_priorizar TEXT,
    ja_tentou TEXT,
    disponibilidade TEXT,
    origem_avaliacao_id INTEGER UNIQUE,
    criada_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. AVALIAÇÕES FÍSICAS
CREATE TABLE IF NOT EXISTS avaliacoes (
    id SERIAL PRIMARY KEY,
    aluno_id INTEGER NOT NULL REFERENCES alunos(id),
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('essencial', 'premium', 'performance')),
    data_avaliacao DATE NOT NULL DEFAULT CURRENT_DATE,
    data_avaliacao_anterior DATE,
    anamnese_id INTEGER REFERENCES anamnese_respostas(id) ON DELETE SET NULL,
    peso_kg NUMERIC(5,2),
    altura_m NUMERIC(4,2),
    imc NUMERIC(5,2),
    percentual_gordura NUMERIC(5,2),
    massa_gorda_kg NUMERIC(5,2),
    massa_magra_kg NUMERIC(5,2),
    circ_ombro NUMERIC(5,2),
    circ_peitoral NUMERIC(5,2),
    circ_cintura NUMERIC(5,2),
    circ_abdomen NUMERIC(5,2),
    circ_quadril NUMERIC(5,2),
    circ_braco_dir NUMERIC(5,2),
    circ_braco_esq NUMERIC(5,2),
    circ_coxa_dir NUMERIC(5,2),
    circ_coxa_esq NUMERIC(5,2),
    circ_panturrilha_dir NUMERIC(5,2),
    circ_panturrilha_esq NUMERIC(5,2),
    dobra_peitoral NUMERIC(5,2),
    dobra_abdominal NUMERIC(5,2),
    dobra_coxa NUMERIC(5,2),
    dobra_triceps NUMERIC(5,2),
    dobra_subescapular NUMERIC(5,2),
    dobra_suprailiaca NUMERIC(5,2),
    dobra_axilar_medial NUMERIC(5,2),
    dobra_somatorio NUMERIC(5,2),
    dobra_percentual_gordura NUMERIC(5,2),
    observacoes_profissional TEXT,
    mensagem_aluno TEXT,
    recomendacoes TEXT,
    frequencia_ideal INTEGER,
    foco_proximo_bloco TEXT,
    indicacao_nutricional BOOLEAN,
    proxima_reavaliacao DATE,
    postural_cabeca VARCHAR(20),
    postural_ombros VARCHAR(20),
    postural_coluna_toracica VARCHAR(20),
    postural_coluna_lombar VARCHAR(20),
    postural_pelve VARCHAR(20),
    postural_joelhos VARCHAR(20),
    postural_pes VARCHAR(20),
    postural_observacoes TEXT,
    dinam_mao_dir NUMERIC(5,2),
    dinam_mao_esq NUMERIC(5,2),
    func_flexao_braco INTEGER,
    func_agachamento INTEGER,
    func_prancha_seg INTEGER,
    vo2_distancia_m NUMERIC(7,2),
    vo2_maximo NUMERIC(5,2),
    vo2_classificacao VARCHAR(30),
    perf_forca_inf_1 TEXT,
    perf_forca_inf_2 TEXT,
    perf_forca_inf_3 TEXT,
    perf_forca_sup_1 TEXT,
    perf_forca_sup_2 TEXT,
    perf_forca_sup_3 TEXT,
    perf_potencia_1 TEXT,
    perf_potencia_2 TEXT,
    perf_potencia_3 TEXT,
    perf_pontos_fortes TEXT,
    perf_limitadores TEXT,
    perf_protocolo TEXT,
    perf_periodizacao TEXT
);

CREATE INDEX IF NOT EXISTS ix_avaliacoes_aluno_data
    ON avaliacoes (aluno_id, data_avaliacao DESC);

ALTER TABLE avaliacoes ADD COLUMN anamnese_id INTEGER REFERENCES anamnese_respostas(id) ON DELETE SET NULL;

-- 5. TABELA DE HISTÓRICO DO CHAT
CREATE TABLE historico_chat (
    id SERIAL PRIMARY KEY,
    pergunta TEXT NOT NULL,
    resposta TEXT NOT NULL,
    data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================
-- INSERIR DADOS DE EXEMPLO
-- ================================

INSERT INTO planos (nome, preco) VALUES
    ('Plano Mensal', 100.00),
    ('Plano Trimestral', 300.00),
    ('Plano Semestral', 600.00);

INSERT INTO alunos (nome, email, telefone, plano_id) VALUES
    ('João Silva', 'joao@email.com', '27999990001', 1),
    ('Maria Souza', 'maria@email.com', '27999990002', 3),
    ('Carlos Eduardo', 'carlos@email.com', '27999990003', 2);

INSERT INTO anamneses (aluno_id, idade, altura_cm, peso_kg, objetivo, historico_saude, historico_lesoes) VALUES
    (1, 28, 175.00, 80.00, 'Hipertrofia', 'Saudável', 'Nenhuma'),
    (2, 35, 163.00, 65.00, 'Emagrecimento', 'Hipertensão controlada', 'Lesão no joelho em 2022'),
    (3, 42, 180.00, 90.00, 'Condicionamento', 'Diabetes tipo 2', 'Cirurgia no ombro em 2020');
