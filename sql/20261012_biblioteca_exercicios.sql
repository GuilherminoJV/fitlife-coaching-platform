-- Biblioteca inicial FitLife: 84 exercícios revisados por grupo muscular.
-- Faz backup do conteúdo existente e aborta se alguma tabela referenciar exercicios.
BEGIN;
DO $$
BEGIN
    IF to_regclass(current_schema() || '.exercicios_backup_20261012') IS NOT NULL THEN
        RAISE EXCEPTION 'Backup exercicios_backup_20261012 já existe; migração interrompida para evitar sobrescrever dados.';
    END IF;
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE contype = 'f' AND confrelid = to_regclass(current_schema() || '.exercicios')
    ) THEN
        RAISE EXCEPTION 'Há chaves estrangeiras apontando para exercicios; migração interrompida.';
    END IF;
END $$;
CREATE TABLE exercicios_backup_20261012 AS TABLE exercicios;
DELETE FROM exercicios;
INSERT INTO exercicios (nome, categoria, musculo_alvo, nivel, equipamento, descricao, indicacoes, contraindicacoes, tipo_articular) VALUES
('Supino reto com barra', 'Força', 'Peito', 'Básico', 'Barra', 'Exercício básico para o grupo muscular Peito', NULL, NULL, 'Com barra'),
('Supino reto com halteres', 'Força', 'Peito', 'Básico', 'Halteres', 'Exercício básico para o grupo muscular Peito', NULL, NULL, 'Com halteres'),
('Supino inclinado com barra', 'Força', 'Peito', 'Básico', 'Barra', 'Exercício básico para o grupo muscular Peito', NULL, NULL, 'Com barra'),
('Supino inclinado com halteres', 'Força', 'Peito', 'Básico', 'Halteres', 'Exercício básico para o grupo muscular Peito', NULL, NULL, 'Com halteres'),
('Supino reto na máquina', 'Força', 'Peito', 'Básico', 'Máquina', 'Exercício básico para o grupo muscular Peito', NULL, NULL, 'Em máquina'),
('Crucifixo reto com halteres', 'Força', 'Peito', 'Básico', 'Halteres', 'Exercício básico para o grupo muscular Peito', NULL, NULL, 'Com halteres'),
('Crucifixo inclinado com halteres', 'Força', 'Peito', 'Básico', 'Halteres', 'Exercício básico para o grupo muscular Peito', NULL, NULL, 'Com halteres'),
('Crucifixo reto na máquina', 'Força', 'Peito', 'Básico', 'Máquina', 'braços mantidos estendidos durante o movimento', NULL, NULL, 'Em máquina'),
('Peck Deck', 'Força', 'Peito', 'Básico', 'Máquina', 'movimento na máquina com os cotovelos flexionados; pode não estar disponível em todas as academias', NULL, NULL, 'Em máquina'),
('Crossover na polia alta', 'Força', 'Peito', 'Básico', 'Polia', 'Exercício básico para o grupo muscular Peito', NULL, NULL, 'Na polia'),
('Crossover na polia média', 'Força', 'Peito', 'Básico', 'Polia', 'Exercício básico para o grupo muscular Peito', NULL, NULL, 'Na polia'),
('Crossover na polia baixa', 'Força', 'Peito', 'Básico', 'Polia', 'Exercício básico para o grupo muscular Peito', NULL, NULL, 'Na polia'),
('Flexão de braço', 'Força', 'Peito', 'Básico', 'Peso corporal', 'Exercício básico para o grupo muscular Peito', NULL, NULL, 'Peso corporal'),
('Puxada pronada na polia (pulley)', 'Força', 'Costas', 'Básico', 'Polia alta', 'Exercício básico para o grupo muscular Costas', NULL, NULL, 'Puxada vertical'),
('Puxada supinada na polia (pulley)', 'Força', 'Costas', 'Básico', 'Polia alta', 'Exercício básico para o grupo muscular Costas', NULL, NULL, 'Puxada vertical'),
('Puxada neutra na polia (pulley)', 'Força', 'Costas', 'Básico', 'Polia alta', 'Exercício básico para o grupo muscular Costas', NULL, NULL, 'Puxada vertical'),
('Remada baixa pronada', 'Força', 'Costas', 'Básico', 'Peso corporal', 'Exercício básico para o grupo muscular Costas', NULL, NULL, 'Peso corporal'),
('Remada baixa supinada', 'Força', 'Costas', 'Básico', 'Peso corporal', 'Exercício básico para o grupo muscular Costas', NULL, NULL, 'Peso corporal'),
('Remada baixa neutra', 'Força', 'Costas', 'Básico', 'Peso corporal', 'Exercício básico para o grupo muscular Costas', NULL, NULL, 'Peso corporal'),
('Remada unilateral com halter', 'Força', 'Costas', 'Básico', 'Halteres', 'Exercício básico para o grupo muscular Costas', NULL, NULL, 'Com halteres'),
('Remada curvada pronada com barra', 'Força', 'Costas', 'Básico', 'Barra', 'Exercício básico para o grupo muscular Costas', NULL, NULL, 'Com barra'),
('Remada curvada supinada com barra', 'Força', 'Costas', 'Básico', 'Barra', 'Exercício básico para o grupo muscular Costas', NULL, NULL, 'Com barra'),
('Remada curvada neutra com halteres', 'Força', 'Costas', 'Básico', 'Halteres', 'Exercício básico para o grupo muscular Costas', NULL, NULL, 'Com halteres'),
('Remada na máquina pronada', 'Força', 'Costas', 'Básico', 'Máquina', 'Exercício básico para o grupo muscular Costas', NULL, NULL, 'Em máquina'),
('Remada na máquina supinada', 'Força', 'Costas', 'Básico', 'Máquina', 'Exercício básico para o grupo muscular Costas', NULL, NULL, 'Em máquina'),
('Remada na máquina neutra', 'Força', 'Costas', 'Básico', 'Máquina', 'Exercício básico para o grupo muscular Costas', NULL, NULL, 'Em máquina'),
('Pulldown com barra reta', 'Força', 'Costas', 'Básico', 'Barra', 'Exercício básico para o grupo muscular Costas', NULL, NULL, 'Com barra'),
('Pulldown com barra W', 'Força', 'Costas', 'Básico', 'Barra', 'Exercício básico para o grupo muscular Costas', NULL, NULL, 'Com barra'),
('Pulldown com corda', 'Força', 'Costas', 'Básico', 'Peso corporal', 'Exercício básico para o grupo muscular Costas', NULL, NULL, 'Peso corporal'),
('Graviton pronado', 'Força', 'Costas', 'Básico', 'Máquina', 'Exercício básico para o grupo muscular Costas', NULL, NULL, 'Em máquina'),
('Graviton supinado', 'Força', 'Costas', 'Básico', 'Máquina', 'Exercício básico para o grupo muscular Costas', NULL, NULL, 'Em máquina'),
('Graviton neutro', 'Força', 'Costas', 'Básico', 'Máquina', 'Exercício básico para o grupo muscular Costas', NULL, NULL, 'Em máquina'),
('Desenvolvimento com halteres', 'Força', 'Ombro', 'Básico', 'Halteres', 'Exercício básico para o grupo muscular Ombro', NULL, NULL, 'Com halteres'),
('Desenvolvimento na máquina', 'Força', 'Ombro', 'Básico', 'Máquina', 'Exercício básico para o grupo muscular Ombro', NULL, NULL, 'Em máquina'),
('Elevação lateral com halteres', 'Força', 'Ombro', 'Básico', 'Halteres', 'Exercício básico para o grupo muscular Ombro', NULL, NULL, 'Com halteres'),
('Elevação lateral na polia', 'Força', 'Ombro', 'Básico', 'Polia', 'Exercício básico para o grupo muscular Ombro', NULL, NULL, 'Na polia'),
('Elevação frontal com halteres', 'Força', 'Ombro', 'Básico', 'Halteres', 'Exercício básico para o grupo muscular Ombro', NULL, NULL, 'Com halteres'),
('Crucifixo inverso na máquina', 'Força', 'Ombro', 'Básico', 'Máquina', 'Exercício básico para o grupo muscular Ombro', NULL, NULL, 'Em máquina'),
('Puxada para o rosto na polia (Face Pull)', 'Força', 'Ombro', 'Básico', 'Polia', 'Exercício básico para o grupo muscular Ombro', NULL, NULL, 'Na polia'),
('Rosca direta com barra', 'Força', 'Bíceps', 'Básico', 'Barra', 'Exercício básico para o grupo muscular Bíceps', NULL, NULL, 'Com barra'),
('Rosca alternada com halteres', 'Força', 'Bíceps', 'Básico', 'Halteres', 'Exercício básico para o grupo muscular Bíceps', NULL, NULL, 'Com halteres'),
('Rosca martelo', 'Força', 'Bíceps', 'Básico', 'Peso corporal', 'Exercício básico para o grupo muscular Bíceps', NULL, NULL, 'Peso corporal'),
('Rosca Scott', 'Força', 'Bíceps', 'Básico', 'Peso corporal', 'Exercício básico para o grupo muscular Bíceps', NULL, NULL, 'Peso corporal'),
('Rosca na polia', 'Força', 'Bíceps', 'Básico', 'Polia', 'Exercício básico para o grupo muscular Bíceps', NULL, NULL, 'Na polia'),
('Rosca concentrada', 'Força', 'Bíceps', 'Básico', 'Peso corporal', 'Exercício básico para o grupo muscular Bíceps', NULL, NULL, 'Peso corporal'),
('Tríceps na polia com barra reta', 'Força', 'Tríceps', 'Básico', 'Polia', 'Exercício básico para o grupo muscular Tríceps', NULL, NULL, 'Na polia'),
('Tríceps na polia com barra W', 'Força', 'Tríceps', 'Básico', 'Polia', 'Exercício básico para o grupo muscular Tríceps', NULL, NULL, 'Na polia'),
('Tríceps na polia com corda', 'Força', 'Tríceps', 'Básico', 'Polia', 'Exercício básico para o grupo muscular Tríceps', NULL, NULL, 'Na polia'),
('Tríceps testa com barra', 'Força', 'Tríceps', 'Básico', 'Barra', 'Exercício básico para o grupo muscular Tríceps', NULL, NULL, 'Com barra'),
('Tríceps testa com halter', 'Força', 'Tríceps', 'Básico', 'Halteres', 'Exercício básico para o grupo muscular Tríceps', NULL, NULL, 'Com halteres'),
('Tríceps francês com barra', 'Força', 'Tríceps', 'Básico', 'Barra', 'Exercício básico para o grupo muscular Tríceps', NULL, NULL, 'Com barra'),
('Tríceps francês com halter', 'Força', 'Tríceps', 'Básico', 'Halteres', 'Exercício básico para o grupo muscular Tríceps', NULL, NULL, 'Com halteres'),
('Supino fechado', 'Força', 'Tríceps', 'Básico', 'Peso corporal', 'Exercício básico para o grupo muscular Tríceps', NULL, NULL, 'Peso corporal'),
('Agachamento livre com barra', 'Força', 'Quadríceps', 'Básico', 'Barra', 'Exercício básico para o grupo muscular Quadríceps', NULL, NULL, 'Com barra'),
('Agachamento livre com halter (goblet)', 'Força', 'Quadríceps', 'Básico', 'Halteres', 'Exercício básico para o grupo muscular Quadríceps', NULL, NULL, 'Com halteres'),
('Leg press 45º', 'Força', 'Quadríceps', 'Básico', 'Máquina', 'Exercício básico para o grupo muscular Quadríceps', NULL, NULL, 'Em máquina'),
('Leg horizontal 180º', 'Força', 'Quadríceps', 'Básico', 'Máquina', 'Exercício básico para o grupo muscular Quadríceps', NULL, NULL, 'Em máquina'),
('Agachamento no hack', 'Força', 'Quadríceps', 'Básico', 'Peso corporal', 'Exercício básico para o grupo muscular Quadríceps', NULL, NULL, 'Peso corporal'),
('Cadeira extensora', 'Força', 'Quadríceps', 'Básico', 'Máquina', 'Exercício básico para o grupo muscular Quadríceps', NULL, NULL, 'Em máquina'),
('Afundo', 'Força', 'Quadríceps', 'Básico', 'Peso corporal', 'Exercício básico para o grupo muscular Quadríceps', NULL, NULL, 'Peso corporal'),
('Subida no banco ou caixote', 'Força', 'Quadríceps', 'Básico', 'Peso corporal', 'Exercício básico para o grupo muscular Quadríceps', NULL, NULL, 'Peso corporal'),
('Levantamento terra romeno', 'Força', 'Posterior de coxa', 'Básico', 'Peso corporal', 'Exercício básico para o grupo muscular Posterior de coxa', NULL, NULL, 'Peso corporal'),
('Stiff com barra', 'Força', 'Posterior de coxa', 'Básico', 'Barra', 'Exercício básico para o grupo muscular Posterior de coxa', NULL, NULL, 'Com barra'),
('Stiff com halteres', 'Força', 'Posterior de coxa', 'Básico', 'Halteres', 'Exercício básico para o grupo muscular Posterior de coxa', NULL, NULL, 'Com halteres'),
('Mesa flexora', 'Força', 'Posterior de coxa', 'Básico', 'Máquina', 'Exercício básico para o grupo muscular Posterior de coxa', NULL, NULL, 'Em máquina'),
('Cadeira flexora', 'Força', 'Posterior de coxa', 'Básico', 'Máquina', 'Exercício básico para o grupo muscular Posterior de coxa', NULL, NULL, 'Em máquina'),
('Flexora em pé', 'Força', 'Posterior de coxa', 'Básico', 'Peso corporal', 'Exercício básico para o grupo muscular Posterior de coxa', NULL, NULL, 'Peso corporal'),
('Elevação pélvica com barra', 'Força', 'Glúteos', 'Básico', 'Barra', 'Exercício básico para o grupo muscular Glúteos', NULL, NULL, 'Com barra'),
('Elevação pélvica no solo', 'Força', 'Glúteos', 'Básico', 'Peso corporal', 'Exercício básico para o grupo muscular Glúteos', NULL, NULL, 'Core'),
('Elevação pélvica na máquina', 'Força', 'Glúteos', 'Básico', 'Máquina', 'Exercício básico para o grupo muscular Glúteos', NULL, NULL, 'Em máquina'),
('Cadeira abdutora', 'Força', 'Glúteos', 'Básico', 'Máquina', 'Exercício básico para o grupo muscular Glúteos', NULL, NULL, 'Em máquina'),
('Extensão de quadril na polia com a perna estendida', 'Força', 'Glúteos', 'Básico', 'Polia', 'manter o joelho estendido durante o movimento', NULL, NULL, 'Na polia'),
('Glúteo coice na polia', 'Força', 'Glúteos', 'Básico', 'Polia', 'levar a perna para trás em movimento de coice, combinando extensão do quadril e do joelho', NULL, NULL, 'Na polia'),
('Agachamento búlgaro', 'Força', 'Glúteos', 'Básico', 'Peso corporal', 'Exercício básico para o grupo muscular Glúteos', NULL, NULL, 'Peso corporal'),
('Agachamento sumô', 'Força', 'Glúteos', 'Básico', 'Peso corporal', 'Exercício básico para o grupo muscular Glúteos', NULL, NULL, 'Peso corporal'),
('Levantamento terra sumô', 'Força', 'Glúteos', 'Básico', 'Peso corporal', 'Exercício básico para o grupo muscular Glúteos', NULL, NULL, 'Peso corporal'),
('Prancha frontal', 'Força', 'Core', 'Básico', 'Peso corporal', 'Exercício básico para o grupo muscular Core', NULL, NULL, 'Core'),
('Prancha lateral', 'Força', 'Core', 'Básico', 'Peso corporal', 'Exercício básico para o grupo muscular Core', NULL, NULL, 'Core'),
('Perdigueiro', 'Força', 'Core', 'Básico', 'Peso corporal', 'Exercício básico para o grupo muscular Core', NULL, NULL, 'Core'),
('Abdominal curto', 'Força', 'Core', 'Básico', 'Peso corporal', 'Exercício básico para o grupo muscular Core', NULL, NULL, 'Core'),
('Abdominal remador', 'Força', 'Core', 'Básico', 'Peso corporal', 'Exercício básico para o grupo muscular Core', NULL, NULL, 'Core'),
('Anti-rotação na polia (Pallof press)', 'Força', 'Core', 'Básico', 'Polia', 'Exercício básico para o grupo muscular Core', NULL, NULL, 'Na polia'),
('Abdominal oblíquo', 'Força', 'Core', 'Básico', 'Peso corporal', 'Exercício básico para o grupo muscular Core', NULL, NULL, 'Core'),
('Abdominal infra no solo', 'Força', 'Core', 'Básico', 'Peso corporal', 'Exercício básico para o grupo muscular Core', NULL, NULL, 'Core');
SELECT setval(pg_get_serial_sequence('exercicios', 'id'), COALESCE(MAX(id), 1), COUNT(*) > 0) FROM exercicios;
COMMIT;
