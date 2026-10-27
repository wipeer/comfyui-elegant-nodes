// Elegant Slider: ComfyUI's own slider, with a range you set on the node. The slider follows
// the node's min, max and step; the Python side keeps the value there for runs from the API.

import { app } from "../../scripts/app.js";
import { NODE_IDS, chainMethod, onNodeCreated } from "./common.js";

// Nodes 2.0 puts every widget's name in a column to the left of the widget, which leaves the
// slider half the width. On Elegant Sliders the slider row loses its name and fills the node,
// and the other rows (the advanced range settings) get their name above them. Vue's markup has
// no names for these parts, so the label and field of each row are tagged and styled here; if
// the markup changes the tags simply don't match and the node looks as Vue draws it.
const VUE_NODE = "data-elegant-slider";
const VUE_SLIDER_ROW = "data-elegant-slider-row";
const VUE_LABEL = "data-elegant-label";
const VUE_FIELD = "data-elegant-field";
const VUE_STYLE = `
[${VUE_NODE}] [${VUE_FIELD}] { display: flex !important; flex-direction: column; align-items: stretch; gap: 2px; }
[${VUE_NODE}] [${VUE_FIELD}] > * { grid-column: auto !important; min-width: 0; }
[${VUE_NODE}] [${VUE_LABEL}] { font-size: 11px; opacity: 0.65; line-height: 1.2; padding-left: 2px; }
[${VUE_SLIDER_ROW}] [${VUE_LABEL}] { display: none; }
`;

const liveSliders = new Set();

function ensureVueStyle() {
  if (document.getElementById("elegant-slider-style")) return;
  const style = document.createElement("style");
  style.id = "elegant-slider-style";
  style.textContent = VUE_STYLE;
  document.head.appendChild(style);
}

/** The element holding a widget row's label and field: the innermost grid with two or more children. */
function fieldOf(row) {
  const grids = [...row.querySelectorAll(":scope div")].filter((div) => {
    return div.children.length >= 2 && getComputedStyle(div).display === "grid" && div.className.includes("subgrid");
  });
  return grids.at(-1) ?? null;
}

function tagVueSliders() {
  const graph = app.canvas?.graph ?? app.graph;
  const wanted = new Set();
  for (const node of liveSliders) {
    if (node.graph && node.graph === graph) wanted.add(String(node.id));
  }
  for (const element of document.querySelectorAll("[data-node-id]")) {
    const isSlider = wanted.has(element.dataset.nodeId);
    element.toggleAttribute(VUE_NODE, isSlider);
    if (!isSlider) continue;
    for (const row of element.querySelectorAll(".lg-node-widget")) {
      const field = fieldOf(row);
      if (!field) continue;
      field.setAttribute(VUE_FIELD, "");
      field.firstElementChild?.setAttribute(VUE_LABEL, "");
      row.toggleAttribute(VUE_SLIDER_ROW, !!row.querySelector('[role="slider"]'));
    }
  }
}

ensureVueStyle();
setInterval(tagVueSliders, 250);

const FREE_STEP = 0.01; // step 0 (any value): the slider still needs a size for one drag step

const MAX_DECIMALS = 6;

/** Decimals needed to show multiples of `step` (1 -> 0, 0.25 -> 2). */
function decimalsOf(step) {
  let decimals = 0;
  while (decimals < MAX_DECIMALS && Math.abs(step * 10 ** decimals - Math.round(step * 10 ** decimals)) > 1e-9) {
    decimals += 1;
  }
  return decimals;
}

/**
 * The value limited to the range and moved to the nearest step from the lower end.
 * Mirrors snap_to_range() in core/slider.py.
 */
function snapToRange(value, minimum, maximum, step) {
  const low = Math.min(minimum, maximum);
  const high = Math.max(minimum, maximum);
  let result = Math.min(Math.max(value, low), high);
  if (step > 0) {
    result = low + Math.floor((result - low) / step + 0.5) * step;
    if (result > high) result = low + Math.floor((high - low) / step) * step;
  }
  return Number(result.toFixed(10));
}

function setupSlider(node) {
  const find = (name) => node.widgets?.find((w) => w.name === name);
  const value = find("value");
  const min = find("min");
  const max = find("max");
  const step = find("step");
  if (!value || !min || !max || !step) return;

  // `clamp`: also bring the current value into the new range (not when a workflow loads).
  const apply = (clamp) => {
    const low = Math.min(Number(min.value), Number(max.value));
    const high = Math.max(Number(min.value), Number(max.value));
    const size = Number(step.value) > 0 ? Number(step.value) : FREE_STEP;

    // `step` is what the classic canvas multiplies by 10; `step2` is the real step.
    Object.assign(value.options, { min: low, max: high, step: size * 10, step2: size, precision: decimalsOf(size) });

    if (clamp) {
      const snapped = snapToRange(Number(value.value), low, high, Number(step.value));
      if (snapped !== value.value) {
        value.value = snapped;
        value.callback?.(snapped);
      }
    }
    node.setDirtyCanvas?.(true, true);
  };

  for (const widget of [min, max, step]) chainMethod(widget, "callback", () => apply(true));
  chainMethod(node, "onConfigure", () => apply(false));
  apply(false);

  chainMethod(node, "onRemoved", () => liveSliders.delete(node));
  liveSliders.add(node);
}

app.registerExtension({
  name: "elegant.slider",
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name === NODE_IDS.slider) onNodeCreated(nodeType, setupSlider);
  },
});
