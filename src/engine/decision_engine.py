from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field

# --- ENUMS (Padronização de Saídas e Entradas) ---

class AcaoEngine(str, Enum):
    AUMENTAR_CARGA = "AUMENTAR_CARGA"
    MANTER_CARGA = "MANTER_CARGA"
    REDUZIR_CARGA = "REDUZIR_CARGA"
    ALERTAR_INTENSIDADE_BAIXA = "ALERTAR_INTENSIDADE_BAIXA"
    SUGERIR_DELOAD = "SUGERIR_DELOAD"

class QualidadeTecnica(str, Enum):
    EXCELENTE = "EXCELENTE"
    BOA = "BOA"
    REGULAR = "REGULAR"
    RUIM = "RUIM"

# --- MODELOS DE DADOS (Pydantic) ---

class ExecucaoExercicio(BaseModel):
    exercicio_id: str
    nome_exercicio: str
    carga_atual_kg: float = Field(gt=0, description="Carga utilizada em kg")
    reps_alvo: int = Field(gt=0, description="Meta do topo da faixa de repetições")
    reps_realizadas: int = Field(ge=0, description="Repetições efetivamente completadas")
    rir: int = Field(ge=0, le=10, description="Repetições de Reserva (0 = Falha)")
    tecnica: QualidadeTecnica

class HistoricoExercicio(BaseModel):
    exercicio_id: str
    sessoes_anteriores: List[ExecucaoExercicio] = Field(
        default_factory=list, 
        description="Histórico das últimas execuções para checar estagnação"
    )

class RecomendacaoEngine(BaseModel):
    acao: AcaoEngine
    nova_carga_sugerida_kg: float
    mensagem_feedback: str
    alerta_fadiga: bool = False

# --- MOTOR DE DECISÃO FITLIFE COACHING ---

class FitLifeDecisionEngine:
    
    @staticmethod
    def _calcular_nova_carga(carga_atual: float) -> float:
        """
        Calcula a nova carga com base na carga atual.
        Isolado para facilitar evoluções futuras (como leitura de anilhas/equipamentos).
        """
        if carga_atual < 20.0:
            # Incremento mais conservador para cargas baixas / exercícios isolados
            return round(carga_atual + 1.0, 1)
        
        # Incremento padrão de 5%
        return round(carga_atual * 1.05, 1)

    @staticmethod
    def avaliar_sessao_atual(execucao: ExecucaoExercicio) -> RecomendacaoEngine:
        """
        Avalia o desempenho de um exercício em uma única sessão.
        Regra de decisão: Técnica > Repetições x RIR.
        """
        
        # Regra 1: Falha na Técnica (Prioridade: Segurança Física)
        if execucao.tecnica in [QualidadeTecnica.REGULAR, QualidadeTecnica.RUIM]:
            nova_carga = round(execucao.carga_atual_kg * 0.90, 1) # Reduz 10%
            return RecomendacaoEngine(
                acao=AcaoEngine.REDUZIR_CARGA,
                nova_carga_sugerida_kg=nova_carga,
                mensagem_feedback="Técnica comprometida. Carga reduzida em 10% para recalibrar a execução com segurança."
            )

        # Regra 2: Progressão de Carga (Atingiu topo da faixa + RIR ideal + Boa Técnica)
        if execucao.reps_realizadas >= execucao.reps_alvo and execucao.rir <= 2:
            nova_carga = FitLifeDecisionEngine._calcular_nova_carga(execucao.carga_atual_kg)
            return RecomendacaoEngine(
                acao=AcaoEngine.AUMENTAR_CARGA,
                nova_carga_sugerida_kg=nova_carga,
                mensagem_feedback=f"Excelente! Meta batida com RIR {execucao.rir}. Sugestão de aumento para {nova_carga}kg na próxima sessão."
            )

        # Regra 3: Subestimação de Esforço (RIR muito alto / Carga leve)
        if execucao.rir >= 4:
            return RecomendacaoEngine(
                acao=AcaoEngine.ALERTAR_INTENSIDADE_BAIXA,
                nova_carga_sugerida_kg=execucao.carga_atual_kg,
                mensagem_feedback="Intensidade abaixo do estímulo alvo (RIR >= 4). Mantenha a carga, mas busque trabalhar mais próximo da falha."
            )

        # Regra 4: Consolidação de Carga (Execução boa, mas não atingiu topo da faixa)
        return RecomendacaoEngine(
            acao=AcaoEngine.MANTER_CARGA,
            nova_carga_sugerida_kg=execucao.carga_atual_kg,
            mensagem_feedback="Desempenho dentro do esperado. Mantenha a carga até atingir o topo da faixa de repetições com RIR <= 2."
        )

    @staticmethod
    def checar_estagnacao_ou_fadiga(historico: HistoricoExercicio) -> Optional[RecomendacaoEngine]:
        """
        Analisa as últimas 3 sessões do mesmo exercício para identificar estagnação.
        """
        sessoes = historico.sessoes_anteriores
        if len(sessoes) < 3:
            return None  # Histórico insuficiente para diagnosticar

        ultimas_3 = sessoes[-3:]
        
        cargas = [s.carga_atual_kg for s in ultimas_3]
        reps = [s.reps_realizadas for s in ultimas_3]
        rirs = [s.rir for s in ultimas_3]

        estagnado = len(set(cargas)) == 1 and len(set(reps)) == 1
        alta_fadiga = all(rir == 0 for rir in rirs)

        if estagnado and alta_fadiga:
            nova_carga = round(cargas[-1] * 0.80, 1) # Deload de 20%
            return RecomendacaoEngine(
                acao=AcaoEngine.SUGERIR_DELOAD,
                nova_carga_sugerida_kg=nova_carga,
                mensagem_feedback="Desempenho estagnado por 3 sessões seguidas com falha total. Recomendada 1 semana de Deload (Volume/Carga reduzidos).",
                alerta_fadiga=True
            )

        return None

