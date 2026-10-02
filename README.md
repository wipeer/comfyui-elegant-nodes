# ComfyUI Elegant Seed

A custom seed node for [ComfyUI](https://github.com/Comfy-Org/ComfyUI), based on the
built-in [`SeedNode`](https://github.com/Comfy-Org/ComfyUI/blob/master/comfy_extras/nodes_seed.py).

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

## Installation

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/wipeer/comfyui-elegant-seed.git
```

Restart ComfyUI and search for **Elegant Seed**.

Requires a ComfyUI version that ships the V3 node API (`comfy_api.latest`).
