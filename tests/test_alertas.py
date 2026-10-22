import importlib
import sys
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from pydantic import ValidationError

from src.alertas import ALERTAS, detectar_alerta


@pytest.mark.parametrize("pergunta", [
    "Estou com dor leve no peito durante o exercício",
    "Senti aperto no peito depois do treino",
    "No treino tive falta de ar e tontura forte",
])
def test_detecta_alertas_cardíacos(pergunta):
    categoria, texto = detectar_alerta(pergunta)

    assert categoria == "cardiaco"
    assert texto == ALERTAS["cardiaco"]["texto"]


@pytest.mark.parametrize("pergunta", [
    "aluna grávida com sangramento",
    "gestante teve perda de líquido durante o treino",
    "na gravidez surgiram contrações durante o exercício",
])
def test_detecta_alertas_obstetricos(pergunta):
    categoria, texto = detectar_alerta(pergunta)

    assert categoria == "obstetrico"
    assert texto == ALERTAS["obstetrico"]["texto"]


@pytest.mark.parametrize("pergunta", [
    "exercício para peitoral",
    "treino de peito e tríceps",
    "dor no joelho ao agachar",
    "treino para gestante no segundo trimestre",
    "como progredir carga no supino",
    "aluno hipertenso pode treinar?",
])
def test_perguntas_normais_nao_disparam_alerta(pergunta):
    assert detectar_alerta(pergunta) == (None, None)


def _importar_api_com_dependencias_falsas(monkeypatch):
    """Import the API without loading embeddings or contacting the model provider."""
    if "src.api" in sys.modules:
        return sys.modules["src.api"]

    import llama_index.core as llama_core
    from llama_index.core import SimpleDirectoryReader, VectorStoreIndex
    import llama_index.embeddings.huggingface as huggingface
    import groq

    class FakeReader:
        def __init__(self, *args, **kwargs):
            pass

        def load_data(self):
            return []

    class FakeIndex:
        def as_retriever(self, **kwargs):
            return SimpleNamespace(retrieve=MagicMock(name="retrieve"))

    fake_model_create = MagicMock(name="model_create")
    monkeypatch.setattr(SimpleDirectoryReader, "__init__", FakeReader.__init__)
    monkeypatch.setattr(SimpleDirectoryReader, "load_data", FakeReader.load_data)
    monkeypatch.setattr(llama_core, "Settings", SimpleNamespace(embed_model=None, llm=None))
    monkeypatch.setattr(huggingface, "HuggingFaceEmbedding", lambda **kwargs: object())
    monkeypatch.setattr(VectorStoreIndex, "from_documents", lambda *args, **kwargs: FakeIndex())
    monkeypatch.setattr(groq, "Groq", lambda **kwargs: SimpleNamespace(
        chat=SimpleNamespace(completions=SimpleNamespace(create=fake_model_create))
    ))
    sys.modules.pop("src.api", None)
    return importlib.import_module("src.api")


@pytest.mark.parametrize("pergunta,categoria", [
    ("Dor leve no peito durante exercício", "cardiaco"),
    ("Aluna grávida com sangramento", "obstetrico"),
])
def test_rota_devolve_alerta_sem_chamar_busca_ou_modelo(monkeypatch, pergunta, categoria):
    api = _importar_api_com_dependencias_falsas(monkeypatch)
    busca = MagicMock(name="retrieve")
    modelo = MagicMock(name="model_create")
    monkeypatch.setattr(api, "retriever", SimpleNamespace(retrieve=busca))
    monkeypatch.setattr(api.cliente_groq.chat.completions, "create", modelo)

    payload = api.perguntar(api.Pergunta(pergunta=pergunta))

    assert payload["alerta"] is True
    assert payload["categoria_alerta"] == categoria
    assert payload["resposta"] == ALERTAS[categoria]["texto"]
    assert payload["fontes"] == []
    assert payload["interrompida"] is False
    busca.assert_not_called()
    modelo.assert_not_called()


def test_historico_valida_quantidade_e_tamanho_das_mensagens(monkeypatch):
    api = _importar_api_com_dependencias_falsas(monkeypatch)
    mensagem = {"papel": "user", "texto": "x" * 1500}

    valido = api.Pergunta(pergunta="Pergunta", historico=[mensagem] * 6)
    assert len(valido.historico) == 6

    with pytest.raises(ValidationError):
        api.Pergunta(pergunta="Pergunta", historico=[mensagem] * 7)
    with pytest.raises(ValidationError):
        api.Pergunta(pergunta="Pergunta", historico=[{"papel": "user", "texto": "x" * 1501}])


def test_rota_envia_historico_ao_modelo_e_compõe_busca_referencial(monkeypatch):
    api = _importar_api_com_dependencias_falsas(monkeypatch)
    busca = MagicMock(name="retrieve", return_value=[])
    historico = [
        {"papel": "user", "texto": "Quais exercícios para dor no joelho?"},
        {"papel": "assistant", "texto": "A base cita exercícios combinados."},
    ]
    resposta = SimpleNamespace(
        choices=[SimpleNamespace(
            message=SimpleNamespace(content="Resposta de teste"), finish_reason="stop"
        )]
    )
    modelo = MagicMock(name="model_create", return_value=resposta)
    monkeypatch.setattr(api, "retriever", SimpleNamespace(retrieve=busca))
    monkeypatch.setattr(api.cliente_groq.chat.completions, "create", modelo)
    monkeypatch.setattr(api, "salvar_historico", MagicMock())

    payload = api.perguntar(api.Pergunta(pergunta="E esse treino?", historico=historico))

    assert payload["resposta"] == "Resposta de teste"
    assert busca.call_args.args[0] == "Quais exercícios para dor no joelho?\nE esse treino?"
    mensagens = modelo.call_args.kwargs["messages"]
    assert mensagens[1:3] == [
        {"role": "user", "content": historico[0]["texto"]},
        {"role": "assistant", "content": historico[1]["texto"]},
    ]
