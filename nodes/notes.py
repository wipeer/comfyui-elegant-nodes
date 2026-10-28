"""Elegant Notes: tabs with names and text, and the Merge node that joins them."""

from aiohttp import web

import folder_paths
from comfy_api.latest import io
from server import PromptServer

from ..core.notes import (
    clean_tabs,
    dump_notes,
    merge,
    note_path,
    parse_notes,
    pick_tab,
    read_notes,
    write_notes,
)
from ..core.switch import OUT_OF_RANGE_OPTIONS
from .types import NamedListType

MAX_LISTS = 20
LIST_NAMES = [f"list_{i}" for i in range(1, MAX_LISTS + 1)]

# The tabs are edited in a box on the node (web/js/notes.js), stored as JSON in this widget.
NOTES_INPUT = "notes"
NOTES_TOOLTIP = "The tabs, as JSON: edit them on the node. Or connect a named list instead."


def _tabs_output(name: str, tooltip: str):
    return io.String.Output(display_name=name, is_output_list=True, tooltip=tooltip)


class ElegantNotes(io.ComfyNode):
    """Tabs of text, each with a name. Outputs them as one named list."""

    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="ElegantNotes",
            display_name="Elegant Notes",
            search_aliases=["notes", "tabs", "text tabs", "named text", "memo", "snippets"],
            category="elegant",
            description="Tabs of text, each with a name you can change. Outputs them as a named list "
            "for Elegant Notes Merge.",
            inputs=[
                io.MultiType.Input(
                    io.String.Input(NOTES_INPUT, default="[]", multiline=True, tooltip=NOTES_TOOLTIP),
                    types=[NamedListType],
                ),
            ],
            outputs=[NamedListType.Output(display_name="named list")],
        )

    @classmethod
    def execute(cls, notes) -> io.NodeOutput:
        # Text: the tabs as JSON from the node. A named list connected in: used as it is.
        return io.NodeOutput(clean_tabs(notes) if isinstance(notes, list) else parse_notes(notes))


class ElegantNotesMerge(io.ComfyNode):
    """Joins named lists into one, and gives out the tabs as lists, or one tab by index."""

    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="ElegantNotesMerge",
            display_name="Elegant Notes Merge",
            search_aliases=["notes merge", "merge notes", "combine tabs", "index", "select tab", "named list"],
            category="elegant",
            description="Joins the named lists of Elegant Notes into one flat list (no nesting), and gives "
            "out the tab names and values as lists, or the tab at an index. A new input appears each "
            "time you connect the last one.",
            is_output_node=True,
            inputs=[
                io.Autogrow.Input(
                    "lists",
                    template=io.Autogrow.TemplateNames(NamedListType.Input("list"), names=LIST_NAMES, min=1),
                    tooltip="Connect named lists here; a new input appears each time you connect the last one.",
                ),
                io.Int.Input(
                    "index",
                    default=1,
                    min=-(2**31),
                    max=2**31 - 1,
                    tooltip="Which tab the single tab outputs give, counting from 1. Can be connected.",
                ),
                io.Combo.Input(
                    "out_of_range",
                    options=OUT_OF_RANGE_OPTIONS,
                    default="clamp",
                    advanced=True,
                    tooltip="What an index outside the tabs does. error: stop with a message. "
                    "clamp (default): below 1 uses the first tab, above the last uses the last. "
                    "wrap: count around (one past the last is the first again).",
                ),
            ],
            outputs=[
                NamedListType.Output(display_name="named list"),
                _tabs_output("tab names", "The names of all tabs, in order."),
                _tabs_output("tab values", "The values of all tabs, in order."),
                io.String.Output(display_name="tab name", tooltip="The name of the tab at the index."),
                io.String.Output(display_name="tab value", tooltip="The value of the tab at the index."),
                io.Int.Output(display_name="count", tooltip="How many tabs there are."),
            ],
        )

    @classmethod
    def execute(
        cls,
        lists: io.Autogrow.Type,
        index: int = 1,
        out_of_range: str = "clamp",
    ) -> io.NodeOutput:
        connected = [lists[name] for name in LIST_NAMES if name in lists and lists[name] is not None]
        tabs = merge(connected)
        tab = pick_tab(tabs, index, out_of_range)  # raises if out of range or empty
        return io.NodeOutput(
            tabs,
            [item["name"] for item in tabs],
            [item["value"] for item in tabs],
            tab["name"],
            tab["value"],
            len(tabs),
        )


# Load and Save (web/js/notes.js, the Files panel). Paths are kept inside the output folder.

def _output_directory() -> str:
    return folder_paths.get_output_directory()


@PromptServer.instance.routes.post("/elegant/notes/load")
async def load_notes_route(request):
    body = await request.json()
    try:
        tabs = read_notes(note_path(_output_directory(), body.get("path", "")))
    except (ValueError, OSError) as error:
        return web.json_response({"error": str(error)}, status=400)
    return web.json_response({"notes": dump_notes(tabs)})


@PromptServer.instance.routes.post("/elegant/notes/save")
async def save_notes_route(request):
    body = await request.json()
    try:
        full_path = note_path(_output_directory(), body.get("path", ""))
        write_notes(full_path, parse_notes(body.get("notes", "[]")))
    except (ValueError, OSError) as error:
        return web.json_response({"error": str(error)}, status=400)
    return web.json_response({"path": full_path})
