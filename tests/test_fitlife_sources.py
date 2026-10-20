import json
from pathlib import Path
from types import SimpleNamespace

from src.fitlife_assistant import (
    LIMIAR_RELEVANCIA_FONTES,
    SYSTEM_PROMPT,
    filtrar_nos_relevantes,
    montar_mensagens_continuacao,
    montar_resposta_publica,
    resposta_interrompida,
)


def _no(score, *, file_name, text):
    return SimpleNamespace(
        score=score,
        text=text,
        node=SimpleNamespace(metadata={"file_name": file_name}),
    )


def test_resposta_publica_inclui_fontes_acima_do_corte_sem_caminho():
    filename = "reabilitacao_joelho.txt"
    path = str((Path("data") / filename).resolve())
    nodes = [
        _no(0.82, file_name=path, text="Trecho relevante " * 30),
        _no(LIMIAR_RELEVANCIA_FONTES, file_name=path, text="No limite não entra."),
        _no(0.20, file_name="C:\\dados\\privados\\outro.txt", text="Trecho fraco."),
    ]

    payload = montar_resposta_publica("Pergunta", "Resposta", nodes)

    assert payload["pergunta"] == "Pergunta"
    assert payload["resposta"] == "Resposta"
    assert len(payload["fontes"]) == 1
    fonte = payload["fontes"][0]
    assert fonte["titulo"].startswith("Dor patelofemoral")
    assert fonte["arquivo"] == filename
    assert len(fonte["trecho"]) <= 200
    serialized = json.dumps(payload, ensure_ascii=False)
    assert path not in serialized
    assert "C:\\Dev\\fitlife-rag" not in serialized


def test_resposta_publica_sem_fontes_acima_do_corte():
    nodes = [
        _no(0.10, file_name="arquivo.txt", text="Trecho sem relevância suficiente."),
        _no(None, file_name="sem-score.txt", text="Sem pontuação não passa pelo corte."),
    ]

    payload = montar_resposta_publica("Pergunta fora da base", "A base não cobre o tema.", nodes)

    assert payload["fontes"] == []
    assert filtrar_nos_relevantes(nodes) == []


def test_resposta_publica_sinaliza_interrupcao_e_inclui_instrucao_de_resposta_completa():
    payload = montar_resposta_publica("Pergunta", "Trecho parcial", [], interrompida=True)

    assert payload["interrompida"] is True
    assert "250 palavras" in SYSTEM_PROMPT
    assert "Termine frases e ideias por completo" in SYSTEM_PROMPT


def test_detecta_finish_reason_length_e_constroi_continuacao_sem_repetir():
    assert resposta_interrompida("length") is True
    assert resposta_interrompida("stop") is False

    messages = montar_mensagens_continuacao("Pergunta original", "Resposta parcial", [])

    assert messages[-2] == {"role": "assistant", "content": "Resposta parcial"}
    assert messages[-1]["role"] == "user"
    assert "Não repita" in messages[-1]["content"]

