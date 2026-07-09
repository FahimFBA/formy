from django.core.exceptions import ValidationError
from django.db import transaction

from .models import Form, FormSubmission, validate_submission_data


@transaction.atomic
def create_submission(*, form: Form, data: dict, metadata: dict | None = None) -> FormSubmission:
    if not form.is_published:
        raise ValidationError("This form is not accepting submissions.")

    validate_submission_data(form.schema, data)
    submission = FormSubmission(
        form=form,
        data=data,
        metadata=metadata or {},
        schema_version=form.schema_version,
    )
    submission.full_clean()
    submission.save()
    return submission

