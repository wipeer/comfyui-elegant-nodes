# Changelog

## Unreleased

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
