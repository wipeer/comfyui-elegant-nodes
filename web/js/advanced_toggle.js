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

export const vueNodesEnabled = () => !!app.extensionManager?.setting?.get?.("Comfy.VueNodes.Enabled");

/**
 * Hides the given advanced widgets in the classic canvas while the node's ⚙ is off (and shows
 * them with it), resizing the node when that changes; call it every frame or tick. Newer
 * frontends show advanced widgets in the classic canvas whatever `options.advanced` says, and
 * keep room for any widget that isn't `hidden`. The Vue nodes view hides them itself, so
 * there the widgets are left alone.
 */
export function syncClassicAdvanced(node, widgets = advancedWidgets(node)) {
  const vue = vueNodesEnabled();
  const show = vue || !!node.showAdvanced || alwaysShowAdvanced();
  if (node.__elegantShowAdvanced === show) return;
  node.__elegantShowAdvanced = show;
  for (const widget of widgets) widget.hidden = !show;
  if (!vue) node.setSize?.([node.size[0], node.computeSize()[1]]);
  node.setDirtyCanvas?.(true, true);
}

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
export function markAdvancedForCanvas(node) {
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
