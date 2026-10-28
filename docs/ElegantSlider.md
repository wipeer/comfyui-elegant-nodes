# Elegant Slider

ComfyUI's own slider for a number, with the range set on the node: no fixed 0 to 100 like in other nodes.

### Controls

**min**, **max** and **step** are advanced: click the **⚙** in the title to show them.

| Item | Description |
|---|---|
| **value** | The slider. Drag it, or double-click to type a number. Its range is **min** to **max**. |
| **min**, **max** | The smallest and largest value on the slider. Change them and the slider follows; a value outside the new range is moved into it. If **min** is above **max** they are swapped. |
| **step** | The size of one step: `1` for whole numbers, `0.01` for hundredths, `0.25` for quarters. `0`: any value. Steps count from **min**, so 0 to 10 in steps of 3 gives 0, 3, 6, 9. |

### Outputs

| Item | Description |
|---|---|
| **int** | The value rounded to a whole number (INT). |
| **float** | The value (FLOAT). |

The value is also kept inside the range and on the step when the workflow runs, e.g. when it is sent through the API with a value outside the range.
