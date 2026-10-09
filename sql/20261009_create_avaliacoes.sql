-- Registros separados de anamnese e avaliação física.
-- Migração aditiva: preserva as tabelas e os dados existentes.
CREATE TABLE IF NOT EXISTS anamnese_respostas (
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

CREATE INDEX IF NOT EXISTS ix_anamnese_respostas_aluno_data
    ON anamnese_respostas (aluno_id, criada_em DESC);

CREATE TABLE IF NOT EXISTS avaliacoes (
    id SERIAL PRIMARY KEY,
    aluno_id INTEGER NOT NULL REFERENCES alunos(id),
    anamnese_id INTEGER REFERENCES anamnese_respostas(id) ON DELETE SET NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('essencial', 'premium', 'performance')),
    data_avaliacao DATE NOT NULL DEFAULT CURRENT_DATE,
    data_avaliacao_anterior DATE,
    peso_kg NUMERIC(5,2), altura_m NUMERIC(4,2), imc NUMERIC(5,2),
    percentual_gordura NUMERIC(5,2), massa_gorda_kg NUMERIC(5,2), massa_magra_kg NUMERIC(5,2),
    circ_ombro NUMERIC(5,2), circ_peitoral NUMERIC(5,2), circ_cintura NUMERIC(5,2), circ_abdomen NUMERIC(5,2),
    circ_quadril NUMERIC(5,2), circ_braco_dir NUMERIC(5,2), circ_braco_esq NUMERIC(5,2),
    circ_coxa_dir NUMERIC(5,2), circ_coxa_esq NUMERIC(5,2), circ_panturrilha_dir NUMERIC(5,2), circ_panturrilha_esq NUMERIC(5,2),
    dobra_peitoral NUMERIC(5,2), dobra_abdominal NUMERIC(5,2), dobra_coxa NUMERIC(5,2), dobra_triceps NUMERIC(5,2),
    dobra_subescapular NUMERIC(5,2), dobra_suprailiaca NUMERIC(5,2), dobra_axilar_medial NUMERIC(5,2),
    dobra_somatorio NUMERIC(5,2), dobra_percentual_gordura NUMERIC(5,2),
    observacoes_profissional TEXT, mensagem_aluno TEXT, recomendacoes TEXT,
    frequencia_ideal INTEGER, foco_proximo_bloco TEXT, indicacao_nutricional BOOLEAN, proxima_reavaliacao DATE,
    postural_cabeca VARCHAR(20), postural_ombros VARCHAR(20), postural_coluna_toracica VARCHAR(20),
    postural_coluna_lombar VARCHAR(20), postural_pelve VARCHAR(20), postural_joelhos VARCHAR(20), postural_pes VARCHAR(20), postural_observacoes TEXT,
    dinam_mao_dir NUMERIC(5,2), dinam_mao_esq NUMERIC(5,2), func_flexao_braco INTEGER, func_agachamento INTEGER,
    func_prancha_seg INTEGER, vo2_distancia_m NUMERIC(7,2), vo2_maximo NUMERIC(5,2), vo2_classificacao VARCHAR(30),
    perf_forca_inf_1 TEXT, perf_forca_inf_2 TEXT, perf_forca_inf_3 TEXT,
    perf_forca_sup_1 TEXT, perf_forca_sup_2 TEXT, perf_forca_sup_3 TEXT,
    perf_potencia_1 TEXT, perf_potencia_2 TEXT, perf_potencia_3 TEXT,
    perf_pontos_fortes TEXT, perf_limitadores TEXT, perf_protocolo TEXT, perf_periodizacao TEXT
);

ALTER TABLE avaliacoes ADD COLUMN IF NOT EXISTS anamnese_id INTEGER REFERENCES anamnese_respostas(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS ix_avaliacoes_aluno_data ON avaliacoes (aluno_id, data_avaliacao DESC);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='avaliacoes' AND column_name='dobra_suprailíaca')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='avaliacoes' AND column_name='dobra_suprailiaca') THEN
        ALTER TABLE avaliacoes RENAME COLUMN "dobra_suprailíaca" TO dobra_suprailiaca;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='avaliacoes' AND column_name='dobra_somatório')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='avaliacoes' AND column_name='dobra_somatorio') THEN
        ALTER TABLE avaliacoes RENAME COLUMN "dobra_somatório" TO dobra_somatorio;
    END IF;
END $$;

-- Migra respostas que estavam misturadas na antiga tabela avaliacoes.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='avaliacoes' AND column_name='pratica_atividade') THEN
        EXECUTE $copy$
            INSERT INTO anamnese_respostas (
                aluno_id, pratica_atividade, atividade_qual, frequencia_semanal, treinou_personal,
                nivel_condicionamento, doenca_diagnosticada, medicamentos, historico_cirurgia_lesao,
                dores_articulares, restricao_medica, medico_liberou, qualidade_sono, horas_sono,
                nivel_estresse, bebida_alcoolica, fumante, suplementos, acompanhamento_nutricional,
                restricao_alimentar, refeicoes_por_dia, objetivo_principal, prazo_resultado,
                regiao_priorizar, ja_tentou, disponibilidade, origem_avaliacao_id
            )
            SELECT a.aluno_id, a.pratica_atividade, a.atividade_qual, a.frequencia_semanal,
                a.treinou_personal, a.nivel_condicionamento, a.doenca_diagnosticada, a.medicamentos,
                a.historico_cirurgia_lesao, a.dores_articulares, a.restricao_medica, a.medico_liberou,
                a.qualidade_sono, a.horas_sono, a.nivel_estresse, a.bebida_alcoolica, a.fumante,
                a.suplementos, a.acompanhamento_nutricional, a.restricao_alimentar, a.refeicoes_por_dia,
                a.objetivo_principal, a.prazo_resultado, a.regiao_priorizar, a.ja_tentou,
                a.disponibilidade, a.id
            FROM avaliacoes a
            WHERE NOT EXISTS (SELECT 1 FROM anamnese_respostas n WHERE n.origem_avaliacao_id=a.id)
              AND (a.pratica_atividade IS NOT NULL OR a.atividade_qual IS NOT NULL OR a.doenca_diagnosticada IS NOT NULL
                OR a.medicamentos IS NOT NULL OR a.historico_cirurgia_lesao IS NOT NULL OR a.objetivo_principal IS NOT NULL)
        $copy$;
        UPDATE avaliacoes a SET anamnese_id=n.id FROM anamnese_respostas n
          WHERE n.origem_avaliacao_id=a.id AND a.anamnese_id IS NULL;
    END IF;
END $$;
