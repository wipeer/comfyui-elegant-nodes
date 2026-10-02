"""Turning arbitrary values into display text."""

import json
import re

_ESCAPES = {"n": "\n", "t": "\t", "r": "\r", "\\": "\\"}


def to_text(value) -> str:
    """Same conversion as ComfyUI's Preview as Text (PreviewAny)."""
    if value is None:
        return "None"
    if isinstance(value, str):
        return value
    if isinstance(value, (int, float, bool)):
        return str(value)
    try:
        return json.dumps(value, indent=4, ensure_ascii=False)
    except Exception:
        try:
            return str(value)
        except Exception:
            return "source exists, but could not be serialized."


def unescape(text: str) -> str:
    r"""Turns the typed escapes \n, \t, \r and \\ into the characters they stand for."""
    return re.sub(r"\\([ntr\\])", lambda match: _ESCAPES[match.group(1)], text)
