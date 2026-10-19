# ==========================================================================
# 1. CONFIGURAÇÃO / IMPORTS
# ==========================================================================

import os
from urllib.parse import urlparse

from dotenv import load_dotenv

from fastapi import FastAPI, HTTPException
from fastapi.encoders import jsonable_encoder
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from pydantic import BaseModel, Field
from typing import Any, Literal
from datetime import date

from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, Settings
from llama_index.embeddings.huggingface import HuggingFaceEmbedding

from groq import Groq

from src.database import (
    salvar_historico,
    listar_alunos,
    buscar_aluno,
    criar_aluno,
    atualizar_aluno,
    desativar_aluno,
    reativar_aluno,
    listar_planos,
    listar_exercicios,
    listar_exercicios_por_categoria,
    listar_exercicios_por_grupo,
    buscar_exercicio,
    criar_exercicio,
    criar_avaliacao,
    atualizar_avaliacao,
    listar_avaliacoes,
    buscar_avaliacao,
    deletar_avaliacao,
    criar_anamnese,
    atualizar_anamnese,
    listar_anamneses,
    buscar_anamnese_resposta,
    deletar_anamnese,
    listar_treinos,
    obter_resumo_home,
    criar_treino,
    criar_sessao_treino,
    encerrar_treino,
    deletar_treino,
    deletar_exercicio_treino,
    reordenar_exercicios_sessao
)
from src.fitlife_assistant import montar_mensagens
from src.home_summary import data_atual_home


# ==========================================================================
# 2. VARIÁVEIS DE AMBIENTE
# ==========================================================================

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")


# ==========================================================================
# 3. IA / RAG
# ==========================================================================

