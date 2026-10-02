import torch

from comfy_api.latest import io, ui

from ..core.text import to_text, unescape

MAX_SOURCES = 20
SOURCE_NAMES = [f"source_{i}" for i in range(1, MAX_SOURCES + 1)]


def _to_text(value) -> str:
    # Show the start and end of each tensor dimension instead of the whole thing.
    torch.set_printoptions(edgeitems=6)
    try:
        return to_text(value)
    finally:
        torch.set_printoptions()


class ElegantAnyToStringPreview(io.ComfyNode):
    """Any value as plain text. Display, also on subgraph nodes, is in web/js/text_preview.js."""

    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="ElegantAnyToStringPreview",
            display_name="Elegant Any to String Preview",
            search_aliases=["any to string", "preview", "preview text", "show text", "debug", "inspect", "to string"],
            category="utilities/elegant",
            description="Converts any value to a string and shows it as plain text, also on the "
            "subgraph node when used inside a subgraph.",
            is_output_node=True,
            inputs=[io.AnyType.Input("source")],
            outputs=[io.String.Output(display_name="string")],
        )

    @classmethod
    def execute(cls, source=None) -> io.NodeOutput:
        text = _to_text(source)
        return io.NodeOutput(text, ui=ui.PreviewText(text))


class ElegantAnyToStringMultiPreview(io.ComfyNode):
    """Several values as text, joined with a delimiter."""

    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="ElegantAnyToStringMultiPreview",
            display_name="Elegant Any to String Multi Preview",
            search_aliases=["any to string", "join", "concatenate", "combine text", "preview", "show text", "debug"],
            category="utilities/elegant",
            description="Converts several values to strings and joins them with a delimiter. "
            "A new source input appears each time you connect the last one.",
            is_output_node=True,
            inputs=[
                io.Autogrow.Input(
                    "sources",
                    template=io.Autogrow.TemplateNames(io.AnyType.Input("source"), names=SOURCE_NAMES, min=1),
                    tooltip="Connect values here; a new input appears each time you connect the last one.",
                ),
                io.String.Input(
                    "delimiter",
                    default="\\n",
                    tooltip="Put between the values. Type \\n for a new line and \\t for a tab.",
                ),
            ],
            outputs=[io.String.Output(display_name="string")],
        )

    @classmethod
    def execute(cls, sources: io.Autogrow.Type, delimiter: str) -> io.NodeOutput:
        parts = [_to_text(sources[name]) for name in SOURCE_NAMES if name in sources]
        text = unescape(delimiter).join(parts)
        return io.NodeOutput(text, ui=ui.PreviewText(text))
