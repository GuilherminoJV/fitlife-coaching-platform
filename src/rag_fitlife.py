# ================================
# RAG FITLIFE COACHING
# ================================

from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, Settings
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from groq import Groq
import os
from dotenv import load_dotenv

# Carrega as variáveis do arquivo .env
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# --- APENAS EMBEDDING (sem LLM do LlamaIndex) ---
Settings.embed_model = HuggingFaceEmbedding(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)
Settings.llm = None

# --- CLIENTE GROQ DIRETO ---
cliente_groq = Groq(api_key=GROQ_API_KEY)

# --- CARREGA OS DOCUMENTOS ---
print("Carregando base de conhecimento...")
documents = SimpleDirectoryReader("data").load_data()

# --- CRIA O ÍNDICE ---
print("Criando índice...")
index = VectorStoreIndex.from_documents(documents)
retriever = index.as_retriever(similarity_top_k=3)

# --- FUNÇÃO DE CONSULTA ---
def perguntar(pergunta):
    # Busca trechos relevantes
    nos = retriever.retrieve(pergunta)
    contexto = "\n".join([no.text for no in nos])

    # Manda pro Groq com o contexto
    resposta = cliente_groq.chat.completions.create(
        model="openai/gpt-oss-20b",
        messages=[
            {
                "role": "system",
                "content": "Você é um assistente especialista da FitLife Coaching. Responda em português com base no contexto fornecido."
            },
            {
                "role": "user",
                "content": f"Contexto:\n{contexto}\n\nPergunta: {pergunta}"
            }
        ]
    )
    return resposta.choices[0].message.content

# --- CHAT SIMPLES ---
print("\n=== ASSISTENTE FITLIFE ===")
print("Digite sua pergunta (ou 'sair' para encerrar)\n")

while True:
    pergunta = input("Você: ")
    if pergunta.lower() == "sair":
        print("Encerrando...")
        break
    resposta = perguntar(pergunta)
    print(f"\nFitLife IA: {resposta}\n")