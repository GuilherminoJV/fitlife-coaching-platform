# 🏋️‍♂️ FitLife Coaching Platform

> Plataforma de gestão para coaching esportivo com assistente de IA Generativa (RAG), FastAPI e PostgreSQL.

![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![LlamaIndex](https://img.shields.io/badge/LlamaIndex-RAG-black?style=for-the-badge)
![Groq](https://img.shields.io/badge/Groq-API-orange?style=for-the-badge)

---

## 📌 Visão Geral

A **FitLife Coaching Platform** é um ecossistema completo para gestão de personal trainers e consultorias esportivas. A aplicação combina um **dashboard administrativo** para monitoramento de métricas em tempo real e um **assistente inteligente baseado em RAG (Retrieval-Augmented Generation)**.

---

## 🎬 Demonstração da Aplicação

<!-- Substitua o caminho abaixo pela imagem/GIF do seu projeto -->
<img width="1090" height="998" alt="Animação" src="https://github.com/user-attachments/assets/1b0f79a3-34b2-4fd8-ba2f-3031c0b74204" />

---

## ✨ Principais Funcionalidades

- **📊 Dashboard do Administrador:** Métricas operacionais em tempo real (Alunos Ativos, Anamneses Realizadas, Consultas IA no mês).
- **🤖 Assistente RAG Inteligente:** 
  - *Para Alunos:* Resposta rápida a dúvidas sobre treinos, execução e orientações.
  - *Para o Coach/Admin:* Suporte na análise de anamneses e decisões técnicas.
- **🗄️ Persistência de Dados:** Modelagem e integração assíncrona com PostgreSQL.
- **📱 Interface Web Responsiva:** Painel intuitivo servido diretamente pelo FastAPI.

---

## 🛠️ Tecnologias Utilizadas

- **Backend:** Python 3.10+, FastAPI, Uvicorn
- **Banco de Dados:** PostgreSQL, SQLAlchemy / DAOs
- **Inteligência Artificial:** LlamaIndex, Groq API (LLMs), RAG (Retrieval-Augmented Generation)
- **Frontend:** HTML5, CSS3 (Design Responsivo), JavaScript Vanilla
- **DevOps & Versionamento:** Git, GitHub, Python Virtual Environment (`venv`)

---

## 📅 Histórico de Atualizações

### v0.2.0 — Integração com Banco de Dados
- Integração completa com **PostgreSQL** via SQLAlchemy + pg8000
- Tabelas criadas: `planos`, `alunos`, `anamneses`, `historico_chat`
- Histórico do chat salvo automaticamente no banco a cada consulta
- Novas rotas na API: `GET /alunos` e `GET /alunos/{id}`
- Variáveis de ambiente protegidas via `.env`

### v0.1.0 — Lançamento Inicial
- Assistente RAG com LlamaIndex + Groq API
- Interface web com identidade visual FitLife Coaching
- API REST com FastAPI e documentação Swagger automática
- Projeto publicado no GitHub com `.gitignore` configurado

---

## 🚀 Como Executar o Projeto Localmente

```bash
git clone https://github.com/GuilherminoJV/fitlife-coaching-platform.git
cd fitlife-coaching-platform
```

> ⚠️ **Nota:** Este projeto é de uso estritamente pessoal e vinculado à marca **FitLife Coaching**.
> Por isso, arquivos sensíveis como a base de conhecimento (`data/`), variáveis de ambiente (`.env`)
> e dados reais de alunos **não estão disponíveis neste repositório**.
> O código aqui presente representa apenas a estrutura técnica da plataforma,
> disponibilizado para fins de portfólio e demonstração de habilidades.
