# ==========================================================================
# 1. CONEXÃO / CONFIGURAÇÃO
# 2. ALUNOS
# 3. ANAMNESES
# 4. HISTÓRICO CHAT
# 5. TESTE DE CONEXÃO
# 6. EXERCÍCIOS
# ==========================================================================

import os

from sqlalchemy import create_engine, text
from dotenv import load_dotenv


# ==========================================================================
# 1. CONEXÃO / CONFIGURAÇÃO
# ==========================================================================

load_dotenv()

DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

DATABASE_URL = (
    f"postgresql+pg8000://"
    f"{DB_USER}:{DB_PASSWORD}@"
    f"{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

engine = create_engine(DATABASE_URL)


# ==========================================================================
# 2. ALUNOS
# ==========================================================================

def listar_alunos():
    with engine.connect() as conn:
        result = conn.execute(
            text("""
                SELECT
                    a.id,
                    a.nome,
                    a.email,
                    a.telefone,
                    p.nome AS plano,
                    a.data_cadastro
                FROM alunos a
                LEFT JOIN planos p
                    ON a.plano_id = p.id
                ORDER BY a.nome
            """)
        )

        return result.fetchall()


def buscar_aluno(aluno_id):
    with engine.connect() as conn:
        result = conn.execute(
            text("""
                SELECT
                    a.id,
                    a.nome,
                    a.email,
                    a.telefone,
                    p.nome AS plano,
                    a.data_cadastro
                FROM alunos a
                LEFT JOIN planos p
                    ON a.plano_id = p.id
                WHERE a.id = :id
            """),
            {"id": aluno_id}
        )

        return result.fetchone()


def criar_aluno(nome, email, telefone, plano_id):
    with engine.connect() as conn:
        result = conn.execute(
            text("""
                INSERT INTO alunos (
                    nome,
                    email,
                    telefone,
                    plano_id
                )
                VALUES (
                    :nome,
                    :email,
                    :telefone,
                    :plano_id
                )
                RETURNING id
            """),
            {
                "nome": nome,
                "email": email,
                "telefone": telefone,
                "plano_id": plano_id
            }
        )

        conn.commit()

        return result.fetchone()[0]


# ==========================================================================
# 3. ANAMNESES
# ==========================================================================

def buscar_anamnese(aluno_id):
    with engine.connect() as conn:
        result = conn.execute(
            text("""
                SELECT *
                FROM anamneses
                WHERE aluno_id = :id
                ORDER BY data_avaliacao DESC
                LIMIT 1
            """),
            {"id": aluno_id}
        )

        return result.fetchone()


# ==========================================================================
# 4. HISTÓRICO CHAT
# ==========================================================================

def salvar_historico(pergunta, resposta):
    with engine.connect() as conn:
        conn.execute(
            text("""
                INSERT INTO historico_chat (
                    pergunta,
                    resposta
                )
                VALUES (
                    :pergunta,
                    :resposta
                )
            """),
            {
                "pergunta": pergunta,
                "resposta": resposta
            }
        )

        conn.commit()


def listar_historico(limite=10):
    with engine.connect() as conn:
        result = conn.execute(
            text("""
                SELECT
                    pergunta,
                    resposta,
                    data_hora
                FROM historico_chat
                ORDER BY data_hora DESC
                LIMIT :limite
            """),
            {"limite": limite}
        )

        return result.fetchall()


# ==========================================================================
# 5. TESTE DE CONEXÃO
# ==========================================================================

if __name__ == "__main__":
    try:
        with engine.connect() as conn:
            print(
                "✅ Conectado ao PostgreSQL com sucesso!"
            )

        print("\n📋 Alunos cadastrados:")

        for aluno in listar_alunos():
            print(
                f" - {aluno[1]} | "
                f"{aluno[4]} | "
                f"{aluno[2]}"
            )

    except Exception as e:
        print(f"❌ Erro: {e}")


# ==========================================================================
# 6. EXERCÍCIOS
# ==========================================================================

def listar_exercicios():
    with engine.connect() as conn:
        result = conn.execute(
            text("""
                SELECT
                    id,
                    nome,
                    categoria,
                    musculo_alvo,
                    nivel,
                    equipamento,
                    descricao,
                    indicacoes,
                    contraindicacoes,
                    tipo_articular
                FROM exercicios
                ORDER BY categoria, nome
            """)
        )

        return result.fetchall()


def listar_exercicios_por_categoria(categoria):
    with engine.connect() as conn:
        result = conn.execute(
            text("""
                SELECT
                    id,
                    nome,
                    categoria,
                    musculo_alvo,
                    nivel,
                    equipamento,
                    descricao,
                    indicacoes,
                    contraindicacoes,
                    tipo_articular
                FROM exercicios
                WHERE categoria = :categoria
                ORDER BY nome
            """),
            {"categoria": categoria}
        )

        return result.fetchall()


def buscar_exercicio(exercicio_id):
    with engine.connect() as conn:
        result = conn.execute(
            text("""
                SELECT
                    id,
                    nome,
                    categoria,
                    musculo_alvo,
                    nivel,
                    equipamento,
                    descricao,
                    indicacoes,
                    contraindicacoes,
                    tipo_articular
                FROM exercicios
                WHERE id = :id
            """),
            {"id": exercicio_id}
        )

        return result.fetchone()