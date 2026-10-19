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
from src.home_summary import (
    JANELA_REAVALIACAO_DIAS,
    JANELA_TREINO_DIAS,
    data_atual_home,
    montar_resumo_home,
)


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


def obter_resumo_home(hoje=None):
    """Busca dados dos alunos ativos e retorna o resumo da Home.

    A data e as janelas são parâmetros SQL; a consulta não usa CURRENT_DATE.
    """
    referencia = hoje or data_atual_home()
    with engine.connect() as conn:
        rows = conn.execute(
            text("""
                SELECT
                    a.id AS aluno_id,
                    a.nome,
                    av.id AS avaliacao_id,
                    av.data_avaliacao,
                    av.proxima_reavaliacao,
                    t.id AS treino_id,
                    t.nome AS treino_nome,
                    t.data_inicio AS treino_data_inicio,
                    t.data_fim AS treino_data_fim,
                    EXISTS (
                        SELECT 1
                        FROM anamnese_respostas an
                        WHERE an.aluno_id = a.id
                    ) AS tem_anamnese,
                    CASE
                        WHEN av.proxima_reavaliacao >= CAST(:hoje AS DATE)
                         AND av.proxima_reavaliacao <= CAST(:hoje AS DATE)
                             + (:janela_reavaliacao_dias * INTERVAL '1 day')
                        THEN TRUE ELSE FALSE
                    END AS reavaliacao_na_janela,
                    CASE
                        WHEN t.data_fim >= CAST(:hoje AS DATE)
                         AND t.data_fim <= CAST(:hoje AS DATE)
                             + (:janela_treino_dias * INTERVAL '1 day')
                        THEN TRUE ELSE FALSE
                    END AS treino_na_janela
                FROM alunos a
                LEFT JOIN LATERAL (
                    SELECT x.id, x.data_avaliacao, x.proxima_reavaliacao
                    FROM avaliacoes x
                    WHERE x.aluno_id = a.id
                    ORDER BY x.data_avaliacao DESC, x.id DESC
                    LIMIT 1
                ) av ON TRUE
                LEFT JOIN LATERAL (
                    SELECT x.id, x.nome, x.data_inicio, x.data_fim
                    FROM treinos x
                    WHERE x.aluno_id = a.id
                      AND x.data_inicio <= CAST(:hoje AS DATE)
                    ORDER BY
                        (x.data_fim >= CAST(:hoje AS DATE)) DESC,
                        CASE WHEN x.data_fim >= CAST(:hoje AS DATE) THEN x.data_fim END ASC,
                        x.data_inicio DESC,
                        x.id DESC
                    LIMIT 1
                ) t ON TRUE
                WHERE a.ativo = TRUE
                ORDER BY a.nome, a.id
            """),
            {
                "hoje": referencia,
                "janela_reavaliacao_dias": JANELA_REAVALIACAO_DIAS,
                "janela_treino_dias": JANELA_TREINO_DIAS,
            },
        ).mappings().all()

    return montar_resumo_home(
        rows,
        hoje=referencia,
        janela_reavaliacao_dias=JANELA_REAVALIACAO_DIAS,
        janela_treino_dias=JANELA_TREINO_DIAS,
    )


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
                    a.data_nascimento,
                    a.sexo
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
                    a.data_nascimento,
                    a.sexo
                FROM alunos a
                LEFT JOIN planos p
                    ON a.plano_id = p.id
                WHERE a.id = :id
            """),
            {"id": aluno_id}
        )
        return result.fetchone()


def criar_aluno(nome, email, telefone, plano_id, objetivo, modalidade, data_nascimento=None, sexo=None):
    with engine.connect() as conn:
        result = conn.execute(
            text("""
                INSERT INTO alunos (
                    nome, email, telefone,
                    plano_id, objetivo, modalidade,
                    data_nascimento, sexo
                )
                VALUES (
                    :nome, :email, :telefone,
                    :plano_id, :objetivo, :modalidade,
                    :data_nascimento, :sexo
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
                "data_nascimento": data_nascimento,
                "sexo": sexo
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


def atualizar_aluno(aluno_id, nome, email, telefone, plano_id, objetivo, modalidade, data_nascimento=None, sexo=None):
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
                    data_nascimento = :data_nascimento,
                    sexo = :sexo
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
                "data_nascimento": data_nascimento,
                "sexo": sexo
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
                    tipo_articular,
                    midia_url
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
                    tipo_articular,
                    midia_url
                FROM exercicios
                WHERE categoria = :categoria
                ORDER BY nome
            """),
            {"categoria": categoria}
        )

        return result.fetchall()


def listar_exercicios_por_grupo(grupo):
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
                    tipo_articular,
                    midia_url
                FROM exercicios
                WHERE musculo_alvo = :grupo
                ORDER BY nome
            """),
            {"grupo": grupo}
        )
        return result.fetchall()


