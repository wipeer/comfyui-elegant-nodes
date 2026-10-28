# Elegant Any to String Multi Preview

Turns several values into text and joins them with a delimiter (**concat**), or picks one of them by index (**switch**).

**Works from the subgraph node.** After each run the joined text also appears on the subgraph node. Each copy of a subgraph shows its own value.

### Inputs

| Item | Description |
|---|---|
| **source_1, source_2, …** | Connect values here. A new input appears each time you connect the last free one (up to 20). Disconnect one and the gap closes. |
| **delimiter** | concat: put between the values. `\n` = new line (default), `\t` = tab, `\\` = backslash. Anything else is used as typed, e.g. `, ` or ` \| `. |
| **wrap_text** | (advanced) Wrap long lines to the box width instead of scrolling sideways. |
| **mode** | `concat`: join all sources with the delimiter. `switch`: use only the source chosen by **index**. Only the settings the mode uses are shown: **delimiter** (and **prefix** / **suffix** when switched on) in concat, **index** in switch. The others move to the advanced settings (**⚙**) and are greyed out there. |
| **index** | switch: which source to use, counting from 1 (`source_1`). Connect a number to choose it from elsewhere, e.g. an **Elegant Random Number** for a random pick. |
| **use_prefix**, **use_suffix** | (advanced) concat: switch on to show the **prefix** / **suffix** field. |
| **prefix**, **suffix** | concat: text added before / after the joined text. `\n` = new line, `\t` = tab, like the delimiter. |

### Outputs

| Item | Description |
|---|---|
| **string** | The joined text (concat) or the chosen source as text (switch). |
| **value** | switch: the chosen source **unchanged**, so the switch works for images, models, latents… anything. concat: the joined text. |

The preview shows which one was picked, e.g. `▶ source_2`. Note: ComfyUI still computes every connected source, also the ones not picked.

### Advanced: out of range

Click the **⚙** in the title to show it. What an **index** outside the connected sources does:

| Item | Description |
|---|---|
| `error` | stop the run with a message. |
| `clamp` | (default) below 1 uses the first source, above the last uses the last. |
| `wrap` | count around: with 3 sources, 4 is the first again and 0 the last. |

Each value is converted like in **Elegant Any to String Preview**.

### Hiding the preview

Switch **show_preview** (advanced, click the **⚙**) off to hide the text box, on the node and on the subgraph node when it is inside one. The node gets smaller; the result is still made and output.
