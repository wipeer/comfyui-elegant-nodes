"""Named notes: tabs, each with a name and a text value (Elegant Notes nodes)."""

import json
import os

from .switch import pick_index

FILE_EXTENSION = ".json"


def unique_name(name: str, taken: list[str]) -> str:
    """`name`, or `name_2`, `name_3`, … when `taken` already has it."""
    if name not in taken:
        return name
    number = 2
    while f"{name}_{number}" in taken:
        number += 1
    return f"{name}_{number}"


def clean_tabs(items) -> list[dict]:
    """Tabs as {"name", "value"} dicts of text. Empty names become tab1, tab2, …; repeated names get a suffix."""
    if not isinstance(items, list):
        raise ValueError("Notes must be a list of tabs.")
    tabs = []
    for number, item in enumerate(items, start=1):
        if not isinstance(item, dict):
            raise ValueError(f"Tab {number} must be an object with a name and a value.")
        name = str(item.get("name") or "").strip() or f"tab{number}"
        value = item.get("value")
        tabs.append(
            {
                "name": unique_name(name, [tab["name"] for tab in tabs]),
                "value": "" if value is None else str(value),
            }
        )
    return tabs


def parse_notes(text: str) -> list[dict]:
    """The tabs in `text` (JSON). Blank text is no tabs."""
    if not text or not text.strip():
        return []
    try:
        data = json.loads(text)
    except json.JSONDecodeError as error:
        raise ValueError(f"The notes are not valid JSON: {error}") from error
    return clean_tabs(data)


def dump_notes(tabs: list[dict]) -> str:
    """`tabs` as JSON text, the way the notes are stored in a file and in the workflow."""
    return json.dumps(clean_tabs(tabs), ensure_ascii=False, indent=2)


def merge(named_lists: list[list[dict]]) -> list[dict]:
    """One flat list of the tabs of all `named_lists`, in order. Repeated names get a suffix."""
    return clean_tabs([tab for tabs in named_lists for tab in tabs])


def pick_tab(tabs: list[dict], index: int, out_of_range: str = "error") -> dict:
    """The tab at 1-based `index`, with the same out-of-range rules as the switch."""
    if not tabs:
        raise ValueError("There are no tabs: connect a named list or add a tab.")
    if out_of_range == "error" and not 1 <= index <= len(tabs):
        raise ValueError(f"Index {index} is out of range: there are {len(tabs)} tabs (1–{len(tabs)}).")
    return tabs[pick_index(index, len(tabs), out_of_range)]


def note_path(base: str, path: str) -> str:
    """`path` inside the folder `base`, with the .json extension added when missing. Refuses anything outside it."""
    path = (path or "").strip()
    if not path:
        raise ValueError("Type the file path first.")
    if not path.lower().endswith(FILE_EXTENSION):
        path += FILE_EXTENSION
    base = os.path.abspath(base)
    full = os.path.abspath(os.path.join(base, path))
    if os.path.commonpath([base, full]) != base:
        raise ValueError(f"Path {path!r} is outside the output directory.")
    return full


def read_notes(full_path: str) -> list[dict]:
    if not os.path.isfile(full_path):
        raise ValueError(f"File not found: {os.path.basename(full_path)}")
    with open(full_path, encoding="utf-8") as file:
        return parse_notes(file.read())


def write_notes(full_path: str, tabs: list[dict]) -> None:
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as file:
        file.write(dump_notes(tabs) + "\n")

