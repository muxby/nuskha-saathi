# Nuskha Saathi developer shortcuts. Run from the repository root.
APP := nuskha-saathi
PY  := $(APP)/backend/.venv/bin/python

.PHONY: setup setup-backend setup-frontend
setup: setup-backend setup-frontend

setup-backend:
	cd $(APP)/backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt

setup-frontend:
	cd $(APP)/frontend && npm ci

