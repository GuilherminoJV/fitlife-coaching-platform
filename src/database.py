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

def listar_alunos(apenas_ativos=False):
    with engine.connect() as conn:
        filtro = "WHERE a.ativo = TRUE" if apenas_ativos else ""
        result = conn.execute(
            text(f"""
                SELECT
                    a.id,
                    a.nome,
                    a.email,
                    a.telefone,
                    p.nome AS plano,
                    a.data_cadastro,
                    a.ativo,
                    a.objetivo,
                    a.modalidade,
                    a.data_nascimento
                FROM alunos a
                LEFT JOIN planos p
                    ON a.plano_id = p.id
                {filtro}
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
                    a.data_cadastro,
                    a.ativo,
                    a.objetivo,
                    a.modalidade,
                    a.data_nascimento
                FROM alunos a
                LEFT JOIN planos p
                    ON a.plano_id = p.id
                WHERE a.id = :id
            """),
            {"id": aluno_id}
        )
        return result.fetchone()


def criar_aluno(nome, email, telefone, plano_id, objetivo, modalidade, data_nascimento=None):
    with engine.connect() as conn:
        result = conn.execute(
            text("""
                INSERT INTO alunos (
                    nome, email, telefone,
                    plano_id, objetivo, modalidade,
                    data_nascimento
                )
                VALUES (
                    :nome, :email, :telefone,
                    :plano_id, :objetivo, :modalidade,
                    :data_nascimento
                )
                RETURNING id
            """),
            {
                "nome": nome,
                "email": email,
                "telefone": telefone,
                "plano_id": plano_id,
                "objetivo": objetivo,
                "modalidade": modalidade,
                "data_nascimento": data_nascimento
            }
        )
        conn.commit()
        return result.fetchone()[0]

def listar_planos():
    with engine.connect() as conn:
        result = conn.execute(
            text("""
                SELECT id, nome, preco
                FROM planos
                ORDER BY preco
            """)
        )
        return result.fetchall()


def atualizar_aluno(aluno_id, nome, email, telefone, plano_id, objetivo, modalidade, data_nascimento=None):
    with engine.connect() as conn:
        conn.execute(
            text("""
                UPDATE alunos SET
                    nome = :nome,
                    email = :email,
                    telefone = :telefone,
                    plano_id = :plano_id,
                    objetivo = :objetivo,
                    modalidade = :modalidade,
                    data_nascimento = :data_nascimento
                WHERE id = :id
            """),
            {
                "id": aluno_id,
                "nome": nome,
                "email": email,
                "telefone": telefone,
                "plano_id": plano_id,
                "objetivo": objetivo,
                "modalidade": modalidade,
                "data_nascimento": data_nascimento
            }
        )
        conn.commit()


def desativar_aluno(aluno_id):
    with engine.connect() as conn:
        conn.execute(
            text("""
                UPDATE alunos
                SET ativo = FALSE
                WHERE id = :id
            """),
            {"id": aluno_id}
        )
        conn.commit()


def reativar_aluno(aluno_id):
    with engine.connect() as conn:
        conn.execute(
            text("""
                UPDATE alunos
                SET ativo = TRUE
                WHERE id = :id
            """),
            {"id": aluno_id}
        )
        conn.commit()


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

# ==========================================================================
# 7. ANAMNESES E AVALIAÇÕES FÍSICAS
# ==========================================================================

AVALIACAO_TIPOS = {"essencial", "premium", "performance"}

ANAMNESE_CAMPOS = {
    "pratica_atividade", "atividade_qual", "frequencia_semanal",
    "treinou_personal", "nivel_condicionamento", "doenca_diagnosticada",
    "medicamentos", "historico_cirurgia_lesao", "dores_articulares",
    "restricao_medica", "medico_liberou", "qualidade_sono", "horas_sono",
    "nivel_estresse", "bebida_alcoolica", "fumante", "suplementos",
    "acompanhamento_nutricional", "restricao_alimentar", "refeicoes_por_dia",
    "objetivo_principal", "prazo_resultado", "regiao_priorizar", "ja_tentou",
    "disponibilidade",
}

AVALIACAO_CAMPOS = {
    "data_avaliacao", "data_avaliacao_anterior", "anamnese_id",
    "peso_kg", "altura_m", "imc", "percentual_gordura",
    "massa_gorda_kg", "massa_magra_kg", "circ_ombro", "circ_peitoral",
    "circ_cintura", "circ_abdomen", "circ_quadril", "circ_braco_dir",
    "circ_braco_esq", "circ_coxa_dir", "circ_coxa_esq",
    "circ_panturrilha_dir", "circ_panturrilha_esq", "dobra_peitoral",
    "dobra_abdominal", "dobra_coxa", "dobra_triceps", "dobra_subescapular",
    "dobra_suprailiaca", "dobra_axilar_medial", "dobra_somatorio",
    "dobra_percentual_gordura", "observacoes_profissional", "mensagem_aluno",
    "recomendacoes", "frequencia_ideal", "foco_proximo_bloco",
    "indicacao_nutricional", "proxima_reavaliacao", "postural_cabeca",
    "postural_ombros", "postural_coluna_toracica", "postural_coluna_lombar",
    "postural_pelve", "postural_joelhos", "postural_pes",
    "postural_observacoes", "dinam_mao_dir", "dinam_mao_esq",
    "func_flexao_braco", "func_agachamento", "func_prancha_seg",
    "vo2_distancia_m", "vo2_maximo", "vo2_classificacao", "perf_forca_inf_1",
    "perf_forca_inf_2", "perf_forca_inf_3", "perf_forca_sup_1",
    "perf_forca_sup_2", "perf_forca_sup_3", "perf_potencia_1",
    "perf_potencia_2", "perf_potencia_3", "perf_pontos_fortes",
    "perf_limitadores", "perf_protocolo", "perf_periodizacao",
}

