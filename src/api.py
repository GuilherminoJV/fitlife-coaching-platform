# ==========================================================================
# 1. CONFIGURAÇÃO / IMPORTS
# ==========================================================================

import os

from dotenv import load_dotenv

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from pydantic import BaseModel

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
    buscar_exercicio
)


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

class AlunoUpdate(BaseModel):
    nome: str
    email: str
    telefone: str
    plano_id: int
    objetivo: str
    modalidade: str


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

    contexto = "\n".join(
        [no.text for no in nos]
    )

    resposta = cliente_groq.chat.completions.create(
        model="openai/gpt-oss-20b",
        messages=[
            {
                "role": "system",
                "content":
                    "Você é um assistente especialista da FitLife Coaching. "
                    "Responda em português com base no contexto fornecido."
            },
            {
                "role": "user",
                "content":
                    f"Contexto:\n{contexto}\n\n"
                    f"Pergunta: {body.pergunta}"
            }
        ]
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
            "modalidade": a[8]
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
        "modalidade": aluno[8]
    }

@app.post("/alunos")
def post_aluno(body: AlunoCreate):
    novo_id = criar_aluno(
        body.nome,
        body.email,
        body.telefone,
        body.plano_id,
        body.objetivo,
        body.modalidade
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
        body.modalidade
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