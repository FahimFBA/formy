# By: Md. Fahim Bin Amin

# This file contains the business logic for the formy app: submission creation, avatar
# upload validation, and user registration. Views stay thin and only translate the
# exceptions raised here (see exceptions.py) into HTTP responses; models.py only owns
# schema/field validation, not these higher-level rules.

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from PIL import Image, UnidentifiedImageError
from rest_framework.authtoken.models import Token

from .exceptions import (
    AvatarTooLarge,
    FormNotAcceptingSubmissions,
    InvalidAvatarFile,
    MissingCredentials,
    UsernameAlreadyTaken,
)
from .models import Form, FormSubmission, validate_submission_data

User = get_user_model()


@transaction.atomic
def create_submission(*, form: Form, data: dict, metadata: dict | None = None) -> FormSubmission:
    """
    Validates and stores a submission against a form's current schema.
    :param form: the Form being submitted to
    :param data: (dict) submitted field values, keyed by field name
    :param metadata: (dict or None) request context to store alongside the submission
        (for example IP address, user agent); defaults to an empty dict
    :return: the created FormSubmission
    :errors: FormNotAcceptingSubmissions, django.core.exceptions.ValidationError
    """
    if not form.is_published:
        raise FormNotAcceptingSubmissions()

    validate_submission_data(form.schema, data)
    submission = FormSubmission(
        form=form,
        data=data,
        metadata=metadata or {},
        schema_version=form.schema_version,
    )
    submission.full_clean()
    submission.save()
    return submission


def validate_avatar_upload(avatar) -> None:
    """
    Validates an uploaded avatar file. Checks the size cap first (cheap) and then
    decodes the file with Pillow to confirm it is actually an image, since Django's
    ImageField.full_clean() alone only checks the file extension.
    :param avatar: uploaded file object (django.core.files.uploadedfile.UploadedFile);
        left seeked to the start on both success and failure so callers can read it again
    :errors: AvatarTooLarge, InvalidAvatarFile
    """
    if avatar.size > settings.MAX_AVATAR_UPLOAD_BYTES:
        raise AvatarTooLarge()

    try:
        Image.open(avatar).verify()
    except (UnidentifiedImageError, OSError) as error:
        raise InvalidAvatarFile() from error
    finally:
        avatar.seek(0)


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
