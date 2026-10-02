# ComfyUI Elegant Seed

A custom seed node for [ComfyUI](https://github.com/Comfy-Org/ComfyUI), based on the
built-in [`SeedNode`](https://github.com/Comfy-Org/ComfyUI/blob/master/comfy_extras/nodes_seed.py).

## Node: Elegant Seed

Category: `utilities/elegant`

| Input  | Type | Description |
|--------|------|-------------|
| `seed` | INT  | Seed value (0 – `sys.maxsize`) with a *control after generate* widget (fixed / increment / decrement / randomize). |

| Output      | Type   | Description |
|-------------|--------|-------------|
| `seed`      | INT    | The seed, for KSampler and other seed inputs. |
| `seed_text` | STRING | The same seed as text, e.g. for filenames or prompts. |

## Installation

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/wipeer/comfyui-elegant-seed.git
```

Restart ComfyUI and search for **Elegant Seed**.

Requires a ComfyUI version that ships the V3 node API (`comfy_api.latest`).
