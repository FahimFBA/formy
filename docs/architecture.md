# Architecture

Formy is split into a reusable Django app and a standalone React client. See `docs/api-reference.md`
for the full endpoint list, `docs/local-development.md` and `docs/docker-deployment.md` for how to
run it, and `docs/integration-guide.md` for the three ways to embed or reuse it elsewhere.

## Backend

The `backend/formy` package owns the domain model:

- `Form` stores the portable JSON schema, publication state, and an `owner` (nullable FK to
  `AUTH_USER_MODEL`, so the app works whether or not the host project assigns owners).
- `FormSubmission` stores normalized submission payloads and the schema version that was live when
  the submission was made.
- `UserProfile` stores per-user extras that do not belong on `AUTH_USER_MODEL` itself, currently
  just an optional `avatar` image.
- `services.py` keeps write behavior (validation, submission creation) out of views so it can be
  reused by other Django projects or management commands.
- `serializers.py` / `permissions.py` / `views.py` expose a Django REST Framework API:
  - `FormViewSet`: authenticated CRUD, scoped to `request.user`'s own forms, plus `submissions`
    (paginated list) and `export` (CSV, JSON, or a formatted PDF) actions.
  - `PublicFormDetailView` / `PublicSubmitView`: anonymous read/submit by slug, published forms
    only. Submission is honeypot-protected (`constants.HONEYPOT_FIELD`, silently dropped if
    filled) and throttled per form and IP (`throttling.SubmissionRateThrottle`, rate configurable
    via `FORMY_SUBMISSION_THROTTLE_RATE`).
  - `RegisterView` + DRF's `obtain_auth_token`: token issuance so the API is usable standalone.
  - `ProfileView`, `ChangePasswordView`, `AvatarUploadView`: a user managing their own account.
    Avatar uploads are validated by actually decoding the file with Pillow, not just checking the
    extension or the client-supplied content type, since Django's `ImageField.full_clean()` alone
    only checks the extension.
- `Form.schema_version` auto-increments (in `Form.save()`) whenever `schema` actually changes.
  `FormSubmission.schema_version` records which version was live at submit time, so editing a
  form's fields later does not retroactively change how old submissions are interpreted.

The `backend/config` package is deployment glue (settings, URL root, media/static file serving,
Dockerfile, gunicorn/whitenoise wiring). It stays thin and is not imported from `formy`, so the
reusable app remains portable: copy that one directory into another Django project, register it in
`INSTALLED_APPS` plus urls, and it works with that project's own user model and auth. See
`docs/integration-guide.md` for the exact steps.

## Frontend

The `frontend/src` app is schema-driven and router-based:

- `SchemaEditor` edits the schema, with drag-and-drop field reordering.
- `FormRenderer` renders any supported schema (used both in the builder preview and the public
  page).
- `api/client.js` centralizes fetch, token attachment, error unwrapping, and a separate multipart
  helper for file uploads.
- `api/auth.js` / `api/forms.js` isolate backend communication (auth, profile, CRUD, public
  read/submit).
- Pages: `LoginPage`, `DashboardPage` (list/create/delete forms, paginated, delete asks for
  confirmation through `ConfirmDialog` rather than the browser's native `confirm()`), `BuilderPage`
  (edit schema plus metadata, drag-and-drop field reordering, live preview), `SubmissionsPage`
  (with CSV/JSON/PDF export), `ProfilePage` (account details, password change, avatar upload),
  `PublicFormPage` (`/f/:slug`, anonymous).
- `components/ConfirmDialog.jsx` is a small reusable modal (backdrop click, Escape key, and a
  Cancel button all dismiss it) used anywhere a destructive action needs confirmation, currently
  form deletion.
- `components/Layout.jsx` renders the current user's avatar (from `GET /api/auth/profile/`) in the
  header when logged in, falling back to a placeholder icon if no avatar is set.

`FormRenderer` stays reusable on its own (embedded widgets or a future standalone package), since it
only depends on a schema plus values/callbacks, not on routing or auth state. Both it and the
standalone embed widget (below) share the same honeypot field name from `lib/constants.js`.

### Embeddable widget

`src/embed/main.js` is a separate, dependency-free vanilla-JS entry point (its own
`vite.embed.config.js` build, `npm run build:embed`) that mounts and submits a single published
form into any HTML page via `<div data-formy-form="slug">` plus a `<script>` tag, no React runtime
shipped. See `docs/integration-guide.md` for the embed snippet and CORS requirements.

## Deployment

`docker-compose.yml` runs Postgres, Redis, the Django API (gunicorn plus whitenoise for static
files, with a dedicated volume for user-uploaded media), and the built React app served by nginx,
which proxies `/api/` and `/media/` to the backend so the two run same-origin (no CORS needed on
that path) and forward the original `Host` header (including port) so absolute URLs the backend
generates, such as avatar URLs, resolve correctly through the proxy. Redis backs Django's cache so
the submission-rate throttle counts correctly across gunicorn's multiple worker processes, a
single-process `LocMemCache` would let each worker under-count independently.
`.github/workflows/ci.yml` runs Python lint, backend tests, JS lint, and frontend build on every
pull request. `.github/workflows/release.yml` tags and publishes a GitHub release automatically
whenever `CHANGELOG.md` gains a new dated version section on `main`; see `AGENTS.md` for the exact
release steps.

## Status

The original scaling-path items (rate limiting, honeypot spam protection, submission export in
three formats, schema versioning, drag-and-drop field ordering, an embeddable script bundle, user
profile management with avatars, dashboard pagination, confirmation prompts before destructive
actions) are all implemented, see above. Anything past this point is an infrastructure or product
choice rather than a gap: for example swapping the single non-expiring API token for refresh
tokens, CAPTCHA instead of or alongside the honeypot, or streaming export for very large submission
counts.
