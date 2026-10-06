import os

import numpy as np
import torch
from PIL import Image, ImageOps

import folder_paths
import node_helpers
from comfy_api.latest import io, ui

from ..core.files import FILENAME_FORMATS, format_filename, list_images

MAX_LISTED = 50  # file names shown in the preview


def _input_folder(folder: str) -> str:
    """`folder` inside ComfyUI's input directory; refuses anything that leads outside it."""
    base = folder_paths.get_input_directory()
    path = os.path.abspath(os.path.join(base, folder))
    if not folder_paths.is_within_directory(base, path):
        raise ValueError(f"Folder {folder!r} is outside the input directory.")
    if not os.path.isdir(path):
        raise ValueError(f"Folder {folder!r} not found in the input directory.")
    return path


def _load_image(path: str) -> torch.Tensor:
    image = node_helpers.pillow(Image.open, path)
    image = node_helpers.pillow(ImageOps.exif_transpose, image)  # respect camera rotation
    if image.mode == "I":
        image = image.point(lambda i: i * (1 / 255))
    array = np.array(image.convert("RGB")).astype(np.float32) / 255.0
    return torch.from_numpy(array)[None,]


class ElegantLoadImageFromFolder(io.ComfyNode):
    """ComfyUI's Load Image (from Folder), plus each image's file name."""

    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="ElegantLoadImageFromFolder",
            display_name="Elegant Load Image (from Folder)",
            search_aliases=["load folder", "load from folder", "load images", "batch images", "file name"],
            category="utilities/elegant",
            description="Loads every image in a folder of ComfyUI's input directory, in name order, "
            "with each image's file name.",
            is_output_node=True,
            inputs=[
                io.Combo.Input(
                    "folder",
                    options=folder_paths.get_input_subfolders(),
                    tooltip="Folder inside ComfyUI's input directory. Its images are loaded "
                    "(PNG, JPG, WEBP, BMP, TIFF); those in subfolders only with include_subfolders on.",
                ),
                io.Combo.Input(
                    "filename_format",
                    options=FILENAME_FORMATS,
                    default=FILENAME_FORMATS[0],
                    advanced=True,
                    tooltip="What the filename output holds: the file name (photo.png), the name without "
                    "extension (photo) or the full path on the server.",
                ),
                # Added in 1.7.0: last, so workflows saved before keep their widget values, and
                # optional, so prompts saved before (API format) stay valid.
                io.String.Input(
                    "filter",
                    default="",
                    optional=True,
                    tooltip="Load only images whose file name matches, e.g. *train_??5.* "
                    "(* = anything, ? = one character, [abc] = one of a, b, c; case is ignored). Empty: all images.",
                ),
                io.Boolean.Input(
                    "include_subfolders",
                    default=False,
                    optional=True,
                    label_on="on",
                    label_off="off",
                    advanced=True,
                    tooltip="Also load images in the folder's subfolders, at any depth. The filter still "
                    "matches only the file name.",
                ),
            ],
            outputs=[
                io.Image.Output(display_name="images", is_output_list=True, tooltip="The images, one by one."),
                io.String.Output(
                    display_name="filename", is_output_list=True, tooltip="The file name of each image, in the same order."
                ),
            ],
        )

    @classmethod
    def fingerprint_inputs(cls, folder: str, filename_format: str, filter: str = "", include_subfolders: bool = False):
        # Run again when matching files in the folder are added, removed or changed.
        try:
            paths = list_images(_input_folder(folder), filter, include_subfolders)
            return [(path, os.path.getmtime(path)) for path in paths]
        except (OSError, ValueError):
            return float("nan")  # never equal: let execute report the problem

    @classmethod
    def execute(
        cls, folder: str, filename_format: str, filter: str = "", include_subfolders: bool = False
    ) -> io.NodeOutput:
        folder_path = _input_folder(folder)
        paths = list_images(folder_path, filter, include_subfolders)
        where = f"{folder} and its subfolders" if include_subfolders else folder
        if not paths:
            matching = f" matching {filter.strip()!r}" if filter.strip() else ""
            raise ValueError(f"No images{matching} in {where}.")
        images = [_load_image(path) for path in paths]
        names = [format_filename(path, filename_format) for path in paths]

        listed = "\n".join(names[:MAX_LISTED])
        if len(names) > MAX_LISTED:
            listed += f"\n… and {len(names) - MAX_LISTED} more"
        count = f"{len(names)} image{'s' if len(names) != 1 else ''} from {where}"
        if filter.strip():
            total = len(list_images(folder_path, "", include_subfolders))
            count = f"{len(names)} of {total} images in {where} match {filter.strip()}"
        return io.NodeOutput(images, names, ui=ui.PreviewText(f"{count}\n\n{listed}"))
