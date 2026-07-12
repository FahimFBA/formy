# By: Md. Fahim Bin Amin

# This file contains the DRF views exposed under /api/. Business rules (submission
# creation, avatar/banner/attachment validation, registration) live in services.py;
# views only translate requests into service/serializer calls and translate the
# exceptions raised there into HTTP responses.

import csv
import io
import json
from xml.sax.saxutils import escape

from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import FileResponse, Http404, HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from rest_framework import generics, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .constants import HONEYPOT_FIELD
from .exceptions import (
    AttachmentTooLarge,
    AvatarTooLarge,
    BannerTooLarge,
    FormNotAcceptingSubmissions,
    InvalidAttachmentType,
    InvalidAvatarFile,
    InvalidBannerFile,
    MissingCredentials,
    TooManyAttachments,
    UsernameAlreadyTaken,
)
from .labels import LABELS
from .models import Form, SubmissionAttachment, UserProfile
from .permissions import IsOwner
from .serializers import (
    ChangePasswordSerializer,
    FormSerializer,
    FormSubmissionSerializer,
    PublicFormSerializer,
    SubmissionCreateSerializer,
    UserSerializer,
)
from .services import create_submission, register_user, validate_avatar_upload, validate_banner_upload
from .throttling import SubmissionRateThrottle


def _field_display_value(field: dict, submission) -> str:
    """
    Renders one submission's value for one schema field as plain text for CSV/PDF
    export, formatting the compound types ("multi_select", "phone", "file") that a
    bare str() would otherwise render as a Python dict/list repr.
    :param field: the schema field being rendered
    :param submission: the FormSubmission being exported
    :return: (str) the field's value, formatted for a spreadsheet/PDF cell
    """
    value = submission.data.get(field["name"], "")

    if field["type"] == "multi_select":
        return ", ".join(value) if isinstance(value, list) else str(value)

    if field["type"] == "phone":
        if isinstance(value, dict):
            return f"{value.get('country_code', '')} {value.get('number', '')}".strip()
        return str(value)

    if field["type"] == "file":
        if isinstance(value, list):
            return ", ".join(item.get("filename", "") for item in value if isinstance(item, dict))
        return ""

    return str(value)


