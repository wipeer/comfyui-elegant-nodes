// Bypassing a node that feeds an Elegant node's wildcard (any type) input.
//
// When the prompt is built, a bypassed node passes one of its inputs through to its output.
// Which one is chosen by the type the node *after* it expects; for a wildcard input the
// frontend skips the type check and takes input 0 without looking whether the bypassed node
// has any, and throws "SlotIndexError: No input found for flattened id ..." when it has none
// (a text, number or loader node, for example). With a real type it finds no match and simply
// drops the link, as it does for any other input.
//
// So while the prompt is built, linked wildcard inputs of Elegant nodes get the type of their
// link, and are put back right after.

import { app } from "../../scripts/app.js";
import { NODE_IDS } from "./common.js";

const ELEGANT_NODE_TYPES = new Set([...Object.values(NODE_IDS), "ElegantReroute"]);

/** Every node of a graph, also inside subgraph nodes. */
function* nodesDeep(graph, depth = 0) {
  if (!graph || depth > 16) return;
  for (const node of graph.nodes ?? graph._nodes ?? []) {
    yield node;
    if (node.isSubgraphNode?.() && node.subgraph) yield* nodesDeep(node.subgraph, depth + 1);
  }
}

/** Gives linked wildcard inputs the type of their link; returns the function that undoes it. */
function concretizeWildcardInputs(graph) {
  const changed = [];
  for (const node of nodesDeep(graph)) {
    if (!ELEGANT_NODE_TYPES.has(node.type)) continue;
    for (const input of node.inputs ?? []) {
      if (input.type !== "*" || input.link == null) continue;
      const type = node.graph?.getLink?.(input.link)?.type;
      if (!type || type === "*") continue;
      changed.push([input, input.type]);
      input.type = type;
    }
  }
  return () => {
    for (const [input, type] of changed) input.type = type;
  };
}

app.registerExtension({
  name: "elegant.wildcard_bypass",
  setup() {
    const original = app.graphToPrompt;
    if (typeof original !== "function" || original.__elegantWildcardBypass) return;
    const patched = async function (graph = app.rootGraph ?? app.graph, ...rest) {
      const restore = concretizeWildcardInputs(graph);
      try {
        return await original.call(this, graph, ...rest);
      } finally {
        restore();
      }
    };
    patched.__elegantWildcardBypass = true;
    app.graphToPrompt = patched;
  },
});
