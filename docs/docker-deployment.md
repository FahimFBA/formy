# Running Formy With Docker

`docker-compose.yml` at the repository root runs the whole stack: Postgres, Redis, the Django API
(gunicorn + whitenoise), and the built React app served by nginx. This is the closest local
environment to production, and the easiest way to demo the app without setting up a Python or
Node toolchain at all.

## Prerequisites

- Docker Desktop, running, before you call `docker compose up`.

## Start the stack

```powershell
docker compose up --build
```

This builds the backend and frontend images, then starts four containers:

| Service    | Purpose                                          | Reachable at              |
|------------|---------------------------------------------------|----------------------------|
| `db`       | Postgres 16                                        | internal only              |
| `redis`    | Shared cache for the submission rate limiter       | internal only              |
| `backend`  | Django API (gunicorn, 3 workers, migrations auto-run on start) | `http://localhost:8000` |
| `frontend` | Built React app served by nginx, proxies `/api/` and `/media/` to `backend` | `http://localhost:8080` |

Open `http://localhost:8080` and use the app exactly as described in `docs/local-development.md`.
Requests to `/api/` and `/media/` are proxied by nginx to the backend container, so the frontend
and backend appear same-origin from the browser's point of view, no CORS configuration needed for
this path.

Run it detached with `docker compose up -d --build`, and stop it with `docker compose down` (add
`-v` only if you also want to delete the Postgres and media volumes, see "Resetting data" below).

## Environment variables

`docker-compose.yml` sets sane defaults for everything except the secret key. Override any of
these by exporting them before running `docker compose up`, or by adding a `.env` file next to
`docker-compose.yml` (Compose loads that automatically; do not confuse it with `backend/.env`,
which is only used when running the backend outside Docker):

- `DJANGO_SECRET_KEY`: set a real random value for anything beyond local testing. Compose defaults
  to `change-me-in-production` if unset, which is fine for a throwaway local run and nothing else.

Everything else (database credentials, `DJANGO_DEBUG=False`, `REDIS_URL`, allowed hosts) is fixed
in `docker-compose.yml` for the container-to-container network. If you need to change ports,
domains, or add TLS termination, that is a `docker-compose.yml` / reverse proxy change, not an
environment variable.

## Creating users inside Docker

There is no seed data. Create your first user one of these ways:

**Django superuser (for the admin site):**

```powershell
docker compose exec backend python manage.py createsuperuser
```

Then log in at `http://localhost:8080/admin/`. Note that Docker's `backend` container does expose
`/admin/` too, but reach it through the nginx proxy (`:8080`) if you also want static assets to
load; hitting `:8000/admin/` directly still works for the API/login pages themselves.

**Regular user (through the API or the UI), no superuser needed:**

Either register through the running frontend at `http://localhost:8080/login`, or call the API
directly:

```powershell
curl -X POST http://localhost:8080/api/auth/register/ `
  -H "Content-Type: application/json" `
  -d '{\"username\":\"alice\",\"password\":\"a-strong-password\",\"email\":\"alice@example.com\"}'
```

This returns `{"token": "..."}`. See `docs/user-management.md` for the full set of options
(promoting a user to staff/superuser, resetting a password from the shell, and so on) and
`docs/api-reference.md` for every auth endpoint.

## Logs and shell access

```powershell
docker compose logs -f backend
docker compose logs -f frontend
docker compose exec backend python manage.py shell
docker compose exec backend bash
```

## Resetting data

Postgres data and uploaded avatars live in named volumes (`postgres_data`, `media_data`), so they
survive `docker compose down` and container rebuilds. To start completely fresh:

```powershell
docker compose down -v
```

This deletes both volumes. There is no confirmation prompt, so make sure you actually want to lose
the database and any uploaded avatars before running it.

## Rebuilding after code changes

The backend has no bind mount, so code changes on the host are not picked up by a running
container. After editing backend or frontend source, rebuild the relevant service:

```powershell
docker compose up -d --build backend
docker compose up -d --build frontend
```

If you generate a new Django migration while working this way (`docker compose exec backend python
manage.py makemigrations`), copy it out of the container onto the host before rebuilding, or the
rebuild throws it away:

```powershell
docker cp formy-backend-1:/app/backend/formy/migrations/000X_your_migration.py backend/formy/migrations/
```
