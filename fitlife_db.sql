-- ================================
-- FITLIFE COACHING - BANCO DE DADOS
-- ================================

-- 1. APAGAR TABELAS EXISTENTES (ordem importa por causa das FK)
DROP TABLE IF EXISTS historico_chat;
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
    plano_id INTEGER REFERENCES planos(id)
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