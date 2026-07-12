<p align="center">
  <img src="assets/images/formy.png" alt="Formy logo" width="120" />
</p>

<h1 align="center">Formy</h1>

<p align="center">
  <a href="https://github.com/FahimFBA/formy/actions/workflows/ci.yml"><img src="https://github.com/FahimFBA/formy/actions/workflows/ci.yml/badge.svg" alt="CI status" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" /></a>
  <a href="CHANGELOG.md"><img src="https://img.shields.io/github/v/release/FahimFBA/formy" alt="Latest release" /></a>
</p>

Formy is a production-oriented customizable forms platform with a Django backend and a
React/Tailwind frontend. The backend is written as a reusable Django app that can be installed
into another Django project, and this repository also ships a standalone API project plus a full
React frontend for development and deployment.

## Features

- **Drag-and-drop form builder** with 10 field types: text, textarea, email, number, select,
  multi-select, checkbox, date, phone, and file upload with attachments.
- **Custom form branding**: logo, colors, and theming per form.
- **Reusable Django app**: vendor `formy` into an existing Django project, or run it standalone.
- **Embeddable widget** to drop a form into any website, plus a full REST API.
- **Multi-language UI copy** (English, Spanish, Chinese) shared between backend and frontend via
  `label-universe`.
- **Docker-ready** production stack: Postgres, Redis, gunicorn, and nginx.
- **CI on every PR**: Python lint, backend tests, JS lint, and frontend build.

## Structure

```text
assets/                 Project images (logo, etc.) used by this README
backend/
  config/               Django project settings, URL routing, Dockerfile
  formy/                Reusable Django app (models, DRF views/serializers, auth)
  manage.py
  requirements.txt
frontend/
  src/                  React application (pages, components, api client)
  package.json
  tailwind.config.js
docs/                   Setup, deployment, API, and architecture guides
label-universe/         Shared UI copy (en/es/zh) read by both backend and frontend
docker-compose.yml      Postgres, Redis, backend, and frontend for a full local/production-like stack
.github/workflows/      CI (Python lint, backend tests, JS lint, frontend build) and automated releases
LICENSE                 MIT license
CHANGELOG.md            Notable changes per release
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
- `label-universe/README.md`: the shared UI copy registry (English, Spanish, Chinese) both sides
  read from, and how to add a string or a fourth language.
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

## License

MIT, see [LICENSE](LICENSE).
