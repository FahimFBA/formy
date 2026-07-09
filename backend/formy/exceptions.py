# By: Md. Fahim Bin Amin

# This file contains the domain-specific exceptions raised by formy's service layer
# (services.py). They exist to separate business-rule violations from plain field
# validation, which stays as django.core.exceptions.ValidationError raised by model
# clean() methods and serializer validate_*() methods. Views catch these and translate
# them into DRF error responses; see AGENTS.md for the full convention. Default
# messages come from label-universe/labels.json (see labels.py) rather than being
# hardcoded here.

from .labels import LABELS


class FormNotAcceptingSubmissions(Exception):

    def __init__(self, message=LABELS["err_form_not_accepting_submissions"]):
        """
        Raised when a submission is attempted against a form that is not published.
        :param message: human-readable explanation returned to the API caller
        """
        self.message = message
        super().__init__(message)


class MissingCredentials(Exception):

    def __init__(self, message=LABELS["err_missing_credentials"]):
        """
        Raised during registration when the username or password is missing.
        :param message: human-readable explanation returned to the API caller
        """
        self.message = message
        super().__init__(message)


class UsernameAlreadyTaken(Exception):

    def __init__(self, message=LABELS["err_username_taken"]):
        """
        Raised during registration when the requested username already belongs to
        another account.
        :param message: human-readable explanation returned to the API caller
        """
        self.message = message
        super().__init__(message)


class AvatarTooLarge(Exception):

    def __init__(self, message=LABELS["err_avatar_too_large"]):
        """
        Raised when an uploaded avatar exceeds settings.MAX_AVATAR_UPLOAD_BYTES.
        :param message: human-readable explanation returned to the API caller
        """
        self.message = message
        super().__init__(message)


class InvalidAvatarFile(Exception):

    def __init__(self, message=LABELS["err_avatar_invalid"]):
        """
        Raised when an uploaded avatar fails to decode as an actual image, regardless of
        its file extension or client-supplied content type.
        :param message: human-readable explanation returned to the API caller
        """
        self.message = message
        super().__init__(message)
