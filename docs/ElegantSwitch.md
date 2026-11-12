# Elegant Switch

A switch with two modes: pick one of two inputs, or pick which of two outputs is active.

### Controls

| Item | Description |
|---|---|
| **switch** | `1` or `2`. Connect a BOOLEAN to it (true = 1) and that value is used instead. |
| **input_1** | Any value. Used when the switch is **1**. |
| **input_2** | Any value. Used when the switch is **2**. |
| **mode** | `pick input` (default) or `pick output`, see below. |
| **lazy_evaluation** | Advanced (⚙), pick input only. **off** (default): both inputs are computed, as in any node. **on**: only the chosen input is computed and the other branch is skipped. |

### pick input

**output_1** is the chosen input. An input with nothing connected sends the plain boolean instead:

| switch | input_1 connected | input_2 connected | output_1 |
|---|---|---|---|
| 1 | yes | any | **input_1** |
| 1 | no | any | `true` |
| 2 | any | yes | **input_2** |
| 2 | any | no | `false` |

**output_2** is blocked.

### pick output

The switch chooses which output is active. The other is blocked, so nodes connected only to it do not run.

| inputs connected | switch 1 | switch 2 |
|---|---|---|
| only input_1 | input_1 → output_1 | input_1 → output_2 |
| input_1 and input_2 | input_1 → output_1 | input_2 → output_2 |

Workflows saved before this mode existed keep working (the inputs were called `on_true` / `on_false`).
