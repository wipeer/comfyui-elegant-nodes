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
                    tooltip="Folder inside ComfyUI's input directory. Images directly in it are loaded "
                    "(PNG, JPG, WEBP, BMP, TIFF), not those in its subfolders.",
                ),
                io.Combo.Input(
                    "filename_format",
                    options=FILENAME_FORMATS,
                    default=FILENAME_FORMATS[0],
                    advanced=True,
                    tooltip="What the filename output holds: the file name (photo.png), the name without "
                    "extension (photo) or the full path on the server.",
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
    def fingerprint_inputs(cls, folder: str, filename_format: str):
        # Run again when files in the folder are added, removed or changed.
        try:
            return [(path, os.path.getmtime(path)) for path in list_images(_input_folder(folder))]
        except (OSError, ValueError):
            return float("nan")  # never equal: let execute report the problem

    @classmethod
    def execute(cls, folder: str, filename_format: str) -> io.NodeOutput:
        paths = list_images(_input_folder(folder))
        if not paths:
            raise ValueError(f"No images found in {folder!r}.")
        images = [_load_image(path) for path in paths]
        names = [format_filename(path, filename_format) for path in paths]

        listed = "\n".join(names[:MAX_LISTED])
        if len(names) > MAX_LISTED:
            listed += f"\n… and {len(names) - MAX_LISTED} more"
        count = f"{len(names)} image{'s' if len(names) != 1 else ''} from {folder}"
        return io.NodeOutput(images, names, ui=ui.PreviewText(f"{count}\n\n{listed}"))
