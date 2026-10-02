// Elegant Resolution Selector: live read-only result, orientation-aware ratio labels.

import { app } from "../../scripts/app.js";
import {
  NODE_IDS,
  chainMethod,
  collectPromoted,
  frontendOnly,
  groupsSignature,
  growToFit,
  hostInputConnected,
  inputIsLinked,
  liveWidget,
  onNodeCreated,
  replaceHostWidgets,
  watchSubgraphHost,
} from "./common.js";

const INPUT_NAMES = ["aspect_ratio", "orientation", "base", "round_to"];

// Must match ASPECT_RATIOS and compute_resolution() in core/resolution.py.
const ASPECT_RATIOS = {
  "1:1": [1, 1],
  "5:4": [5, 4],
  "9:7": [9, 7],
  "4:3": [4, 3],
  "3:2": [3, 2],
  "16:9": [16, 9],
  "21:9": [21, 9],
};

export function computeResolution(aspectRatio, landscape, base, roundTo) {
  const [a, b] = ASPECT_RATIOS[aspectRatio];
  const scale = Math.sqrt(landscape ? a / b : b / a);
  const width = Math.max(roundTo, Math.floor((base * scale) / roundTo + 0.5) * roundTo);
  const height = Math.max(roundTo, Math.floor(base / scale / roundTo + 0.5) * roundTo);
  return [width, height];
}

/** "1360 × 768 · 1.00 MP · 1.77:1", or a hint when the inputs come from links. */
function describe(values) {
  if (!values) return "set by a linked input";
  const { aspect_ratio, orientation, base, round_to } = values;
  const roundTo = Number(round_to);
  if (!(aspect_ratio in ASPECT_RATIOS) || !Number.isFinite(base) || !(roundTo > 0)) return "–";

  const [width, height] = computeResolution(aspect_ratio, !!orientation, base, roundTo);
  // Same megapixel convention as ComfyUI's own nodes: 1 MP = 1024 × 1024.
  const megapixels = ((width * height) / (1024 * 1024)).toFixed(2);
  const long = (Math.max(width, height) / Math.min(width, height)).toFixed(2);
  const ratio = width === height ? "1:1" : width > height ? `${long}:1` : `1:${long}`;
  return `${width} × ${height} · ${megapixels} MP · ${ratio}`;
}

/** Shows the aspect ratio dropdown in the current orientation, e.g. 3:2 as 2:3 in portrait. */
function labelAspectRatios(aspectWidget, getOrientationWidget) {
  if (!aspectWidget?.options || aspectWidget.options.__elegantLabels) return;
  aspectWidget.options.getOptionLabel = (value) => {
    const landscape = getOrientationWidget()?.value ?? true;
    if (landscape || !value?.includes(":")) return value ?? "";
    const [a, b] = value.split(":");
    return `${b}:${a}`;
  };
  aspectWidget.options.__elegantLabels = true;
}

// Result fields on screen, refreshed together so they follow every change
// (typing, switches, promoted widgets, workflow load) in both renderers.
const liveResults = new Set();
setInterval(() => {
  for (const entry of liveResults) {
    if (!entry.owner.graph || !entry.owner.widgets?.includes(entry.widget)) liveResults.delete(entry);
    else entry.update();
  }
}, 250);

/**
 * Read-only "result" field. A regular text widget, so it looks like the other
 * fields. (Not "disabled": the canvas hides the value of disabled widgets.)
 */
function addResultWidget(owner, getWidgets, isActive) {
  const widget = frontendOnly(owner.addWidget("text", "result", "", () => {}));
  widget.options.read_only = true; // Vue nodes: read-only input
  widget.onClick = () => {}; // Canvas: don't open the edit prompt
  widget.tooltip = "Width × height · megapixels · actual aspect ratio after rounding";

  let wasSquare;
  const update = () => {
    const widgets = getWidgets();
    labelAspectRatios(widgets.aspect_ratio, () => getWidgets().orientation);
    const values = isActive() ? Object.fromEntries(INPUT_NAMES.map((name) => [name, widgets[name]?.value])) : null;

    const text = describe(values);
    if (widget.value !== text) {
      widget.value = text;
      // The dropdown label depends on the orientation, so redraw it too.
      owner.setDirtyCanvas?.(true, false);
    }

    // Orientation has no effect on a square.
    const square = values?.aspect_ratio === "1:1";
    if (widgets.orientation && "disabled" in widgets.orientation && wasSquare !== square) {
      widgets.orientation.disabled = square;
      wasSquare = square;
    }
  };
  update();
  liveResults.add({ owner, widget, update });
  return widget;
}

function setupResolutionNode(node) {
  const widgetsByName = () => Object.fromEntries((node.widgets ?? []).map((w) => [w.name, w]));
  // Inputs fed by links (e.g. promoted to a subgraph node): the subgraph node shows the result.
  addResultWidget(node, widgetsByName, () => !INPUT_NAMES.some((name) => inputIsLinked(node, name)));

  // The initial size is set before the result field exists; make room for it,
  // also for workflows saved with a smaller node.
  growToFit(node);
  chainMethod(node, "onConfigure", growToFit);
}

/** Shows the result on a subgraph node for each Elegant Resolution Selector whose inputs it promotes. */
function syncSubgraphNode(host) {
  const state = (host.__elegantResolution ??= { signature: null });
  const groups = collectPromoted(host, NODE_IDS.resolutionSelector).filter((g) =>
    INPUT_NAMES.some((name) => g.inputs[name])
  );
  const signature = groupsSignature(groups);
  if (signature === state.signature) return;
  state.signature = signature;

  replaceHostWidgets(host, "resolution", () =>
    groups.map((group) =>
      addResultWidget(
        host,
        () => Object.fromEntries(INPUT_NAMES.map((name) => [name, liveWidget(host, group, name)])),
        () =>
          INPUT_NAMES.every((name) =>
            group.inputs[name] ? !hostInputConnected(host, group.inputs[name]) : !inputIsLinked(group.inner, name)
          )
      )
    )
  );
}

app.registerExtension({
  name: "elegant.resolution_selector",
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name === NODE_IDS.resolutionSelector) onNodeCreated(nodeType, setupResolutionNode);
  },
  nodeCreated(node) {
    if (node.isSubgraphNode?.()) watchSubgraphHost(node, syncSubgraphNode);
  },
});
