# By: Md. Fahim Bin Amin

# This file contains the backend test suite: submission creation/validation rules,
# auth/registration, profile and password management, avatar upload validation, form
# ownership scoping, schema versioning, submission export, honeypot handling, and the
# public submission rate throttle.

import tempfile

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from .constants import HONEYPOT_FIELD
from .exceptions import FormNotAcceptingSubmissions
from .models import Form, FormSubmission
from .services import create_submission
from .throttling import SubmissionRateThrottle

User = get_user_model()

CONTACT_SCHEMA = {"fields": [{"name": "email", "label": "Email", "type": "email", "required": True}]}

ONE_PIXEL_GIF = (
    b"GIF89a\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xff\xff\xff!\xf9\x04\x01\x00\x00\x00\x00,"
    b"\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;"
)


class FormSubmissionTests(TestCase):
    def test_required_field_is_enforced(self):
        form = Form.objects.create(
            name="Contact",
            slug="contact",
            status=Form.Status.PUBLISHED,
            schema=CONTACT_SCHEMA,
        )

        with self.assertRaises(ValidationError):
            create_submission(form=form, data={})

    def test_published_form_accepts_valid_submission(self):
        form = Form.objects.create(
            name="Contact",
            slug="contact",
            status=Form.Status.PUBLISHED,
            schema=CONTACT_SCHEMA,
        )

        submission = create_submission(form=form, data={"email": "hello@example.com"})

        self.assertEqual(submission.data["email"], "hello@example.com")

    def test_unpublished_form_rejects_submission(self):
        form = Form.objects.create(name="Draft", slug="draft", schema=CONTACT_SCHEMA)

        with self.assertRaises(FormNotAcceptingSubmissions):
            create_submission(form=form, data={"email": "hello@example.com"})


