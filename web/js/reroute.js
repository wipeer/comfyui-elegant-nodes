// Elegant Reroute: a bare pass-through that can be renamed (double-click the title) and
// resized down to a small square, in both the classic canvas and the Vue nodes view.

import { app } from "../../scripts/app.js";
import { chainMethod, onNodeCreated } from "./common.js";

const REROUTE_NODE_TYPE = "ElegantReroute";

const MIN_SIZE = [34, 26];
const DEFAULT_SIZE = [120, 26];

// Room the type name needs: padding plus about this much per character (14px text).
const LABEL_PADDING = 24;
const LABEL_CHAR_WIDTH = 7.5;

// The Vue nodes view gives every node a minimum width of 225px (--min-node-width) and
// doesn't expose the node type in the DOM. Reroutes are tagged, and a rule with !important
// (which beats the inline style) lowers the minimum for them only.
const VUE_ATTRIBUTE = "data-elegant-reroute";
const VUE_STYLE = `[${VUE_ATTRIBUTE}] { --min-node-width: ${MIN_SIZE[0]}px !important; }`;

const liveReroutes = new Set();

// The input has no name; the output is named after the type that comes through (LATENT,
// MODEL, ...), or nothing while nothing is connected or the node is too small to hold it.
function syncSlotLabels(node) {
  for (const input of node.inputs ?? []) input.label = " ";
  for (const output of node.outputs ?? []) {
    const type = output.type && output.type !== "*" ? String(output.type) : "";
    const fits = node.size[0] >= LABEL_PADDING + LABEL_CHAR_WIDTH * type.length;
    const label = type && fits ? type : " ";
    if (output.label === label) continue;
    output.label = label;
    node.setDirtyCanvas?.(true, true);
  }
}

function setupReroute(node) {
  node.computeSize = () => [...MIN_SIZE]; // the smallest size the node can be resized to
  node.setSize?.([...DEFAULT_SIZE]);
  syncSlotLabels(node);
  chainMethod(node, "onConfigure", syncSlotLabels);
  chainMethod(node, "onConnectionsChange", syncSlotLabels);
  chainMethod(node, "onRemoved", () => liveReroutes.delete(node));
  liveReroutes.add(node);
}

function ensureVueStyle() {
  if (document.getElementById("elegant-reroute-style")) return;
  const style = document.createElement("style");
  style.id = "elegant-reroute-style";
  style.textContent = VUE_STYLE;
  document.head.appendChild(style);
}

// Vue may reuse an element for another node, so tags are set and cleared on every pass.
function tagVueNodes() {
  for (const node of liveReroutes) syncSlotLabels(node); // the type can change from upstream
  const graph = app.canvas?.graph ?? app.graph;
  const wanted = new Set();
  for (const node of liveReroutes) {
    if (node.graph && node.graph === graph) wanted.add(String(node.id));
  }
  for (const element of document.querySelectorAll("[data-node-id]")) {
    element.toggleAttribute(VUE_ATTRIBUTE, wanted.has(element.dataset.nodeId));
  }
}

ensureVueStyle();
setInterval(tagVueNodes, 250);

app.registerExtension({
  name: "elegant.reroute",
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name === REROUTE_NODE_TYPE) onNodeCreated(nodeType, setupReroute);
  },
});
