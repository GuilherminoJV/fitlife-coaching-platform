from fastapi.testclient import TestClient
from src.api import app

client = TestClient(app)

def test_api_responde():
    response = client.get("/")
    assert response.status_code == 200

def test_interface_chat_carrega():
    response = client.get("/chat")
    assert response.status_code == 200
    assert "FitLife Coaching Assistant" in response.text

def test_rota_inexistente_retorna_404():
    response = client.get("/rota-que-nao-existe")
    assert response.status_code == 404