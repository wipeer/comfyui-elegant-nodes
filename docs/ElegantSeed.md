# Elegant Seed

A seed you can keep fixed or have regenerated on every run.

**Works from the subgraph node.** Inside a subgraph, `seed` is promoted automatically and the three buttons appear on the subgraph node, acting on its own seed. Promote `mode` too to get the switch there. Each copy of a subgraph keeps its own seed.

### Controls

| Item | Description |
|---|---|
| **mode** | `random`: a new seed for every run. `fixed`: the seed in the field is always used. |
| **seed** | The seed. Type a number to use it for the next run, in either mode. |
| **🎲 Random** | New seed now, and switch to random mode. |
| **♻️ Last seed → fixed** | Put back the seed of the last **finished** run (the image you see) and switch to fixed. The label shows that seed. Runs still queued or generating don't count, so it's safe to click while the next one is running. |
| **🎲 Random → fixed** | New seed, and switch to fixed mode. |

### Before or after the run

Random mode follows *Settings → Widget control mode*:

- **after** (default): the run uses the seed you see, then a new one appears. To get back the seed of an image you liked, use **♻️ Last seed → fixed**.

- **before**: a new seed is made just before the run, so the field shows the seed that was used.

### Outputs

`seed` (INT) for samplers, `seed_text` (STRING) for filenames or prompts.