Settings.embed_model = HuggingFaceEmbedding(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

Settings.llm = None

cliente_groq = Groq(api_key=GROQ_API_KEY)

print("Carregando base de conhecimento...")

documents = SimpleDirectoryReader("data").load_data()

index = VectorStoreIndex.from_documents(documents)

retriever = index.as_retriever(
    similarity_top_k=3
)


# ==========================================================================
# 4. FASTAPI / ARQUIVOS
# ==========================================================================

app = FastAPI(
    title="FitLife Coaching API"
)

app.mount(
    "/static",
    StaticFiles(directory="static"),
    name="static"
)


# ==========================================================================
# 5. MODELOS
# ==========================================================================

class Pergunta(BaseModel):
    pergunta: str

class AlunoCreate(BaseModel):
    nome: str
    email: str
    telefone: str
    plano_id: int
    objetivo: str
    modalidade: str
    data_nascimento: str | None = None
    sexo: Literal["masculino", "feminino"] | None = None

class AlunoUpdate(BaseModel):
    nome: str
    email: str
    telefone: str
    plano_id: int
    objetivo: str
    modalidade: str
    data_nascimento: str | None = None
    sexo: Literal["masculino", "feminino"] | None = None

class ExercicioCreate(BaseModel):
    nome: str = Field(min_length=2, max_length=100)
    categoria: Literal["Musculação", "Aeróbico", "Funcional", "Mobilidade", "Alongamento", "Elásticos e faixas"]
    musculo_alvo: Literal["Peito", "Costas", "Ombro", "Bíceps", "Tríceps", "Quadríceps", "Posterior de coxa", "Glúteos", "Core", "Corpo inteiro"]
    midia_url: str | None = Field(default=None, max_length=1000)


class AvaliacaoCreate(BaseModel):
    tipo: Literal["essencial", "premium", "performance"]
    dados: dict[str, Any] = Field(default_factory=dict)


class TreinoExercicioCreate(BaseModel):
    exercicio_id: int = Field(gt=0)
    series: int = Field(ge=1, le=20, default=3)
    repeticoes: str = Field(min_length=1, max_length=40, default="8–12")
    descanso_segundos: int = Field(ge=0, le=3600, default=60)
    carga: str | None = Field(default=None, max_length=40)
    observacoes: str | None = Field(default=None, max_length=500)


class TreinoCreate(BaseModel):
    nome: str = Field(min_length=2, max_length=120)
    objetivo: str = Field(min_length=2, max_length=200)
    dificuldade: Literal["Iniciante", "Intermediário", "Avançado"]
    orientacoes_gerais: str | None = Field(default=None, max_length=5000)
    data_inicio: date
    data_fim: date | None = None
    remover_apos_vencimento: bool = False
    ocultar_antes_inicio: bool = False


class TreinoSessaoCreate(BaseModel):
    nome: str = Field(min_length=2, max_length=120)
    exercicios: list[TreinoExercicioCreate] = Field(min_length=1, max_length=50)


class OrdemExercicios(BaseModel):
    ids: list[int] = Field(min_length=1, max_length=100)


# ==========================================================================
# 6. INTERFACE
# ==========================================================================

@app.get("/")
def root():
    return {
        "mensagem": "FitLife Coaching API funcionando!"
    }


@app.get("/chat")
def pagina_chat():
    return FileResponse(
        "static/index.html"
    )


@app.get("/home/resumo")
def get_home_resumo():
    return jsonable_encoder(obter_resumo_home())


# ==========================================================================
# 7. FITLIFE IA
# ==========================================================================

@app.post("/perguntar")
def perguntar(body: Pergunta):

    nos = retriever.retrieve(
        body.pergunta
    )

    resposta = cliente_groq.chat.completions.create(
        model="openai/gpt-oss-20b",
        messages=montar_mensagens(body.pergunta, nos),
        temperature=0.2,
        max_tokens=700,
    )

    salvar_historico(
        body.pergunta,
        resposta.choices[0].message.content
    )

    return {
        "pergunta": body.pergunta,
        "resposta": resposta.choices[0].message.content
    }


# ==========================================================================
# 8. ALUNOS
# ==========================================================================

@app.get("/planos")
def get_planos():
    planos = listar_planos()
    return [
        {"id": p[0], "nome": p[1], "preco": float(p[2])}
        for p in planos
    ]

@app.get("/alunos")
def get_alunos(apenas_ativos: bool = False):
    alunos = listar_alunos(apenas_ativos)
    return [
        {
            "id": a[0],
            "nome": a[1],
            "email": a[2],
            "telefone": a[3],
            "plano": a[4],
            "data_cadastro": str(a[5]),
            "ativo": a[6],
            "objetivo": a[7],
            "modalidade": a[8],
            "data_nascimento": str(a[9]) if a[9] else None,
            "sexo": a[10]
        }
        for a in alunos
    ]

@app.get("/alunos/{aluno_id}")
def get_aluno(aluno_id: int):
    aluno = buscar_aluno(aluno_id)
    if not aluno:
        return {"erro": "Aluno não encontrado"}
    return {
        "id": aluno[0],
        "nome": aluno[1],
        "email": aluno[2],
        "telefone": aluno[3],
        "plano": aluno[4],
        "data_cadastro": str(aluno[5]),
        "ativo": aluno[6],
        "objetivo": aluno[7],
        "modalidade": aluno[8],
        "data_nascimento": str(aluno[9]) if aluno[9] else None,
        "sexo": aluno[10]
    }


@app.post("/alunos/{aluno_id}/avaliacoes", status_code=201)
def post_avaliacao(aluno_id: int, body: AvaliacaoCreate):
    if not buscar_aluno(aluno_id):
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    try:
        avaliacao_id = criar_avaliacao(aluno_id, body.tipo, body.dados)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return {"id": avaliacao_id, "mensagem": "Avaliação cadastrada com sucesso!"}


@app.get("/alunos/{aluno_id}/avaliacoes")
def get_avaliacoes(aluno_id: int):
    if not buscar_aluno(aluno_id):
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    return jsonable_encoder(listar_avaliacoes(aluno_id))


@app.get("/avaliacoes/{avaliacao_id}")
def get_avaliacao(avaliacao_id: int):
    avaliacao = buscar_avaliacao(avaliacao_id)
    if not avaliacao:
        raise HTTPException(status_code=404, detail="Avaliação não encontrada")
    return jsonable_encoder(avaliacao)


@app.delete("/avaliacoes/{avaliacao_id}")
def delete_avaliacao(avaliacao_id: int):
    if not deletar_avaliacao(avaliacao_id):
        raise HTTPException(status_code=404, detail="Avaliação não encontrada")
    return {"mensagem": "Avaliação excluída com sucesso!"}


@app.put("/avaliacoes/{avaliacao_id}")
def put_avaliacao(avaliacao_id: int, body: AvaliacaoCreate):
    try:
        if atualizar_avaliacao(avaliacao_id, body.tipo, body.dados) is None:
            raise HTTPException(status_code=404, detail="Avaliação não encontrada")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"mensagem": "Avaliação atualizada com sucesso!"}


