# By: Md. Fahim Bin Amin

# This file contains formy's URL routing, included under /api/ by config/urls.py.
# FormViewSet's CRUD routes (list/create/retrieve/update/delete plus the submissions
# and export actions) are registered through the DRF router; every other endpoint is
# a single-purpose APIView registered explicitly below.

from django.urls import include, path
from rest_framework.authtoken.views import obtain_auth_token
from rest_framework.routers import DefaultRouter

from . import views

app_name = "formy"

router = DefaultRouter()
router.register("forms", views.FormViewSet, basename="form")

urlpatterns = [
    path("auth/register/", views.RegisterView.as_view(), name="register"),
    path("auth/token/", obtain_auth_token, name="token"),
    path("auth/profile/", views.ProfileView.as_view(), name="profile"),
    path("auth/profile/avatar/", views.AvatarUploadView.as_view(), name="profile-avatar"),
    path("auth/change-password/", views.ChangePasswordView.as_view(), name="change-password"),
    path("public/forms/<slug:slug>/", views.PublicFormDetailView.as_view(), name="public-form-detail"),
    path("public/forms/<slug:slug>/submit/", views.PublicSubmitView.as_view(), name="public-form-submit"),
    path(
        "attachments/<uuid:pk>/download/",
        views.SubmissionAttachmentDownloadView.as_view(),
        name="attachment-download",
    ),
    path("", include(router.urls)),
]
