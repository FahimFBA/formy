# By: Md. Fahim Bin Amin

# This file contains the Django admin registrations for formy's models.

from django.contrib import admin

from .models import Form, FormSubmission


@admin.register(Form)
class FormAdmin(admin.ModelAdmin):
    """
    Admin list/search/filter configuration for Form.
    """

    list_display = ("name", "slug", "owner", "status", "updated_at")
    list_filter = ("status",)
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ("name", "slug", "description")
    autocomplete_fields = ("owner",)


@admin.register(FormSubmission)
class FormSubmissionAdmin(admin.ModelAdmin):
    """
    Admin list/search/filter configuration for FormSubmission. submitted_at is read-only
    since submissions should only be created through services.create_submission.
    """

    list_display = ("form", "submitted_at")
    list_filter = ("form",)
    readonly_fields = ("submitted_at",)
    search_fields = ("form__name", "form__slug")
