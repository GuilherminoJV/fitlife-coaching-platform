from datetime import date, timedelta

from src.home_summary import montar_resumo_home


HOJE = date(2026, 10, 18)


def aluno(
    aluno_id,
    *,
    avaliacao_id=1,
    proxima_reavaliacao=None,
    treino_id=1,
    treino_data_fim=None,
    tem_anamnese=True,
):
    return {
        "aluno_id": aluno_id,
        "nome": f"Aluno {aluno_id}",
        "avaliacao_id": avaliacao_id,
        "data_avaliacao": date(2026, 9, 1) if avaliacao_id else None,
        "proxima_reavaliacao": proxima_reavaliacao,
        "treino_id": treino_id,
        "treino_nome": "Plano de treino" if treino_id else None,
        "treino_data_inicio": date(2026, 10, 1) if treino_id else None,
        "treino_data_fim": treino_data_fim,
        "tem_anamnese": tem_anamnese,
    }


def test_classifica_reavaliacao_e_treino_vencidos_com_data_controlada():
    resultado = montar_resumo_home(
        [aluno(1, proxima_reavaliacao=HOJE - timedelta(days=2), treino_data_fim=HOJE - timedelta(days=1))],
        hoje=HOJE,
    )

    assert resultado["indicadores"]["reavaliacoes_vencidas"] == 1
    assert resultado["indicadores"]["treinos_vencidos"] == 1
    assert resultado["indicadores"]["alunos_sem_treino_ativo"] == 1
    assert resultado["alunos_pendentes"] == [{
        "aluno_id": 1,
        "nome": "Aluno 1",
        "motivos": ["reavaliacao_vencida", "sem_treino_ativo", "treino_vencido"],
    }]


def test_classifica_itens_dentro_das_janelas_sem_marcar_pendente():
    resultado = montar_resumo_home(
        [aluno(
            2,
            proxima_reavaliacao=HOJE + timedelta(days=30),
            treino_data_fim=HOJE + timedelta(days=7),
        )],
        hoje=HOJE,
    )

    assert resultado["indicadores"]["reavaliacoes_proximas"] == 1
    assert resultado["indicadores"]["treinos_proximos_do_fim"] == 1
    assert resultado["indicadores"]["alunos_pendentes"] == 0


def test_sem_dados_e_anamnese_sao_explicitos_e_anamnese_nao_e_pendencia():
    resultado = montar_resumo_home(
        [aluno(
            3,
            avaliacao_id=None,
            proxima_reavaliacao=None,
            treino_id=None,
            treino_data_fim=None,
            tem_anamnese=False,
        )],
        hoje=HOJE,
    )

    assert resultado["indicadores"]["alunos_sem_avaliacao"] == 1
    assert resultado["indicadores"]["alunos_sem_treino_ativo"] == 1
    assert resultado["indicadores"]["alunos_sem_anamnese"] == 1
    assert resultado["indicadores"]["alunos_pendentes"] == 1
    assert resultado["reavaliacoes"]["alunos_sem_avaliacao"] == [{
        "aluno_id": 3,
        "nome": "Aluno 3",
    }]
    assert resultado["alunos_sem_anamnese"] == [{"aluno_id": 3, "nome": "Aluno 3"}]
    assert resultado["alunos_pendentes"][0]["motivos"] == ["sem_treino_ativo"]


def test_sem_alunos_retorna_indicadores_zerados():
    resultado = montar_resumo_home([], hoje=HOJE)

    assert resultado["data_referencia"] == "2026-10-18"
    assert resultado["indicadores"]["alunos_ativos"] == 0
    assert resultado["indicadores"]["alunos_pendentes"] == 0
    assert resultado["reavaliacoes"]["alunos_sem_avaliacao"] == []
    assert resultado["treinos"]["alunos_sem_treino_ativo"] == []


def test_consulta_do_resumo_envia_data_e_janelas_como_parametros(monkeypatch):
    from src import database

    capturado = {}

    class Resultado:
        def mappings(self):
            return self

        def all(self):
            return []

    class Conexao:
        def __enter__(self):
            return self

        def __exit__(self, *_):
            return False

        def execute(self, consulta, parametros):
            capturado["sql"] = str(consulta)
            capturado["parametros"] = parametros
            return Resultado()

    class EngineFalso:
        def connect(self):
            return Conexao()

    monkeypatch.setattr(database, "engine", EngineFalso())
    resultado = database.obter_resumo_home(hoje=HOJE)

    assert resultado["data_referencia"] == "2026-10-18"
    assert capturado["parametros"] == {
        "hoje": HOJE,
        "janela_reavaliacao_dias": 30,
        "janela_treino_dias": 7,
    }
    assert "CURRENT_DATE" not in capturado["sql"].upper()
    assert "INTERVAL '1 day'" in capturado["sql"]


def test_treino_ativo_com_data_fim_aparece_em_treinos_ativos():
    resultado = montar_resumo_home(
        [aluno(10, treino_data_fim=HOJE + timedelta(days=20))],
        hoje=HOJE,
    )

    assert resultado["treinos"]["ativos"] == [{
        "aluno_id": 10,
        "nome": "Aluno 10",
        "treino_id": 1,
        "nome_treino": "Plano de treino",
        "data_fim": "2026-11-07",
    }]
    assert resultado["treinos"]["alunos_sem_treino_ativo"] == []
    assert resultado["treinos"]["vencidos"] == []
    assert "proximos_do_fim" in resultado["treinos"]


def test_treino_ativo_sem_data_fim_aparece_com_prazo_nulo():
    resultado = montar_resumo_home(
        [aluno(11, treino_data_fim=None)],
        hoje=HOJE,
    )

    assert resultado["treinos"]["ativos"] == [{
        "aluno_id": 11,
        "nome": "Aluno 11",
        "treino_id": 1,
        "nome_treino": "Plano de treino",
        "data_fim": None,
    }]
    assert resultado["indicadores"]["alunos_sem_treino_ativo"] == 0
    assert resultado["indicadores"]["alunos_pendentes"] == 0


def test_aluno_sem_treino_ativo_nao_aparece_em_treinos_ativos():
    resultado = montar_resumo_home(
        [aluno(12, treino_id=None, treino_data_fim=None)],
        hoje=HOJE,
    )

    assert resultado["treinos"]["ativos"] == []
    assert resultado["treinos"]["alunos_sem_treino_ativo"] == [{
        "aluno_id": 12,
        "nome": "Aluno 12",
    }]
    assert resultado["alunos_pendentes"][0]["motivos"] == ["sem_treino_ativo"]
