from comfy_api.latest import io

from ..core.resolution import ASPECT_RATIOS, ROUND_TO_OPTIONS, compute_resolution


class ElegantResolutionSelector(io.ComfyNode):
    """Width and height from an aspect ratio. The live result line is in web/js/resolution_selector.js."""

    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="ElegantResolutionSelector",
            display_name="Elegant Resolution Selector",
            search_aliases=["resolution", "aspect ratio", "size", "width height", "elegant resolution"],
            category="utilities/elegant",
            description="Width and height for an aspect ratio, keeping about the same pixel count "
            "as a base x base square.",
            inputs=[
                io.Combo.Input(
                    "aspect_ratio",
                    options=list(ASPECT_RATIOS),
                    default="1:1",
                    tooltip="Aspect ratio. Shown flipped (e.g. 2:3) in portrait.",
                ),
                io.Boolean.Input(
                    "orientation",
                    default=True,
                    label_on="landscape",
                    label_off="portrait",
                    tooltip="Landscape: wider than tall. Portrait: taller than wide. No effect at 1:1.",
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
                    options=ROUND_TO_OPTIONS,
                    default="16",
                    tooltip="Width and height are rounded to a multiple of this. 8 is the minimum for "
                    "latent models, 16 suits Flux/SD3, 64 matches SDXL training sizes.",
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
