from django.contrib import admin

from .models import Form, FormSubmission


@admin.register(Form)
class FormAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "owner", "status", "updated_at")
    list_filter = ("status",)
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ("name", "slug", "description")
    autocomplete_fields = ("owner",)


@admin.register(FormSubmission)
class FormSubmissionAdmin(admin.ModelAdmin):
    list_display = ("form", "submitted_at")
    list_filter = ("form",)
    readonly_fields = ("submitted_at",)
    search_fields = ("form__name", "form__slug")

