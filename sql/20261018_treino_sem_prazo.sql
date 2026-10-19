-- Permite manter uma rotina ativa sem data final definida.
ALTER TABLE treinos
    ALTER COLUMN data_fim DROP NOT NULL;
