PYTHON := python3
PIP := $(PYTHON) -m pip
UVICORN := uvicorn
COMPOSE := docker compose -f ../docker-compose.yml

.PHONY: install run lint format migrate makemigrations start stop db-up db-down

install:
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements.txt

run:
	$(UVICORN) app.main:app --reload --host 0.0.0.0 --port 8000

lint:
	$(PYTHON) -m ruff app

format:
	$(PYTHON) -m black app

migrate:
	alembic upgrade head

makemigrations:
	alembic revision --autogenerate -m "update schema"

db-up:
	$(COMPOSE) up -d postgres

db-down:
	$(COMPOSE) stop postgres

start:
	$(COMPOSE) up -d postgres
	$(MAKE) run

stop:
	$(COMPOSE) stop postgres

