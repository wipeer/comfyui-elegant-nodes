import json
import re

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


MAX_SOURCES = 20
_ESCAPES = {"n": "\n", "t": "\t", "r": "\r", "\\": "\\"}


def unescape(delimiter: str) -> str:
    r"""Turns the typed escapes \n, \t, \r and \\ into the characters they stand for."""
    return re.sub(r"\\([ntr\\])", lambda m: _ESCAPES[m.group(1)], delimiter)


class ElegantAnyToStringAdvanced(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        source_names = [f"source_{i}" for i in range(1, MAX_SOURCES + 1)]
        return io.Schema(
            node_id="ElegantAnyToStringAdvanced",
            display_name="Elegant Any to String (Advanced)",
            search_aliases=["any to string", "join", "concatenate", "combine text", "preview", "show text", "debug"],
            category="utilities/elegant",
            description="Converts several values to strings and joins them with a delimiter. "
            "A new source input appears each time you connect the last one.",
            is_output_node=True,
            inputs=[
                io.Autogrow.Input(
                    "sources",
                    template=io.Autogrow.TemplateNames(io.AnyType.Input("source"), names=source_names, min=1),
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
    def execute(cls, sources: dict, delimiter: str) -> io.NodeOutput:
        torch.set_printoptions(edgeitems=6)
        try:
            names = [f"source_{i}" for i in range(1, MAX_SOURCES + 1)]
            parts = [to_text(sources[name]) for name in names if name in sources]
        finally:
            torch.set_printoptions()
        value = unescape(delimiter).join(parts)
        return io.NodeOutput(value, ui=ui.PreviewText(value))
