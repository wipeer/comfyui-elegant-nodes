import json

import torch

from comfy_api.latest import io, ui


def to_text(source) -> str:
    """Same conversion as ComfyUI's Preview as Text (PreviewAny)."""
    if source is None:
        return "None"
    if isinstance(source, str):
        return source
    if isinstance(source, (int, float, bool)):
        return str(source)
    try:
        return json.dumps(source, indent=4, ensure_ascii=False)
    except Exception:
        try:
            return str(source)
        except Exception:
            return "source exists, but could not be serialized."


class ElegantAnyToString(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="ElegantAnyToString",
            display_name="Elegant Any to String",
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
        torch.set_printoptions(edgeitems=6)
        try:
            value = to_text(source)
        finally:
            torch.set_printoptions()
        return io.NodeOutput(value, ui=ui.PreviewText(value))
