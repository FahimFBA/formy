# AGENTS.md

Instructions for AI coding agents (and humans acting like one) working in this repository.
Read this before making changes. If something here conflicts with a direct user instruction
in the current conversation, the user instruction wins, but flag the conflict.

## What this project is

Formy is a form builder and submission platform: a Django REST Framework backend (`backend/`)
and a React + Vite + Tailwind frontend (`frontend/`). The backend is written as a self-contained,
reusable Django app (`backend/formy`) plus a thin deployment project (`backend/config`), so it can
be copied into another Django project. See `docs/architecture.md` for how the pieces fit together
and `docs/` in general before assuming how something works.

## Ground rules

- Do not use em dashes (`—`) or en dashes (`–`) anywhere: code, comments, docs, commit messages,
  PR descriptions, changelog entries. Use a period, comma, colon, parentheses, or "and"/"or"
  instead. This is a standing preference, not a one-off request.
- Do not write comments that explain what code does. Only write a comment when the reason is
  non-obvious (a workaround, an invariant, a constraint that would surprise a reader).
- Do not add abstractions, config flags, or generalized helpers for a single call site. Match the
  existing style in the file you are editing rather than introducing a new pattern.
- Do not add error handling for cases that cannot happen given Django/DRF's own guarantees.
  Validate at real boundaries (user input, external requests), not everywhere defensively.
- Keep the reusable `backend/formy` app decoupled from `backend/config`. It must keep working if
  copied into a different Django project with a different `AUTH_USER_MODEL`, so do not add
  imports from `config` into `formy`, and do not hardcode anything that assumes this specific
  deployment (domains, ports, `config.settings` values that are not passed through `settings.py`
  in a generic way).

## Before committing anything

- Never commit `backend/.env`, `backend/db.sqlite3`, `backend/media/`, `backend/staticfiles/*`
  (except `.gitkeep`), or `backend/.venv/`. All of these are already covered by `.gitignore`; if a
  new kind of local/secret file shows up, add it to `.gitignore` instead of relying on `git add`
  being careful by hand.
- Never commit real user data, tokens, or API keys, including ones that look like test fixtures.
  Test data in `backend/formy/tests.py` should stay obviously fake (`s3cret-pass`,
  `alice@example.com`, and similar).
- Run the checks in "Running checks locally" below before handing off work as done.

## Running checks locally

The project has no bind mount for the backend source into Docker, so for quick local iteration use
a Python 3.12 virtualenv or run checks inside the built container. Python 3.13+ locally may not have
prebuilt Pillow wheels; prefer 3.12.

Backend:

```powershell
cd backend
pip install -r requirements-dev.txt
python -m ruff check .
python manage.py test
```

Frontend:

```powershell
cd frontend
npm ci
npm run lint
npm run build
npm run build:embed
```

These are exactly the jobs CI runs on every pull request (`.github/workflows/ci.yml`). A PR is not
done until all four are green.

## Changelog and releases

Every user-visible change (new feature, bug fix, behavior change) gets an entry added under the
`## [Unreleased]` heading in `CHANGELOG.md`, in the matching `### Added` / `### Changed` /
`### Fixed` / `### Removed` subsection (create the subsection if it does not exist yet). Follow the
existing [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) style already in the file.

Do not invent a version number or move `Unreleased` into a dated section yourself unless the user
explicitly asks for a release. When they do:

1. Rename `## [Unreleased]` to `## [X.Y.Z] - YYYY-MM-DD` (semantic version bump, real date), and
   add a fresh empty `## [Unreleased]` heading above it.
2. Add the two reference links at the bottom of the file for the new version, following the
   existing pattern.
3. Commit and push to `main`.

Pushing a commit that touches `CHANGELOG.md` on `main` triggers `.github/workflows/release.yml`,
which reads the top dated version section, tags it (`vX.Y.Z`), and publishes a GitHub Release with
that section's body as the release notes automatically. There is nothing else to run by hand, and
nothing to do if you are not asked to cut a release. Do not manually create tags or GitHub releases.

## Testing conventions

- Backend tests live in `backend/formy/tests.py` using DRF's `APITestCase`. Follow the existing
  grouping by feature area (`ProfileTests`, `AvatarTests`, and so on) rather than one flat class.
- Any test touching `MEDIA_ROOT` (avatar uploads) must use
  `@override_settings(MEDIA_ROOT=tempfile.mkdtemp())` so it never writes into real media storage.
- Anything validating file uploads should assume Django's `ImageField` only checks the file
  extension, not the actual content. If you add another upload field, validate the decoded content
  (see `AvatarUploadView` in `backend/formy/views.py` for the pattern) rather than trusting the
  extension or the client-supplied content type.

## Docs

`docs/` holds the long-form documentation (local setup, Docker setup, API reference, integration
guide). Update the relevant doc in the same change that changes the behavior it describes. Do not
let `README.md`, `backend/README.md`, `frontend/README.md`, and `docs/` drift out of sync; the root
`README.md` is meant to be a short index that links into `docs/`, not a second copy of the same
content.