class AuthTests(APITestCase):
    def test_register_creates_user_and_returns_token(self):
        response = self.client.post(
            "/api/auth/register/",
            {"username": "alice", "password": "s3cret-pass", "email": "alice@example.com"},
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("token", response.json())
        self.assertTrue(User.objects.filter(username="alice").exists())

    def test_register_rejects_duplicate_username(self):
        User.objects.create_user(username="alice", password="s3cret-pass")

        response = self.client.post("/api/auth/register/", {"username": "alice", "password": "another-pass"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_token_login_returns_token_for_valid_credentials(self):
        User.objects.create_user(username="alice", password="s3cret-pass")

        response = self.client.post("/api/auth/token/", {"username": "alice", "password": "s3cret-pass"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("token", response.json())


class ProfileTests(APITestCase):
    def setUp(self):
        self.alice = User.objects.create_user(username="alice", password="s3cret-pass", email="alice@example.com")

    def test_requires_authentication(self):
        response = self.client.get("/api/auth/profile/")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_can_view_own_profile(self):
        self.client.force_authenticate(self.alice)

        response = self.client.get("/api/auth/profile/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["username"], "alice")

    def test_default_language_is_english(self):
        self.client.force_authenticate(self.alice)

        response = self.client.get("/api/auth/profile/")

        self.assertEqual(response.json()["language"], "en")

    def test_can_update_language(self):
        self.client.force_authenticate(self.alice)

        response = self.client.patch("/api/auth/profile/", {"language": "zh"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["language"], "zh")
        self.alice.profile.refresh_from_db()
        self.assertEqual(self.alice.profile.language, "zh")

    def test_rejects_unsupported_language(self):
        self.client.force_authenticate(self.alice)

        response = self.client.patch("/api/auth/profile/", {"language": "fr"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_can_update_profile_fields(self):
        self.client.force_authenticate(self.alice)

        response = self.client.patch(
            "/api/auth/profile/",
            {"first_name": "Alice", "last_name": "Smith", "email": "alice2@example.com"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.alice.refresh_from_db()
        self.assertEqual(self.alice.first_name, "Alice")
        self.assertEqual(self.alice.email, "alice2@example.com")

    def test_cannot_change_username_to_one_already_taken(self):
        User.objects.create_user(username="bob", password="s3cret-pass")
        self.client.force_authenticate(self.alice)

        response = self.client.patch("/api/auth/profile/", {"username": "bob"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_can_change_password(self):
        self.client.force_authenticate(self.alice)

        response = self.client.post(
            "/api/auth/change-password/",
            {"old_password": "s3cret-pass", "new_password": "n3w-s3cret-pass"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.alice.refresh_from_db()
        self.assertTrue(self.alice.check_password("n3w-s3cret-pass"))

    def test_change_password_rejects_wrong_old_password(self):
        self.client.force_authenticate(self.alice)

        response = self.client.post(
            "/api/auth/change-password/",
            {"old_password": "wrong-pass", "new_password": "n3w-s3cret-pass"},
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_change_password_rejects_weak_password(self):
        self.client.force_authenticate(self.alice)

        response = self.client.post(
            "/api/auth/change-password/",
            {"old_password": "s3cret-pass", "new_password": "12345"},
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class AvatarTests(APITestCase):
    def setUp(self):
        self.alice = User.objects.create_user(username="alice", password="s3cret-pass")

    def test_requires_authentication(self):
        response = self.client.post("/api/auth/profile/avatar/")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_can_upload_avatar(self):
        self.client.force_authenticate(self.alice)
        avatar = SimpleUploadedFile("avatar.gif", ONE_PIXEL_GIF, content_type="image/gif")

        response = self.client.post("/api/auth/profile/avatar/", {"avatar": avatar}, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(response.json()["avatar_url"])

    def test_rejects_non_image_file(self):
        self.client.force_authenticate(self.alice)
        bogus = SimpleUploadedFile("avatar.gif", b"not an image", content_type="image/gif")

        response = self.client.post("/api/auth/profile/avatar/", {"avatar": bogus}, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_oversized_file(self):
        self.client.force_authenticate(self.alice)
        oversized = SimpleUploadedFile(
            "avatar.gif", ONE_PIXEL_GIF + bytes(5 * 1024 * 1024), content_type="image/gif"
        )

        response = self.client.post("/api/auth/profile/avatar/", {"avatar": oversized}, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_can_delete_avatar(self):
        self.client.force_authenticate(self.alice)
        avatar = SimpleUploadedFile("avatar.gif", ONE_PIXEL_GIF, content_type="image/gif")
        self.client.post("/api/auth/profile/avatar/", {"avatar": avatar}, format="multipart")

        response = self.client.delete("/api/auth/profile/avatar/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.json()["avatar_url"])


class FormApiOwnershipTests(APITestCase):
    def setUp(self):
        self.alice = User.objects.create_user(username="alice", password="s3cret-pass")
        self.bob = User.objects.create_user(username="bob", password="s3cret-pass")
        self.alice_form = Form.objects.create(
            owner=self.alice,
            name="Alice Form",
            slug="alice-form",
            status=Form.Status.PUBLISHED,
            schema=CONTACT_SCHEMA,
        )

    def test_anonymous_cannot_list_forms(self):
        response = self.client.get("/api/forms/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_owner_sees_only_their_forms(self):
        self.client.force_authenticate(self.alice)

        response = self.client.get("/api/forms/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.json()["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["slug"], "alice-form")

    def test_other_user_cannot_see_or_edit_someone_elses_form(self):
        self.client.force_authenticate(self.bob)

        detail = self.client.get(f"/api/forms/{self.alice_form.id}/")
        self.assertEqual(detail.status_code, status.HTTP_404_NOT_FOUND)

        update = self.client.patch(f"/api/forms/{self.alice_form.id}/", {"name": "Hijacked"})
        self.assertEqual(update.status_code, status.HTTP_404_NOT_FOUND)

    def test_authenticated_user_can_create_form(self):
        self.client.force_authenticate(self.alice)

        response = self.client.post(
            "/api/forms/",
            {"name": "New Form", "slug": "new-form", "schema": CONTACT_SCHEMA},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created = Form.objects.get(slug="new-form")
        self.assertEqual(created.owner, self.alice)

    def test_create_rejects_invalid_schema(self):
        self.client.force_authenticate(self.alice)

        response = self.client.post(
            "/api/forms/",
            {"name": "Bad", "slug": "bad-form", "schema": {"fields": [{"name": "x"}]}},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_owner_can_list_submissions_for_their_form(self):
        create_submission(form=self.alice_form, data={"email": "hello@example.com"})
        self.client.force_authenticate(self.alice)

        response = self.client.get(f"/api/forms/{self.alice_form.id}/submissions/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()["results"]), 1)


class PublicFormApiTests(APITestCase):
    def test_public_can_fetch_published_form_by_slug(self):
        Form.objects.create(name="Contact", slug="contact", status=Form.Status.PUBLISHED, schema=CONTACT_SCHEMA)

        response = self.client.get("/api/public/forms/contact/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["slug"], "contact")

    def test_public_cannot_fetch_draft_form(self):
        Form.objects.create(name="Draft", slug="draft", schema=CONTACT_SCHEMA)

        response = self.client.get("/api/public/forms/draft/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_public_can_submit_to_published_form(self):
        Form.objects.create(name="Contact", slug="contact", status=Form.Status.PUBLISHED, schema=CONTACT_SCHEMA)

        response = self.client.post(
            "/api/public/forms/contact/submit/",
            {"data": {"email": "hello@example.com"}},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_public_submission_missing_required_field_returns_400(self):
        Form.objects.create(name="Contact", slug="contact", status=Form.Status.PUBLISHED, schema=CONTACT_SCHEMA)

        response = self.client.post("/api/public/forms/contact/submit/", {"data": {}}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class HoneypotTests(APITestCase):
    def setUp(self):
        self.form = Form.objects.create(
            name="Contact", slug="contact", status=Form.Status.PUBLISHED, schema=CONTACT_SCHEMA
        )

    def test_filled_honeypot_silently_drops_submission(self):
        response = self.client.post(
            "/api/public/forms/contact/submit/",
            {"data": {"email": "hello@example.com"}, HONEYPOT_FIELD: "http://spam.example"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(FormSubmission.objects.count(), 0)

    def test_empty_honeypot_allows_normal_submission(self):
        response = self.client.post(
            "/api/public/forms/contact/submit/",
            {"data": {"email": "hello@example.com"}, HONEYPOT_FIELD: ""},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(FormSubmission.objects.count(), 1)


class SubmissionThrottleTests(APITestCase):
    def setUp(self):
        cache.clear()
        Form.objects.create(name="Contact", slug="contact", status=Form.Status.PUBLISHED, schema=CONTACT_SCHEMA)
        # SimpleRateThrottle snapshots THROTTLE_RATES onto the class at import time, so
        # override_settings(REST_FRAMEWORK=...) never reaches it -- patch the class directly.
        self._original_rates = SubmissionRateThrottle.THROTTLE_RATES
        SubmissionRateThrottle.THROTTLE_RATES = {"submission": "1/min"}

    def tearDown(self):
        SubmissionRateThrottle.THROTTLE_RATES = self._original_rates

    def test_exceeding_submission_rate_returns_429(self):
        first = self.client.post(
            "/api/public/forms/contact/submit/", {"data": {"email": "a@example.com"}}, format="json"
        )
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)

        second = self.client.post(
            "/api/public/forms/contact/submit/", {"data": {"email": "a@example.com"}}, format="json"
        )
        self.assertEqual(second.status_code, status.HTTP_429_TOO_MANY_REQUESTS)


class SchemaVersioningTests(APITestCase):
    def test_schema_version_increments_when_schema_changes(self):
        alice = User.objects.create_user(username="alice", password="s3cret-pass")
        form = Form.objects.create(
            owner=alice, name="Contact", slug="contact", status=Form.Status.PUBLISHED, schema=CONTACT_SCHEMA
        )
        self.assertEqual(form.schema_version, 1)
        self.client.force_authenticate(alice)

        new_schema = {
            "fields": [
                {"name": "email", "label": "Email", "type": "email", "required": True},
                {"name": "phone", "label": "Phone", "type": "text", "required": False},
            ]
        }
        response = self.client.patch(f"/api/forms/{form.id}/", {"schema": new_schema}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        form.refresh_from_db()
        self.assertEqual(form.schema_version, 2)

    def test_schema_version_unchanged_when_schema_not_edited(self):
        alice = User.objects.create_user(username="alice", password="s3cret-pass")
        form = Form.objects.create(
            owner=alice, name="Contact", slug="contact", status=Form.Status.PUBLISHED, schema=CONTACT_SCHEMA
        )
        self.client.force_authenticate(alice)

        response = self.client.patch(f"/api/forms/{form.id}/", {"name": "Renamed"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        form.refresh_from_db()
        self.assertEqual(form.schema_version, 1)

    def test_submission_records_schema_version_at_submit_time(self):
        form = Form.objects.create(
            name="Contact", slug="contact", status=Form.Status.PUBLISHED, schema=CONTACT_SCHEMA
        )
        form.schema = {
            "fields": [
                *CONTACT_SCHEMA["fields"],
                {"name": "phone", "label": "Phone", "type": "text", "required": False},
            ]
        }
        form.save()
        self.assertEqual(form.schema_version, 2)

        submission = create_submission(form=form, data={"email": "hello@example.com"})

        self.assertEqual(submission.schema_version, 2)


class SubmissionExportTests(APITestCase):
    def setUp(self):
        self.alice = User.objects.create_user(username="alice", password="s3cret-pass")
        self.bob = User.objects.create_user(username="bob", password="s3cret-pass")
        self.form = Form.objects.create(
            owner=self.alice, name="Contact", slug="contact", status=Form.Status.PUBLISHED, schema=CONTACT_SCHEMA
        )
        create_submission(form=self.form, data={"email": "hello@example.com"})

    def test_owner_can_export_csv(self):
        self.client.force_authenticate(self.alice)

        response = self.client.get(f"/api/forms/{self.form.id}/export/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "text/csv")
        body = response.content.decode()
        self.assertIn("hello@example.com", body)
        self.assertIn("Email", body)

    def test_owner_can_export_json(self):
        self.client.force_authenticate(self.alice)

        response = self.client.get(f"/api/forms/{self.form.id}/export/?export_format=json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.json()
        self.assertEqual(len(payload), 1)
        self.assertEqual(payload[0]["data"]["email"], "hello@example.com")

    def test_owner_can_export_pdf(self):
        self.client.force_authenticate(self.alice)

        response = self.client.get(f"/api/forms/{self.form.id}/export/?export_format=pdf")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertTrue(response.content.startswith(b"%PDF"))

    def test_other_user_cannot_export(self):
        self.client.force_authenticate(self.bob)

        response = self.client.get(f"/api/forms/{self.form.id}/export/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
