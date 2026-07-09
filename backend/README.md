# Formy Backend

This backend contains:

- `config`: a standalone Django project for development and deployment.
- `formy`: the reusable Django app that can be installed into another Django project.

See `docs/local-development.md` (running this backend directly) and `docs/docker-deployment.md`
(running it in Docker) in the repository root for full setup instructions, and
`docs/api-reference.md` for the complete API reference; this file only covers environment
variables and quick links.

## Environment

Copy `.env.example` to `.env` for local development. Production deployments should provide
environment variables through the platform secret manager.

Required production values:

- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG=False`
- `DJANGO_ALLOWED_HOSTS`
- `DJANGO_CSRF_TRUSTED_ORIGINS`
- Database settings matching your production database
- `REDIS_URL`: required whenever you run more than one backend process/worker (gunicorn's default
  is 3). Without it, the submission-rate throttle falls back to a per-process in-memory cache, so
  each worker counts independently and the effective limit becomes `rate * worker_count`.

Optional:

- `FORMY_SUBMISSION_THROTTLE_RATE`: public submission rate limit (default `30/hour`), DRF format
  (for example `10/min`, `100/day`).

## API and schema reference

Full endpoint list, request/response shapes, the form schema format, and schema versioning
behavior all live in `docs/api-reference.md` at the repository root. This file only covers
environment variables specific to running the backend.

