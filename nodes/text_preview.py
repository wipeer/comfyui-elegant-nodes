import re

import torch

from comfy_api.latest import io, ui

from ..core.switch import OUT_OF_RANGE_OPTIONS, pick_index
from ..core.text import to_text, unescape
from .preview_option import show_preview_input

MAX_SOURCES = 20
SOURCE_NAMES = [f"source_{i}" for i in range(1, MAX_SOURCES + 1)]


def _wrap_input():
    # Display only: the frontend (web/js/text_preview.js) wraps the preview box.
    return io.Boolean.Input(
        "wrap_text",
        default=False,
        label_on="on",
        label_off="off",
        advanced=True,
        tooltip="Wrap long lines to the width of the preview box instead of scrolling sideways.",
    )


def _to_text(value) -> str:
    # Show the start and end of each tensor dimension instead of the whole thing.
    torch.set_printoptions(edgeitems=6)
    try:
        return to_text(value)
    finally:
        torch.set_printoptions()


_VARIABLE = re.compile(r"\$(?:var|source_)(\d+)")


def _fill_template(template: str, sources: dict) -> str:
    """Replaces $var1, $var2, … (also $source_1) with the text of that source; unknown ones become empty."""

    def replace(match):
        name = f"source_{int(match.group(1))}"
        return _to_text(sources[name]) if name in sources else ""

    return _VARIABLE.sub(replace, template)


class ElegantAnyToStringPreview(io.ComfyNode):
    """Any value as plain text. Display, also on subgraph nodes, is in web/js/text_preview.js."""

    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="ElegantAnyToStringPreview",
            display_name="Elegant Any to String Preview",
            search_aliases=["any to string", "preview", "preview text", "show text", "debug", "inspect", "to string"],
            category="elegant",
            description="Converts any value to a string and shows it as plain text, also on the "
            "subgraph node when used inside a subgraph.",
            is_output_node=True,
            inputs=[io.AnyType.Input("source"), _wrap_input(), show_preview_input()],
            outputs=[io.String.Output(display_name="string")],
        )

    @classmethod
    def execute(cls, source=None, wrap_text: bool = False, show_preview: bool = True) -> io.NodeOutput:
        text = _to_text(source)
        return io.NodeOutput(text, ui=ui.PreviewText(text))


def _affix_inputs(name: str, where: str):
    # web/js/text_preview.js shows the text field only when its switch is on and the mode is concat.
    return [
        io.Boolean.Input(
            f"use_{name}",
            default=False,
            optional=True,
            label_on="on",
            label_off="off",
            advanced=True,
            tooltip=f"concat: add the {name} text {where} the joined text.",
        ),
        io.String.Input(
            name,
            default="",
            optional=True,
            tooltip=f"concat, when use_{name} is on: text added {where} the joined text. "
            "Type \\n for a new line and \\t for a tab.",
        ),
    ]


class ElegantAnyToStringMultiPreview(io.ComfyNode):
    """Several values as text: joined with a delimiter (concat), or one picked by index (switch)."""

    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="ElegantAnyToStringMultiPreview",
            display_name="Elegant Any to String Multi Preview",
            search_aliases=[
                "any to string", "join", "concatenate", "combine text", "switch", "select", "index",
                "preview", "show text", "debug",
            ],
            category="elegant",
            description="Converts several values to strings and joins them with a delimiter (concat), or "
            "picks one of them by index (switch). A new source input appears each time you connect "
            "the last one.",
            is_output_node=True,
            inputs=[
                io.Autogrow.Input(
                    "sources",
                    # Not lazy: ComfyUI (0.38) doesn't apply lazy evaluation to auto-growing
                    # inputs, so in switch mode every connected source is still computed.
                    template=io.Autogrow.TemplateNames(io.AnyType.Input("source"), names=SOURCE_NAMES, min=1),
                    tooltip="Connect values here; a new input appears each time you connect the last one.",
                ),
                io.String.Input(
                    "delimiter",
                    default="\\n",
                    tooltip="concat: put between the values. Type \\n for a new line and \\t for a tab.",
                ),
                _wrap_input(),
                io.Combo.Input(
                    "mode",
                    options=["concat", "switch", "template"],
                    default="concat",
                    tooltip="concat: join all sources. switch: use only the source chosen by index. "
                    "template: write text with $var1, $var2… standing for the sources.",
                ),
                io.Int.Input(
                    "index",
                    default=1,
                    min=-(2**31),
                    max=2**31 - 1,
                    tooltip="switch: which source to use, counting from 1 (source_1). Can be connected.",
                ),
                io.Combo.Input(
                    "out_of_range",
                    options=OUT_OF_RANGE_OPTIONS,
                    default="clamp",
                    advanced=True,
                    tooltip="switch: what an index outside the sources does. error: stop with a message. "
                    "clamp: below 1 uses the first source, above the last uses the last. "
                    "wrap: count around (one past the last is the first again).",
                ),
                # Added in 1.6.0: last, so workflows saved before keep their widget values, and
                # optional, so prompts saved before (API format) stay valid.
                *_affix_inputs("prefix", "before"),
                *_affix_inputs("suffix", "after"),
                io.String.Input(
                    "template",
                    default="",
                    multiline=True,
                    optional=True,
                    tooltip="template: your text; $var1, $var2… (also $source_1…) are replaced by the "
                    "text of that source. Variables without a connected source are replaced with nothing.",
                ),
                show_preview_input(),
            ],
            outputs=[
                io.String.Output(display_name="string"),
                io.AnyType.Output(
                    display_name="value",
                    tooltip="switch: the chosen source unchanged (image, model, anything). concat: the joined text.",
                ),
            ],
        )

    @classmethod
    def execute(
        cls,
        sources: io.Autogrow.Type,
        delimiter: str,
        wrap_text: bool = False,
        mode: str = "concat",
        index: int = 1,
        out_of_range: str = "error",
        use_prefix: bool = False,
        prefix: str = "",
        use_suffix: bool = False,
        suffix: str = "",
        template: str = "",
        show_preview: bool = True,
    ) -> io.NodeOutput:
        names = [name for name in SOURCE_NAMES if name in sources]
        if mode == "template":
            text = _fill_template(template, sources)
            return io.NodeOutput(text, text, ui=ui.PreviewText(text))
        if mode == "switch":
            name = names[pick_index(index, len(names), out_of_range)]  # raises if out of range or empty
            value = sources[name]
            text = _to_text(value)
            preview = f"▶ {name}\n{text}"
            return io.NodeOutput(text, value, ui=ui.PreviewText(preview))

        text = unescape(delimiter).join(_to_text(sources[name]) for name in names)
        text = (unescape(prefix) if use_prefix else "") + text + (unescape(suffix) if use_suffix else "")
        return io.NodeOutput(text, text, ui=ui.PreviewText(text))
