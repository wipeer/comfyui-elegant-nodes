// Plain-text preview box for the Elegant preview nodes, also shown on subgraph nodes.
// The last text is saved in the workflow, so it shows again after loading.

import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import {
  NODE_IDS,
  chainMethod,
  collectPromoted,
  frontendOnly,
  growToFit,
  liveWidget,
  onNodeCreated,
  watchSubgraphHost,
} from "./common.js";

const PREVIEW_NODE_TYPES = new Set([
  NODE_IDS.anyToStringPreview,
  NODE_IDS.anyToStringMultiPreview,
  NODE_IDS.anyMathMultiPreview,
]);

const TEXT_WIDGET = "text";
// A subgraph node gets one text box per preview node inside it, named by that
// node's id path relative to the subgraph node (e.g. "5", or "7:5" when nested).
const HOST_WIDGET_PREFIX = "elegant_text:";

// Last shown text, saved in the workflow: on the preview node itself, and per
// inner node path on subgraph nodes.
const SAVED_TEXT_PROPERTY = "elegant_text";
const HOST_SAVED_TEXTS_PROPERTY = "elegant_texts";
const MAX_SAVED_LENGTH = 10000;

const MIN_HEIGHT = 60;
const MAX_HEIGHT = 240;
const LINE_HEIGHT = 17; // 12px monospace at line-height 1.4, rounded up
const CHAR_WIDTH = 7.3; // 12px monospace, rounded up
const WRAP_WIDGET = "wrap_text";

// Text boxes on screen; refreshed together so they follow the wrap switch and
// node width in both renderers, also when the switch is promoted.
const liveBoxes = new Set();
setInterval(() => {
  for (const box of liveBoxes) {
    if (!box.owner.graph || !box.owner.widgets?.includes(box.widget)) liveBoxes.delete(box);
    else box.update();
  }
}, 250);

function toText(text) {
  if (text == null) return "";
  if (Array.isArray(text)) return text.filter((part) => part != null).join("\n\n");
  return String(text);
}

/**
 * Adds a read-only text box. `getWrapWidget` returns the widget whose value
 * decides whether long lines wrap (the node's wrap_text switch, or the
 * subgraph node's when promoted).
 */
function addTextWidget(owner, name, getWrapWidget = () => null) {
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

  let wrap = false;

  // Grows the box (and node) to fit the visible lines, up to MAX_HEIGHT; longer text scrolls.
  const fit = () => {
    const width = textarea.clientWidth || owner.size[0] - 30;
    const charsPerLine = Math.max(10, Math.floor((width - 18) / CHAR_WIDTH));
    const lines = textarea.value
      .split("\n")
      .reduce((sum, line) => sum + (wrap ? Math.max(1, Math.ceil(line.length / charsPerLine)) : 1), 0);
    minHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, lines * LINE_HEIGHT + 20));
    growToFit(owner);
  };

  widget.setText = (text, tooltip) => {
    widget.value = text;
    textarea.value = text;
    if (tooltip !== undefined) textarea.title = tooltip;
    fit();
  };

  let lastState = "";
  const update = () => {
    wrap = !!getWrapWidget()?.value;
    const state = `${wrap}:${textarea.clientWidth}`;
    if (state === lastState) return;
    lastState = state;
    textarea.style.whiteSpace = wrap ? "pre-wrap" : "pre";
    textarea.style.overflowWrap = wrap ? "anywhere" : "normal";
    fit();
  };
  update();
  liveBoxes.add({ owner, widget, update });
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

/** Preview nodes inside a subgraph node as [path relative to it, node], through nested subgraphs. */
function previewNodesInside(host, prefix = "", depth = 0) {
  if (!host.subgraph || depth > 16) return [];
  const found = [];
  for (const node of host.subgraph.nodes ?? host.subgraph._nodes ?? []) {
    const path = prefix + node.id;
    if (PREVIEW_NODE_TYPES.has(node.type)) found.push([path, node]);
    else if (node.isSubgraphNode?.()) found.push(...previewNodesInside(node, `${path}:`, depth + 1));
  }
  return found;
}

/** Text to keep in the workflow: capped so large outputs don't bloat it. */
function toSavedText(text) {
  return text.length > MAX_SAVED_LENGTH ? `${text.slice(0, MAX_SAVED_LENGTH)}\n…` : text;
}

/**
 * Gives a subgraph node one text box per preview node inside it, showing the
 * last saved text (or a placeholder before the first run), and removes boxes
 * whose preview node is gone.
 */
