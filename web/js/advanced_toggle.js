// ⚙ in the title of Elegant nodes that have advanced inputs: shows or hides them.
//
// It flips the node's own "show advanced" state — the same one behind ComfyUI's
// "Show advanced inputs" button in Vue nodes and the side panel's advanced
// section — so all of them stay in sync, and it is saved with the workflow.

import { app } from "../../scripts/app.js";
import { NODE_IDS, growToFit, onNodeCreated } from "./common.js";
import { refreshTitleButtons, registerTitleButton } from "./title_buttons.js";

const ELEGANT_NODE_TYPES = new Set(Object.values(NODE_IDS));

function alwaysShowAdvanced() {
  return !!app.extensionManager?.setting?.get?.("Comfy.Node.AlwaysShowAdvancedWidgets");
}

const advancedWidgets = (node) => (node.widgets ?? []).filter((w) => w.options?.advanced);

/**
 * The classic canvas hides a widget only when `widget.advanced` is set (the
 * frontend only sets `options.advanced`), so mirror it there, live — some
 * widgets become advanced depending on other settings (e.g. Multi Preview's
 * mode) — unless the global "always show advanced inputs" setting is on.
 *
 * The canvas also keeps room for hidden advanced widgets (its layout skips
 * only `hidden` ones), leaving gaps, so they also report `hidden` while the
 * advanced inputs are collapsed.
 */
function markAdvancedForCanvas(node) {
  for (const widget of node.widgets ?? []) {
    if (Object.getOwnPropertyDescriptor(widget, "advanced")?.get) continue;
    const isAdvanced = () => !!widget.options?.advanced && !alwaysShowAdvanced();
    Object.defineProperty(widget, "advanced", { get: isAdvanced, set: () => {}, configurable: true });

    let hidden = !!widget.hidden;
    Object.defineProperty(widget, "hidden", {
      get: () => hidden || (isAdvanced() && !node.showAdvanced),
      set: (value) => (hidden = value),
      configurable: true,
    });
  }
}

function toggleAdvanced(node) {
  node.showAdvanced = !node.showAdvanced;
  // Fit the node to the widgets now shown: grow when showing, shrink when hiding.
  const [, minHeight] = node.computeSize?.() ?? node.size;
  if (node.showAdvanced) growToFit(node);
  else node.setSize?.([node.size[0], minHeight]);
  node.setDirtyCanvas?.(true, true);
  refreshTitleButtons();
}

registerTitleButton({
  name: "elegant_advanced",
  order: 1, // left of the ? help button
  glyph: "⚙",
  tooltip: "Show / hide advanced settings",
  appliesTo: (nodeId, node) => advancedWidgets(node).length > 0,
  isActive: (node) => !!node.showAdvanced || alwaysShowAdvanced(),
  onClick: (node) => toggleAdvanced(node),
});

app.registerExtension({
  name: "elegant.advanced_toggle",
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (ELEGANT_NODE_TYPES.has(nodeData.name)) onNodeCreated(nodeType, markAdvancedForCanvas);
  },
});
