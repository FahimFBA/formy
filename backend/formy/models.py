# By: Md. Fahim Bin Amin

# This file contains the domain model: Form (the portable JSON schema and its
# publication state), FormSubmission (a normalized submission plus the schema version
# that was live at submit time), UserProfile (per-user extras that do not belong on
# AUTH_USER_MODEL), and the schema/submission-data validators both models rely on.

import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class Form(models.Model):
    """
    A form definition: its schema, publication status, and ownership. owner is nullable
    so the app works whether or not the host project assigns forms to a user.
    """

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        ARCHIVED = "archived", "Archived"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="forms",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=160)
    slug = models.SlugField(max_length=180, unique=True)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    schema = models.JSONField(default=dict)
    schema_version = models.PositiveIntegerField(default=1)
    success_message = models.CharField(max_length=240, default="Thanks. Your response was submitted.")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.name

    def clean(self) -> None:
        """
        :errors: django.core.exceptions.ValidationError if schema is malformed
        """
        validate_form_schema(self.schema)

    def save(self, *args, **kwargs) -> None:
        """
        Auto-increments schema_version whenever schema actually changes, so
        FormSubmission.schema_version can record which version was live at submit time
        without editing a form's fields retroactively changing how old submissions are
        interpreted.
        """
        if not self._state.adding:
            previous_schema = Form.objects.filter(pk=self.pk).values_list("schema", flat=True).first()
            if previous_schema is not None and previous_schema != self.schema:
                self.schema_version += 1
        super().save(*args, **kwargs)

    @property
    def is_published(self) -> bool:
        """
        :return: (bool) True if this form currently accepts submissions
        """
        return self.status == self.Status.PUBLISHED


class FormSubmission(models.Model):
    """
    A single submitted response to a Form, storing the schema_version that was live at
    submit time so later edits to the form's fields do not change how this row reads.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    form = models.ForeignKey(Form, related_name="submissions", on_delete=models.CASCADE)
    data = models.JSONField(default=dict)
    metadata = models.JSONField(default=dict, blank=True)
    schema_version = models.PositiveIntegerField(default=1)
    submitted_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-submitted_at"]

    def __str__(self) -> str:
        return f"{self.form.slug} submission {self.submitted_at:%Y-%m-%d %H:%M}"

    def clean(self) -> None:
        """
        :errors: django.core.exceptions.ValidationError if data does not satisfy the
            form's current schema (required fields, types, and so on)
        """
        validate_submission_data(self.form.schema, self.data)


class UserProfile(models.Model):
    """
    Per-user extras that do not belong on AUTH_USER_MODEL itself: an optional avatar
    image (see services.validate_avatar_upload for how uploads are verified before a
    UserProfile is saved) and the user's UI language preference.
    """

    class Language(models.TextChoices):
        ENGLISH = "en", "English"
        SPANISH = "es", "Spanish"
        CHINESE = "zh", "Chinese"

    user = models.OneToOneField(settings.AUTH_USER_MODEL, related_name="profile", on_delete=models.CASCADE)
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)
    language = models.CharField(max_length=8, choices=Language.choices, default=Language.ENGLISH)

    def __str__(self) -> str:
        return f"{self.user.username} profile"


ALLOWED_FIELD_TYPES = {"text", "textarea", "email", "number", "select", "checkbox", "date"}


def validate_form_schema(schema: dict) -> None:
    """
    Validates a form's schema shape: a dict with a "fields" list, each field having a
    unique string name, a supported type, a string label, and (for "select") a
    non-empty options list.
    :param schema: (dict) the schema to validate
    :errors: django.core.exceptions.ValidationError on any malformed field
    """
    if not isinstance(schema, dict):
        raise ValidationError("Form schema must be an object.")

    fields = schema.get("fields", [])
    if not isinstance(fields, list):
        raise ValidationError("Form schema fields must be a list.")

    seen_names: set[str] = set()
    for field in fields:
        if not isinstance(field, dict):
            raise ValidationError("Each field must be an object.")

        name = field.get("name")
        field_type = field.get("type")
        label = field.get("label")

        if not name or not isinstance(name, str):
            raise ValidationError("Each field requires a string name.")
        if name in seen_names:
            raise ValidationError(f"Duplicate field name: {name}")
        if field_type not in ALLOWED_FIELD_TYPES:
            raise ValidationError(f"Unsupported field type: {field_type}")
        if not label or not isinstance(label, str):
            raise ValidationError(f"Field {name} requires a string label.")

        if field_type == "select":
            options = field.get("options", [])
            if not isinstance(options, list) or not options:
                raise ValidationError(f"Select field {name} requires options.")

        seen_names.add(name)


def validate_submission_data(schema: dict, data: dict) -> None:
    """
    Validates that submitted data satisfies a form's schema: schema itself must be
    valid, data must be an object, and every required field must have a non-empty value.
    :param schema: (dict) the form's current schema
    :param data: (dict) submitted field values, keyed by field name
    :errors: django.core.exceptions.ValidationError if schema is malformed or a
        required field is missing/empty
    """
    validate_form_schema(schema)

    if not isinstance(data, dict):
        raise ValidationError("Submission data must be an object.")

    for field in schema.get("fields", []):
        name = field["name"]
        required = bool(field.get("required", False))

        if required and data.get(name) in (None, "", []):
            raise ValidationError(f"{field['label']} is required.")