def criar_exercicio(nome, categoria, musculo_alvo, midia_url=None):
    with engine.begin() as conn:
        result = conn.execute(
            text("""
                INSERT INTO exercicios (nome, categoria, musculo_alvo, midia_url)
                VALUES (:nome, :categoria, :musculo_alvo, :midia_url)
                RETURNING id
            """),
            {
                "nome": nome,
                "categoria": categoria,
                "musculo_alvo": musculo_alvo,
                "midia_url": midia_url or None,
            }
        )
        return result.scalar_one()


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
                    tipo_articular,
                    midia_url
                FROM exercicios
                WHERE id = :id
            """),
            {"id": exercicio_id}
        )

        return result.fetchone()


# ===========================================================================
# 7. TREINOS PRESCRITOS
# ===========================================================================

def listar_treinos(aluno_id):
    with engine.connect() as conn:
        treinos = conn.execute(
            text("""
                SELECT id, aluno_id, nome, objetivo, dificuldade, orientacoes_gerais,
                       data_inicio, data_fim, remover_apos_vencimento,
                       ocultar_antes_inicio, criado_em
                FROM treinos
                WHERE aluno_id = :aluno_id
                ORDER BY data_inicio DESC, id DESC
            """), {"aluno_id": aluno_id}
        ).mappings().all()

        items = []
        for treino in treinos:
            sessoes = conn.execute(
                text("""
                    SELECT id, treino_id, nome, ordem
                    FROM treino_sessoes
                    WHERE treino_id = :treino_id
                    ORDER BY ordem, id
                """), {"treino_id": treino["id"]}
            ).mappings().all()
            sessoes_com_exercicios = []
            for sessao in sessoes:
                exercicios = conn.execute(
                    text("""
                        SELECT te.id, te.exercicio_id, e.nome, e.musculo_alvo, e.categoria,
                               e.midia_url, e.descricao,
                               te.ordem, te.series, te.repeticoes, te.descanso_segundos,
                               te.carga, te.observacoes
                        FROM treino_exercicios te
                        JOIN exercicios e ON e.id = te.exercicio_id
                        WHERE te.sessao_id = :sessao_id
                        ORDER BY te.ordem, te.id
                    """), {"sessao_id": sessao["id"]}
                ).mappings().all()
                sessoes_com_exercicios.append({**dict(sessao), "exercicios": [dict(ex) for ex in exercicios]})
            items.append({**dict(treino), "sessoes": sessoes_com_exercicios})
        return items


def criar_treino(aluno_id, dados):
    with engine.begin() as conn:
        treino_id = conn.execute(
            text("""
                INSERT INTO treinos (
                    aluno_id, nome, objetivo, dificuldade, orientacoes_gerais,
                    data_inicio, data_fim, remover_apos_vencimento,
                    ocultar_antes_inicio
                ) VALUES (
                    :aluno_id, :nome, :objetivo, :dificuldade, :orientacoes_gerais,
                    :data_inicio, :data_fim, :remover_apos_vencimento,
                    :ocultar_antes_inicio
                ) RETURNING id
            """), {"aluno_id": aluno_id, **dados}
        ).scalar_one()
        return treino_id


def criar_sessao_treino(treino_id, nome, exercicios):
    with engine.begin() as conn:
        treino = conn.execute(
            text("SELECT 1 FROM treinos WHERE id = :id"), {"id": treino_id}
        ).scalar_one_or_none()
        if not treino:
            raise LookupError("Treino não encontrado.")

        nome = nome.strip()
        if len(nome) < 2:
            raise ValueError("Informe um nome válido para a sessão de treino.")

        ordem_sessao = conn.execute(
            text("SELECT COALESCE(MAX(ordem), 0) + 1 FROM treino_sessoes WHERE treino_id = :id"),
            {"id": treino_id}
        ).scalar_one()
        sessao_id = conn.execute(
            text("""
                INSERT INTO treino_sessoes (treino_id, nome, ordem)
                VALUES (:treino_id, :nome, :ordem)
                RETURNING id
            """), {"treino_id": treino_id, "nome": nome, "ordem": ordem_sessao}
        ).scalar_one()

        for offset, exercicio in enumerate(exercicios, start=1):
            existe_exercicio = conn.execute(
                text("SELECT 1 FROM exercicios WHERE id = :id"),
                {"id": exercicio["exercicio_id"]}
            ).scalar_one_or_none()
            if not existe_exercicio:
                raise ValueError(f"O exercício {exercicio['exercicio_id']} não existe na biblioteca.")
            conn.execute(
                text("""
                    INSERT INTO treino_exercicios (
                        sessao_id, exercicio_id, ordem, series, repeticoes,
                        descanso_segundos, carga, observacoes
                    ) VALUES (
                        :sessao_id, :exercicio_id, :ordem, :series, :repeticoes,
                        :descanso_segundos, :carga, :observacoes
                    )
                """), {"sessao_id": sessao_id, "ordem": offset, **exercicio}
            )
        return sessao_id


def deletar_exercicio_treino(item_id):
    with engine.begin() as conn:
        result = conn.execute(
            text("DELETE FROM treino_exercicios WHERE id = :id RETURNING id"),
            {"id": item_id}
        )
        return result.scalar_one_or_none() is not None


def reordenar_exercicios_sessao(sessao_id, ids):
    with engine.begin() as conn:
        result = conn.execute(
            text("SELECT id FROM treino_exercicios WHERE sessao_id = :id ORDER BY ordem, id"),
            {"id": sessao_id}
        )
        atuais = [row[0] for row in result.fetchall()]
        if not atuais:
            raise LookupError("Sessão sem exercícios ou sessão não encontrada.")
        if len(ids) != len(atuais) or set(ids) != set(atuais):
            raise ValueError("A nova ordem precisa conter todos os exercícios da sessão uma única vez.")

        temporario = len(ids) + len(atuais) + 1
        for index, item_id in enumerate(ids, start=1):
            conn.execute(
                text("UPDATE treino_exercicios SET ordem = :ordem WHERE id = :id AND sessao_id = :sessao_id"),
                {"ordem": temporario + index, "id": item_id, "sessao_id": sessao_id}
            )
        for index, item_id in enumerate(ids, start=1):
            conn.execute(
                text("UPDATE treino_exercicios SET ordem = :ordem WHERE id = :id AND sessao_id = :sessao_id"),
                {"ordem": index, "id": item_id, "sessao_id": sessao_id}
            )
        return True

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
    "peso_kg", "altura_m", "imc", "imc_classificacao", "percentual_gordura",
    "rcq", "rcq_classificacao", "circ_somatorio", "percentual_gordura_ideal",
    "gordura_ideal_kg", "massa_magra_ideal_kg", "peso_ideal_kg", "gordura_excedente_kg",
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


def atualizar_anamnese(anamnese_id, dados):
    if not isinstance(dados, dict) or not dados:
        raise ValueError("Informe os dados da anamnese.")
    invalidos = set(dados) - ANAMNESE_CAMPOS
    if invalidos:
        raise ValueError("Campos de anamnese desconhecidos: " + ", ".join(sorted(invalidos)))
    sets = ", ".join(f"{campo} = :{campo}" for campo in dados)
    with engine.begin() as conn:
        result = conn.execute(
            text(f"UPDATE anamnese_respostas SET {sets} WHERE id = :id RETURNING id"),
            {**dados, "id": anamnese_id}
        )
        return result.scalar_one_or_none()


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
