# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Releases are cut automatically. Moving an `Unreleased` entry into a new dated version section and
merging that change to `main` is what triggers the release workflow (see `.github/workflows/release.yml`).
It tags the commit, publishes a GitHub Release, and copies the section below into the release notes.
See `AGENTS.md` for the exact steps.

## [Unreleased]

## [0.3.0] - 2026-07-10

### Added

- `label-universe/`: a shared UI copy registry (`labels.json`) read by both the backend
  (`backend/formy/labels.py`) and frontend (`frontend/src/lib/i18n.jsx`), so button labels,
  headings, notices, and error messages are defined once instead of hardcoded per file.
- Frontend localization into English, Spanish, and Chinese. `UserProfile.language` (default `en`)
  stores each account's preference, editable from `/profile` and read/written through
  `GET`/`PATCH /api/auth/profile/`. `LanguageProvider`/`useTranslation()` apply it across every
  authenticated page; `Layout` syncs it from the fetched profile, and it is cached in
  `localStorage` so it applies before that request resolves.

### Changed

- Both `Dockerfile`s now build with the repository root as their context instead of their own
  directory, so they can copy `label-universe/` in alongside `backend/`/`frontend/`; each nests its
  service under `/app/<service>` in the image to keep the same relative path to `label-universe/`
  that exists on disk. See the new `Dockerfile.dockerignore` files and `docker-compose.yml`.

## [0.2.0] - 2026-07-10

### Added

- `backend/formy/exceptions.py`: domain exception layer (`FormNotAcceptingSubmissions`,
  `MissingCredentials`, `UsernameAlreadyTaken`, `AvatarTooLarge`, `InvalidAvatarFile`) separating
  business-rule violations from plain field validation.
- `services.register_user` and `services.validate_avatar_upload`, moving registration and avatar
  validation out of views and into the service layer alongside `create_submission`.

### Changed

- Views now only parse requests, call a service function, and translate whatever it raises into an
  HTTP response; `RegisterView` and `AvatarUploadView` no longer contain business logic directly.
- Added docstrings (Python, `:param`/`:return`/`:errors`) and JSDoc (`@param`/`@returns`) to every
  public function, method, and exported frontend function/component, plus a file header comment on
  every backend and frontend source file. See `AGENTS.md` for the exact convention.

## [0.1.0] - 2026-07-10

### Added

- Form builder with a drag-and-drop schema editor supporting text, textarea, email, number, select,
  checkbox, and date fields.
- Public, unauthenticated form rendering and submission by slug (`/f/:slug`), with honeypot spam
  protection and per-form-per-IP submission rate limiting.
- Authenticated form management API (create, update, delete, list) scoped to each user's own forms.
- Schema versioning: editing a published form's fields does not retroactively change how already
  collected submissions are interpreted.
- Submission export as CSV, JSON, or a formatted PDF (human-readable timestamps, wrapped columns,
  landscape layout for wide forms).
- Token-based authentication with registration, login, profile view/update, password change, and
  profile avatar upload/removal (validated as a real image, not just by file extension).
- Dashboard pagination and a confirmation modal before destructive actions such as deleting a form.
- Framework-agnostic embeddable widget (`formy-embed.js`) for mounting a single published form on
  any page without shipping React.
- Docker Compose stack (Postgres, Redis, Django API, nginx-served React app) for a production-like
  local environment.
- CI on every pull request: Python lint (ruff), Django test suite, JS lint (eslint), and frontend
  build checks.

[Unreleased]: https://github.com/FahimFBA/formy/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/FahimFBA/formy/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/FahimFBA/formy/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/FahimFBA/formy/releases/tag/v0.1.0
