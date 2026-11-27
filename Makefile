# Nuskha Saathi developer shortcuts. Run from the repository root.
APP := nuskha-saathi
PY  := $(APP)/backend/.venv/bin/python

.PHONY: setup setup-backend setup-frontend
setup: setup-backend setup-frontend

setup-backend:
	cd $(APP)/backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt

setup-frontend:
	cd $(APP)/frontend && npm ci

.PHONY: api web
api:
	cd $(APP)/backend && .venv/bin/python -m uvicorn main:app --reload --port 8000

web:
	cd $(APP)/frontend && npm run dev

.PHONY: test test-backend test-frontend eval
test: test-backend test-frontend

test-backend:
	cd $(APP)/backend && .venv/bin/python -m pytest -q

test-frontend:
	cd $(APP)/frontend && npm run typecheck && npm run test:unit

eval:
	cd $(APP)/backend && .venv/bin/python -m tests.run_eval_30

# Both need the API on :8000 and a production frontend on :3000.
.PHONY: test-ui test-e2e
test-ui:
	cd $(APP)/frontend && npm run test:ui

test-e2e:
	cd $(APP)/frontend && npm run test:e2e
