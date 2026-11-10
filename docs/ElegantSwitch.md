# Elegant Switch

A true/false switch that picks one of two inputs and passes it on.

### Controls

| Item | Description |
|---|---|
| **switch** | `true` or `false`. Connect a BOOLEAN to it and that value is used instead. |
| **on_true** | Any value. Output when the switch is **true**. |
| **on_false** | Any value. Output when the switch is **false**. |
| **lazy_evaluation** | Advanced (⚙). **off** (default): both inputs are computed, as in any node. **on**: only the chosen input is computed and the other branch is skipped, which saves time and memory when it is heavy. |

An input with nothing connected sends the plain boolean instead:

| switch | on_true connected | on_false connected | Output |
|---|---|---|---|
| true | yes | any | **on_true** |
| true | no | any | `true` |
| false | any | yes | **on_false** |
| false | any | no | `false` |

So with no inputs at all the node is just a true/false switch, and with only **on_true** connected it gives that value or `false`.

### Outputs

| Item | Description |
|---|---|
| **output** | The chosen input, or the switch itself when that input is empty (any type). |