function syncSubgraphNode(host) {
  const inside = new Map(previewNodesInside(host));
  for (const widget of [...(host.widgets ?? [])]) {
    if (widget.name?.startsWith(HOST_WIDGET_PREFIX) && !inside.has(widget.name.slice(HOST_WIDGET_PREFIX.length))) {
      host.removeWidget?.(widget);
    }
  }

  const saved = host.properties?.[HOST_SAVED_TEXTS_PROPERTY];
  if (saved) {
    for (const path of Object.keys(saved)) if (!inside.has(path)) delete saved[path];
  }
  for (const [path, inner] of inside) {
    const name = HOST_WIDGET_PREFIX + path;
    if (host.widgets?.some((w) => w.name === name)) continue;
    // A node just turned into a subgraph brings along the text it last showed.
    const text = saved?.[path] ?? inner.properties?.[SAVED_TEXT_PROPERTY] ?? "";
    addTextWidget(host, name, () => wrapWidgetFor(host, inner)).setText(text, inner.title);
  }
}

/** Syncs every subgraph node in the workflow, at any depth. */
function syncAllSubgraphNodes(graph = rootGraph(), depth = 0) {
  if (!graph || depth > 16) return;
  for (const node of graph.nodes ?? graph._nodes ?? []) {
    if (!node.isSubgraphNode?.() || !node.subgraph) continue;
    syncSubgraphNode(node);
    syncAllSubgraphNodes(node.subgraph, depth + 1);
  }
}

let syncScheduled = false;
function scheduleSyncAll() {
  if (syncScheduled) return;
  syncScheduled = true;
  setTimeout(() => {
    syncScheduled = false;
    syncAllSubgraphNodes();
  }, 0);
}

function showOnSubgraphNode(host, relativePath, inner, text) {
  host.properties ??= {};
  host.properties[HOST_SAVED_TEXTS_PROPERTY] = {
    ...host.properties[HOST_SAVED_TEXTS_PROPERTY],
    [relativePath]: toSavedText(text),
  };
  const name = HOST_WIDGET_PREFIX + relativePath;
  const widget =
    host.widgets?.find((w) => w.name === name) ?? addTextWidget(host, name, () => wrapWidgetFor(host, inner));
  widget.setText(text, inner.title);
}

function rootGraph() {
  return app.rootGraph ?? app.graph;
}

// The executed message carries the full id path, so the text goes to the right
// copy of a subgraph even when the same subgraph is used several times.
api.addEventListener("executed", ({ detail }) => {
  if (detail?.output?.text === undefined) return;
  const ids = String(detail.node ?? detail.display_node ?? "").split(":");
  const resolved = resolvePath(rootGraph(), ids);
  if (!resolved || !PREVIEW_NODE_TYPES.has(resolved.node.type)) return;

  const text = toText(detail.output.text);
  const { hosts, node } = resolved;
  node.properties ??= {};
  node.properties[SAVED_TEXT_PROPERTY] = toSavedText(text);
  node.widgets?.find((w) => w.name === TEXT_WIDGET)?.setText?.(text);
  hosts.forEach((host, index) => showOnSubgraphNode(host, ids.slice(index + 1).join(":"), node, text));
});

/** The wrap switch for a preview node shown on a subgraph node: promoted there, or the node's own. */
function wrapWidgetFor(host, inner) {
  const group = collectPromoted(host, inner.type).find((g) => g.inner === inner);
  return group ? liveWidget(host, group, WRAP_WIDGET) : inner.widgets?.find((w) => w.name === WRAP_WIDGET);
}

function setupPreviewNode(node) {
  const widget = addTextWidget(node, TEXT_WIDGET, () => node.widgets?.find((w) => w.name === WRAP_WIDGET));
  // Show the text saved with the workflow until the next run.
  chainMethod(node, "onConfigure", () => widget.setText(node.properties?.[SAVED_TEXT_PROPERTY] ?? ""));
}

app.registerExtension({
  name: "elegant.text_preview",
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (!PREVIEW_NODE_TYPES.has(nodeData.name)) return;
    onNodeCreated(nodeType, setupPreviewNode);
    // Added to or removed from a subgraph: update the boxes on subgraph nodes.
    chainMethod(nodeType.prototype, "onAdded", scheduleSyncAll);
    chainMethod(nodeType.prototype, "onRemoved", scheduleSyncAll);
  },
  nodeCreated(node) {
    if (node.isSubgraphNode?.()) watchSubgraphHost(node, syncSubgraphNode);
  },
});
