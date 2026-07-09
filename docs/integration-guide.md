# Integrating Formy Into an Existing Application

There are three ways to use Formy, from least to most invasive. Pick based on how much you want
to own versus reuse.

## 1. Drop the embeddable widget into any existing website

Use this when you already have a website (any stack, or none) and just want a single form on a
page, backed by a Formy instance running somewhere. No React, no build step on the host site.

Build the widget once from this repo:

```powershell
cd frontend
npm run build:embed
```

This outputs `dist-embed/formy-embed.js` (about 5 kB). Host that one file (static hosting, a CDN,
or Django's own `staticfiles` if you are also self-hosting the API), and add this to any page:

```html
<div data-formy-form="contact" data-formy-api="https://your-domain.com/api"></div>
<script src="https://your-domain.com/static/formy-embed.js"></script>
```

- `data-formy-form`: the slug of an already-published form.
- `data-formy-api`: the Formy backend's `/api` base URL. Falls back to `window.FORMY_API_BASE`,
  then `http://localhost:8000/api`, so set one of those if you have multiple forms on one page and
  do not want to repeat the attribute.

Multiple `[data-formy-form]` containers on the same page each mount independently. The widget
includes the same honeypot field as the React renderer, so spam protection works the same way as
described in `docs/api-reference.md`.

The Formy backend needs `DJANGO_CORS_ALLOWED_ORIGINS` to include the origin the widget is served
from, since this path is a genuine cross-origin request (the widget's page is not served by the
Formy frontend/nginx). See `backend/config/middleware.py` for how that is enforced.

## 2. Call the Formy API from your own frontend

Use this when you have (or are building) your own frontend and want full control over the UI, but
do not want to write the form backend yourself.

Run the Formy backend (locally per `docs/local-development.md`, or via Docker per
`docs/docker-deployment.md`, or deployed anywhere that can run a Django app), then call the REST
API documented in `docs/api-reference.md` directly:

1. Register or log in a user (`POST /api/auth/register/` or `POST /api/auth/token/`) to get a
   token, or let your own application layer manage that if it already has its own login.
2. Create and publish forms through `POST /api/forms/` and `PATCH /api/forms/<id>/`
   (`status: "published"`).
3. Render the public schema from `GET /api/public/forms/<slug>/` in your own UI, however you like.
4. Submit with `POST /api/public/forms/<slug>/submit/`.

Set `DJANGO_CORS_ALLOWED_ORIGINS` and `DJANGO_CSRF_TRUSTED_ORIGINS` to your frontend's origin if it
is not served from the same origin as the Formy backend.

`frontend/src/components/FormRenderer.jsx` is a working reference for how to turn the schema JSON
into an actual form if you want a starting point rather than writing a renderer from scratch; it
only depends on a schema plus values/callbacks, not on routing or auth state, so it is reusable
outside this repo's own router.

## 3. Vendor the `formy` Django app into your own Django project

Use this when you already have a Django project and want forms to be first-class models in your
own database and admin, rather than talking to a separate service.

`backend/formy` is written to be portable: copy that one directory into your project (or vendor it
as a local package), then:

```python
INSTALLED_APPS = [
    ...
    "rest_framework",
    "rest_framework.authtoken",
    "formy",
]

urlpatterns = [
    ...
    path("api/", include("formy.urls")),
]
```

```powershell
python manage.py migrate
```

That is the entire integration. `formy` depends only on `djangorestframework` and Django's built-in
auth, nothing from this repo's `backend/config` (which is deployment glue, not part of the reusable
app, and stays out of `formy` on purpose, see `AGENTS.md`). Forms are owned by whatever
`AUTH_USER_MODEL` your project already uses; anyone you authenticate manages their own forms
through the API, and published forms are readable/submittable anonymously by slug exactly as
described in `docs/api-reference.md`.

If your project needs the rate limiter to count correctly across multiple worker processes, point
`REDIS_URL` (or your own `CACHES["default"]`) at a shared cache, same as this repo's own
`backend/config/settings.py` does.

You are not required to use this repo's frontend at all with this option. Build your own admin UI
against the same `formy` models and API, or use the Django admin (`FormAdmin`,
`FormSubmissionAdmin` in `backend/formy/admin.py`) as-is.
