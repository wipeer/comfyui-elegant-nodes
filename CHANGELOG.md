# Changelog

## 1.7.0

- **Elegant Load Image (from Folder)**: **filter** by file name with wildcards, e.g.
  `*train_??5.*` (case is ignored), and an advanced **include_subfolders** switch. The preview
  shows how many images matched.
- New inputs added since 1.5.0 are optional, so prompts saved in API format before keep working.
- **Elegant Any to String Multi Preview**: **prefix** and **suffix** are single-line fields now,
  with `\n` / `\t` like the delimiter, so they hide and grey out reliably like the other settings.

## 1.6.0

- **Elegant Any to String Multi Preview**: optional **prefix** and **suffix** (multi-line, as
  typed) around the joined text in concat mode. Switch them on with the advanced `use_prefix` /
  `use_suffix`; the fields then show with the normal settings, otherwise they're advanced and
  greyed out. Workflows saved before keep their values.

## 1.5.0

- **New: Elegant Load Image (from Folder)**: ComfyUI's Load Image (from Folder) plus a
  `filename` output; the advanced `filename_format` picks file name, name without extension or
  full path. Loads in natural name order, applies EXIF rotation, reruns when the folder changes,
  and lists the loaded files on the node and on subgraph nodes.
- Vue nodes view: the ? / ⚙ title buttons no longer stick to another node when Vue reuses a
  removed node's header (e.g. after converting a selection to a subgraph).

## 1.4.0

- **Elegant Random Number** now uses ComfyUI's standard seed with its **control after
  generate** (fixed / increment / decrement / randomize), like KSampler. The 🎲 Random,
  ♻️ Last seed → fixed and 🎲 Random → fixed buttons set the seed and that control.
  **Breaking:** the random/fixed `mode` switch is gone; re-add the node in workflows saved
  with 1.3.0.
- **Elegant Any to String Multi Preview** shows only the setting its mode uses: `delimiter` in
  concat, `index` in switch. The other one moves to the advanced settings (⚙), greyed out.
- Hidden advanced inputs no longer leave empty gaps in the classic canvas.
- New [TODO.md](TODO.md): known limitations, workarounds and plans.

## 1.3.0

- **New: Elegant Random Number**: a seeded random int or float between min and max, with the same
  random/fixed switch and seed buttons as Elegant Seed; works from subgraph nodes.
- **Elegant Any to String Multi Preview**: new **switch** mode picks one source by **index**, with
  a **value** output that passes the chosen source through unchanged (images, models, …).
  Advanced **out_of_range** setting: error (default), clamp or wrap.
- **Elegant Any Math Multi Preview**: seeded `rand`, `randint` and `uniform` functions.
- **wrap_text** is now an advanced input (still off by default).
- New cyan **⚙** in the title of nodes with advanced inputs: shows or hides them in both the
  classic and the Vue nodes view, in sync with ComfyUI's "Show advanced inputs" button.
- Preview boxes stay below buttons and results, on nodes and on subgraph nodes.

## 1.2.0

- **Elegant Any to String Preview** and **Multi Preview**: new **wrap_text** switch to wrap long
  lines to the box width; the box grows to fit. The box on a subgraph node follows it too.
- **Elegant Seed**: ♻️ Last seed → fixed now restores the seed of the last *finished* run (the
  image you see). Before, it took the last *queued* run, so with another run queued or
  generating (Run pressed again, batch count, Instant mode) it gave a newer, unseen seed.

## 1.1.0

- Preview nodes inside a subgraph show their box on the subgraph node right away, before the
  first run (also when added later or when a node that already ran is turned into a subgraph).
- The last preview text is saved with the workflow (up to 10,000 characters), so previews show
  their values again right after loading, also on subgraph nodes.

## 1.0.0

First public release. Every node works from the subgraph node: buttons, live results and
previews show there, per copy of the subgraph.

- **Elegant Seed**: random/fixed switch, Random, Last seed → fixed and Random → fixed buttons,
  follows the global "Widget control mode" (before/after), remembers the last seed per node.
- **Elegant Resolution Selector**: aspect ratio with landscape/portrait, constant pixel count
  from a base size, rounding to 8/16/32/64, live read-only result.
- **Elegant Any to String Preview** and **Multi Preview**: any value(s) as plain text, joined
  with a configurable delimiter.
- **Elegant Any Math Multi Preview**: safe math expressions over auto-growing inputs, with int,
  float, boolean and string outputs and a worked-out preview.
- A cyan **?** in each node's title opens detailed help.

**Breaking:** node ids renamed from earlier development versions: `ElegantResolution` →
`ElegantResolutionSelector`, `ElegantAnyToString` → `ElegantAnyToStringPreview`,
`ElegantAnyToStringAdvanced` → `ElegantAnyToStringMultiPreview`.
