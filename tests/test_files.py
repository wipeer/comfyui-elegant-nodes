import os

import pytest

from core.files import FILENAME_FORMATS, format_filename, list_images, natural_key


def test_natural_order():
    names = ["img10.png", "img2.png", "IMG1.png", "a.png"]
    assert sorted(names, key=natural_key) == ["a.png", "IMG1.png", "img2.png", "img10.png"]


def test_list_images(tmp_path):
    for name in ["b2.PNG", "b10.jpg", "notes.txt", "c.webp"]:
        (tmp_path / name).write_bytes(b"")
    (tmp_path / "sub").mkdir()
    (tmp_path / "sub" / "inner.png").write_bytes(b"")
    (tmp_path / "folder.png").mkdir()  # a folder named like an image
    found = [os.path.basename(p) for p in list_images(str(tmp_path))]
    assert found == ["b2.PNG", "b10.jpg", "c.webp"]


def test_format_filename(tmp_path):
    path = str(tmp_path / "photo.final.png")
    assert format_filename(path, "file name") == "photo.final.png"
    assert format_filename(path, "name without extension") == "photo.final"
    assert format_filename(path, "full path") == os.path.abspath(path)
    assert FILENAME_FORMATS[0] == "file name"
    with pytest.raises(ValueError):
        format_filename(path, "bogus")
