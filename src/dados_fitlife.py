# ================================
# DADOS BASE - FITLIFE COACHING
# ================================

# --- INFORMAÇÕES DA EMPRESA ---
empresa = {
    "nome": "FitLife Coaching",
    "especialidade": "Reabilitação e Grupos Especiais",
    "modalidades": ["Presencial", "Online"],
    "localização": "Vitória, ES"
}

# --- EXERCÍCIOS POR CATEGORIA ---
exercicios = {
    "força": [
        "Agachamento livre",
        "Leg press",
        "Cadeira extensora",
        "Supino reto",
        "Remada curvada"
    ],
    "reabilitação": [
        "Alongamento de isquiotibiais",
        "Fortalecimento de manguito rotador",
        "Exercícios de propriocepção",
        "Mobilidade de quadril",
        "Estabilização lombar"
    ],
    "cardio": [
        "Esteira",
        "Bicicleta ergométrica",
        "Elíptico",
        "Caminhada funcional"
    ]
}

# --- ANAMNESE BÁSICA ---
anamnese_modelo = {
    "dados_pessoais": {
        "nome": "",
        "idade": 0,
        "sexo": "",
        "peso_kg": 0.0,
        "altura_cm": 0.0
    },
    "historico_saude": {
        "doencas_preexistentes": [],
        "medicamentos": [],
        "lesoes_anteriores": [],
        "cirurgias": []
    },
    "objetivos": {
        "principal": "",
        "prazo_meses": 0,
        "disponibilidade_semanal": 0
    }
}

# --- EXIBIÇÃO ---
print("=== FITLIFE COACHING ===")
print(f"Especialidade: {empresa['especialidade']}")
print(f"Localização: {empresa['localização']}\n")

print("=== EXERCÍCIOS DISPONÍVEIS ===")
for categoria, lista in exercicios.items():
    print(f"\n[{categoria.upper()}]")
    for exercicio in lista:
        print(f"  - {exercicio}")

print("\n=== MODELO DE ANAMNESE ===")
print("Campos:", list(anamnese_modelo.keys()))