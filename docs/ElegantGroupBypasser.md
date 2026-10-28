# Elegant Group Bypasser

One toggle per group, to bypass or enable everything inside the group at once. A port of **Fast Groups Bypasser** from rgthree-comfy that also works in the Vue nodes view.

Add it and it lists the groups of the graph it sits in (inside a subgraph: the groups of that subgraph). switching it **on** enables every node inside the group, **off** bypasses them, nodes inside subgraph nodes too. The toggles follow changes made elsewhere, live. It never runs: it isn't part of the prompt.

### Settings

Advanced: click the **⚙** in the title to show them.

| Item | Description |
|---|---|
| **match_title** | Only list groups whose title matches. Plain text, or a regular expression; upper/lower case is ignored. Empty: all groups. |
| **match_colors** | Only list groups of these colours, comma separated: ComfyUI colour names (`red`, `green`, `blue`, `pale_blue`, `cyan`, `purple`, `yellow`, `brown`, `black`) or hex codes (`#a4d399`, `#f00`). The colour must match exactly; groups without a colour are left out. Together with **match_title**, a group must pass both. Empty: all colours. |
| **sort** | `position`: top to bottom, then left to right. `alphanumeric`: by title, numbers by value (18 before 100), case ignored. |
| **restriction** | `default`: any number of groups on. `max one`: switching a group on switches the others off. `always one`: also keeps one group on. Only enforced by clicks on this node; changing nodes some other way can break it. |

### Right-click menu

| Item | Description |
|---|---|
| **Bypass all** | Bypass every listed group (with **always one**, the first stays on). |
| **Enable all** | Enable every listed group (with a **max one** restriction, only the first). |
| **Toggle all** | Flip every listed group. |
| **Go to group: …** | Pan and zoom to a group (the first 20 listed). |

### Good to know

- A node counts as inside a group when its centre is. A node in two overlapping groups follows whichever toggle was used last.

- A group with no nodes shows as **off**.

- The node never changes itself, even if it sits inside a group.
