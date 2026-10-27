// Elegant Slider: ComfyUI's own slider, with a range you set on the node. The slider follows
// the node's min, max and step; the Python side keeps the value there for runs from the API.

import { app } from "../../scripts/app.js";
import { syncClassicAdvanced } from "./advanced_toggle.js";
import { NODE_IDS, chainMethod, onNodeCreated } from "./common.js";

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

  // The range settings are advanced: the classic canvas needs help hiding them behind the ⚙.
  chainMethod(node, "onDrawBackground", () => syncClassicAdvanced(node));
  syncClassicAdvanced(node);
}

app.registerExtension({
  name: "elegant.slider",
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name === NODE_IDS.slider) onNodeCreated(nodeType, setupSlider);
  },
});
