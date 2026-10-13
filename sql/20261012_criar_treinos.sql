-- Planejamentos de treino, sessões e exercícios prescritos.

CREATE TABLE IF NOT EXISTS treinos (
    id SERIAL PRIMARY KEY,
    aluno_id INTEGER NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    nome VARCHAR(120) NOT NULL,
    objetivo VARCHAR(200) NOT NULL,
    dificuldade VARCHAR(20) NOT NULL
        CHECK (dificuldade IN ('Iniciante', 'Intermediário', 'Avançado')),
    orientacoes_gerais TEXT,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    remover_apos_vencimento BOOLEAN NOT NULL DEFAULT TRUE,
    ocultar_antes_inicio BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT treinos_datas_validas CHECK (data_fim >= data_inicio)
);

CREATE TABLE IF NOT EXISTS treino_sessoes (
    id SERIAL PRIMARY KEY,
    treino_id INTEGER NOT NULL REFERENCES treinos(id) ON DELETE CASCADE,
    nome VARCHAR(120) NOT NULL,
    ordem INTEGER NOT NULL CHECK (ordem > 0),
    UNIQUE (treino_id, ordem)
);

CREATE TABLE IF NOT EXISTS treino_exercicios (
    id SERIAL PRIMARY KEY,
    sessao_id INTEGER NOT NULL REFERENCES treino_sessoes(id) ON DELETE CASCADE,
    exercicio_id INTEGER NOT NULL REFERENCES exercicios(id) ON DELETE RESTRICT,
    ordem INTEGER NOT NULL CHECK (ordem > 0),
    series INTEGER NOT NULL DEFAULT 3 CHECK (series BETWEEN 1 AND 20),
    repeticoes VARCHAR(40) NOT NULL DEFAULT '8–12',
    descanso_segundos INTEGER NOT NULL DEFAULT 60 CHECK (descanso_segundos >= 0),
    carga VARCHAR(40),
    observacoes VARCHAR(500),
    UNIQUE (sessao_id, ordem)
);

CREATE INDEX IF NOT EXISTS idx_treinos_aluno_datas
    ON treinos (aluno_id, data_inicio DESC);

CREATE INDEX IF NOT EXISTS idx_treino_sessoes_treino
    ON treino_sessoes (treino_id, ordem);

CREATE INDEX IF NOT EXISTS idx_treino_exercicios_sessao
    ON treino_exercicios (sessao_id, ordem);
