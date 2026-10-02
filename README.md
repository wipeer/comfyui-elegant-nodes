# ComfyUI Elegant Nodes

Small, tidy utility nodes for [ComfyUI](https://github.com/Comfy-Org/ComfyUI):

- **Elegant Seed**: a seed with a random/fixed switch and handy buttons, based on the
  built-in [`SeedNode`](https://github.com/Comfy-Org/ComfyUI/blob/master/comfy_extras/nodes_seed.py).
- **Elegant Resolution Selector**: width and height from an aspect ratio, keeping the pixel count steady.
- **Elegant Any to String Preview**: turns any value into text and shows it, also on subgraph nodes.
- **Elegant Any to String Multi Preview**: the same for several values, joined with a delimiter.
- **Elegant Any Math Multi Preview**: a math expression over any number of inputs, with int, float, boolean and string outputs.

All are in the `utilities/elegant` category and work inside subgraphs.

## Node: Elegant Seed

Category: `utilities/elegant`

### Controls

| Control | What it does |
|---------|--------------|
| **mode** switch | `random`: a new seed is generated for every run. `fixed`: the seed in the field is always used. |
| **seed** field | Shows the seed, and you can type one in. A seed you type is used for the next run in either mode. |
| **🎲 Random** | Generates a new seed now and switches to `random` mode. |
| **♻️ Last seed → fixed** | Puts the seed used by the last queued run back in the field and switches to `fixed` mode. The label shows that seed. |
| **🎲 Random → fixed** | Generates a new seed and switches to `fixed` mode. |

### Before or after the run

In `random` mode, the node follows ComfyUI's global setting
**Settings → Lite Graph → Node Widget → Widget control mode**:

- **after** (default): the run uses the seed in the field, and a new one is generated
  right after queueing. The field then shows the *next* seed, so use
  **♻️ Last seed → fixed** to get back the one that was used.
- **before**: a new seed is generated right before queueing, so the field shows the seed
  that was used.

The last used seed is saved with the workflow, so it survives a reload. With a batch
count above 1, every run in the batch gets its own seed, and the last one is remembered.

### Inside a subgraph

When you turn an Elegant Seed into a subgraph (or put it inside one), ComfyUI promotes
the `seed` widget to the subgraph node automatically. The three buttons then show up on
the subgraph node too, right under the promoted widgets, and they work on the subgraph
node's own seed.

- Promote `mode` as well (right-click the widget inside the subgraph → *Promote widget*)
  to get the random/fixed switch on the subgraph node. If you don't, the switch on the
  node inside the subgraph is used.
- Each copy of the subgraph node keeps its own seed and its own last used seed.
- Demote both `seed` and `mode` and the buttons go away.

### Outputs

| Output      | Type   | Description |
|-------------|--------|-------------|
| `seed`      | INT    | The seed, for KSampler and other seed inputs. |
| `seed_text` | STRING | The same seed as text, e.g. for filenames or prompts. |

Random seeds go up to 2^53 − 1, the largest number the browser handles exactly
(same limit as ComfyUI's own randomize).

## Node: Elegant Resolution Selector

Category: `utilities/elegant`

| Control | What it does |
|---------|--------------|
| **aspect_ratio** | 1:1, 5:4, 9:7, 4:3, 3:2, 16:9, 21:9. In portrait the list shows them flipped (4:5, 7:9, 3:4, 2:3, 9:16, 9:21). |
| **orientation** switch | `landscape` or `portrait`; portrait turns 3:2 into 2:3. Has no effect at 1:1. |
| **base** | Side of the square (1:1) image. Every ratio keeps about the same pixel count, so 1024 gives about 1 MP for all of them. |
| **round_to** | Width and height are rounded to a multiple of 8, 16 (default), 32 or 64. 8 is the minimum for latent models, 16 is safe for Flux/SD3, 64 matches SDXL training sizes. |
| **result** (read-only) | Live preview, e.g. `1360 × 768 · 1.00 MP · 1.77:1`. The ratio shown is the one after rounding. |

The size is `width = base × √ratio`, `height = base ÷ √ratio`, then rounded. Megapixels use
ComfyUI's convention (1 MP = 1024 × 1024).

| Output   | Type | Description |
|----------|------|-------------|
| `width`  | INT  | Connect to Empty Latent Image (or any width input). |
| `height` | INT  | Connect to Empty Latent Image (or any height input). |

Some results at base 1024, round to 16: 1:1 → 1024 × 1024, 4:3 → 1184 × 880,
3:2 → 1248 × 832, 16:9 → 1360 × 768, 21:9 → 1568 × 672.

In a subgraph, promote any of its widgets and the result line shows up on the subgraph
node as well.

## Node: Elegant Any to String Preview

Category: `utilities/elegant`

Based on ComfyUI's [Preview as Text](https://github.com/Comfy-Org/ComfyUI/blob/master/comfy_extras/nodes_preview_any.py)
and uses the same conversion: text stays as is, numbers and booleans become their value,
lists and dicts become indented JSON, and anything else (tensors, latents, …) is printed.

| Input / Output | Type   | Description |
|----------------|--------|-------------|
| `source`       | any    | The value to convert. |
| `string`       | STRING | The value as text, to feed into other nodes. |

The value is shown in a read-only plain-text box (no Markdown) that you can select and copy.

**Inside a subgraph:** after a run, the same text box appears on the subgraph node, so you
can see the value without opening the subgraph. Each copy of a subgraph node shows its own
value, and nested subgraphs show it on every level. Delete the node inside and its box goes
away from the subgraph node. The text isn't saved with the workflow; run again after loading.

## Node: Elegant Any to String Multi Preview

Category: `utilities/elegant`

Converts several values to text (same conversion as above) and joins them.

| Input / Output | Type   | Description |
|----------------|--------|-------------|
| `source_1`, `source_2`, … | any | Values to join. A new input appears each time you connect the last free one (up to 20). Disconnect one and the gap closes. |
| `delimiter`    | STRING | Put between the values. Default `\n` (new line). Type `\n` for a new line, `\t` for a tab, `\\` for a backslash; anything else is used as typed, e.g. `, `. |
| `string`       | STRING | The joined text. |

It shows the result in the same plain-text box, also on subgraph nodes.

## Node: Elegant Any Math Multi Preview

Category: `utilities/elegant`

Evaluates an expression over the inputs `a`, `b`, `c`, … Based on ComfyUI's Math Expression
node and evaluated safely with [simpleeval](https://github.com/danthedeckie/simpleeval)
(already installed with ComfyUI), so only math is possible, no Python code.

| Input / Output | Type    | Description |
|----------------|---------|-------------|
| `a`, `b`, …    | any     | Values for the expression. A new input appears each time you connect the last free one (up to `z`). Text that looks like a number is used as a number. |
| `expression`   | STRING  | E.g. `a * b`, `(a + b) / 2`, `a / b`, `max(a, b)`, `a > b and b >= 768`, `round(a / 64) * 64`, `a + "_" + str(b)`. |
| `int`          | INT     | The result as a whole number (decimals are cut off: 1.77 → 1). |
| `float`        | FLOAT   | The result as a decimal number. |
| `boolean`      | BOOLEAN | `False` for 0, empty text or false, otherwise `True`. |
| `string`       | STRING  | The result as text. |

Operators: `+ - * / // % **`, comparisons `== != < <= > >=`, `and or not`, and
`x if condition else y`. Functions: `sum min max abs round pow sqrt ceil floor log log2 log10
exp sin cos tan clamp int float str bool`. Constants: `pi`, `tau`. `values` is the list of
all inputs, so `sum(values)` adds them all.

If the result is text that isn't a number, `int` and `float` are 0. Errors (division by
zero, an unconnected input in the expression) stop the run with a message.

The plain-text box shows the result and all four outputs, also on subgraph nodes.

## Installation

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/wipeer/comfyui-elegant-nodes.git
```

Restart ComfyUI and search for **Elegant** to see all nodes.

Requires a ComfyUI version that ships the V3 node API (`comfy_api.latest`).
