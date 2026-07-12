# By: Md. Fahim Bin Amin

# This file contains the business logic for the formy app: submission creation
# (including attachment validation and storage), image upload validation (avatar and
# form banner), and user registration. Views stay thin and only translate the
# exceptions raised here (see exceptions.py) into HTTP responses; models.py only owns
# schema/field validation, not these higher-level rules.

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from PIL import Image, UnidentifiedImageError
from rest_framework.authtoken.models import Token

from .exceptions import (
    AttachmentTooLarge,
    AvatarTooLarge,
    BannerTooLarge,
    FormNotAcceptingSubmissions,
    InvalidAttachmentType,
    InvalidAvatarFile,
    InvalidBannerFile,
    MissingCredentials,
    TooManyAttachments,
    UsernameAlreadyTaken,
)
from .models import Form, FormSubmission, SubmissionAttachment, validate_submission_data

User = get_user_model()

# Internal placeholder stored in submission data for a required "file" field while it still
# needs schema validation, before the real attachment references replace it. Never seen by
# API callers.
_FILE_PENDING_MARKER = "__attached__"


def _uploaded_files_for_field(files, name: str) -> list:
    """
    :param files: the "files" mapping passed into create_submission; either a plain
        dict (one file per key, as used by tests) or a Django QueryDict/MultiValueDict
        (request.FILES, where a field name can carry more than one file)
    :param name: the schema field name to look up
    :return: (list) uploaded file objects for that field name, possibly empty
    """
    if hasattr(files, "getlist"):
        return files.getlist(name)
    value = files.get(name)
    if value is None:
        return []
    return list(value) if isinstance(value, list) else [value]


@transaction.atomic
def create_submission(
    *, form: Form, data: dict, metadata: dict | None = None, files: dict | None = None
) -> FormSubmission:
    """
    Validates and stores a submission against a form's current schema, including any
    files uploaded against the schema's "file" fields.
    :param form: the Form being submitted to
    :param data: (dict) submitted field values, keyed by field name
    :param metadata: (dict or None) request context to store alongside the submission
        (for example IP address, user agent); defaults to an empty dict
    :param files: (dict or None) uploaded file objects keyed by field name, for any
        "file"-type fields in the form's schema; defaults to no files. A field name may
        carry more than one file, up to that field's "max_files" (default 1).
    :return: the created FormSubmission
    :errors: FormNotAcceptingSubmissions, AttachmentTooLarge, InvalidAttachmentType,
        TooManyAttachments, django.core.exceptions.ValidationError
    """
    if not form.is_published:
        raise FormNotAcceptingSubmissions()

    files = files or {}
    file_fields = {field["name"]: field for field in form.schema.get("fields", []) if field["type"] == "file"}
    uploads_by_field = {}
    for name, field in file_fields.items():
        uploaded = _uploaded_files_for_field(files, name)
        if not uploaded:
            continue

        max_files = field.get("max_files", 1)
        if len(uploaded) > max_files:
            raise TooManyAttachments()
        for uploaded_file in uploaded:
            validate_attachment_upload(uploaded_file, accept=field.get("accept"))

        uploads_by_field[name] = uploaded
        data[name] = [_FILE_PENDING_MARKER] * len(uploaded)

    validate_submission_data(form.schema, data)
    submission = FormSubmission(
        form=form,
        data=data,
        metadata=metadata or {},
        schema_version=form.schema_version,
    )
    submission.full_clean()
    submission.save()

    for name, uploaded in uploads_by_field.items():
        attachments = [
            SubmissionAttachment.objects.create(
                submission=submission,
                field_name=name,
                file=uploaded_file,
                original_filename=uploaded_file.name,
                content_type=uploaded_file.content_type or "",
                size=uploaded_file.size,
            )
            for uploaded_file in uploaded
        ]
        data[name] = [
            {"attachment_id": str(attachment.id), "filename": attachment.original_filename}
            for attachment in attachments
        ]

    if uploads_by_field:
        submission.data = data
        submission.save(update_fields=["data"])

    return submission


