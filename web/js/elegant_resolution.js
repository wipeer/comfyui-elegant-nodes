import { app } from "../../scripts/app.js";
import {
  collectPromoted,
  groupsSignature,
  hostInputConnected,
  inputIsLinked,
  liveWidget,
  replaceHostWidgets,
  watchSubgraphHost,
} from "./elegant_common.js";

const NODE_ID = "ElegantResolution";
const INPUT_NAMES = ["aspect_ratio", "orientation", "base", "round_to"];

// Must stay in sync with ASPECT_RATIOS / compute_resolution() in resolution.py.
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
  const ratio = landscape ? a / b : b / a;
  const scale = Math.sqrt(ratio);
  const width = Math.max(roundTo, Math.floor((base * scale) / roundTo + 0.5) * roundTo);
  const height = Math.max(roundTo, Math.floor(base / scale / roundTo + 0.5) * roundTo);
  return [width, height];
}

function describe(values) {
  if (!values) return "set by a linked input";
  const { aspect_ratio, orientation, base, round_to } = values;
  const roundTo = Number(round_to);
  if (!(aspect_ratio in ASPECT_RATIOS) || !Number.isFinite(base) || !(roundTo > 0)) return "–";

  const [width, height] = computeResolution(aspect_ratio, !!orientation, base, roundTo);
  // Same megapixel convention as ComfyUI's own nodes: 1 MP = 1024 × 1024.
  const megapixels = ((width * height) / (1024 * 1024)).toFixed(2);
  const long = Math.max(width, height) / Math.min(width, height);
  const ratio = width === height ? "1:1" : width > height ? `${long.toFixed(2)}:1` : `1:${long.toFixed(2)}`;
  return `${width} × ${height} · ${megapixels} MP · ${ratio}`;
}

// Result fields currently on screen; refreshed together so they follow any change
// (typing, switches, promoted widgets, workflow load) in both renderers.
const liveResults = new Set();
setInterval(() => {
  for (const entry of liveResults) {
    if (!entry.owner.graph || !entry.owner.widgets?.includes(entry.widget)) liveResults.delete(entry);
    else entry.update();
  }
}, 250);

/** Shows the aspect ratio dropdown in the current orientation, e.g. 3:2 as 2:3 in portrait. */
function labelAspectRatios(aspectWidget, getOrientationWidget) {
  if (!aspectWidget?.options || aspectWidget.options.__elegantLabels) return;
  aspectWidget.options.getOptionLabel = (value) => {
    const landscape = getOrientationWidget()?.value ?? true;
    if (landscape || !value || !value.includes(":")) return value ?? "";
    const [a, b] = value.split(":");
    return `${b}:${a}`;
  };
  aspectWidget.options.__elegantLabels = true;
}

/**
 * Read-only "result" field showing the resulting size. It is a regular text
 * widget so it looks like the other fields, and is never sent to the backend.
 * (Not "disabled": the canvas hides the value of disabled widgets.)
 */
function addResultWidget(owner, getWidgets, isActive) {
  const widget = owner.addWidget("text", "result", "", () => {}, { serialize: false });
  widget.serialize = false;
  widget.options ??= {};
  widget.options.serialize = false;
  widget.options.read_only = true; // Vue nodes: read-only input
  widget.onClick = () => {}; // Canvas: don't open the edit prompt
  widget.tooltip = "Width × height · megapixels · actual aspect ratio after rounding";

  let lastAspect;
  const update = () => {
    const widgets = getWidgets();
    labelAspectRatios(widgets.aspect_ratio, () => getWidgets().orientation);
    const values = isActive()
      ? Object.fromEntries(INPUT_NAMES.map((name) => [name, widgets[name]?.value]))
      : null;
    const text = describe(values);
    if (widget.value !== text) {
      widget.value = text;
      // The dropdown shows the ratio in the current orientation, so redraw it too.
      owner.setDirtyCanvas?.(true, false);
    }

    // Orientation has no effect on a square.
    const square = values?.aspect_ratio === "1:1";
    if (widgets.orientation && "disabled" in widgets.orientation && lastAspect !== square) {
      widgets.orientation.disabled = square;
      lastAspect = square;
    }
  };
  update();
  liveResults.add({ owner, widget, update });
  return widget;
}

function setupElegantResolution(node) {
  const byName = () => Object.fromEntries((node.widgets ?? []).map((w) => [w.name, w]));
  // When an input is fed by a link (e.g. promoted to a subgraph node), the value
  // here is not the one that gets used; the subgraph node shows the result instead.
  addResultWidget(node, byName, () => !INPUT_NAMES.some((name) => inputIsLinked(node, name)));

  // The node's initial size is set before this widget exists; make room for it,
  // also for workflows saved with a smaller node.
  const growToFit = () => {
    const [minWidth, minHeight] = node.computeSize?.() ?? node.size;
    if (node.size[0] < minWidth || node.size[1] < minHeight) {
      node.setSize?.([Math.max(node.size[0], minWidth), Math.max(node.size[1], minHeight)]);
    }
  };
  growToFit();
  const originalOnConfigure = node.onConfigure;
  node.onConfigure = function (...args) {
    const result = originalOnConfigure?.apply(this, args);
    growToFit();
    return result;
  };
}

function syncSubgraphHost(host) {
  const state = (host.__elegantResolution ??= { signature: null });
  const groups = collectPromoted(host, NODE_ID).filter((g) => INPUT_NAMES.some((n) => g.inputs[n]));
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
            group.inputs[name]
              ? !hostInputConnected(host, group.inputs[name])
              : !inputIsLinked(group.inner, name)
          )
      )
    )
  );
}

app.registerExtension({
  name: "elegant.resolution",
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name !== NODE_ID) return;
    const onNodeCreated = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function (...args) {
      const result = onNodeCreated?.apply(this, args);
      setupElegantResolution(this);
      return result;
    };
  },
  nodeCreated(node) {
    if (node.isSubgraphNode?.()) watchSubgraphHost(node, syncSubgraphHost);
  },
});
