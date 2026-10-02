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
  return `${width} × ${height}  ·  ${megapixels} MP  ·  ${ratio}`;
}

/**
 * Read-only line showing the resulting size. It recomputes on every draw, so it
 * follows any change (typing, promoted widgets, workflow load) without wiring.
 */
function addResultWidget(owner, getWidgets, isActive) {
  const LG = globalThis.LiteGraph ?? {};
  const widget = {
    name: "result",
    type: "elegant_resolution_result",
    value: "",
    serialize: false,
    options: { serialize: false },
    draw(ctx, node, width, y, height) {
      const widgets = getWidgets();
      const values = isActive()
        ? Object.fromEntries(INPUT_NAMES.map((name) => [name, widgets[name]?.value]))
        : null;
      this.value = describe(values);

      // Orientation has no effect on a square.
      if (widgets.orientation && "disabled" in widgets.orientation) {
        widgets.orientation.disabled = values?.aspect_ratio === "1:1";
      }

      const margin = 15;
      ctx.save();
      ctx.strokeStyle = LG.WIDGET_OUTLINE_COLOR ?? "#666";
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.roundRect?.(margin, y, width - margin * 2, height, height * 0.5) ??
        ctx.rect(margin, y, width - margin * 2, height);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = LG.WIDGET_TEXT_COLOR ?? "#ddd";
      ctx.font = `${Math.round(height * 0.6)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(this.value, width * 0.5, y + height * 0.5);
      ctx.restore();
    },
    computeSize(width) {
      return [width, globalThis.LiteGraph?.NODE_WIDGET_HEIGHT ?? 20];
    },
  };
  return owner.addCustomWidget(widget);
}

function setupElegantResolution(node) {
  const byName = () => Object.fromEntries((node.widgets ?? []).map((w) => [w.name, w]));
  // When an input is fed by a link (e.g. promoted to a subgraph node), the value
  // here is not the one that gets used; the subgraph node shows the result instead.
  addResultWidget(node, byName, () => !INPUT_NAMES.some((name) => inputIsLinked(node, name)));
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
