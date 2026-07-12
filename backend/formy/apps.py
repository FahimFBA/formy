# By: Md. Fahim Bin Amin

# This file contains the Django app config for formy.

from django.apps import AppConfig


class FormyConfig(AppConfig):
    """
    App config for the reusable formy Django app.
    """

    default_auto_field = "django.db.models.BigAutoField"
    name = "formy"
    verbose_name = "Formy"
