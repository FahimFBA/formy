import csv
import io
from xml.sax.saxutils import escape

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from PIL import Image, UnidentifiedImageError
from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from rest_framework import generics, serializers, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .constants import HONEYPOT_FIELD
from .models import Form, UserProfile
from .permissions import IsOwner
from .serializers import (
    ChangePasswordSerializer,
    FormSerializer,
    FormSubmissionSerializer,
    PublicFormSerializer,
    SubmissionCreateSerializer,
    UserSerializer,
)
from .services import create_submission
from .throttling import SubmissionRateThrottle

User = get_user_model()


class FormViewSet(viewsets.ModelViewSet):
    serializer_class = FormSerializer
    permission_classes = [IsAuthenticated, IsOwner]

    def get_queryset(self):
        return Form.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=["get"])
    def submissions(self, request, pk=None):
        form = self.get_object()
        page = self.paginate_queryset(form.submissions.all())
        serializer = FormSubmissionSerializer(page, many=True)
        return self.get_paginated_response(serializer.data)

    @action(detail=True, methods=["get"])
    def export(self, request, pk=None):
        form = self.get_object()
        submissions = form.submissions.all()
        export_format = request.query_params.get("export_format", "csv")

        if export_format == "json":
            serializer = FormSubmissionSerializer(submissions, many=True)
            return Response(serializer.data)

        fields = form.schema.get("fields", [])
        header = ["submitted_at", "schema_version", *(field["label"] for field in fields)]

        if export_format == "pdf":
            pdf_rows = [
                [
                    timezone.localtime(submission.submitted_at).strftime("%b %d, %Y %I:%M %p"),
                    str(submission.schema_version),
                    *(str(submission.data.get(field["name"], "")) for field in fields),
                ]
                for submission in submissions
            ]
            return self._export_pdf(form, ["Submitted At", "Schema Version", *(f["label"] for f in fields)], pdf_rows)

        rows = [
            [
                submission.submitted_at.isoformat(),
                str(submission.schema_version),
                *(str(submission.data.get(field["name"], "")) for field in fields),
            ]
            for submission in submissions
        ]
        return self._export_csv(form, header, rows)

    def _export_csv(self, form, header, rows):
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(header)
        writer.writerows(rows)

        response = HttpResponse(buffer.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="{form.slug}-submissions.csv"'
        return response

    def _export_pdf(self, form, header, rows):
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
    queryset = Form.objects.filter(status=Form.Status.PUBLISHED)
    serializer_class = PublicFormSerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"


class PublicSubmitView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [SubmissionRateThrottle]

    def post(self, request, slug):
        form = get_object_or_404(Form, slug=slug)

        if request.data.get(HONEYPOT_FIELD):
            # Bot tripped the honeypot: report success without touching the database so it
            # doesn't learn the field is a trap.
            return Response(
                {"id": None, "message": form.success_message},
                status=status.HTTP_201_CREATED,
            )

        payload = SubmissionCreateSerializer(data=request.data)
        payload.is_valid(raise_exception=True)

        try:
            submission = create_submission(
                form=form,
                data=payload.validated_data["data"],
                metadata={
                    "ip": request.META.get("REMOTE_ADDR"),
                    "user_agent": request.headers.get("User-Agent", ""),
                },
            )
        except DjangoValidationError as error:
            raise serializers.ValidationError({"detail": error.messages}) from error

        return Response(
            {"id": str(submission.id), "message": form.success_message},
            status=status.HTTP_201_CREATED,
        )


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username", "").strip()
        password = request.data.get("password", "")
        email = request.data.get("email", "").strip()

        if not username or not password:
            return Response(
                {"detail": "username and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if User.objects.filter(username=username).exists():
            return Response({"detail": "username already taken."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=username, email=email, password=password)
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key}, status=status.HTTP_201_CREATED)


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save()
        return Response({"detail": "Password updated."})


class AvatarUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request):
        avatar = request.FILES.get("avatar")
        if not avatar:
            return Response({"detail": "avatar file is required."}, status=status.HTTP_400_BAD_REQUEST)
        if avatar.size > settings.MAX_AVATAR_UPLOAD_BYTES:
            return Response({"detail": "avatar must be 5MB or smaller."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            Image.open(avatar).verify()
        except (UnidentifiedImageError, OSError):
            return Response({"detail": "avatar must be a valid image file."}, status=status.HTTP_400_BAD_REQUEST)
        avatar.seek(0)

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
        profile = getattr(request.user, "profile", None)
        if profile and profile.avatar:
            profile.avatar.delete(save=False)
            profile.avatar = None
            profile.save()

        serializer = UserSerializer(request.user, context={"request": request})
        return Response(serializer.data)
