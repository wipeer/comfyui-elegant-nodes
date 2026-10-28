# Elegant Random Number

A random number between **min** and **max**, drawn from a seed: the same seed always gives the same number, so you can get a value back.

**Works from the subgraph node.** `seed` is promoted automatically and the seed buttons appear on the subgraph node; the value shows there after each run. *control after generate* stays on the node inside the subgraph. Each copy of a subgraph keeps its own seed.

### Controls

| Item | Description |
|---|---|
| **seed** | ComfyUI's standard seed, like KSampler's. Type one to use it for the next run. |
| **control after generate** | ComfyUI's own: `randomize` for a new seed (and number) every run, `fixed` to keep it, or `increment` / `decrement`. |
| **min**, **max** | The range, both included. Swapped automatically if min is larger. |
| **number_type** | `int`: a whole number. `float`: a decimal number. |
| **🎲 Random** | New seed now, and set the control to `randomize`. |
| **♻️ Last seed → fixed** | Put back the seed of the last finished run and set the control to `fixed`, to keep a number you liked. |
| **🎲 Random → fixed** | New seed, and set the control to `fixed`. |

ComfyUI changes the seed before or after each run, per *Settings → Widget control mode*.

### Outputs

`int`, `float` and `string`. Tip: connect `int` to the **index** of a Multi Preview in switch mode for a random pick.

### Hiding the preview

Switch **show_preview** (advanced, click the **⚙**) off to hide the text box, on the node and on the subgraph node when it is inside one. The node gets smaller; the result is still made and output.