def validate_image_upload(image_file, *, max_bytes: int, too_large_error, invalid_file_error) -> None:
    """
    Validates an uploaded image file. Checks the size cap first (cheap) and then
    decodes the file with Pillow to confirm it is actually an image, since Django's
    ImageField.full_clean() alone only checks the file extension. Shared by avatar and
    form banner uploads, which only differ in their size cap and which exception each
    should raise.
    :param image_file: uploaded file object (django.core.files.uploadedfile.UploadedFile);
        left seeked to the start on both success and failure so callers can read it again
    :param max_bytes: maximum allowed file size, in bytes
    :param too_large_error: exception class to raise if image_file.size exceeds max_bytes
    :param invalid_file_error: exception class to raise if image_file does not decode as
        an actual image
    :errors: too_large_error, invalid_file_error
    """
    if image_file.size > max_bytes:
        raise too_large_error()

    try:
        Image.open(image_file).verify()
    except (UnidentifiedImageError, OSError) as error:
        raise invalid_file_error() from error
    finally:
        image_file.seek(0)


def validate_avatar_upload(avatar) -> None:
    """
    Validates an uploaded profile avatar against settings.MAX_AVATAR_UPLOAD_BYTES.
    :param avatar: uploaded file object (django.core.files.uploadedfile.UploadedFile)
    :errors: AvatarTooLarge, InvalidAvatarFile
    """
    validate_image_upload(
        avatar,
        max_bytes=settings.MAX_AVATAR_UPLOAD_BYTES,
        too_large_error=AvatarTooLarge,
        invalid_file_error=InvalidAvatarFile,
    )


def validate_banner_upload(banner) -> None:
    """
    Validates an uploaded form banner image against settings.MAX_BANNER_UPLOAD_BYTES.
    :param banner: uploaded file object (django.core.files.uploadedfile.UploadedFile)
    :errors: BannerTooLarge, InvalidBannerFile
    """
    validate_image_upload(
        banner,
        max_bytes=settings.MAX_BANNER_UPLOAD_BYTES,
        too_large_error=BannerTooLarge,
        invalid_file_error=InvalidBannerFile,
    )


def validate_attachment_upload(attachment, *, accept: str | None = None) -> None:
    """
    Validates a submission's uploaded file against settings.MAX_ATTACHMENT_UPLOAD_BYTES
    and, if given, its "file" schema field's "accept" list. Unlike avatar/banner
    uploads, attachments are arbitrary user documents, not necessarily images, so no
    Pillow decode check is done here.
    :param attachment: uploaded file object (django.core.files.uploadedfile.UploadedFile)
    :param accept: (str or None) comma-separated allowed extensions (for example
        ".pdf,.docx"), matched case-insensitively against attachment.name; no
        restriction if None or empty
    :errors: AttachmentTooLarge, InvalidAttachmentType
    """
    if attachment.size > settings.MAX_ATTACHMENT_UPLOAD_BYTES:
        raise AttachmentTooLarge()

    allowed_extensions = {ext.strip().lower() for ext in (accept or "").split(",") if ext.strip()}
    if allowed_extensions:
        file_extension = "." + attachment.name.rsplit(".", 1)[-1].lower() if "." in attachment.name else ""
        if file_extension not in allowed_extensions:
            raise InvalidAttachmentType()


def register_user(*, username: str, password: str, email: str = "") -> tuple:
    """
    Creates a new user account and issues an API token for it.
    :param username: desired username; surrounding whitespace is stripped
    :param password: plaintext password to set on the new account
    :param email: (str) optional email address; surrounding whitespace is stripped
    :return: (User, Token) tuple for the newly created account
    :errors: MissingCredentials, UsernameAlreadyTaken
    """
    username = username.strip()
    email = email.strip()
    if not username or not password:
        raise MissingCredentials()
    if User.objects.filter(username=username).exists():
        raise UsernameAlreadyTaken()

    user = User.objects.create_user(username=username, email=email, password=password)
    token, _ = Token.objects.get_or_create(user=user)
    return user, token
