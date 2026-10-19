from datetime import date

import pytest
from sqlalchemy import create_engine, text

from src import database
from src.home_summary import montar_resumo_home


HOJE = date(2026, 10, 18)


@pytest.fixture
def banco_treinos(monkeypatch):
    engine = create_engine("sqlite:///:memory:")
    with engine.begin() as conn:
        conn.execute(text("PRAGMA foreign_keys = ON"))
        conn.execute(text("CREATE TABLE treinos (id INTEGER PRIMARY KEY, data_fim DATE, encerrado_em DATETIME)"))
        conn.execute(text("CREATE TABLE treino_sessoes (id INTEGER PRIMARY KEY, treino_id INTEGER NOT NULL REFERENCES treinos(id) ON DELETE CASCADE)"))
        conn.execute(text("CREATE TABLE treino_exercicios (id INTEGER PRIMARY KEY, sessao_id INTEGER NOT NULL REFERENCES treino_sessoes(id) ON DELETE CASCADE)"))
    monkeypatch.setattr(database, "engine", engine)
    yield engine
    engine.dispose()


@pytest.mark.parametrize("data_fim", [date(2026, 11, 1), None], ids=["com-prazo", "sem-prazo"])
def test_encerrar_treino_define_hoje_e_tira_dos_ativos(banco_treinos, data_fim):
    with banco_treinos.begin() as conn:
        conn.execute(text("INSERT INTO treinos (id, data_fim) VALUES (1, :fim)"), {"fim": data_fim})

    assert database.encerrar_treino(1, HOJE) is True

    with banco_treinos.connect() as conn:
        treino = conn.execute(text("SELECT data_fim, encerrado_em FROM treinos WHERE id = 1")).one()
    assert date.fromisoformat(treino.data_fim) == HOJE
    assert treino.encerrado_em is not None

    resumo = montar_resumo_home([{
        "aluno_id": 7,
        "nome": "Aluno 7",
        "treino_id": 1,
        "treino_nome": "Treino teste",
        "treino_data_inicio": date(2026, 10, 1),
        "treino_data_fim": HOJE,
        "treino_encerrado": True,
        "tem_anamnese": True,
    }], hoje=HOJE)
    assert resumo["treinos"]["ativos"] == []
    assert resumo["treinos"]["alunos_sem_treino_ativo"] == [{"aluno_id": 7, "nome": "Aluno 7"}]
    assert resumo["treinos"]["vencidos"] == []


def test_excluir_treino_remove_sessoes_e_exercicios_em_cascata(banco_treinos):
    with banco_treinos.begin() as conn:
        conn.execute(text("INSERT INTO treinos (id, data_fim) VALUES (1, NULL)"))
        conn.execute(text("INSERT INTO treino_sessoes (id, treino_id) VALUES (10, 1)"))
        conn.execute(text("INSERT INTO treino_exercicios (id, sessao_id) VALUES (100, 10)"))

    assert database.deletar_treino(1) is True

    with banco_treinos.connect() as conn:
        assert conn.execute(text("SELECT COUNT(*) FROM treinos")).scalar_one() == 0
        assert conn.execute(text("SELECT COUNT(*) FROM treino_sessoes")).scalar_one() == 0
        assert conn.execute(text("SELECT COUNT(*) FROM treino_exercicios")).scalar_one() == 0


def test_reativar_treino_limpa_arquivo_e_volta_a_ser_ativo(banco_treinos):
    with banco_treinos.begin() as conn:
        conn.execute(
            text("INSERT INTO treinos (id, data_fim, encerrado_em) VALUES (1, :fim, CURRENT_TIMESTAMP)"),
            {"fim": HOJE},
        )

    assert database.reativar_treino(1) is True

    with banco_treinos.connect() as conn:
        treino = conn.execute(text("SELECT data_fim, encerrado_em FROM treinos WHERE id = 1")).one()
    assert treino.data_fim is None
    assert treino.encerrado_em is None

    resumo = montar_resumo_home([{
        "aluno_id": 7,
        "nome": "Aluno 7",
        "avaliacao_id": 1,
        "proxima_reavaliacao": None,
        "treino_id": 1,
        "treino_nome": "Treino reativado",
        "treino_data_inicio": date(2026, 10, 1),
        "treino_data_fim": None,
        "treino_encerrado": False,
        "tem_anamnese": True,
    }], hoje=HOJE)
    assert resumo["treinos"]["ativos"] == [{
        "aluno_id": 7,
        "nome": "Aluno 7",
        "treino_id": 1,
        "nome_treino": "Treino reativado",
        "data_fim": None,
    }]
    assert resumo["treinos"]["alunos_sem_treino_ativo"] == []
    assert resumo["indicadores"]["alunos_pendentes"] == 0


def test_get_home_resumo_nao_retorna_treino_encerrado_como_ativo(monkeypatch):
    capturado = {}

    class Resultado:
        def mappings(self):
            return self

        def all(self):
            return [{
                "aluno_id": 7,
                "nome": "Aluno 7",
                "avaliacao_id": 1,
                "proxima_reavaliacao": None,
                "treino_id": 1,
                "treino_nome": "Treino encerrado",
                "treino_data_inicio": date(2026, 10, 1),
                "treino_data_fim": HOJE,
                "treino_encerrado": True,
                "tem_anamnese": True,
                "treino_na_janela": True,
            }]

    class Conexao:
        def __enter__(self):
            return self

        def __exit__(self, *_):
            return False

        def execute(self, consulta, parametros):
            capturado["sql"] = str(consulta)
            return Resultado()

    class EngineFalso:
        def connect(self):
            return Conexao()

    monkeypatch.setattr(database, "engine", EngineFalso())
    resumo = database.obter_resumo_home(hoje=HOJE)

    assert resumo["treinos"]["ativos"] == []
    assert resumo["treinos"]["alunos_sem_treino_ativo"] == [{"aluno_id": 7, "nome": "Aluno 7"}]
    assert resumo["treinos"]["proximos_do_fim"] == []
    assert "encerrado_em IS NULL" in capturado["sql"]
