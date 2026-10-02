// Plain-text preview box for the Elegant preview nodes, also shown on subgraph nodes.

import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { NODE_IDS, chainMethod, frontendOnly, growToFit, onNodeCreated } from "./common.js";

const PREVIEW_NODE_TYPES = new Set([
  NODE_IDS.anyToStringPreview,
  NODE_IDS.anyToStringMultiPreview,
  NODE_IDS.anyMathMultiPreview,
]);

const TEXT_WIDGET = "text";
// A subgraph node gets one text box per preview node inside it, named by that
// node's id path relative to the subgraph node (e.g. "5", or "7:5" when nested).
const HOST_WIDGET_PREFIX = "elegant_text:";

const MIN_HEIGHT = 60;
const MAX_HEIGHT = 240;
const LINE_HEIGHT = 17; // 12px monospace at line-height 1.4, rounded up

function toText(text) {
  if (text == null) return "";
  if (Array.isArray(text)) return text.filter((part) => part != null).join("\n\n");
  return String(text);
}

function addTextWidget(owner, name) {
  const textarea = document.createElement("textarea");
  textarea.readOnly = true;
  textarea.spellcheck = false;
  textarea.placeholder = "Run the workflow to see the value";
  Object.assign(textarea.style, {
    width: "100%",
    height: "100%",
    boxSizing: "border-box",
    resize: "none",
    padding: "6px 8px",
    border: "1px solid var(--border-color, #444)",
    borderRadius: "6px",
    background: "var(--comfy-input-bg, #222)",
    color: "var(--input-text, #ddd)",
    font: "12px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    whiteSpace: "pre",
    overflow: "auto",
  });
  // Scroll the text, not the canvas.
  textarea.addEventListener("wheel", (e) => e.stopPropagation(), { passive: true });

  let minHeight = MIN_HEIGHT;
  const widget = frontendOnly(
    owner.addDOMWidget(name, "elegant_text", textarea, {
      serialize: false,
      getValue: () => textarea.value,
      setValue: (value) => {
        textarea.value = toText(value);
      },
      getMinHeight: () => minHeight,
    })
  );

  // Shows `text`, growing the box (and node) to fit its lines up to MAX_HEIGHT; longer text scrolls.
  widget.setText = (text, tooltip) => {
    widget.value = text;
    textarea.value = text;
    if (tooltip !== undefined) textarea.title = tooltip;
    const lines = text.split("\n").length;
    minHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, lines * LINE_HEIGHT + 20));
    growToFit(owner);
  };
  return widget;
}

/** Resolves an execution id path like "12:7:5": the subgraph nodes passed through, and the node. */
function resolvePath(graph, ids) {
  const hosts = [];
  for (const id of ids.slice(0, -1)) {
    const host = graph?.getNodeById?.(id);
    if (!host?.isSubgraphNode?.() || !host.subgraph) return null;
    hosts.push(host);
    graph = host.subgraph;
  }
  const node = graph?.getNodeById?.(ids.at(-1));
  return node ? { hosts, node } : null;
}

function showOnSubgraphNode(host, relativePath, inner, text) {
  const name = HOST_WIDGET_PREFIX + relativePath;
  const widget = host.widgets?.find((w) => w.name === name) ?? addTextWidget(host, name);
  widget.setText(text, inner.title);
}

/** Removes text boxes from subgraph nodes whose preview node is gone. */
function pruneSubgraphNodes(graph, depth = 0) {
  if (!graph || depth > 16) return;
  for (const node of graph.nodes ?? graph._nodes ?? []) {
    if (!node.isSubgraphNode?.() || !node.subgraph) continue;
    for (const widget of [...(node.widgets ?? [])]) {
      if (!widget.name?.startsWith(HOST_WIDGET_PREFIX)) continue;
      const ids = widget.name.slice(HOST_WIDGET_PREFIX.length).split(":");
      if (!PREVIEW_NODE_TYPES.has(resolvePath(node.subgraph, ids)?.node.type)) node.removeWidget?.(widget);
    }
    pruneSubgraphNodes(node.subgraph, depth + 1);
  }
}

const rootGraph = () => app.rootGraph ?? app.graph;

// The executed message carries the full id path, so the text goes to the right
// copy of a subgraph even when the same subgraph is used several times.
api.addEventListener("executed", ({ detail }) => {
  if (detail?.output?.text === undefined) return;
  const ids = String(detail.node ?? detail.display_node ?? "").split(":");
  const resolved = resolvePath(rootGraph(), ids);
  if (!resolved || !PREVIEW_NODE_TYPES.has(resolved.node.type)) return;

  const text = toText(detail.output.text);
  const { hosts, node } = resolved;
  node.widgets?.find((w) => w.name === TEXT_WIDGET)?.setText?.(text);
  hosts.forEach((host, index) => showOnSubgraphNode(host, ids.slice(index + 1).join(":"), node, text));
});

api.addEventListener("execution_start", () => pruneSubgraphNodes(rootGraph()));

app.registerExtension({
  name: "elegant.text_preview",
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (!PREVIEW_NODE_TYPES.has(nodeData.name)) return;
    onNodeCreated(nodeType, (node) => addTextWidget(node, TEXT_WIDGET));
    chainMethod(nodeType.prototype, "onRemoved", () => setTimeout(() => pruneSubgraphNodes(rootGraph()), 0));
  },
});
