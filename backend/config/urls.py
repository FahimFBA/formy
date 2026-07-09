from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve as serve_static

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("formy.urls")),
    # Served directly by Django rather than whitenoise (which indexes STATIC_ROOT at startup and
    # can't see files uploaded at runtime). Fine at this scale; put a reverse proxy/CDN in front of
    # MEDIA_ROOT if upload traffic grows.
    re_path(r"^media/(?P<path>.*)$", serve_static, {"document_root": settings.MEDIA_ROOT}),
]