# --- TESTE LOCAL DO MÓDULO ---

if __name__ == "__main__":
    engine = FitLifeDecisionEngine()

    print("=== TESTANDO O MOTOR DE DECISÃO FITLIFE ===\n")

    # Teste 1: Carga Alta (Leg Press) -> Incremento percentual
    legpress = ExecucaoExercicio(
        exercicio_id="ex_01",
        nome_exercicio="Leg Press 45°",
        carga_atual_kg=200.0,
        reps_alvo=12,
        reps_realizadas=12,
        rir=1,
        tecnica=QualidadeTecnica.EXCELENTE
    )
    res1 = engine.avaliar_sessao_atual(legpress)
    print(f"1. Leg Press (200kg): [{res1.acao.value}] -> Nova Carga: {res1.nova_carga_sugerida_kg}kg | {res1.mensagem_feedback}")

    # Teste 2: Carga Baixa (Elevação Lateral) -> Incremento conservador
    elevacao = ExecucaoExercicio(
        exercicio_id="ex_02",
        nome_exercicio="Elevação Lateral",
        carga_atual_kg=12.0,
        reps_alvo=12,
        reps_realizadas=12,
        rir=2,
        tecnica=QualidadeTecnica.BOA
    )
    res2 = engine.avaliar_sessao_atual(elevacao)
    print(f"2. Elevação Lateral (12kg): [{res2.acao.value}] -> Nova Carga: {res2.nova_carga_sugerida_kg}kg | {res2.mensagem_feedback}")

    # Teste 3: Técnica Ruim -> Redução por segurança
    agachamento = ExecucaoExercicio(
        exercicio_id="ex_03",
        nome_exercicio="Agachamento Livre",
        carga_atual_kg=100.0,
        reps_alvo=10,
        reps_realizadas=8,
        rir=0,
        tecnica=QualidadeTecnica.RUIM
    )
    res3 = engine.avaliar_sessao_atual(agachamento)
    print(f"3. Agachamento (100kg): [{res3.acao.value}] -> Nova Carga: {res3.nova_carga_sugerida_kg}kg | {res3.mensagem_feedback}")