# label-universe

A single source of truth for Formy's user-facing copy: button labels, headings, field
labels, notices, and error messages. Frontend reads from `labels.json` instead of
hardcoding the same string in more than one place, following the label-universe
pattern from the standard this project follows.

## Format

`labels.json` is a `key: { en, es, zh }` map, sorted alphabetically by key. Every key
has all three languages populated: English (`en`), Spanish (`es`), and Chinese (`zh`).
Keys are prefixed by what they are:

- `btn_`: button text
- `lbl_`: field/section label
- `title_`: heading text or a title/tooltip attribute
- `desc_`: longer descriptive text under a heading
- `msg_`: a status or confirmation message
- `err_`: an error message
- `nav_`: navigation text (header, links)
- `link_`: a text link that is not primary navigation
- `hint_`: small helper text under a field
- `opt_`: a select option's placeholder text

A value may contain a `{placeholder}` token (for example `msg_confirm_delete_form`
uses `{name}`); callers substitute it before rendering.

To add a fourth language, add its code to every key's object and to
`SUPPORTED_LANGUAGES` in `frontend/src/lib/i18n.jsx`; do this one key at a time so the
file is never left with a partially translated key.

## What does not belong here

User-authored content (a form's own name, field labels, submitted data) is not UI
copy and stays out of this file. Only strings that are part of Formy's own interface
belong here.

## Consumers

- `frontend/src/lib/i18n.jsx` imports `labels.json` and exposes a `LanguageProvider`
  plus a `useTranslation()` hook (`t(key, params)`, `language`, `setLanguage`). The
  active language comes from the signed-in user's `language` field (set on
  `ProfilePage`, defaults to `"en"` for new accounts) and is cached in
  `localStorage` so it applies immediately on the next page load, before the profile
  request resolves.
- Backend response text (`backend/formy/exceptions.py`, `views.py`, `serializers.py`)
  reads the English (`en`) string from this same file via `backend/formy/labels.py`,
  so the wording is defined once even though the API itself does not localize its
  error messages per request; only the frontend's own UI text is localized today.

Both Docker images copy this folder in alongside `backend/` and `frontend/`; see the
root `docker-compose.yml` and each service's `Dockerfile` for how the build context
was widened to include it.
