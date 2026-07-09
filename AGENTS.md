# AGENTS.md

Instructions for AI coding agents (and humans acting like one) working in this repository.
Read this before making changes. If something here conflicts with a direct user instruction
in the current conversation, the user instruction wins, but flag the conflict.

## What this project is

Formy is a form builder and submission platform: a Django REST Framework backend (`backend/`),
a React + Vite + Tailwind frontend (`frontend/`), and a top-level `label-universe/` directory that
both of them read UI copy from. The backend is written as a self-contained, reusable Django app
(`backend/formy`) plus a thin deployment project (`backend/config`), so it can be copied into
another Django project. See `docs/architecture.md` for how the pieces fit together and `docs/` in
general before assuming how something works.

## Ground rules

- Do not use em dashes (`—`) or en dashes (`–`) anywhere: code, comments, docs, commit messages,
  PR descriptions, changelog entries. Use a period, comma, colon, parentheses, or "and"/"or"
  instead. This is a standing preference, not a one-off request.
- Every public function, method, and exported frontend function/component gets a docstring
  (Python) or JSDoc block (JavaScript/JSX). See "Docstring convention" below for the exact shape.
  A one-line file header comment describing what the file contains goes at the top of every
  backend and frontend source file. Do not write comments inside a function body that just narrate
  what the next line does; only comment there when the reason is non-obvious (a workaround, an
  invariant, a constraint that would surprise a reader).
- Do not add abstractions, config flags, or generalized helpers for a single call site. Match the
  existing style in the file you are editing rather than introducing a new pattern.
- Do not add error handling for cases that cannot happen given Django/DRF's own guarantees.
  Validate at real boundaries (user input, external requests), not everywhere defensively.
- Keep the reusable `backend/formy` app decoupled from `backend/config`. It must keep working if
  copied into a different Django project with a different `AUTH_USER_MODEL`, so do not add
  imports from `config` into `formy`, and do not hardcode anything that assumes this specific
  deployment (domains, ports, `config.settings` values that are not passed through `settings.py`
  in a generic way).
- Business logic and validation belong in `backend/formy/services.py`, not in views. A view's job
  is to parse the request, call a service function, and translate whatever it raises into an HTTP
  response. Domain-rule violations (as opposed to plain field validation) get their own exception
  class in `backend/formy/exceptions.py`, following the existing ones there.
- Any new user-facing string (button label, heading, notice, error message) goes in
  `label-universe/labels.json`, never hardcoded inline. Add the key with all three languages
  (`en`, `es`, `zh`) at once, never just `en`. Frontend components read it through
  `useTranslation()` (`frontend/src/lib/i18n.jsx`); backend default messages read the English
  string through `LABELS` (`backend/formy/labels.py`). See `label-universe/README.md` for the key
  naming convention and what counts as UI copy versus user-authored content that stays out of it.
  The embeddable widget (`frontend/src/embed/main.js`) has no signed-in user, so it always reads
  the English string directly rather than going through `useTranslation()`.
- Both `Dockerfile`s build with the repository root as context (see `docker-compose.yml`), not
  their own directory, so they can copy in `label-universe/` alongside `backend/`/`frontend/`. If
  you edit either `Dockerfile`, keep each service nested under `/app/<service>` in the image so the
  relative path from source to `label-universe/` matches on disk and in the container; do not
  revert to a flat `/app` layout for one service without the other, or the label loader's relative
  path breaks.

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

## Docstring convention

Backend (Python), every public function and method:

```python
def get_user(conn, user_id):
    """
    One-line summary of what this does.
    :param user_id: what it is and any constraints
    :return: what is returned and its shape
    :errors: ExceptionClassA, ExceptionClassB (only if it can raise something a caller should
        expect and handle; omit this line entirely if it cannot)
    """
```

Exception classes follow the shape already in `backend/formy/exceptions.py`: a one-line class-level
purpose (when it is raised), plus a `:param message:` line on `__init__`.

Frontend (JavaScript/JSX), every exported function and component gets a JSDoc block directly above
it (`@param`, `@returns`); component props are documented as `@param {type} props.name`. Purely
internal one-off inline handlers (an `onClick` defined inline in JSX) do not need their own JSDoc,
but a named helper function does.

Every source file (backend and frontend) starts with:

```
# By: Md. Fahim Bin Amin
#
# This file contains ... (one or two lines describing what the file contains)
```

(`//` instead of `#` in JavaScript/JSX files.) Follow the exact pattern already used across
`backend/formy/*.py`, `backend/config/*.py`, and `frontend/src/**/*.{js,jsx}`.

## Testing conventions

- Backend tests live in `backend/formy/tests.py` using DRF's `APITestCase`. Follow the existing
  grouping by feature area (`ProfileTests`, `AvatarTests`, and so on) rather than one flat class.
- Any test touching `MEDIA_ROOT` (avatar uploads) must use
  `@override_settings(MEDIA_ROOT=tempfile.mkdtemp())` so it never writes into real media storage.
- Anything validating file uploads should assume Django's `ImageField` only checks the file
  extension, not the actual content. If you add another upload field, validate the decoded content
  (see `services.validate_avatar_upload` in `backend/formy/services.py` for the pattern) rather
  than trusting the extension or the client-supplied content type.

## Docs

`docs/` holds the long-form documentation (local setup, Docker setup, API reference, integration
guide). Update the relevant doc in the same change that changes the behavior it describes. Do not
let `README.md`, `backend/README.md`, `frontend/README.md`, and `docs/` drift out of sync; the root
`README.md` is meant to be a short index that links into `docs/`, not a second copy of the same
content.
