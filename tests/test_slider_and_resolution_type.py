import pytest

from core.resolution import Resolution, parse_resolution, resolve_resolution
from core.slider import snap_to_range


@pytest.mark.parametrize(
    "text, expected",
    [
        ("1024x1024", (1024, 1024)),
        ("1024 x 1024", (1024, 1024)),
        ("1024 X   768", (1024, 768)),
        ("1024 1024", (1024, 1024)),
        ("1024, 768", (1024, 768)),
        ("1024 , 768", (1024, 768)),
        ("1024*768", (1024, 768)),
        ("1024×768", (1024, 768)),
        ("1920;1080", (1920, 1080)),
        ("(1024, 768)", (1024, 768)),
        ("[1024 768]", (1024, 768)),
        ("  512  ", (512, 512)),
        ("512", (512, 512)),
    ],
)
def test_parse_resolution(text, expected):
    assert parse_resolution(text) == expected


@pytest.mark.parametrize("text", ["", "   "])
def test_parse_empty_is_none(text):
    assert parse_resolution(text) is None


@pytest.mark.parametrize("text", ["abc", "1024x", "x768", "1024x768x3", "10.5x20", "0x512", "-5x10", "16:9"])
def test_parse_rejects(text):
    with pytest.raises(ValueError):
        parse_resolution(text)


def test_resolution_prints_as_text():
    assert str(Resolution(1024, 768)) == "1024x768"
    assert Resolution(2, 3).width == 2 and Resolution(2, 3).height == 3


def test_resolve_from_text_pair_or_parts():
    assert resolve_resolution(resolution="1024 x 768") == (1024, 768)
    assert resolve_resolution(resolution=Resolution(640, 480)) == (640, 480)
    assert resolve_resolution(resolution=(640, 480)) == (640, 480)
    assert resolve_resolution(width=800, height=600) == (800, 600)


def test_width_or_height_given_on_its_own_wins():
    assert resolve_resolution(width=512, resolution="1024x768") == (512, 768)
    assert resolve_resolution(height=512, resolution="1024x768") == (1024, 512)
    assert resolve_resolution(width=1, height=2, resolution="1024x768") == (1, 2)


def test_resolve_needs_both_sides():
    with pytest.raises(ValueError):
        resolve_resolution(width=512)
    with pytest.raises(ValueError):
        resolve_resolution(resolution="")
    with pytest.raises(ValueError):
        resolve_resolution()
    with pytest.raises(ValueError):
        resolve_resolution(width=0, height=10)


@pytest.mark.parametrize(
    "value, lo, hi, step, expected",
    [
        (50, 0, 100, 1, 50),
        (50.4, 0, 100, 1, 50),
        (50.5, 0, 100, 1, 51),
        (-5, 0, 100, 1, 0),
        (500, 0, 100, 1, 100),
        (0.3, 0, 1, 0.1, 0.3),
        (0.30000000000000004, 0, 1, 0.1, 0.3),
        (7, 0, 10, 3, 6),
        (10, 0, 10, 3, 9),
        (11, 1, 10, 5, 6),
        (5, 100, 0, 1, 5),
        (150, 100, 0, 1, 100),
        (3.14159, 0, 10, 0, 3.14159),
        (3.14159, 0, 10, 0.01, 3.14),
    ],
)
def test_snap_to_range(value, lo, hi, step, expected):
    assert snap_to_range(value, lo, hi, step) == pytest.approx(expected)
