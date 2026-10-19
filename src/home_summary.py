"""Regras e montagem do resumo operacional exibido na Home."""

from datetime import date, datetime, timedelta, timezone
from typing import Any, Mapping
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


try:
    FUSO_HORARIO_HOME = ZoneInfo("America/Sao_Paulo")
except ZoneInfoNotFoundError:
    # O Python no Windows pode não ter a base IANA instalada. São Paulo não
    # adota horário de verão desde 2019, então UTC-3 é o offset atual correto.
    FUSO_HORARIO_HOME = timezone(timedelta(hours=-3), "America/Sao_Paulo")
JANELA_REAVALIACAO_DIAS = 30
JANELA_TREINO_DIAS = 7


def data_atual_home() -> date:
    """Retorna a data local de São Paulo, sem depender do fuso do servidor."""
    return datetime.now(FUSO_HORARIO_HOME).date()


def _iso(valor: Any) -> str | None:
    return valor.isoformat() if valor is not None else None


def montar_resumo_home(
    registros: list[Mapping[str, Any]],
    *,
    hoje: date | None = None,
    janela_reavaliacao_dias: int = JANELA_REAVALIACAO_DIAS,
    janela_treino_dias: int = JANELA_TREINO_DIAS,
) -> dict[str, Any]:
    """Classifica alunos ativos e monta a resposta pública do endpoint.

    `registros` deve conter uma linha por aluno ativo, com a avaliação mais
    recente, o treino iniciado mais relevante e a existência de anamnese.
    A função é pura para permitir testes com datas controladas.
    """
    referencia = hoje or data_atual_home()
    limite_reavaliacao = date.fromordinal(referencia.toordinal() + janela_reavaliacao_dias)
    limite_treino = date.fromordinal(referencia.toordinal() + janela_treino_dias)

    reavaliacoes_vencidas: list[dict[str, Any]] = []
    reavaliacoes_proximas: list[dict[str, Any]] = []
    avaliacoes_sem_proxima_data: list[dict[str, Any]] = []
    alunos_sem_avaliacao: list[dict[str, Any]] = []
    treinos_vencidos: list[dict[str, Any]] = []
    treinos_proximos: list[dict[str, Any]] = []
    treinos_ativos: list[dict[str, Any]] = []
    alunos_sem_treino_ativo: list[dict[str, Any]] = []
    alunos_sem_anamnese: list[dict[str, Any]] = []
    pendencias: dict[int, dict[str, Any]] = {}

    for registro in registros:
        aluno_id = registro["aluno_id"]
        nome = registro["nome"]
        aluno = {"aluno_id": aluno_id, "nome": nome}
        motivos: list[str] = []

        avaliacao_id = registro.get("avaliacao_id")
        proxima = registro.get("proxima_reavaliacao")
        if avaliacao_id is None:
            alunos_sem_avaliacao.append(aluno)
        elif proxima is None:
            avaliacoes_sem_proxima_data.append({
                **aluno,
                "avaliacao_id": avaliacao_id,
                "data_avaliacao": _iso(registro.get("data_avaliacao")),
            })
        elif proxima < referencia:
            item = {
                **aluno,
                "avaliacao_id": avaliacao_id,
                "proxima_reavaliacao": _iso(proxima),
                "dias_atraso": (referencia - proxima).days,
            }
            reavaliacoes_vencidas.append(item)
            motivos.append("reavaliacao_vencida")
        elif registro.get("reavaliacao_na_janela", proxima <= limite_reavaliacao):
            reavaliacoes_proximas.append({
                **aluno,
                "avaliacao_id": avaliacao_id,
                "proxima_reavaliacao": _iso(proxima),
                "dias_restantes": (proxima - referencia).days,
            })

        treino_id = registro.get("treino_id")
        data_fim = registro.get("treino_data_fim")
        treino_encerrado = bool(registro.get("treino_encerrado", False))
        treino_ativo = treino_id is not None and not treino_encerrado and (data_fim is None or data_fim >= referencia)
        if not treino_ativo:
            alunos_sem_treino_ativo.append(aluno)
            motivos.append("sem_treino_ativo")

        if treino_ativo:
            treinos_ativos.append({
                **aluno,
                "treino_id": treino_id,
                "nome_treino": registro.get("treino_nome"),
                "data_fim": _iso(data_fim),
            })

        if treino_id is not None and data_fim is not None:
            treino = {
                **aluno,
                "treino_id": treino_id,
                "nome_treino": registro.get("treino_nome"),
                "data_inicio": _iso(registro.get("treino_data_inicio")),
                "data_fim": _iso(data_fim),
            }
            if data_fim < referencia and not treino_encerrado:
                treinos_vencidos.append({
                    **treino,
                    "dias_atraso": (referencia - data_fim).days,
                })
                motivos.append("treino_vencido")
            elif not treino_encerrado and registro.get("treino_na_janela", data_fim <= limite_treino):
                treinos_proximos.append({
                    **treino,
                    "dias_restantes": (data_fim - referencia).days,
                })

        if not registro.get("tem_anamnese", False):
            alunos_sem_anamnese.append(aluno)

        if motivos:
            pendencias[aluno_id] = {**aluno, "motivos": sorted(set(motivos))}

    indicadores = {
        "alunos_ativos": len(registros),
        "reavaliacoes_vencidas": len(reavaliacoes_vencidas),
        "reavaliacoes_proximas": len(reavaliacoes_proximas),
        "alunos_sem_avaliacao": len(alunos_sem_avaliacao),
        "avaliacoes_sem_proxima_data": len(avaliacoes_sem_proxima_data),
        "treinos_vencidos": len(treinos_vencidos),
        "treinos_proximos_do_fim": len(treinos_proximos),
        "alunos_sem_treino_ativo": len(alunos_sem_treino_ativo),
        "alunos_sem_anamnese": len(alunos_sem_anamnese),
        "alunos_pendentes": len(pendencias),
    }

    return {
        "data_referencia": referencia.isoformat(),
        "parametros": {
            "janela_reavaliacao_dias": janela_reavaliacao_dias,
            "janela_treino_dias": janela_treino_dias,
        },
        "indicadores": indicadores,
        "reavaliacoes": {
            "vencidas": reavaliacoes_vencidas,
            "proximas": reavaliacoes_proximas,
            "sem_proxima_data": avaliacoes_sem_proxima_data,
            "alunos_sem_avaliacao": alunos_sem_avaliacao,
        },
        "treinos": {
            "ativos": treinos_ativos,
            "vencidos": treinos_vencidos,
            "proximos_do_fim": treinos_proximos,
            "alunos_sem_treino_ativo": alunos_sem_treino_ativo,
        },
        "alunos_sem_anamnese": alunos_sem_anamnese,
        "alunos_pendentes": list(pendencias.values()),
    }
