"""Local, dependency-free safety alerts for the FitLife assistant."""

import re
import unicodedata


# Keep category patterns and fixed responses together for easy review/editing.
ALERTAS = {
    "cardiaco": {
        "sinais": (
            r"\b(?:dor|pressao|aperto|desconforto)\b.{0,36}\b(?:no peito|no centro do peito|na regiao do peito|perto do peito|na altura do peito|no lado (?:direito|esquerdo) do peito)\b",
            r"\bfalta\s+de\s+ar\b",
            r"\bdesmaio\b|\bdesmaiou\b|\bsincope\b",
            r"\btontura\s+(?:muito\s+)?forte\b",
            r"\bpalpitacao\s+(?:muito\s+)?(?:importante|forte|intensa)\b",
        ),
        "texto": (
            "Interrompa a atividade agora. Dor ou pressão no peito durante o "
            "esforço exige avaliação médica, mesmo que leve ou passageira. Se a "
            "dor persistir ou vier com falta de ar, tontura, suor frio ou desmaio, "
            "ligue para o SAMU (192). Não retome o treino sem liberação médica."
        ),
    },
    "obstetrico": {
        "gestacao": (
            r"\bgestante(?:s)?\b",
            r"\bgravida(?:s)?\b",
            r"\bgravidez\b",
            r"\bgestacao\b",
        ),
        "sinais": (
            r"\bsangramento\b",
            r"\bperda\s+de\s+liquido\b",
            r"\bcontracoes?\b",
        ),
        "texto": (
            "Interrompa a atividade. Qualquer sangramento, perda de líquido ou "
            "contração durante a gestação exige contato imediato com a equipe "
            "obstétrica ou com um serviço de urgência, mesmo que leve. Em "
            "sangramento intenso, dor forte ou desmaio, ligue para o SAMU (192). "
            "Não retome o treino sem liberação da equipe obstétrica."
        ),
    },
}


def _normalizar(pergunta: str) -> str:
    texto = unicodedata.normalize("NFD", pergunta.casefold())
    return "".join(
        caractere for caractere in texto
        if unicodedata.category(caractere) != "Mn"
    )


def detectar_alerta(pergunta: str) -> tuple[str | None, str | None]:
    """Return (category, fixed text) for alarm symptoms, otherwise (None, None)."""
    texto = _normalizar(pergunta or "")

    obstetrico = ALERTAS["obstetrico"]
    if any(re.search(padrao, texto) for padrao in obstetrico["sinais"]) and any(
        re.search(padrao, texto) for padrao in obstetrico["gestacao"]
    ):
        return "obstetrico", obstetrico["texto"]

    cardiaco = ALERTAS["cardiaco"]
    if any(re.search(padrao, texto) for padrao in cardiaco["sinais"]):
        return "cardiaco", cardiaco["texto"]

    return None, None
