# By: Md. Fahim Bin Amin

# This file contains the WSGI entry point for the config project, used by gunicorn.

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

application = get_wsgi_application()

