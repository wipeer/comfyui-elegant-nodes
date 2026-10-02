import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

const NODE_IDS = new Set(["ElegantAnyToString", "ElegantAnyToStringAdvanced"]);
const TEXT_WIDGET = "text";
// Subgraph nodes get one text box per Elegant Any to String inside them, named by
// the inner node's id path relative to the subgraph node (e.g. "5" or "7:5").
const HOST_WIDGET_PREFIX = "elegant_text:";

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
  // Keep wheel scrolling and text selection inside the box instead of the canvas.
  textarea.addEventListener("wheel", (e) => e.stopPropagation(), { passive: true });

  const widget = owner.addDOMWidget(name, "elegant_text", textarea, {
    serialize: false,
    getValue: () => textarea.value,
    setValue: (value) => {
      textarea.value = toText(value);
    },
    getMinHeight: () => 60,
  });
  widget.serialize = false;
  widget.textarea = textarea;
  return widget;
}

function setText(widget, text, tooltip) {
  if (!widget) return;
  widget.value = text;
  if (widget.textarea) {
    widget.textarea.value = text;
    if (tooltip !== undefined) widget.textarea.title = tooltip;
  }
}

/** Resolves an id path like "12:7:5" from `graph`: the subgraph nodes passed through, and the node. */
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

function growToFit(node) {
  const [minWidth, minHeight] = node.computeSize?.() ?? node.size;
  node.setSize?.([Math.max(node.size[0], minWidth), Math.max(node.size[1], minHeight)]);
  node.setDirtyCanvas?.(true, true);
}

function showOnHost(host, relativePath, inner, text) {
  const name = HOST_WIDGET_PREFIX + relativePath;
  let widget = host.widgets?.find((w) => w.name === name);
  if (!widget) {
    widget = addTextWidget(host, name);
    growToFit(host);
  }
  setText(widget, text, inner.title);
  host.setDirtyCanvas?.(true, true);
}

/** Removes text boxes from subgraph nodes whose inner Elegant Any to String is gone. */
function pruneHosts(graph, depth = 0) {
  if (!graph || depth > 16) return;
  for (const node of graph.nodes ?? graph._nodes ?? []) {
    if (!node.isSubgraphNode?.() || !node.subgraph) continue;
    for (const widget of [...(node.widgets ?? [])]) {
      if (!widget.name?.startsWith(HOST_WIDGET_PREFIX)) continue;
      const ids = widget.name.slice(HOST_WIDGET_PREFIX.length).split(":");
      if (!NODE_IDS.has(resolvePath(node.subgraph, ids)?.node.type)) node.removeWidget?.(widget);
    }
    pruneHosts(node.subgraph, depth + 1);
  }
}

api.addEventListener("executed", ({ detail }) => {
  if (detail?.output?.text === undefined) return;
  const ids = String(detail.node ?? detail.display_node ?? "").split(":");
  const resolved = resolvePath(app.rootGraph ?? app.graph, ids);
  if (!resolved || !NODE_IDS.has(resolved.node.type)) return;

  const text = toText(detail.output.text);
  const { hosts, node } = resolved;
  setText(node.widgets?.find((w) => w.name === TEXT_WIDGET), text);
  hosts.forEach((host, index) => showOnHost(host, ids.slice(index + 1).join(":"), node, text));
});

api.addEventListener("execution_start", () => pruneHosts(app.rootGraph ?? app.graph));

app.registerExtension({
  name: "elegant.any_to_string",
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (!NODE_IDS.has(nodeData.name)) return;
    const onNodeCreated = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function (...args) {
      const result = onNodeCreated?.apply(this, args);
      addTextWidget(this, TEXT_WIDGET);
      return result;
    };

    const onRemoved = nodeType.prototype.onRemoved;
    nodeType.prototype.onRemoved = function (...args) {
      const result = onRemoved?.apply(this, args);
      setTimeout(() => pruneHosts(app.rootGraph ?? app.graph), 0);
      return result;
    };
  },
});
