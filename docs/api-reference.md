# API Reference

Base URL: `/api/` (e.g. `http://localhost:8000/api/` locally, `http://localhost:8080/api/` through
the Docker/nginx stack). Built on Django REST Framework, JSON in and out unless noted.

Authenticated endpoints use token auth. Send the token from registration or login as:

```
Authorization: Token <api-token>
```

## Auth

### `POST /api/auth/register/`

Create a user and return a token. No authentication required.

Request:

```json
{ "username": "alice", "password": "a-strong-password", "email": "alice@example.com" }
```

`email` is optional. Response `201`:

```json
{ "token": "9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b" }
```

`400` if `username`/`password` are missing, or the username is already taken.

### `POST /api/auth/token/`

Log in an existing user, DRF's built-in `obtain_auth_token`.

Request: `{ "username": "alice", "password": "a-strong-password" }`. Response `200`:
`{ "token": "..." }`.

### `GET /api/auth/profile/`

Authenticated. Returns the current user's profile.

```json
{
  "username": "alice",
  "first_name": "",
  "last_name": "",
  "email": "alice@example.com",
  "avatar_url": null,
  "language": "en"
}
```

`avatar_url` is an absolute URL to the uploaded avatar, or `null` if none has been set. `language`
is the account's UI language preference, one of `en` (default), `es`, or `zh`; see
`label-universe/README.md` for how the frontend uses it.

### `PATCH /api/auth/profile/`

Authenticated. Update any of `username`, `first_name`, `last_name`, `email`, `language`. Send only
the fields you want to change. Returns the same shape as `GET`. `400` with
`{"language": "Unsupported language."}` if `language` is not `en`, `es`, or `zh`.

### `POST /api/auth/profile/avatar/`

Authenticated, multipart form data with a single file field named `avatar`. Maximum 5 MB, and must
decode as a real image (validated by opening it with Pillow, not just by file extension or the
client-supplied content type). Returns the updated profile (same shape as `GET /profile/`), with a
fresh `avatar_url`.

```bash
curl -X POST http://localhost:8000/api/auth/profile/avatar/ \
  -H "Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b" \
  -F "avatar=@./photo.jpg"
```

`400` if the file is missing, too large, or not a decodable image.

### `DELETE /api/auth/profile/avatar/`

Authenticated. Removes the current avatar, if any. Returns the updated profile.

### `POST /api/auth/change-password/`

Authenticated.

```json
{ "old_password": "current-password", "new_password": "a-new-strong-password" }
```

`new_password` is checked against Django's configured password validators (minimum length, not
too similar to the username, not a common password, not entirely numeric). `400` if
`old_password` is wrong or `new_password` fails validation.

## Forms (authenticated, scoped to the requesting user's own forms)

All of these require `Authorization: Token <api-token>` and only ever see/affect forms owned by
that token's user.

### `GET /api/forms/`

Paginated list (`?page=N`, 20 per page). Response shape:

```json
{ "count": 1, "next": null, "previous": null, "results": [ { "...": "a form object" } ] }
```

Form object:

```json
{
  "id": "b6b2b8b2-6a8a-4b7e-9a9b-6f6b3a7e5f0a",
  "name": "Contact",
  "slug": "contact",
  "description": "",
  "status": "draft",
  "schema": { "fields": [] },
  "schema_version": 1,
  "success_message": "Thanks. Your response was submitted.",
  "banner_image_url": null,
  "header_text": "",
  "footer_text": "",
  "created_at": "2026-07-10T12:00:00Z",
  "updated_at": "2026-07-10T12:00:00Z"
}
```

`status` is one of `draft`, `published`, `archived`. Only `published` forms are reachable through
the public endpoints below. `schema_version`, `banner_image_url`, `created_at`, `updated_at`, and
`id` are read only. `banner_image_url` is set/cleared through `POST`/`DELETE
/api/forms/<id>/banner/` below, not through this object directly. `header_text` (optional heading
shown above the form on the public page) and `footer_text` (optional text shown below the submit
button) are plain writable fields.

### `POST /api/forms/`

Create a form. Send `name`, `slug`, `schema`, and optionally `description`, `status`,
`success_message`, `header_text`, `footer_text`. `schema` is validated server side, see "Form
schema" below.

### `GET /api/forms/<id>/`

Retrieve a single form you own.

### `PATCH /api/forms/<id>/`

Update any writable field. `schema_version` auto-increments the moment `schema` actually changes,
so existing submissions keep recording the schema version that was live when they were submitted,
even after you edit the form's fields later.

### `DELETE /api/forms/<id>/`

Delete a form and cascade-delete all of its submissions. Not reversible.

### `POST /api/forms/<id>/banner/`

Authenticated, multipart form data with a single file field named `banner`. Maximum 5 MB, and must
decode as a real image (same Pillow-based validation as avatar uploads). Returns the updated form
(same shape as `GET /forms/<id>/`), with a fresh `banner_image_url`. `400` if the file is missing,
too large, or not a decodable image.

### `DELETE /api/forms/<id>/banner/`

Authenticated. Removes the current banner image, if any. Returns the updated form.

### `GET /api/forms/<id>/submissions/`

Paginated list of that form's submissions, same pagination shape as the forms list. Submission
object:

