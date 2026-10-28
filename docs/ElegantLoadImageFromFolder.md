# Elegant Load Image (from Folder)

Loads every image in a folder, like ComfyUI's **Load Image (from Folder)**, and also gives each image's file name.

**Works from the subgraph node.** After each run the list of loaded files also appears on the subgraph node. Each copy of a subgraph shows its own.

### Inputs

| Item | Description |
|---|---|
| **folder** | A folder inside ComfyUI's `input` directory. Its images are loaded (PNG, JPG, WEBP, BMP, TIFF). Press **R** to refresh the list after adding a folder. |
| **filter** | Load only images whose **file name** matches, e.g. `*train_??5.*`: `*` = anything, `?` = one character, `[abc]` = one of a, b, c. Upper/lower case is ignored. Empty: all images. |
| **include_subfolders** | (advanced) Also load images in subfolders, at any depth. The filter still matches only the file name. |
| **start_index** | Number of the first image to load, counting from 1, after filtering and sorting. Past the last image, the run stops with a message. |
| **limit** | Most images to load from **start_index** on; `0` = all the rest. E.g. start 5, limit 4: images 5 to 8. |
| **filename_format** | (advanced, click the **⚙**) What **filename** holds: `file name` (photo.png, default), `name without extension` (photo) or `full path` (the file's path on the ComfyUI server). |

### Outputs

| Item | Description |
|---|---|
| **images** | The images as a list: the nodes after it run once per image, so images may have different sizes. |
| **filename** | The file name of each image, in the same order, e.g. into a Save Image prefix to keep the names. |

Files are loaded in name order, with numbers by value (img2 before img10); with subfolders, by their path inside the folder. Camera rotation (EXIF) is applied. The node runs again when files in the folder are added, removed or changed. If no image matches, the run stops with a message.

### Hiding the preview

Switch **show_preview** (advanced, click the **⚙**) off to hide the text box, on the node and on the subgraph node when it is inside one. The node gets smaller; the result is still made and output.
