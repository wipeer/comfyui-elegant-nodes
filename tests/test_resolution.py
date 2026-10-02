import json
import re
import shutil
import subprocess
from pathlib import Path

import pytest

from core.resolution import ASPECT_RATIOS, ROUND_TO_OPTIONS, compute_resolution

JS_FILE = Path(__file__).parents[1] / "web" / "js" / "resolution_selector.js"


@pytest.mark.parametrize(
    "aspect_ratio, landscape, base, round_to, expected",
    [
        ("1:1", True, 1024, 16, (1024, 1024)),
        ("4:3", True, 1024, 16, (1184, 880)),
        ("3:2", True, 1024, 16, (1248, 832)),
        ("16:9", True, 1024, 16, (1360, 768)),
        ("16:9", True, 1024, 64, (1344, 768)),
        ("21:9", True, 1024, 16, (1568, 672)),
        ("3:2", False, 1024, 64, (832, 1280)),
        ("1:1", False, 512, 8, (512, 512)),
    ],
)
def test_known_sizes(aspect_ratio, landscape, base, round_to, expected):
    assert compute_resolution(aspect_ratio, landscape, base, round_to) == expected


@pytest.mark.parametrize("aspect_ratio", list(ASPECT_RATIOS))
def test_portrait_is_landscape_flipped(aspect_ratio):
    width, height = compute_resolution(aspect_ratio, True, 1024, 16)
    assert compute_resolution(aspect_ratio, False, 1024, 16) == (height, width)


def test_area_stays_close_to_base_squared():
    for aspect_ratio in ASPECT_RATIOS:
        width, height = compute_resolution(aspect_ratio, True, 1024, 8)
        assert abs(width * height / 1024**2 - 1) < 0.02


def test_never_below_round_to():
    assert compute_resolution("21:9", True, 64, 64) == (128, 64)


def _js_aspect_ratios() -> dict:
    source = JS_FILE.read_text()
    block = re.search(r"const ASPECT_RATIOS = \{(.*?)\};", source, re.S).group(1)
    return {key: tuple(map(int, value.split(","))) for key, value in re.findall(r'"([\d:]+)":\s*\[([\d,\s]+)\]', block)}


def test_js_ratios_match_python():
    assert _js_aspect_ratios() == ASPECT_RATIOS


@pytest.mark.skipif(shutil.which("node") is None, reason="Node.js not installed")
def test_js_formula_matches_python():
    """The live result in the UI must equal what the node outputs."""
    source = JS_FILE.read_text()
    start = source.index("const ASPECT_RATIOS")
    end = source.index("/** \"1360 × 768")
    js_code = source[start:end].replace("export ", "")

    cases = [
        (ratio, landscape, base, int(round_to))
        for ratio in ASPECT_RATIOS
        for landscape in (True, False)
        for base in range(64, 4097, 24)
        for round_to in ROUND_TO_OPTIONS
    ]
    script = js_code + f"\nconsole.log(JSON.stringify({json.dumps(cases)}.map(c => computeResolution(...c))));"
    output = subprocess.run(["node"], input=script, capture_output=True, text=True, check=True).stdout
    js_results = [tuple(pair) for pair in json.loads(output)]
    assert js_results == [compute_resolution(*case) for case in cases]
