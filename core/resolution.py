"""Width and height from an aspect ratio, keeping the area of a base x base square; the RESOLUTION type."""

import math
import re
from typing import NamedTuple

# Landscape form; the orientation switch flips them (3:2 -> 2:3).
# Keep in sync with ASPECT_RATIOS in web/js/resolution_selector.js.
ASPECT_RATIOS: dict[str, tuple[int, int]] = {
    "1:1": (1, 1),
    "5:4": (5, 4),
    "9:7": (9, 7),
    "4:3": (4, 3),
    "3:2": (3, 2),
    "16:9": (16, 9),
    "21:9": (21, 9),
}

ROUND_TO_OPTIONS = ["8", "16", "32", "64"]


def compute_resolution(aspect_ratio: str, landscape: bool, base: int, round_to: int) -> tuple[int, int]:
    """Width and height with about the same pixel count as a base x base square.

    Mirrors computeResolution() in web/js/resolution_selector.js, which shows the
    result live in the UI; both must give identical numbers.
    """
    a, b = ASPECT_RATIOS[aspect_ratio]
    scale = math.sqrt(a / b if landscape else b / a)
    # floor(x + 0.5) rather than round(): Python rounds halves to even, JavaScript does not.
    width = max(round_to, math.floor(base * scale / round_to + 0.5) * round_to)
    height = max(round_to, math.floor(base / scale / round_to + 0.5) * round_to)
    return width, height


# ---------------------------------------------------------------------------
# The RESOLUTION type: a width and a height travelling on one link
# ---------------------------------------------------------------------------


class Resolution(NamedTuple):
    """A width and a height. The value of the RESOLUTION type (Elegant Resolution Reroute)."""

    width: int
    height: int

    def __str__(self) -> str:
        return f"{self.width}x{self.height}"


# Two numbers: separated by x, ×, *, a comma, a semicolon, a slash, or just spaces.
_SIZE = re.compile(r"(\d+)\s*(?:[x×*,;/]|\s)\s*(\d+)", re.IGNORECASE)
_SQUARE = re.compile(r"\d+")


def parse_resolution(text: str) -> Resolution | None:
    """Width and height from text like "1024x1024", "1024 x 1024", "1024 1024" or "1024, 1024".

    Brackets around it are ignored; a single number such as "1024" is a square. Empty text gives
    None (nothing given); text that isn't a size raises ValueError.
    """
    cleaned = str(text).strip().strip("()[]{}").strip()
    if not cleaned:
        return None
    if _SQUARE.fullmatch(cleaned):
        return _checked(int(cleaned), int(cleaned))
    match = _SIZE.fullmatch(cleaned)
    if not match:
        raise ValueError(f'"{text}" isn\'t a size. Use two numbers, like 1024x1024, 1024 1024 or 1024, 1024.')
    return _checked(int(match.group(1)), int(match.group(2)))


def _checked(width: int, height: int) -> Resolution:
    if width < 1 or height < 1:
        raise ValueError(f"Width and height must be at least 1, got {width} x {height}.")
    return Resolution(width, height)


def resolve_resolution(width: int | None = None, height: int | None = None, resolution=None) -> Resolution:
    """Combines the three ways to give a size; a width or height given on its own wins.

    `resolution` is a Resolution (or a pair), or text as parse_resolution reads it. It supplies
    whatever width or height isn't given directly.
    """
    base: Resolution | None
    if resolution is None or isinstance(resolution, str):
        base = parse_resolution(resolution) if resolution is not None else None
    else:
        base = Resolution(*resolution)

    chosen_width = width if width is not None else (base.width if base else None)
    chosen_height = height if height is not None else (base.height if base else None)
    if chosen_width is None or chosen_height is None:
        raise ValueError("Give a resolution (like 1024x1024), or both a width and a height.")
    return _checked(int(chosen_width), int(chosen_height))
