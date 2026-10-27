from comfy_api.latest import io

from ..core.resolution import resolve_resolution
from .types import ResolutionType


class ElegantResolutionReroute(io.ComfyNode):
    """Width, height and RESOLUTION in any combination, out as all three plus text."""

    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="ElegantResolutionReroute",
            display_name="Elegant Resolution Reroute",
            search_aliases=[
                "resolution", "size", "width height", "width and height", "dimensions", "split size",
                "combine size", "1024x1024", "reroute",
            ],
            category="elegant",
            description="Width and height as one link. Give a width and a height, or a resolution (type "
            "1024x1024, 1024 1024 or 1024, 1024, or connect a RESOLUTION or text), and get width, height, "
            "the combined RESOLUTION and its text back.",
            inputs=[
                io.Int.Input(
                    "width",
                    optional=True,
                    force_input=True,
                    tooltip="Connect a width. It replaces the width of the resolution.",
                ),
                io.Int.Input(
                    "height",
                    optional=True,
                    force_input=True,
                    tooltip="Connect a height. It replaces the height of the resolution.",
                ),
                io.MultiType.Input(
                    io.String.Input(
                        "resolution",
                        default="1024x1024",
                        optional=True,
                        tooltip="Width and height as text: 1024x1024, 1024 x 1024, 1024 1024, 1024, 1024. "
                        "One number is a square. You can also connect text or a RESOLUTION.",
                    ),
                    types=[ResolutionType],
                ),
                # Advanced: web/js/resolution_reroute.js shows the text output only when this is on.
                io.Boolean.Input(
                    "text_output",
                    default=False,
                    optional=True,
                    label_on="on",
                    label_off="off",
                    advanced=True,
                    tooltip="Show the text output (the size as text, like 1024x1024).",
                ),
            ],
            outputs=[
                io.Int.Output(display_name="width"),
                io.Int.Output(display_name="height"),
                ResolutionType.Output(display_name="resolution"),
                io.String.Output(
                    display_name="text",
                    tooltip='The size as text, like "1024x1024". Switch it on with text_output (advanced, ⚙).',
                ),
            ],
        )

    @classmethod
    def execute(cls, width=None, height=None, resolution=None, text_output: bool = False) -> io.NodeOutput:
        # text_output only shows or hides the text output on the node; the text is always made.
        size = resolve_resolution(width, height, resolution)
        return io.NodeOutput(size.width, size.height, size, str(size))