class AnamneseCreate(BaseModel):
    dados: dict[str, Any] = Field(default_factory=dict)


@app.post("/alunos/{aluno_id}/anamneses", status_code=201)
def post_anamnese(aluno_id: int, body: AnamneseCreate):
    if not buscar_aluno(aluno_id):
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    try:
        anamnese_id = criar_anamnese(aluno_id, body.dados)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"id": anamnese_id, "mensagem": "Anamnese registrada com sucesso!"}


@app.get("/alunos/{aluno_id}/anamneses")
def get_anamneses(aluno_id: int):
    if not buscar_aluno(aluno_id):
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    return jsonable_encoder(listar_anamneses(aluno_id))


@app.get("/anamneses/{anamnese_id}")
def get_anamnese(anamnese_id: int):
    anamnese = buscar_anamnese_resposta(anamnese_id)
    if not anamnese:
        raise HTTPException(status_code=404, detail="Anamnese não encontrada")
    return jsonable_encoder(anamnese)


@app.put("/anamneses/{anamnese_id}")
def put_anamnese(anamnese_id: int, body: AnamneseCreate):
    try:
        if atualizar_anamnese(anamnese_id, body.dados) is None:
            raise HTTPException(status_code=404, detail="Anamnese não encontrada")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"mensagem": "Anamnese atualizada com sucesso!"}


@app.delete("/anamneses/{anamnese_id}")
def delete_anamnese(anamnese_id: int):
    if not deletar_anamnese(anamnese_id):
        raise HTTPException(status_code=404, detail="Anamnese não encontrada")
    return {"mensagem": "Anamnese excluída com sucesso!"}

@app.post("/alunos")
def post_aluno(body: AlunoCreate):
    novo_id = criar_aluno(
        body.nome,
        body.email,
        body.telefone,
        body.plano_id,
        body.objetivo,
        body.modalidade,
        body.data_nascimento,
        body.sexo
    )
    return {"id": novo_id, "mensagem": "Aluno cadastrado com sucesso!"}

@app.put("/alunos/{aluno_id}")
def put_aluno(aluno_id: int, body: AlunoUpdate):
    atualizar_aluno(
        aluno_id,
        body.nome,
        body.email,
        body.telefone,
        body.plano_id,
        body.objetivo,
        body.modalidade,
        body.data_nascimento,
        body.sexo
    )
    return {"mensagem": "Aluno atualizado com sucesso!"}

@app.delete("/alunos/{aluno_id}")
def delete_aluno(aluno_id: int):
    desativar_aluno(aluno_id)
    return {"mensagem": "Aluno desativado com sucesso!"}

@app.patch("/alunos/{aluno_id}/reativar")
def patch_reativar_aluno(aluno_id: int):
    reativar_aluno(aluno_id)
    return {"mensagem": "Aluno reativado com sucesso!"}

# ==========================================================================
# 9. EXERCÍCIOS
# ==========================================================================

@app.get("/alunos/{aluno_id}/treinos")
def get_treinos(aluno_id: int):
    if not buscar_aluno(aluno_id):
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    return jsonable_encoder(listar_treinos(aluno_id))


@app.post("/alunos/{aluno_id}/treinos", status_code=201)
def post_treino(aluno_id: int, body: TreinoCreate):
    if not buscar_aluno(aluno_id):
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    if body.data_fim is not None and body.data_fim < body.data_inicio:
        raise HTTPException(status_code=422, detail="A data de término deve ser igual ou posterior à data de início.")
    dados = body.dict()
    dados["nome"] = dados["nome"].strip()
    dados["objetivo"] = dados["objetivo"].strip()
    if len(dados["nome"]) < 2 or len(dados["objetivo"]) < 2:
        raise HTTPException(status_code=422, detail="Nome e objetivo precisam ter pelo menos 2 caracteres.")
    dados["orientacoes_gerais"] = dados["orientacoes_gerais"].strip() if dados["orientacoes_gerais"] else None
    try:
        treino_id = criar_treino(aluno_id, dados)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"id": treino_id, "mensagem": "Treino criado com sucesso."}


@app.post("/treinos/{treino_id}/sessoes", status_code=201)
def post_sessao_treino(treino_id: int, body: TreinoSessaoCreate):
    try:
        sessao_id = criar_sessao_treino(
            treino_id, body.nome.strip(), [item.dict() for item in body.exercicios]
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"id": sessao_id, "mensagem": "Sessão de treino criada com sucesso."}


