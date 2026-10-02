import math

from comfy_api.latest import io

# Listed in landscape form; the orientation switch turns e.g. 3:2 into 2:3.
ASPECT_RATIOS = {
    "1:1": (1, 1),
    "5:4": (5, 4),
    "9:7": (9, 7),
    "4:3": (4, 3),
    "3:2": (3, 2),
    "16:9": (16, 9),
    "21:9": (21, 9),
}

ROUND_TO = ["8", "16", "32", "64"]


def compute_resolution(aspect_ratio: str, landscape: bool, base: int, round_to: int) -> tuple[int, int]:
    """Width and height with about the same area as a base x base square.

    Must stay in sync with computeResolution() in web/js/elegant_resolution.js,
    which shows the result live in the UI.
    """
    a, b = ASPECT_RATIOS[aspect_ratio]
    ratio = a / b if landscape else b / a
    scale = math.sqrt(ratio)
    # floor(x + 0.5) rather than round(): Python rounds halves to even, JS does not.
    width = max(round_to, math.floor(base * scale / round_to + 0.5) * round_to)
    height = max(round_to, math.floor(base / scale / round_to + 0.5) * round_to)
    return width, height


class ElegantResolution(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="ElegantResolution",
            display_name="Elegant Resolution",
            search_aliases=["resolution", "aspect ratio", "size", "width height", "elegant resolution"],
            category="utilities/elegant",
            description="Width and height for an aspect ratio, keeping about the same pixel count "
            "as a base x base square.",
            inputs=[
                io.Combo.Input(
                    "aspect_ratio",
                    options=list(ASPECT_RATIOS),
                    default="1:1",
                    tooltip="Aspect ratio in landscape form. Use the orientation switch for portrait.",
                ),
                io.Boolean.Input(
                    "orientation",
                    default=True,
                    label_on="landscape",
                    label_off="portrait",
                    tooltip="Landscape: wider than tall. Portrait: taller than wide. Has no effect at 1:1.",
                ),
                io.Int.Input(
                    "base",
                    default=1024,
                    min=64,
                    max=16384,
                    step=8,
                    tooltip="Side of the square (1:1) image. Other ratios keep about the same pixel "
                    "count: 1024 gives about 1 MP for every ratio.",
                ),
                io.Combo.Input(
                    "round_to",
                    options=ROUND_TO,
                    default="16",
                    tooltip="Width and height are rounded to a multiple of this. 8 is the minimum for "
                    "latent models, 16 is safe for Flux/SD3, 64 matches SDXL training sizes.",
                ),
            ],
            outputs=[
                io.Int.Output(display_name="width"),
                io.Int.Output(display_name="height"),
            ],
        )

    @classmethod
    def execute(cls, aspect_ratio: str, orientation: bool, base: int, round_to: str) -> io.NodeOutput:
        width, height = compute_resolution(aspect_ratio, orientation, base, int(round_to))
        return io.NodeOutput(width, height)
