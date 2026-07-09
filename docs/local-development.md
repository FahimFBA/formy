# Running Formy Locally (Without Docker)

This is the fastest loop for changing code: no containers, `manage.py runserver` and `vite dev`
both auto-reload on save. Use `docs/docker-deployment.md` instead if you want the production-like
stack (Postgres, Redis, gunicorn, nginx) or you are demoing the app rather than developing it.

## Prerequisites

- Python 3.12 (3.13+ works for Django itself, but Pillow does not ship prebuilt wheels for very new
  Python versions on Windows; stick to 3.12 to avoid a source build).
- Node.js 20.
- Nothing else. SQLite is the default database and there is no required external cache for a
  single `runserver` process.

## Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

The API is now at `http://localhost:8000/api/`, and the Django admin at
`http://localhost:8000/admin/` (log in with the superuser you just created).

`backend/.env` (created from `.env.example` above) controls settings via environment variables. The
defaults are fine for local development:

- `DJANGO_SECRET_KEY` can stay as the placeholder locally; set a real random value in production.
- `DJANGO_DEBUG=True` enables Django's debug pages. Leave this `False` outside local development.
- `DJANGO_ALLOWED_HOSTS` and `DJANGO_CSRF_TRUSTED_ORIGINS` need to include whatever host/port you
  actually load the frontend from if you change it from the defaults.
- `DJANGO_DB_ENGINE` / `DJANGO_DB_NAME` default to SQLite (`db.sqlite3` in `backend/`). Point them
  at Postgres if you want that locally too; see `docs/docker-deployment.md` for the variable names
  Postgres needs (`DJANGO_DB_USER`, `DJANGO_DB_PASSWORD`, `DJANGO_DB_HOST`, `DJANGO_DB_PORT`).
- `REDIS_URL` is optional for a single `runserver` process. It only matters once you run more than
  one backend process (gunicorn's default is 3 workers), because the submission rate limiter's
  cache is per-process without it. See `docs/api-reference.md` for what that throttle protects.

Run the backend test suite with:

```powershell
python manage.py test
```

## Frontend

In a separate terminal:

```powershell
cd frontend
npm install
npm run dev
```

Vite serves the app at `http://localhost:5173`. It talks to `http://localhost:8000/api` by
default; override that with `VITE_API_BASE_URL` in `frontend/.env` (copy from
`frontend/.env.example`) if your backend is somewhere else.

Open `http://localhost:5173/login` to register an account (this calls the same
`/api/auth/register/` endpoint described in `docs/api-reference.md`, so it is equivalent to
creating a user through the API directly). From there:

- `/dashboard` lists, creates, and deletes your forms, with pagination once you have more than 20.
- `/builder/:id` edits a form's schema with a live preview and drag-and-drop field ordering.
- `/builder/:id/submissions` lists submissions and exports them as CSV, JSON, or PDF.
- `/profile` updates your account details, password, and avatar.
- `/f/:slug` is the public page for a published form; it works without logging in.

See `docs/user-management.md` for every way to create a user (registration endpoint, the frontend
form, `createsuperuser`, and the Django admin) and what each one is for.

## Linting and building

```powershell
cd backend
pip install -r requirements-dev.txt
python -m ruff check .
```

```powershell
cd frontend
npm run lint
npm run build
npm run build:embed
```

These are the same four checks CI runs on every pull request (`.github/workflows/ci.yml`).
