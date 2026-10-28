import pytest

from core.notes import (
    clean_tabs,
    dump_notes,
    merge,
    note_path,
    parse_notes,
    pick_tab,
    preview_text,
    read_notes,
    unique_name,
    write_notes,
)


def test_unique_name():
    assert unique_name("a", []) == "a"
    assert unique_name("a", ["a"]) == "a_2"
    assert unique_name("a", ["a", "a_2"]) == "a_3"


def test_clean_tabs_fills_empty_names_and_suffixes_repeats():
    tabs = clean_tabs([{"name": " ", "value": "x"}, {"name": "b"}, {"name": "b", "value": None}])
    assert tabs == [
        {"name": "tab1", "value": "x"},
        {"name": "b", "value": ""},
        {"name": "b_2", "value": ""},
    ]


def test_clean_tabs_rejects_bad_shapes():
    with pytest.raises(ValueError, match="list of tabs"):
        clean_tabs({"name": "a"})
    with pytest.raises(ValueError, match="Tab 2"):
        clean_tabs([{"name": "a"}, "oops"])


def test_parse_and_dump_round_trip():
    text = dump_notes([{"name": "é", "value": "line\nnext"}])
    assert parse_notes(text) == [{"name": "é", "value": "line\nnext"}]
    assert parse_notes("") == []
    assert parse_notes("  \n") == []
    with pytest.raises(ValueError, match="not valid JSON"):
        parse_notes("{nope")


def test_merge_flattens_in_order_with_unique_names():
    first = [{"name": "intro", "value": "1"}]
    second = [{"name": "intro", "value": "2"}, {"name": "end", "value": "3"}]
    assert merge([first, second]) == [
        {"name": "intro", "value": "1"},
        {"name": "intro_2", "value": "2"},
        {"name": "end", "value": "3"},
    ]
    assert merge([]) == []


def test_pick_tab_by_index_and_out_of_range():
    tabs = [{"name": "a", "value": "1"}, {"name": "b", "value": "2"}]
    assert pick_tab(tabs, 2) == {"name": "b", "value": "2"}
    assert pick_tab(tabs, 5, "clamp") == {"name": "b", "value": "2"}
    assert pick_tab(tabs, 3, "wrap") == {"name": "a", "value": "1"}
    with pytest.raises(ValueError, match="out of range"):
        pick_tab(tabs, 5)
    with pytest.raises(ValueError, match="no tabs"):
        pick_tab([], 1)


def test_note_path_adds_extension_and_stays_inside(tmp_path):
    base = str(tmp_path)
    assert note_path(base, "sub/notes") == str(tmp_path / "sub" / "notes.json")
    assert note_path(base, "a.JSON") == str(tmp_path / "a.JSON")
    with pytest.raises(ValueError, match="outside"):
        note_path(base, "../escape.json")
    with pytest.raises(ValueError, match="outside"):
        note_path(base, str(tmp_path.parent / "x.json"))
    with pytest.raises(ValueError, match="Type the file path"):
        note_path(base, "  ")


def test_write_then_read_file(tmp_path):
    full = note_path(str(tmp_path), "deep/notes.json")
    write_notes(full, [{"name": "t", "value": "v"}])
    assert read_notes(full) == [{"name": "t", "value": "v"}]
    with pytest.raises(ValueError, match="File not found"):
        read_notes(str(tmp_path / "missing.json"))


def test_preview_text():
    assert preview_text([{"name": "a", "value": "1"}, {"name": "b", "value": "2"}]) == "[a]\n1\n\n[b]\n2"
