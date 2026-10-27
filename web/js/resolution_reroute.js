// Elegant Resolution Reroute: the text output is optional, shown or hidden by the advanced
// text_output switch. The node always makes the text; this adds or removes its output slot.

import { app } from "../../scripts/app.js";
import { syncClassicAdvanced } from "./advanced_toggle.js";
import { NODE_IDS, chainMethod, onNodeCreated } from "./common.js";

const TEXT_OUTPUT = "text";
const SWITCH = "text_output";

function setupResolutionReroute(node) {
  const toggle = node.widgets?.find((w) => w.name === SWITCH);
  const textIndex = () => node.outputs?.findIndex((o) => o.name === TEXT_OUTPUT) ?? -1;
  if (!toggle || textIndex() === -1) return;

  // The slot as ComfyUI made it, to put back the same one.
  const { name, type, localized_name, tooltip } = node.outputs[textIndex()];

  const apply = (loading) => {
    const index = textIndex();
    const linked = index !== -1 && !!node.outputs[index].links?.length;

    // A workflow saved before the switch existed has the output in use: keep it, and the switch on.
    if (loading && !toggle.value && linked) toggle.value = true;

    if (toggle.value && index === -1) {
      node.addOutput(name, type, { localized_name, tooltip });
    } else if (!toggle.value && index !== -1) {
      node.removeOutput(index);
    } else {
      return;
    }
    node.setSize?.([node.size[0], node.computeSize()[1]]);
    node.setDirtyCanvas?.(true, true);
  };

  chainMethod(toggle, "callback", () => apply(false));
  chainMethod(node, "onConfigure", () => apply(true));
  apply(false);

  // The switch is advanced: the classic canvas needs help hiding it behind the ⚙.
  chainMethod(node, "onDrawBackground", () => syncClassicAdvanced(node));
  syncClassicAdvanced(node);
}

app.registerExtension({
  name: "elegant.resolution_reroute",
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name === NODE_IDS.resolutionReroute) onNodeCreated(nodeType, setupResolutionReroute);
  },
});
