# Elegant Resolution Selector

Width and height for an aspect ratio, keeping about the same number of pixels as a square of **base** × **base**.

**Works from the subgraph node.** Promote any of its widgets and the **result** field appears on the subgraph node, following the promoted values live.

### Controls

| Item | Description |
|---|---|
| **aspect_ratio** | 1:1, 5:4, 9:7, 4:3, 3:2, 16:9, 21:9. In portrait they show flipped (2:3, 9:16, …). |
| **orientation** | landscape (wider) or portrait (taller). No effect at 1:1. |
| **base** | Side of the square image. 1024 ≈ 1 MP for every ratio (SDXL, Flux); 512 for SD 1.5. |
| **round_to** | Width and height become multiples of this. 8 is the minimum, 16 suits Flux/SD3, 64 matches SDXL training sizes. |

The line at the bottom shows the result live, e.g. `1360 × 768 · 1.00 MP · 1.77:1`. The ratio shown is the one after rounding; MP uses 1 MP = 1024 × 1024.

### Formula

`width = base × √ratio`, `height = base ÷ √ratio`, each rounded to **round_to**.

### Examples (base 1024, round to 16)

| Item | Description |
|---|---|
| 1:1 | 1024 × 1024 |
| 4:3 | 1184 × 880 |
| 3:2 | 1248 × 832 |
| 16:9 | 1360 × 768 |
| 21:9 | 1568 × 672 |

### Outputs

`width` and `height` (INT), e.g. into Empty Latent Image, and `resolution`: both together as a RESOLUTION on one link, for the **Elegant Resolution Reroute** (it turns it back into width, height and text).
