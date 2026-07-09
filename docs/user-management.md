# Managing Users

Formy authenticates with DRF token auth on top of Django's own user model (whatever
`AUTH_USER_MODEL` the host project uses; the standalone project in this repo uses Django's default
`auth.User`). There is no built-in admin UI for managing other users beyond the Django admin site
itself, only self-service endpoints for a user's own account.

## Creating a superuser (admin access)

A superuser can log into `/admin/` and manage every `Form`, `FormSubmission`, and Django `User` in
the database, including other people's forms. This is an administrative account, not a "regular"
app user.

Local (no Docker):

```powershell
cd backend
python manage.py createsuperuser
```

Docker:

```powershell
docker compose exec backend python manage.py createsuperuser
```

Either way you are prompted for a username, optional email, and password. Log in at `/admin/`
(`http://localhost:8000/admin/` locally, `http://localhost:8080/admin/` through the Docker/nginx
stack).

## Creating a regular user

Regular users own their own forms and submissions and cannot see anyone else's. There is no
invitation flow. Any of the following work and are equivalent, since the frontend's login page and
the widget's registration both call the same endpoint:

**Through the frontend:** open `/login`, switch to the registration tab, submit username, email,
password.

**Through the API directly:**

```powershell
curl -X POST http://localhost:8000/api/auth/register/ `
  -H "Content-Type: application/json" `
  -d '{\"username\":\"alice\",\"password\":\"a-strong-password\",\"email\":\"alice@example.com\"}'
```

Response: `{"token": "<api-token>"}`. Store that token and send it as `Authorization: Token
<api-token>` on every authenticated request afterward (see `docs/api-reference.md`).

**Through the Django shell,** if you specifically need to script user creation (bulk import, a
seed script, and so on):

```powershell
docker compose exec backend python manage.py shell
```

```python
from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token

User = get_user_model()
user = User.objects.create_user(username="alice", email="alice@example.com", password="a-strong-password")
token, _ = Token.objects.get_or_create(user=user)
print(token.key)
```

## Updating a user's own profile

Once a user has a token, they can view or change their own `username`, `first_name`, `last_name`,
`email`, and avatar through `GET`/`PATCH /api/auth/profile/` and `POST`/`DELETE
/api/auth/profile/avatar/`, and change their password through `POST
/api/auth/change-password/`. This is exactly what the frontend's `/profile` page does. Full request
and response shapes are in `docs/api-reference.md`.

There is no endpoint for one user to edit another user's profile. That is an admin-site operation
(`/admin/auth/user/<id>/change/`), same as any other Django project.

## Resetting a forgotten password (admin operation)

There is no "forgot password" email flow. An administrator resets a user's password either from the
Django admin's user change form, or from the shell:

```powershell
docker compose exec backend python manage.py changepassword alice
```

## Deleting a user

Delete the `User` row from the Django admin (`/admin/auth/user/`) or the shell
(`user.delete()`). Deleting a user cascades to their `Form`s (see `owner` on `Form` in
`backend/formy/models.py`), which in turn cascades to that form's `FormSubmission`s. There is no
soft delete or undo; confirm you actually want to remove that user's forms and submissions before
doing this in a production environment.
