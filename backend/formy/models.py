# By: Md. Fahim Bin Amin

# This file contains the domain model: Form (the portable JSON schema and its
# publication state, plus its optional banner/header/footer presentation fields),
# FormSubmission (a normalized submission plus the schema version that was live at
# submit time), SubmissionAttachment (a file uploaded against one "file" schema field
# of a submission), UserProfile (per-user extras that do not belong on AUTH_USER_MODEL),
# and the schema/submission-data validators both Form and FormSubmission rely on.

import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class Form(models.Model):
    """
    A form definition: its schema, publication status, ownership, and optional public
    page presentation (banner image, header text, footer text). owner is nullable so
    the app works whether or not the host project assigns forms to a user.
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
    banner_image = models.ImageField(upload_to="form_banners/", blank=True, null=True)
    header_text = models.CharField(max_length=200, blank=True)
    footer_text = models.TextField(blank=True)
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


def attachment_upload_path(instance: "SubmissionAttachment", filename: str) -> str:
    """
    :param instance: the SubmissionAttachment being saved
    :param filename: the uploaded file's original name
    :return: (str) a storage path namespaced by form and submission, so two
        submissions' attachments never collide even if the original filenames match
    """
    return f"attachments/{instance.submission.form_id}/{instance.submission_id}/{filename}"


class SubmissionAttachment(models.Model):
    """
    A single file uploaded against one "file"-type schema field of a FormSubmission.
    The submission's own data dict stores only a reference (attachment id and original
    filename) for display; the actual file lives here so it can be validated, stored,
    and served independently of the submission's JSON payload.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    submission = models.ForeignKey(FormSubmission, related_name="attachments", on_delete=models.CASCADE)
    field_name = models.CharField(max_length=120)
    file = models.FileField(upload_to=attachment_upload_path)
    original_filename = models.CharField(max_length=255)
    content_type = models.CharField(max_length=120, blank=True)
    size = models.PositiveIntegerField()
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return self.original_filename


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


ALLOWED_FIELD_TYPES = {
    "text",
    "textarea",
    "email",
    "number",
    "select",
    "checkbox",
    "date",
    "multi_select",
    "phone",
    "file",
}

# Field types whose schema definition requires a non-empty "options" list, same as "select".
OPTIONS_FIELD_TYPES = {"select", "multi_select"}


def validate_form_schema(schema: dict) -> None:
    """
    Validates a form's schema shape: a dict with a "fields" list, each field having a
    unique string name, a supported type, a string label, and (for "select" and
    "multi_select") a non-empty options list.
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

        if field_type in OPTIONS_FIELD_TYPES:
            options = field.get("options", [])
            if not isinstance(options, list) or not options:
                raise ValidationError(f"{field_type} field {name} requires options.")

        if field_type == "file":
            max_files = field.get("max_files", 1)
            if not isinstance(max_files, int) or isinstance(max_files, bool) or max_files < 1:
                raise ValidationError(f"file field {name} max_files must be a positive integer.")
            accept = field.get("accept")
            if accept is not None and not isinstance(accept, str):
                raise ValidationError(f"file field {name} accept must be a string.")

        seen_names.add(name)


def validate_submission_data(schema: dict, data: dict) -> None:
    """
    Validates that submitted data satisfies a form's schema: schema itself must be
    valid, data must be an object, and every required field must have a non-empty
    value, where "non-empty" is type-specific: a "phone" field needs a number, every
    other type just needs a truthy value.
    :param schema: (dict) the form's current schema
    :param data: (dict) submitted field values, keyed by field name; for "file"
        fields, the caller is expected to have already substituted a placeholder
        truthy value for any field that has an attached upload (see
        services.create_submission)
    :errors: django.core.exceptions.ValidationError if schema is malformed or a
        required field is missing/empty
    """
    validate_form_schema(schema)

    if not isinstance(data, dict):
        raise ValidationError("Submission data must be an object.")

    for field in schema.get("fields", []):
        name = field["name"]
        required = bool(field.get("required", False))
        if not required:
            continue

        value = data.get(name)
        if field["type"] == "phone":
            is_empty = not isinstance(value, dict) or not value.get("number")
        else:
            is_empty = value in (None, "", [])

        if is_empty:
            raise ValidationError(f"{field['label']} is required.")
