-- Campos adicionais para cálculos da avaliação física; preserva registros existentes.
ALTER TABLE alunos
    ADD COLUMN IF NOT EXISTS sexo VARCHAR(20);

ALTER TABLE avaliacoes
    ADD COLUMN IF NOT EXISTS imc_classificacao VARCHAR(40),
    ADD COLUMN IF NOT EXISTS rcq NUMERIC(5,3),
    ADD COLUMN IF NOT EXISTS rcq_classificacao VARCHAR(20),
    ADD COLUMN IF NOT EXISTS circ_somatorio NUMERIC(7,2),
    ADD COLUMN IF NOT EXISTS percentual_gordura_ideal NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS gordura_ideal_kg NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS massa_magra_ideal_kg NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS peso_ideal_kg NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS gordura_excedente_kg NUMERIC(5,2);