AVALIACAO_ALIASES = {
    # Compatibilidade com os dois nomes acentuados da proposta original.
    "dobra_suprailíaca": "dobra_suprailiaca",
    "dobra_somatório": "dobra_somatorio",
}


def criar_avaliacao(aluno_id, tipo, dados):
    """Cria uma avaliação com os campos enviados e preserva defaults do banco."""
    if tipo not in AVALIACAO_TIPOS:
        raise ValueError("Tipo de avaliação inválido.")
    if not isinstance(dados, dict):
        raise ValueError("Os dados da avaliação devem ser um objeto.")

    dados = {
        AVALIACAO_ALIASES.get(campo, campo): valor
        for campo, valor in dados.items()
    }
    campos_invalidos = set(dados) - AVALIACAO_CAMPOS
    if campos_invalidos:
        raise ValueError(
            "Campos de avaliação desconhecidos: "
            + ", ".join(sorted(campos_invalidos))
        )

    # Os nomes de coluna vêm exclusivamente da lista permitida acima.
    colunas = ["aluno_id", "tipo", *dados.keys()]
    parametros = {"aluno_id": aluno_id, "tipo": tipo, **dados}
    sql_colunas = ", ".join(colunas)
    sql_valores = ", ".join(f":{coluna}" for coluna in colunas)

    with engine.begin() as conn:
        result = conn.execute(
            text(
                f"INSERT INTO avaliacoes ({sql_colunas}) "
                f"VALUES ({sql_valores}) RETURNING id"
            ),
            parametros,
        )
        return result.scalar_one()


def atualizar_avaliacao(avaliacao_id, tipo, dados):
    if tipo not in AVALIACAO_TIPOS or not isinstance(dados, dict):
        raise ValueError("Tipo ou dados da avaliação inválidos.")
    dados = {AVALIACAO_ALIASES.get(k, k): v for k, v in dados.items()}
    invalidos = set(dados) - AVALIACAO_CAMPOS
    if invalidos:
        raise ValueError("Campos de avaliação desconhecidos: " + ", ".join(sorted(invalidos)))
    dados["tipo"] = tipo
    sets = ", ".join(f"{k} = :{k}" for k in dados)
    with engine.begin() as conn:
        result = conn.execute(text(f"UPDATE avaliacoes SET {sets} WHERE id = :id RETURNING id"), {**dados, "id": avaliacao_id})
        return result.scalar_one_or_none()


def criar_anamnese(aluno_id, dados):
    if not isinstance(dados, dict) or not dados:
        raise ValueError("Informe os dados da anamnese.")
    invalidos = set(dados) - ANAMNESE_CAMPOS
    if invalidos:
        raise ValueError("Campos de anamnese desconhecidos: " + ", ".join(sorted(invalidos)))
    cols = ["aluno_id", *dados]
    binds = {"aluno_id": aluno_id, **dados}
    with engine.begin() as conn:
        return conn.execute(text(f"INSERT INTO anamnese_respostas ({', '.join(cols)}) VALUES ({', '.join(':'+c for c in cols)}) RETURNING id"), binds).scalar_one()


def listar_anamneses(aluno_id):
    with engine.connect() as conn:
        rows = conn.execute(text("SELECT * FROM anamnese_respostas WHERE aluno_id=:id ORDER BY criada_em DESC, id DESC"), {"id": aluno_id}).mappings().all()
        return [dict(row) for row in rows]


def buscar_anamnese_resposta(anamnese_id):
    with engine.connect() as conn:
        row = conn.execute(text("SELECT * FROM anamnese_respostas WHERE id=:id"), {"id": anamnese_id}).mappings().first()
        return dict(row) if row else None


def deletar_anamnese(anamnese_id):
    with engine.begin() as conn:
        result = conn.execute(text("DELETE FROM anamnese_respostas WHERE id=:id RETURNING id"), {"id": anamnese_id})
        return result.scalar_one_or_none() is not None


def listar_avaliacoes(aluno_id):
    with engine.connect() as conn:
        result = conn.execute(
            text("""
                SELECT id, aluno_id, tipo, data_avaliacao,
                       peso_kg, altura_m, imc, percentual_gordura,
                       proxima_reavaliacao
                FROM avaliacoes
                WHERE aluno_id = :id
                ORDER BY data_avaliacao DESC, id DESC
            """),
            {"id": aluno_id}
        )
        return [dict(row._mapping) for row in result.fetchall()]


def buscar_avaliacao(avaliacao_id):
    with engine.connect() as conn:
        result = conn.execute(
            text("""
                SELECT * FROM avaliacoes
                WHERE id = :id
            """),
            {"id": avaliacao_id}
        )
        row = result.mappings().first()
        return dict(row) if row else None


def deletar_avaliacao(avaliacao_id):
    with engine.begin() as conn:
        result = conn.execute(
            text("""
                DELETE FROM avaliacoes
                WHERE id = :id
                RETURNING id
            """),
            {"id": avaliacao_id}
        )
        return result.scalar_one_or_none() is not None