```json
{
  "id": "1d2c3b4a-...",
  "data": { "email": "someone@example.com" },
  "metadata": { "ip": "203.0.113.7", "user_agent": "Mozilla/5.0 ..." },
  "schema_version": 1,
  "submitted_at": "2026-07-10T12:05:00Z",
  "attachments": [
    {
      "id": "8f0a...",
      "field_name": "resume",
      "filename": "resume.pdf",
      "content_type": "application/pdf",
      "size": 48213,
      "url": "http://localhost:8000/api/attachments/8f0a.../download/"
    }
  ]
}
```

`attachments` lists any files uploaded against this submission's `"file"`-type fields (see "Form
schema" below); it is empty if the form's schema has none. Each attachment's `url` is the
owner-only download endpoint below, not a direct media URL.

### `GET /api/attachments/<id>/download/`

Authenticated. Downloads one submission attachment. Only the owner of the attachment's form may
download it; anyone else (including other authenticated users) gets `404`.

### `GET /api/forms/<id>/export/`

Export submissions. Controlled by `?export_format=`, not DRF's own `?format=` (that query param
name is reserved by DRF's content negotiation and returns a `404` for unknown values like `csv` or
`pdf`).

- `?export_format=csv` (default): CSV download, one column per form field plus `submitted_at`
  (ISO 8601) and `schema_version`.
- `?export_format=json`: the same submission objects as `GET .../submissions/`, but as a single
  non-paginated array.
- `?export_format=pdf`: a formatted PDF table. Timestamps are rendered in the server's local time
  as `Jul 10, 2026 03:05 PM` rather than ISO 8601, since this format is meant for humans to read
  directly rather than for another program to parse. Wide forms (more than 4 columns) render in
  landscape.

## Public endpoints (no authentication, published forms only)

### `GET /api/public/forms/<slug>/`

Returns the form's schema for rendering:

```json
{
  "id": "b6b2b8b2-...",
  "name": "Contact",
  "slug": "contact",
  "description": "",
  "schema": { "fields": [ { "name": "email", "label": "Email", "type": "email", "required": true } ] },
  "success_message": "Thanks. Your response was submitted.",
  "banner_image_url": null,
  "header_text": "",
  "footer_text": ""
}
```

`404` if the slug does not exist or the form is not `published`.

### `POST /api/public/forms/<slug>/submit/`

Plain JSON, for schemas with no `"file"` field:

```json
{ "data": { "email": "someone@example.com" } }
```

If the schema has a `"file"` field, send `multipart/form-data` instead: a `data` field holding the
same object as a JSON-encoded string, plus one file part per `"file"` field, named after that
field's `name`:

```bash
curl -X POST http://localhost:8000/api/public/forms/jobs/submit/ \
  -F 'data={"email":"someone@example.com"}' \
  -F "resume=@./resume.pdf"
```

Response `201`: `{ "id": "<submission-id>", "message": "<form.success_message>" }`.

Two protections apply to this endpoint:

- **Honeypot.** Include a `hp_url` key alongside `data` (both the React renderer and the
  embeddable widget already add this automatically as a visually hidden field). If it is
  non-empty, the request still returns `201` with a `message`, but nothing is written to the
  database, and `id` in the response is `null`. This is meant to look identical to a real success
  to whatever submitted it.
- **Rate limiting.** Throttled per form and IP address together, so one spammy IP cannot exhaust
  the limit for every form, and one popular form cannot exhaust the limit for every visitor. The
  rate is `FORMY_SUBMISSION_THROTTLE_RATE` (default `30/hour`, DRF format, e.g. `10/min`,
  `100/day`). This only counts correctly across multiple gunicorn workers if `REDIS_URL` is set;
  see `docs/local-development.md`.

`400` if a required field is missing, or the payload otherwise fails the form's schema.

## Form schema

`schema` on a `Form` is a small JSON document:

```json
{
  "fields": [
    {
      "name": "email",
      "label": "Email",
      "type": "email",
      "required": true,
      "placeholder": "jane@example.com"
    }
  ]
}
```

- `name`: unique within the form, used as the key in submitted `data`.
- `label`: shown to the person filling out the form.
- `type`: one of `text`, `textarea`, `email`, `number`, `select`, `checkbox`, `date`,
  `multi_select`, `phone`, `file`.
- `required`: optional, defaults to `false`.
- `select` and `multi_select` fields additionally require a non-empty `options` array.
- `file` fields optionally take `accept` (a comma-separated list of allowed extensions, for example
  `".pdf,.docx"`; no restriction if omitted) and `max_files` (a positive integer, default `1`,
  allowing more than one upload against the same field).

Submitting or saving a schema that violates any of the above returns a `400` with a descriptive
message (see `validate_form_schema` in `backend/formy/models.py` for the exact rules).

The three added types store a different shape in submitted `data` than a plain string:

- `multi_select`: an array of the selected options, for example `["Product", "Support"]`. Required
  means "at least one option selected".
- `phone`: an object `{ "country_code": "+880", "number": "1712345678" }`. `country_code` is a
  dial code (see `label-universe/countries.json` for the list the frontend offers); required means
  `number` must be non-empty, `country_code` may be blank.
- `file`: not sent inline in `data`. Upload it as one or more real files over
  `multipart/form-data` (see `POST /api/public/forms/<slug>/submit/` above, repeat the same file
  part name for more than one file up to `max_files`); the server replaces it with an array of
  references, `[{ "attachment_id": "...", "filename": "resume.pdf" }]`, and each attachment's
  bytes are downloadable through `GET /api/attachments/<id>/download/`. Required means at least one
  file must be attached. Uploading more files than `max_files` allows, or a file whose extension is
  not in `accept`, returns a `400`.
