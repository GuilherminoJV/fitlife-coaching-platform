-- Distingue um treino encerrado manualmente de um treino que vence hoje.
ALTER TABLE treinos
    ADD COLUMN IF NOT EXISTS encerrado_em TIMESTAMPTZ;
