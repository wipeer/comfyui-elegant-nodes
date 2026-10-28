# Elegant Any to String Preview

Turns any value into text, shows it, and outputs it as a `string`.

**Works from the subgraph node.** The text also shows on the subgraph node, so you can check a value without opening it. Each copy of a subgraph shows its own value.

### Conversion

- Text stays as it is.

- Numbers and booleans become their value (`42`, `0.5`, `True`).

- Lists and dictionaries become indented JSON.

- Anything else (images, latents, models, …) is printed, with large tensors shortened.

The box is plain text (no Markdown); you can select and copy from it. Switch **wrap_text** on (an advanced input, off by default: click the **⚙** in the title to show it) to wrap long lines to the box width instead of scrolling sideways.

The last text is saved with the workflow (up to 10,000 characters), so it shows again after loading.

### Hiding the preview

Switch **show_preview** (advanced, click the **⚙**) off to hide the text box, on the node and on the subgraph node when it is inside one. The node gets smaller; the result is still made and output.