class FormViewSet(viewsets.ModelViewSet):
    """
    Authenticated CRUD for a user's own forms, plus submissions and export actions.
    Scoped to request.user via get_queryset(); IsOwner also guards single-object access.
    """

    serializer_class = FormSerializer
    permission_classes = [IsAuthenticated, IsOwner]

    def get_queryset(self):
        """
        :return: (QuerySet) forms owned by the current user only
        """
        return Form.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        """
        Stamps the new form with the current user as owner.
        :param serializer: the validated FormSerializer instance being saved
        """
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=["get"])
    def submissions(self, request, pk=None):
        """
        Lists submissions for a single form, paginated the same way as the forms list.
        :return: (Response) paginated list of FormSubmissionSerializer data
        """
        form = self.get_object()
        page = self.paginate_queryset(form.submissions.all())
        serializer = FormSubmissionSerializer(page, many=True, context={"request": request})
        return self.get_paginated_response(serializer.data)

    @action(detail=True, methods=["get"])
    def export(self, request, pk=None):
        """
        Exports all of a form's submissions as CSV, JSON, or PDF.
        :query export_format: "csv" (default), "json", or "pdf"
        :return: (Response) a file download for csv/pdf, or a plain JSON array for json
        """
        form = self.get_object()
        submissions = form.submissions.all()
        export_format = request.query_params.get("export_format", "csv")

        if export_format == "json":
            serializer = FormSubmissionSerializer(submissions, many=True, context={"request": request})
            return Response(serializer.data)

        fields = form.schema.get("fields", [])
        header = ["submitted_at", "schema_version", *(field["label"] for field in fields)]

        if export_format == "pdf":
            pdf_rows = [
                [
                    timezone.localtime(submission.submitted_at).strftime("%b %d, %Y %I:%M %p"),
                    str(submission.schema_version),
                    *(_field_display_value(field, submission) for field in fields),
                ]
                for submission in submissions
            ]
            return self._export_pdf(form, ["Submitted At", "Schema Version", *(f["label"] for f in fields)], pdf_rows)

        rows = [
            [
                submission.submitted_at.isoformat(),
                str(submission.schema_version),
                *(_field_display_value(field, submission) for field in fields),
            ]
            for submission in submissions
        ]
        return self._export_csv(form, header, rows)

    @action(detail=True, methods=["post", "delete"], parser_classes=[MultiPartParser])
    def banner(self, request, pk=None):
        """
        Uploads (POST) or removes (DELETE) this form's banner image.
        :body banner: (multipart file, POST only) the image to set as the banner
        :return: (Response) 200 with the updated form, or 400 if the file is missing,
            too large, or not a valid image
        """
        form = self.get_object()

        if request.method == "DELETE":
            if form.banner_image:
                form.banner_image.delete(save=False)
                form.banner_image = None
                form.save(update_fields=["banner_image"])
            return Response(FormSerializer(form, context={"request": request}).data)

        banner = request.FILES.get("banner")
        if not banner:
            return Response({"detail": LABELS["err_banner_required"]}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_banner_upload(banner)
        except (BannerTooLarge, InvalidBannerFile) as error:
            return Response({"detail": error.message}, status=status.HTTP_400_BAD_REQUEST)

        form.banner_image = banner
        form.save(update_fields=["banner_image"])
        return Response(FormSerializer(form, context={"request": request}).data)

    def _export_csv(self, form, header, rows):
        """
        Builds a CSV file download for a form's submissions.
        :param form: the Form being exported
        :param header: (list of str) column headers
        :param rows: (list of list of str) one row per submission
        :return: (HttpResponse) text/csv attachment
        """
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(header)
        writer.writerows(rows)

        response = HttpResponse(buffer.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="{form.slug}-submissions.csv"'
        return response

    def _export_pdf(self, form, header, rows):
        """
        Builds a formatted PDF table of a form's submissions, landscape when there are
        more than 4 columns.
        :param form: the Form being exported
        :param header: (list of str) column headers
        :param rows: (list of list of str) one row per submission
        :return: (HttpResponse) application/pdf attachment
        """
        pagesize = landscape(letter) if len(header) > 4 else letter
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=pagesize,
            leftMargin=0.5 * inch,
            rightMargin=0.5 * inch,
            topMargin=0.6 * inch,
            bottomMargin=0.5 * inch,
        )

        title_style = ParagraphStyle(name="Title", fontSize=16, leading=20, textColor=colors.HexColor("#0f172a"))
        subtitle_style = ParagraphStyle(name="Subtitle", fontSize=9, leading=12, textColor=colors.HexColor("#64748b"))
        cell_style = ParagraphStyle(name="Cell", fontSize=8, leading=10, textColor=colors.HexColor("#1e293b"))
        header_style = ParagraphStyle(name="Header", fontSize=8, leading=10, textColor=colors.white)

        generated_at = timezone.localtime(timezone.now()).strftime("%b %d, %Y %I:%M %p")
        submission_count = f"{len(rows)} submission{'s' if len(rows) != 1 else ''}"
        story = [
            Paragraph(escape(form.name), title_style),
            Paragraph(f"{submission_count} &middot; generated {escape(generated_at)}", subtitle_style),
            Spacer(1, 0.2 * inch),
        ]

        table_data = [[Paragraph(escape(cell), header_style) for cell in header]]
        table_data += [[Paragraph(escape(cell), cell_style) for cell in row] for row in rows]

        table = Table(table_data, repeatRows=1, hAlign="LEFT")
        style = [
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ]
        for row_index in range(1, len(table_data)):
            if row_index % 2 == 0:
                style.append(("BACKGROUND", (0, row_index), (-1, row_index), colors.HexColor("#f1f5f9")))
        table.setStyle(TableStyle(style))

        story.append(table)
        doc.build(story)

        response = HttpResponse(buffer.getvalue(), content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{form.slug}-submissions.pdf"'
        return response


class PublicFormDetailView(generics.RetrieveAPIView):
    """
    Anonymous, read-only lookup of a single published form by its slug.
    """

    queryset = Form.objects.filter(status=Form.Status.PUBLISHED)
    serializer_class = PublicFormSerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"


class PublicSubmitView(APIView):
    """
    Anonymous submission endpoint for a published form. Honeypot-protected and rate
    limited per form and IP via SubmissionRateThrottle. Accepts either a plain JSON
    body ({"data": {...}}) or multipart/form-data (used whenever the schema has a
    "file" field, since the browser has to send real files alongside the rest of the
    answers; "data" then arrives as a JSON-encoded string field instead of nested JSON).
    """

    permission_classes = [AllowAny]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    throttle_classes = [SubmissionRateThrottle]

    def post(self, request, slug):
        """
        Accepts a submission for the form identified by slug.
        :param slug: the form's slug
        :return: (Response) 201 with the new submission id, or a translated 400 if the
            form is not accepting submissions, an attached file is too large, or the
            data fails schema validation
        """
        form = get_object_or_404(Form, slug=slug)

        if request.data.get(HONEYPOT_FIELD):
            # Bot tripped the honeypot: report success without touching the database so it
            # doesn't learn the field is a trap.
            return Response(
                {"id": None, "message": form.success_message},
                status=status.HTTP_201_CREATED,
            )

        raw_data = request.data.get("data", {})
        if isinstance(raw_data, str):
            try:
                raw_data = json.loads(raw_data) if raw_data else {}
            except json.JSONDecodeError as error:
                raise serializers.ValidationError({"detail": LABELS["err_invalid_submission_json"]}) from error

        payload = SubmissionCreateSerializer(data={"data": raw_data})
        payload.is_valid(raise_exception=True)

        try:
            submission = create_submission(
                form=form,
                data=payload.validated_data["data"],
                metadata={
                    "ip": request.META.get("REMOTE_ADDR"),
                    "user_agent": request.headers.get("User-Agent", ""),
                },
                files=request.FILES,
            )
        except FormNotAcceptingSubmissions as error:
            raise serializers.ValidationError({"detail": error.message}) from error
        except (AttachmentTooLarge, InvalidAttachmentType, TooManyAttachments) as error:
            raise serializers.ValidationError({"detail": error.message}) from error
        except DjangoValidationError as error:
            raise serializers.ValidationError({"detail": error.messages}) from error

        return Response(
            {"id": str(submission.id), "message": form.success_message},
            status=status.HTTP_201_CREATED,
        )


class SubmissionAttachmentDownloadView(APIView):
    """
    Owner-only download of a single file attached to one of a form's submissions.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        """
        :param pk: the SubmissionAttachment's id
        :return: (FileResponse) the stored file as an attachment download
        :errors: django.http.Http404 if the attachment does not exist or does not
            belong to a form owned by the requesting user
        """
        attachment = get_object_or_404(SubmissionAttachment, pk=pk)
        if attachment.submission.form.owner_id != request.user.id:
            raise Http404

        return FileResponse(
            attachment.file.open("rb"),
            as_attachment=True,
            filename=attachment.original_filename,
        )


class RegisterView(APIView):
    """
    Public registration endpoint: creates a user account and returns an API token.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        """
        :body username: desired username
        :body password: desired password
        :body email: (optional) email address
        :return: (Response) 201 with the new account's API token, or 400 if the
            username/password are missing or the username is already taken
        """
        try:
            _, token = register_user(
                username=request.data.get("username", ""),
                password=request.data.get("password", ""),
                email=request.data.get("email", ""),
            )
        except (MissingCredentials, UsernameAlreadyTaken) as error:
            return Response({"detail": error.message}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"token": token.key}, status=status.HTTP_201_CREATED)


class ProfileView(generics.RetrieveUpdateAPIView):
    """
    Lets the authenticated user view and update their own account details.
    """

    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        """
        :return: the current request's user, so this endpoint always acts on "self"
        """
        return self.request.user


class ChangePasswordView(APIView):
    """
    Lets the authenticated user change their own password.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        :body old_password: the account's current password, required to confirm identity
        :body new_password: the new password to set
        :return: (Response) 200 on success, or 400 if old_password is wrong or
            new_password fails Django's password validators
        """
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save()
        return Response({"detail": LABELS["msg_password_updated"]})


class AvatarUploadView(APIView):
    """
    Lets the authenticated user upload or remove their profile avatar.
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request):
        """
        :body avatar: (multipart file) the image to set as the user's avatar
        :return: (Response) 200 with the updated profile, or 400 if the file is missing,
            too large, or not a valid image
        """
        avatar = request.FILES.get("avatar")
        if not avatar:
            return Response({"detail": LABELS["err_avatar_required"]}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_avatar_upload(avatar)
        except (AvatarTooLarge, InvalidAvatarFile) as error:
            return Response({"detail": error.message}, status=status.HTTP_400_BAD_REQUEST)

        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        profile.avatar = avatar
        try:
            profile.full_clean()
        except DjangoValidationError as error:
            return Response({"detail": error.messages}, status=status.HTTP_400_BAD_REQUEST)
        profile.save()

        serializer = UserSerializer(request.user, context={"request": request})
        return Response(serializer.data)

    def delete(self, request):
        """
        Removes the current avatar, if any.
        :return: (Response) 200 with the updated profile
        """
        profile = getattr(request.user, "profile", None)
        if profile and profile.avatar:
            profile.avatar.delete(save=False)
            profile.avatar = None
            profile.save()

        serializer = UserSerializer(request.user, context={"request": request})
        return Response(serializer.data)
