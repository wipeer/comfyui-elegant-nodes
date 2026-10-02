# Changelog

## 1.0.0

First public release.

- **Elegant Seed**: random/fixed switch, Random, Last seed → fixed and Random → fixed buttons,
  follows the global "Widget control mode" (before/after), remembers the last seed per node.
- **Elegant Resolution Selector**: aspect ratio with landscape/portrait, constant pixel count
  from a base size, rounding to 8/16/32/64, live read-only result.
- **Elegant Any to String Preview** and **Multi Preview**: any value(s) as plain text, joined
  with a configurable delimiter.
- **Elegant Any Math Multi Preview**: safe math expressions over auto-growing inputs, with int,
  float, boolean and string outputs and a worked-out preview.
- All nodes work inside subgraphs: buttons, results and previews also show on the subgraph node.
- A cyan **?** in each node's title opens detailed help.

**Breaking:** node ids renamed from earlier development versions: `ElegantResolution` →
`ElegantResolutionSelector`, `ElegantAnyToString` → `ElegantAnyToStringPreview`,
`ElegantAnyToStringAdvanced` → `ElegantAnyToStringMultiPreview`.
