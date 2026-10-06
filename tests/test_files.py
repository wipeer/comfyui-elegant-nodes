import os

import pytest

from core.files import FILENAME_FORMATS, format_filename, list_images, matches, natural_key


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


def test_matches():
    assert matches("set_train_015.png", "*train_??5.*")
    assert matches("SET_TRAIN_105.JPG", "*train_??5.*")  # case is ignored
    assert not matches("set_train_0151.png", "*train_??5.*")
    assert matches("b.png", "[ab].png") and not matches("c.png", "[ab].png")
    assert matches("anything.png", "") and matches("anything.png", "  ")


def test_list_images_filter_and_subfolders(tmp_path):
    for rel in ["a_train_015.png", "a_test_015.png", "day2/b_train_115.jpg", "day10/c_train_215.png",
                "day2/deep/d_train_315.webp", "day2/notes_train_015.txt"]:
        (tmp_path / rel).parent.mkdir(parents=True, exist_ok=True)
        (tmp_path / rel).write_bytes(b"")
    rel = lambda paths: [os.path.relpath(p, tmp_path).replace(os.sep, "/") for p in paths]
    assert rel(list_images(str(tmp_path), "*train_??5.*")) == ["a_train_015.png"]
    assert rel(list_images(str(tmp_path), "*train_??5.*", subfolders=True)) == [
        "a_train_015.png", "day2/b_train_115.jpg", "day2/deep/d_train_315.webp", "day10/c_train_215.png"]
    assert len(list_images(str(tmp_path), "", subfolders=True)) == 5
    assert list_images(str(tmp_path), "*.gif") == []
