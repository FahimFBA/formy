import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class Form(models.Model):
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
        validate_form_schema(self.schema)

    def save(self, *args, **kwargs) -> None:
        if not self._state.adding:
            previous_schema = Form.objects.filter(pk=self.pk).values_list("schema", flat=True).first()
            if previous_schema is not None and previous_schema != self.schema:
                self.schema_version += 1
        super().save(*args, **kwargs)

    @property
    def is_published(self) -> bool:
        return self.status == self.Status.PUBLISHED


class FormSubmission(models.Model):
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
        validate_submission_data(self.form.schema, self.data)


class UserProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, related_name="profile", on_delete=models.CASCADE)
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)

    def __str__(self) -> str:
        return f"{self.user.username} profile"


ALLOWED_FIELD_TYPES = {"text", "textarea", "email", "number", "select", "checkbox", "date"}


def validate_form_schema(schema: dict) -> None:
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
    validate_form_schema(schema)

    if not isinstance(data, dict):
        raise ValidationError("Submission data must be an object.")

    for field in schema.get("fields", []):
        name = field["name"]
        required = bool(field.get("required", False))

        if required and data.get(name) in (None, "", []):
            raise ValidationError(f"{field['label']} is required.")

