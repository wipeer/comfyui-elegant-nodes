"""Listing image files and naming them (Elegant Load Image from Folder)."""

import fnmatch
import os
import re

IMAGE_EXTENSIONS = (".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff")

# What the node's `filename` output holds for each image.
FILENAME_FORMATS = ["file name", "name without extension", "full path"]


def natural_key(name: str):
    """Sort key that orders numbers by value: img2 before img10, case-insensitive."""
    return [int(part) if part.isdigit() else part.lower() for part in re.split(r"(\d+)", name)]


def matches(name: str, pattern: str) -> bool:
    """Whether file name `name` matches wildcard `pattern` (* ? [abc]), ignoring case. Empty matches all."""
    pattern = pattern.strip()
    return not pattern or fnmatch.fnmatchcase(name.lower(), pattern.lower())


def list_images(folder: str, pattern: str = "", subfolders: bool = False) -> list[str]:
    """
    Full paths of the image files in `folder` whose file name matches `pattern`,
    in natural order of their path inside `folder`. With `subfolders`, also those
    in its subfolders, at any depth.
    """
    relative = []
    for root, dirs, files in os.walk(folder):
        dirs.sort()
        for name in files:
            if name.lower().endswith(IMAGE_EXTENSIONS) and matches(name, pattern):
                relative.append(os.path.relpath(os.path.join(root, name), folder))
        if not subfolders:
            break
    return [os.path.join(folder, rel) for rel in sorted(relative, key=lambda rel: natural_key(rel.replace(os.sep, "/")))]


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
