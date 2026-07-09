from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import Form, FormSubmission, validate_form_schema

User = get_user_model()


class FormSerializer(serializers.ModelSerializer):
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
        validate_form_schema(value)
        return value


class PublicFormSerializer(serializers.ModelSerializer):
    class Meta:
        model = Form
        fields = ["id", "name", "slug", "description", "schema", "success_message"]


class FormSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormSubmission
        fields = ["id", "data", "metadata", "schema_version", "submitted_at"]
        read_only_fields = fields


class SubmissionCreateSerializer(serializers.Serializer):
    data = serializers.JSONField(default=dict)


class UserSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["username", "first_name", "last_name", "email", "avatar_url"]

    def get_avatar_url(self, user):
        profile = getattr(user, "profile", None)
        if not profile or not profile.avatar:
            return None
        request = self.context.get("request")
        url = profile.avatar.url
        return request.build_absolute_uri(url) if request else url


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate_new_password(self, value):
        validate_password(value)
        return value
