# Formy Frontend

React, Vite, and Tailwind power the form builder and preview UI.

## Development

```powershell
npm install
npm run dev
```

Set `VITE_API_BASE_URL` when the backend is not running at `http://localhost:8000/api`.

Routes:

- `/login`: log in or register; stores an API token in `localStorage`.
- `/dashboard`: list, create, and delete your forms, paginated.
- `/builder/:id`: edit a form's metadata/schema with a live preview.
- `/builder/:id/submissions`: view and export submissions for a form.
- `/profile`: update account details, password, and avatar.
- `/f/:slug`: public, unauthenticated render and submit page for a published form.

## Production

```powershell
npm run build
```

Deploy the generated `dist` directory to your static hosting provider. Configure the backend's CORS
and CSRF origin settings for the deployed frontend domain.

## Embeddable widget

A framework-agnostic vanilla-JS bundle renders and submits a single published form on any page, no
React and no build step required on the host site. See `docs/integration-guide.md` at the
repository root for the full embed guide; the short version:

```powershell
npm run build:embed
```

Outputs `dist-embed/formy-embed.js` (about 5 kB). Host that file (static hosting, a CDN, or
Django's `staticfiles`) and drop this on any page:

```html
<div data-formy-form="contact" data-formy-api="https://your-domain.com/api"></div>
<script src="https://your-domain.com/static/formy-embed.js"></script>
```

- `data-formy-form`: the published form's slug.
- `data-formy-api`: the backend's `/api` base URL (falls back to `window.FORMY_API_BASE`, then
  `http://localhost:8000/api`).

Multiple `[data-formy-form]` containers on the same page are all mounted independently. The widget
includes the same honeypot spam-trap field as the React renderer.

