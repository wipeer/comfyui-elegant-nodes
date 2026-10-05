# TODO and known limitations

What doesn't work (yet), why, and what's planned. Most limitations come from ComfyUI itself;
they're listed with the workaround in place, so they can be revisited when ComfyUI changes.

## Known limitations

### ComfyUI backend

- **Multi Preview switch computes every source.** In switch mode only the chosen source is
  used, but ComfyUI still runs everything connected to the other sources. Lazy evaluation would
  skip them, but ComfyUI ignores it for auto-growing inputs (`source_1`, `source_2`, …): the
  executor only looks at the node's static input list. Workaround: none; keep expensive branches
  out of a switch, or bypass them.

### ComfyUI frontend

- **Random Number's *control after generate* isn't promoted to subgraph nodes.** ComfyUI promotes
  `seed` but keeps its control widget on the node inside. The seed buttons on the subgraph node
  set that inner control, so they work; changing it by hand means opening the subgraph.
- **Multi Preview mode hints only on the node itself.** Hiding the setting the mode doesn't use
  (`delimiter` or `index`) works on the Multi Preview node. Copies of those widgets promoted to a
  subgraph node aren't handled: show only the one you need by promoting just that one.
- **Greyed-out widgets hide their value in the classic canvas.** The canvas doesn't draw the value
  of a disabled widget, so the unused Multi Preview setting shows only its name there (the Vue
  nodes view shows the value). This is also why the Resolution Selector's result is a read-only
  text field rather than a disabled one.
- **Hidden advanced inputs left gaps in the classic canvas.** Its layout reserves room for every
  widget that isn't `hidden`, including hidden advanced ones. Worked around in
  `web/js/advanced_toggle.js`, which also reports advanced widgets as `hidden` while collapsed.
- **No native "show advanced inputs" button in the classic canvas.** Covered by the ⚙ title
  button, which uses the same per-node state as ComfyUI's own button in the Vue nodes view.
- **Converting a selection that contains a subgraph node into a subgraph can drop links.** This is
  a ComfyUI frontend bug with nested subgraphs, not specific to these nodes. Workaround: reconnect
  the links, or build the inner subgraph first and add nodes around it inside the outer one.
- **Random seeds go up to 2⁵³ − 1.** The browser represents integers exactly only up to there
  (ComfyUI's own randomize has the same cap). Larger seeds can still be typed.

### Comfy Registry

- **The registry page shows "No nodes found".** The node list is extracted by the registry's
  build, not by this repo; the same query run locally finds all six nodes, and installing works.
  Reported upstream; nothing to change here unless the registry asks for something.

### Releases

- **Git tags and GitHub releases are created by hand.** Pushing tags is blocked in the
  environment used for development, so after a version bump create the `vX.Y.Z` release in the
  GitHub UI. Publishing to the registry is automatic (GitHub Actions, on a `pyproject.toml`
  version change on `main`).

## Plans and ideas

- [ ] Lazy switch in Multi Preview once ComfyUI supports lazy auto-growing inputs.
- [ ] Mode hints (hide the unused `delimiter` / `index`) on subgraph nodes too.
- [ ] Show Random Number's *control after generate* on the subgraph node.
- [ ] An **Elegant Nodes** section in ComfyUI's settings (e.g. default `wrap_text`, hiding the
      ? / ⚙ title buttons).
- [ ] Frontend tests in CI. `tests/` covers the Python logic in `core/`; the frontend (buttons,
      subgraph sync, previews, ⚙) is tested by hand in the classic and Vue nodes views.
- [ ] Refresh the screenshots in `docs/images/` (the Random Number now shows ComfyUI's seed
      control instead of the random/fixed switch).

## Release checklist

1. Update `CHANGELOG.md` (move *Unreleased* to the new version).
2. Bump `version` in `pyproject.toml` and push to `main`; GitHub Actions publishes to the
   registry.
3. Create the `vX.Y.Z` release on GitHub with the changelog section as notes.
