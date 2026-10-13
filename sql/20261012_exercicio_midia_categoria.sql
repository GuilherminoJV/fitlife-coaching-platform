-- Adiciona mídia demonstrativa e padroniza a categoria dos exercícios existentes.
BEGIN;
ALTER TABLE exercicios ADD COLUMN IF NOT EXISTS midia_url TEXT;
UPDATE exercicios
SET categoria = 'Musculação'
WHERE lower(categoria) IN ('força', 'forca');
COMMIT;
