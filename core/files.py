"""Listing image files and naming them (Elegant Load Image from Folder)."""

import os
import re

IMAGE_EXTENSIONS = (".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff")

# What the node's `filename` output holds for each image.
FILENAME_FORMATS = ["file name", "name without extension", "full path"]


def natural_key(name: str):
    """Sort key that orders numbers by value: img2 before img10, case-insensitive."""
    return [int(part) if part.isdigit() else part.lower() for part in re.split(r"(\d+)", name)]


def list_images(folder: str) -> list[str]:
    """Full paths of the image files directly in `folder` (not in subfolders), in natural order."""
    names = [
        name
        for name in os.listdir(folder)
        if name.lower().endswith(IMAGE_EXTENSIONS) and os.path.isfile(os.path.join(folder, name))
    ]
    return [os.path.join(folder, name) for name in sorted(names, key=natural_key)]


def format_filename(path: str, fmt: str) -> str:
    """The file at `path` as text, per one of FILENAME_FORMATS."""
    if fmt == "full path":
        return os.path.abspath(path)
    name = os.path.basename(path)
    if fmt == "name without extension":
        return os.path.splitext(name)[0]
    if fmt == "file name":
        return name
    raise ValueError(f"Unknown filename format {fmt!r}: use one of {', '.join(FILENAME_FORMATS)}.")
