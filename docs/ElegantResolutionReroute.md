# Elegant Resolution Reroute

Width and height on **one link**. Give a width and a height, or a resolution as one piece, and get width, height, the resolution and its text back, whichever way you need them.

### Inputs

| Item | Description |
|---|---|
| **width**, **height** | Connect a number. It replaces that side of the resolution, so a **width** alone with `1024x768` in **resolution** gives 512 x 768 if the width is 512. |
| **resolution** | Type a size, or connect a **RESOLUTION** (from another Elegant Resolution Reroute) or any text. Typed or connected text is read leniently: `1024x1024`, `1024 x 1024`, `1024 1024`, `1024, 1024`, `1024*1024`, `(1024, 1024)`. One number is a square: `512` is 512 x 512. Aspect ratios such as `16:9` aren't sizes and are refused. |

### Outputs

| Item | Description |
|---|---|
| **width**, **height** | The two numbers (INT), e.g. into Empty Latent Image. |
| **resolution** | Both together, as a new **RESOLUTION** type that only this node's **resolution** input accepts. It lets one link carry width and height. |
| **text** | The size as text, like `1024x1024` (STRING), for file names or prompts. Optional: it only shows when **text_output** (advanced, click the **⚙**) is on. Switching it off removes the output and its links. |

If neither a resolution nor both a width and a height can be worked out, the run stops with a message. A width or height of 0 or less is refused.
