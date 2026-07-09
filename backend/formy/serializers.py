# By: Md. Fahim Bin Amin

# This file contains the DRF serializers exposed under /api/: form CRUD and its public
# read-only counterpart, submissions (read-only, created through services.create_submission
# instead of this layer), and the account-management serializers used by ProfileView,
# ChangePasswordView, and RegisterView.

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .labels import LABELS
from .models import Form, FormSubmission, UserProfile, validate_form_schema

User = get_user_model()


class FormSerializer(serializers.ModelSerializer):
    """
    Authenticated CRUD representation of a form, owned by the requesting user.
    """

    class Meta:
        model = Form
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "status",
            "schema",
            "schema_version",
            "success_message",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "schema_version", "created_at", "updated_at"]

    def validate_schema(self, value):
        """
        :param value: (dict) the incoming schema value
        :return: value, unchanged, once it passes validation
        :errors: rest_framework.serializers.ValidationError (DRF wraps the underlying
            django.core.exceptions.ValidationError raised by validate_form_schema)
        """
        validate_form_schema(value)
        return value


class PublicFormSerializer(serializers.ModelSerializer):
    """
    Anonymous, read-only representation of a published form. Excludes owner, status,
    schema_version, and timestamps, none of which an anonymous visitor needs.
    """

    class Meta:
        model = Form
        fields = ["id", "name", "slug", "description", "schema", "success_message"]


class FormSubmissionSerializer(serializers.ModelSerializer):
    """
    Read-only representation of a submission. All fields are read-only because
    submissions are created through services.create_submission, not this serializer.
    """

    class Meta:
        model = FormSubmission
        fields = ["id", "data", "metadata", "schema_version", "submitted_at"]
        read_only_fields = fields


class SubmissionCreateSerializer(serializers.Serializer):
    """
    Validates the shape of an incoming public submission payload before it reaches
    services.create_submission.
    """

    data = serializers.JSONField(default=dict)


class UserSerializer(serializers.ModelSerializer):
    """
    Representation of the authenticated user's own account, including a resolved
    absolute avatar URL and the user's UI language preference, both stored on
    UserProfile rather than on the user model itself.
    """

    avatar_url = serializers.SerializerMethodField()
    language = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["username", "first_name", "last_name", "email", "avatar_url", "language"]

    def get_avatar_url(self, user):
        """
        :param user: the User instance being serialized
        :return: (str or None) absolute avatar URL, or None if the user has no avatar
        """
        profile = getattr(user, "profile", None)
        if not profile or not profile.avatar:
            return None
        request = self.context.get("request")
        url = profile.avatar.url
        return request.build_absolute_uri(url) if request else url

    def get_language(self, user):
        """
        :param user: the User instance being serialized
        :return: (str) the user's stored language preference ("en", "es", or "zh"),
            or UserProfile.Language.ENGLISH if they have no profile row yet
        """
        profile = getattr(user, "profile", None)
        return profile.language if profile else UserProfile.Language.ENGLISH

    def update(self, instance, validated_data):
        """
        Updates the user's own account fields, plus their language preference if
        "language" was included in the request. language is read from initial_data
        rather than validated_data since it is a SerializerMethodField (read-only by
        default) and lives on UserProfile, not on the User model this serializer wraps.
        :param instance: the User instance being updated
        :param validated_data: validated User model fields (username, first_name, and so on)
        :return: the updated User instance
        :errors: rest_framework.serializers.ValidationError if language is not one of
            UserProfile.Language's values
        """
        language = self.initial_data.get("language")
        if language is not None:
            if language not in UserProfile.Language.values:
                raise serializers.ValidationError({"language": LABELS["err_unsupported_language"]})
            profile, _ = UserProfile.objects.get_or_create(user=instance)
            profile.language = language
            profile.save()

        return super().update(instance, validated_data)


class ChangePasswordSerializer(serializers.Serializer):
    """
    Validates a password-change request: the current password must be correct and the
    new password must satisfy Django's configured password validators.
    """

    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_old_password(self, value):
        """
        :param value: (str) the claimed current password
        :return: value, unchanged, once it is confirmed correct
        :errors: rest_framework.serializers.ValidationError if value does not match the
            requesting user's current password
        """
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError(LABELS["err_current_password_incorrect"])
        return value

    def validate_new_password(self, value):
        """
        :param value: (str) the requested new password
        :return: value, unchanged, once it passes Django's password validators
        :errors: rest_framework.serializers.ValidationError if value is too weak/common
        """
        validate_password(value)
        return value
