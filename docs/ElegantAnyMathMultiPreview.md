# Elegant Any Math Multi Preview

Calculates an expression from the inputs `a`, `b`, `c`, … and outputs the result as int, float, boolean and string.

The preview shows the expression with the real numbers filled in, e.g. `1 + (2 / 2) - 3 = -1`, followed by all four outputs.

**Works from the subgraph node.** After each run the worked-out result also appears on the subgraph node. Each copy of a subgraph shows its own result.

### Inputs

- Connect values to `a`, `b`, …; a new input appears each time you connect the last free one (up to `z`).

- Any type is accepted. Text that looks like a number (`"12"`, `"0.5"`) is used as a number; other text stays text.

- `values` is the list of all inputs, e.g. `sum(values)` or `max(values)`.

- Using an input that isn't connected stops the run with an error.

### Operators

| Item | Description |
|---|---|
| `a + b` | add (or join two texts) |
| `a - b` | subtract |
| `a * b` | multiply (text × number repeats it) |
| `a / b` | divide, always a decimal: `7 / 2 = 3.5` |
| `a // b` | divide and round down: `7 // 2 = 3` |
| `a % b` | remainder: `7 % 2 = 1` |
| `a ** b` | power: `2 ** 10 = 1024` |
| `-a` | negative |
| `( … )` | group, as usual |

### Comparisons and logic

| Item | Description |
|---|---|
| `== != < <= > >=` | compare, gives True / False |
| `and`, `or`, `not` | combine conditions: `a > 0 and b > 0` |
| `x if condition else y` | choose: `a if a > b else b` |

### Functions

| Item | Description |
|---|---|
| `min(a, b, …)`, `max(a, b, …)` | smallest / largest |
| `sum(values)` or `sum(a, b, …)` | add up |
| `abs(a)` | without sign: `abs(-3) = 3` |
| `round(a)`, `round(a, 2)` | round to whole / 2 decimals (halves go to the even number) |
| `floor(a)`, `ceil(a)` | round down / up |
| `clamp(a, low, high)` | keep between low and high |
| `sqrt(a)`, `pow(a, b)`, `exp(a)` | square root, power, ea |
| `log(a)`, `log2(a)`, `log10(a)` | logarithms (`log(a, base)` also works) |
| `sin(a)`, `cos(a)`, `tan(a)` | trigonometry, in radians |
| `int(a)`, `float(a)`, `str(a)`, `bool(a)` | convert |
| `rand(seed)` | random decimal from 0 to 1 |
| `randint(seed, low, high)` | random whole number, low and high included |
| `uniform(seed, low, high)` | random decimal between low and high |

Constants: `pi` (3.14159…), `tau` (2π).

The random functions are **seeded**: the same seed always gives the same number, so connect an **Elegant Seed** (e.g. as `a`) and use `randint(a, 1, 6)`. For a standalone random value use **Elegant Random Number**.

### Outputs

| Item | Description |
|---|---|
| **int** | whole number; decimals are cut off (`1.77 → 1`, `-1.5 → -1`). Use `round(…)` in the expression to round instead. |
| **float** | decimal number |
| **boolean** | False for 0, empty text or False; otherwise True |
| **string** | the result as text |

If the result is text that isn't a number, int and float are 0.

### Examples

| Item | Description |
|---|---|
| `a / b` | aspect ratio from width and height |
| `round(a / 64) * 64` | snap to a multiple of 64 |
| `a * 1.5` | upscale size by 1.5× |
| `max(a, b)` | long side |
| `a * b / 1048576` | megapixels |
| `clamp(a, 1, 150)` | keep steps in range |
| `a if a > 0 else b` | fallback value |
| `a % 2 == 0` | is even (boolean output) |
| `a + "_" + str(b)` | build a name like `img_42` |

### Safety

Expressions are evaluated with *simpleeval*, like ComfyUI's own Math Expression node: only math, no Python code, and very large powers are refused.

### Hiding the preview

Switch **show_preview** (advanced, click the **⚙**) off to hide the text box, on the node and on the subgraph node when it is inside one. The node gets smaller; the result is still made and output.
