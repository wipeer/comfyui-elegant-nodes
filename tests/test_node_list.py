"""node_list.json (read by ComfyUI-Manager's scanner) must list exactly the pack's nodes."""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def test_node_list_matches_node_ids():
    # The node ids as defined in nodes/*.py (importing them needs ComfyUI).
    defined = {
        node_id
        for path in (ROOT / "nodes").glob("*.py")
        for node_id in re.findall(r'node_id="([^"]+)"', path.read_text(encoding="utf-8"))
    }
    listed = json.loads((ROOT / "node_list.json").read_text(encoding="utf-8"))
    assert set(listed) == defined
    assert all(isinstance(text, str) and text for text in listed.values())
