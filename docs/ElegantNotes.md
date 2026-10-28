# Elegant Notes

Tabs of text, each with a name you can change. Outputs the tabs as a **named list** (`NAMED_LIST`), for **Elegant Notes Merge** or any node that takes a named list.

## Editing

| Action | How |
|---|---|
| Show a tab | Click it. Its text shows in the box below. |
| Rename a tab | **Double-click** it, type, then press Enter (Escape cancels). A name another tab already has gets a suffix (`tab2_2`). |
| Add a tab | **+** at the end of the strip. |
| Delete the shown tab | **✕** at the right end of the strip. |
| Write the text | Type in the box below the tabs. |

The tabs are saved with the workflow.

## Input

| Item | Description |
|---|---|
| **notes** | The tabs as text, or a **NAMED_LIST** connected from another node (for example another Elegant Notes or a reroute). While a list is connected, the tabs come from it and the editor is replaced by a note. Disconnect it to edit the tabs here. |

## Output

| Item | Description |
|---|---|
| **named list** | The tabs as `NAMED_LIST`: a list of `{name, value}`. |

## Files

Click **Files** in the strip to open the file panel:

- **path**: a JSON file, relative to ComfyUI's **output** folder. `.json` is added when missing. Default: `elegant-notes.json`. A path outside the output folder is refused.
- **Load from file** fills the tabs from the file.
- **Save to file** writes the tabs to the file.

The line under the buttons says what happened, for example *Saved 2 tabs to elegant-notes.json*, or the error. The run uses the tabs on the node, not the file.

The JSON file looks like this:

```json
[
  {"name": "intro", "value": "A short text."},
  {"name": "style", "value": "Cinematic, soft light."}
]
```
