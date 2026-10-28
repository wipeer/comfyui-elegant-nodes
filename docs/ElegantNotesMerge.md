# Elegant Notes Merge

Joins named lists (from **Elegant Notes**, or anything that outputs a `NAMED_LIST`) into one flat list, and gives out the tabs as lists or one tab by index.

## Inputs

| Item | Description |
|---|---|
| **list_1, list_2, …** | Named lists to join. A new input appears each time you connect the last free one (up to 20). |
| **index** | Which tab the single-tab outputs give, counting from 1. Starts at 1, and after each run it is capped at the number of tabs. Can be connected. |
| **out_of_range** | (advanced, **⚙**) What an index outside the tabs does. **clamp** (default): below 1 uses the first tab, above the last uses the last. **error**: stop the run with a message. **wrap**: count around (one past the last is the first again). |

## Joining

The tabs of all connected lists come out in order, one after the other, with no nesting. If two tabs have the same name, the later one gets a suffix (`intro`, `intro_2`). Empty names become `tab1`, `tab2`, …

## Outputs

| Item | Description |
|---|---|
| **named list** | All tabs, as one `NAMED_LIST`. |
| **tab names** | The names of all tabs, as a list of strings. |
| **tab values** | The values of all tabs, as a list of strings. |
| **tab name** | The name of the tab at **index**. |
| **tab value** | The text of the tab at **index**. |
| **count** | How many tabs there are. |

The node also shows the **count** as a row, and the index is limited to 1 up to that count after each run.
