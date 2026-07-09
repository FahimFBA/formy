# Formy

Formy is a production-oriented customizable forms platform with a Django backend and a
React/Tailwind frontend. The backend is written as a reusable Django app that can be installed
into another Django project, and this repository also ships a standalone API project plus a full
React frontend for development and deployment.

## Structure

```text
backend/
  config/              Django project settings, URL routing, Dockerfile
  formy/                Reusable Django app (models, DRF views/serializers, auth)
  manage.py
  requirements.txt
frontend/
  src/                  React application (pages, components, api client)
  package.json
  tailwind.config.js
docker-compose.yml      Postgres, Redis, backend, and frontend for a full local/production-like stack
.github/workflows/      CI (Python lint, backend tests, JS lint, frontend build) and automated releases
```

## Quick start

Local, no Docker: see `docs/local-development.md`.

Docker (Postgres, Redis, gunicorn, nginx, the same stack as production): see
`docs/docker-deployment.md`.

Both guides cover creating your first user; see `docs/user-management.md` for every way to create
or manage a user (registration endpoint, the frontend, `createsuperuser`, the Django admin, and
resetting a forgotten password).

## Documentation

- `docs/local-development.md`: run the backend and frontend directly on your machine.
- `docs/docker-deployment.md`: run the full stack in Docker, including how to reset data and
  rebuild after code changes.
- `docs/user-management.md`: creating superusers, regular users, and resetting passwords.
- `docs/api-reference.md`: every endpoint, request and response shapes, and the form schema
  format.
- `docs/integration-guide.md`: the three ways to reuse Formy elsewhere: the embeddable widget, the
  REST API from your own frontend, or vendoring the `formy` Django app into an existing project.
- `docs/architecture.md`: how the backend and frontend are put together.
- `AGENTS.md`: conventions and rules for anyone (human or AI agent) changing this codebase.
- `CHANGELOG.md`: notable changes per release, and how releases are cut.

## Tests and checks

```powershell
cd backend
pip install -r requirements-dev.txt
python -m ruff check .
python manage.py test
```

```powershell
cd frontend
npm run lint
npm run build
npm run build:embed
```

`.github/workflows/ci.yml` runs all four on every pull request against `main`.
