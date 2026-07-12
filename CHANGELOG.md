# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Releases are cut automatically. Moving an `Unreleased` entry into a new dated version section and
merging that change to `main` is what triggers the release workflow (see `.github/workflows/release.yml`).
It tags the commit, publishes a GitHub Release, and copies the section below into the release notes.
See `AGENTS.md` for the exact steps.

## [Unreleased]

## [0.4.0] - 2026-07-12

### Added

- Three new form field types: `multi_select` (checkbox group, stores an array of selected
  options), `phone` (country code plus number, `{country_code, number}`), and `file` (one or more
  real uploads, stored as `SubmissionAttachment` rows and referenced from the submission's data as
  an array of `attachment_id`/`filename` references). `label-universe/countries.json` supplies the
  `phone` field's country picker (ISO-3166 dial codes, `en`/`es`/`zh` names). `file` fields support
  an optional `accept` (allowed extensions) and `max_files` (default `1`) schema constraint, both
  editable from `SchemaEditor` and enforced server side.
- Attachment downloads: `GET /api/attachments/<id>/download/`, owner-only, linked from each
  submission's new `attachments` array and surfaced as download buttons on `SubmissionsPage`.
- Form banner image, header text, and footer text: `POST`/`DELETE /api/forms/<id>/banner/` for the
  banner (same Pillow-based validation as avatar uploads, via the new shared
  `services.validate_image_upload`), `header_text`/`footer_text` as plain writable `Form` fields.
  `BuilderPage` edits all three; the public form page renders them around the form itself.
- `PublicSubmitView` now accepts `multipart/form-data` (required whenever a form's schema has a
  `file` field) alongside the existing plain-JSON path.

### Changed

- Submission CSV/PDF export renders `multi_select`, `phone`, and `file` values as readable text
  (`FormViewSet._field_display_value`) instead of a raw Python dict/list representation.
- `SchemaEditor`'s options editor for `select`/`multi_select` fields is now an explicit per-option
  list with its own "Add option" button and a remove button per row, instead of one shared
  comma-separated text input.
- The `file` field now renders as a dashed drag-and-drop dropzone (click or drop to add, one row per
  attached file with its own remove button, matching the picker style Google Forms uses) instead of
  a bare browser file input, in both `FormRenderer` and the embed widget.

### Fixed

- The `phone` field's country-code select and number input no longer overflow a narrow preview
  or embed container; the row wraps instead.

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

[Unreleased]: https://github.com/FahimFBA/formy/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/FahimFBA/formy/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/FahimFBA/formy/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/FahimFBA/formy/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/FahimFBA/formy/releases/tag/v0.1.0
