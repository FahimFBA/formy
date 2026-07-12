# By: Md. Fahim Bin Amin
#
# Loads the shared label-universe/labels.json registry so default error and response
# messages live in one place instead of being hardcoded across services/views/serializers.
# The API itself does not localize per request, so this exposes the English ("en")
# string for each key; the frontend uses the same file's es/zh strings directly. See
# label-universe/README.md.

import json
from pathlib import Path

_LABELS_PATH = Path(__file__).resolve().parent.parent.parent / "label-universe" / "labels.json"
_RAW_LABELS = json.loads(_LABELS_PATH.read_text())

LABELS = {key: value["en"] for key, value in _RAW_LABELS.items()}
