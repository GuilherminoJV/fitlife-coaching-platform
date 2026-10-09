# ==========================================================================
# 1. CONFIGURAÇÃO / IMPORTS
# ==========================================================================

import os

from dotenv import load_dotenv

from fastapi import FastAPI, HTTPException
from fastapi.encoders import jsonable_encoder
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from pydantic import BaseModel, Field
from typing import Any, Literal

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
    buscar_exercicio,
    criar_avaliacao,
    atualizar_avaliacao,
    listar_avaliacoes,
    buscar_avaliacao,
    deletar_avaliacao,
    criar_anamnese,
    listar_anamneses,
    buscar_anamnese_resposta,
    deletar_anamnese
)
from src.fitlife_assistant import montar_mensagens


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

class AlunoUpdate(BaseModel):
    nome: str
    email: str
    telefone: str
    plano_id: int
    objetivo: str
    modalidade: str
    data_nascimento: str | None = None

class AvaliacaoCreate(BaseModel):
    tipo: Literal["essencial", "premium", "performance"]
    dados: dict[str, Any] = Field(default_factory=dict)


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
            "data_nascimento": str(a[9]) if a[9] else None
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
        "data_nascimento": str(aluno[9]) if aluno[9] else None
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
        body.data_nascimento
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
        body.data_nascimento
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
            "tipo_articular": e[9]
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
            "tipo_articular": e[9]
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
        "tipo_articular": exercicio[9]
    }
