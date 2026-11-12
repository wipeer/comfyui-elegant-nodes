# Elegant Switch Split

The opposite of **Elegant Switch**: the switch picks which of two outputs is active. The other output is blocked, so nodes connected only to it do not run.

### Controls

| Item | Description |
|---|---|
| **switch** | `output_1` (on) or `output_2` (off). Connect a BOOLEAN to it and that value is used instead. |
| **input_1** | Any value. Feeds **output_1**. If **input_2** is empty, it feeds the active output, whichever it is. |
| **input_2** | Optional. Any value. Feeds **output_2**. |

| inputs connected | switch on | switch off |
|---|---|---|
| only input_1 | input_1 → output_1 | input_1 → output_2 |
| input_1 and input_2 | input_1 → output_1 | input_2 → output_2 |

### Outputs

| Item | Description |
|---|---|
| **output_1** | The value when the switch is on; blocked when off. |
| **output_2** | The value when the switch is off; blocked when on. |