@app.patch("/treinos/{treino_id}/encerrar")
def patch_encerrar_treino(treino_id: int):
    if not encerrar_treino(treino_id, data_atual_home()):
        raise HTTPException(status_code=404, detail="Treino não encontrado ou já encerrado.")
    return {"mensagem": "Treino encerrado com sucesso."}


@app.delete("/treinos/{treino_id}")
def delete_treino(treino_id: int):
    if not deletar_treino(treino_id):
        raise HTTPException(status_code=404, detail="Treino não encontrado.")
    return {"mensagem": "Treino excluído com sucesso."}


@app.delete("/treino-exercicios/{item_id}")
def delete_exercicio_treino(item_id: int):
    if not deletar_exercicio_treino(item_id):
        raise HTTPException(status_code=404, detail="Exercício do treino não encontrado.")
    return {"mensagem": "Exercício removido da sessão."}


@app.patch("/sessoes/{sessao_id}/exercicios/ordem")
def patch_ordem_exercicios(sessao_id: int, body: OrdemExercicios):
    try:
        reordenar_exercicios_sessao(sessao_id, body.ids)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"mensagem": "Ordem dos exercícios atualizada."}


@app.post("/exercicios", status_code=201)
def post_exercicio(body: ExercicioCreate):
    nome = body.nome.strip()
    grupo = body.musculo_alvo.strip()
    midia_url = body.midia_url.strip() if body.midia_url else None
    if len(nome) < 2:
        raise HTTPException(status_code=422, detail="Informe um nome de exercício válido.")
    if midia_url:
        parsed_url = urlparse(midia_url)
        if parsed_url.scheme not in {"https", "http"} or not parsed_url.netloc:
            raise HTTPException(status_code=422, detail="A mídia deve ser informada com um link HTTP ou HTTPS válido.")
    exercicio_id = criar_exercicio(nome, body.categoria, grupo, midia_url)
    return {"id": exercicio_id, "mensagem": "Exercício cadastrado com sucesso."}


@app.get("/exercicios")
def get_exercicios():

    exercicios = listar_exercicios()

    return [
        {
            "id": e[0],
            "nome": e[1],
            "categoria": e[2],
            "musculo_alvo": e[3],
            "nivel": e[4],
            "equipamento": e[5],
            "descricao": e[6],
            "indicacoes": e[7],
            "contraindicacoes": e[8],
            "tipo_articular": e[9],
            "midia_url": e[10]
        }
        for e in exercicios
    ]


@app.get("/exercicios/categoria/{categoria}")
def get_exercicios_por_categoria(
    categoria: str
):

    exercicios = listar_exercicios_por_categoria(
        categoria
    )

    return [
        {
            "id": e[0],
            "nome": e[1],
            "categoria": e[2],
            "musculo_alvo": e[3],
            "nivel": e[4],
            "equipamento": e[5],
            "descricao": e[6],
            "indicacoes": e[7],
            "contraindicacoes": e[8],
            "tipo_articular": e[9],
            "midia_url": e[10]
        }
        for e in exercicios
    ]


@app.get("/exercicios/grupo/{grupo}")
def get_exercicios_por_grupo(grupo: str):
    exercicios = listar_exercicios_por_grupo(grupo)
    return [
        {
            "id": e[0],
            "nome": e[1],
            "categoria": e[2],
            "musculo_alvo": e[3],
            "nivel": e[4],
            "equipamento": e[5],
            "descricao": e[6],
            "indicacoes": e[7],
            "contraindicacoes": e[8],
            "tipo_articular": e[9],
            "midia_url": e[10]
        }
        for e in exercicios
    ]


@app.get("/exercicios/{exercicio_id}")
def get_exercicio(
    exercicio_id: int
):

    exercicio = buscar_exercicio(
        exercicio_id
    )

    if not exercicio:
        return {
            "erro": "Exercício não encontrado"
        }

    return {
        "id": exercicio[0],
        "nome": exercicio[1],
        "categoria": exercicio[2],
        "musculo_alvo": exercicio[3],
        "nivel": exercicio[4],
        "equipamento": exercicio[5],
        "descricao": exercicio[6],
        "indicacoes": exercicio[7],
        "contraindicacoes": exercicio[8],
        "tipo_articular": exercicio[9],
        "midia_url": exercicio[10]
    }
