"""Width and height from an aspect ratio, keeping the area of a base x base square."""

import math

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
