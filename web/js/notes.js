// Elegant Notes: tabs with a name and a text value. The tabs are kept as JSON in the node's
// "notes" widget, which is saved in the workflow and sent with the prompt; the node shows
// the tab editor instead of that JSON. Load and Save (behind the Files button) read and
// write the tabs in a JSON file. Elegant Notes Merge shows its count as a row and limits
// its index to the tabs it brings in.

import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { NODE_IDS, chainMethod, frontendOnly, growToFit, onNodeCreated } from "./common.js";

const NOTES_WIDGET = "notes";
const INDEX_WIDGET = "index";
const COUNT_WIDGET = "elegant_count";
const MIN_HEIGHT = 150;
const DEFAULT_PATH = "elegant-notes.json";
// Saved in the node's properties (in the workflow), not in the prompt.
const PATH_PROPERTY = "elegant_file_path";
const FILES_OPEN_PROPERTY = "elegant_file_open";

// Colours and font follow ComfyUI's theme variables, so the editor matches the rest of the node.
const FONT = "12px system-ui, sans-serif";
const TEXT = "var(--input-text, #ddd)";
const MUTED = "var(--descrip-text, #999)";
const LINE = "var(--border-color, #444)";
const PANEL = "var(--comfy-input-bg, #222)";
const OK = "#7bd88f";
const FAILED = "#ff7b7b";

/** The tabs in a JSON text, or none when it doesn't hold a list of tabs. */
function parseTabs(text) {
  try {
    const data = JSON.parse(text || "[]");
    return Array.isArray(data) ? data.map((tab) => ({ name: String(tab?.name ?? ""), value: String(tab?.value ?? "") })) : [];
  } catch {
    return [];
  }
}

/** `name`, or name_2, name_3, … when `taken` already has it. */
function uniqueName(name, taken) {
  if (!taken.includes(name)) return name;
  let number = 2;
  while (taken.includes(`${name}_${number}`)) number += 1;
  return `${name}_${number}`;
}

function flatButton(text, title) {
  const button = document.createElement("button");
  button.textContent = text;
  button.title = title;
  Object.assign(button.style, {
    background: "transparent",
    border: "none",
    color: MUTED,
    font: FONT,
    cursor: "pointer",
    padding: "4px 8px",
    borderRadius: "4px",
  });
  button.addEventListener("mouseenter", () => (button.style.color = TEXT));
  button.addEventListener("mouseleave", () => (button.style.color = MUTED));
  return button;
}

function boxButton(text) {
  const button = document.createElement("button");
  button.textContent = text;
  Object.assign(button.style, {
    flex: "1 1 0",
    background: PANEL,
    border: `1px solid ${LINE}`,
    borderRadius: "4px",
    color: TEXT,
    font: FONT,
    padding: "4px 8px",
    cursor: "pointer",
  });
  return button;
}

async function post(url, body) {
  const response = await api.fetchApi(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

const plural = (count) => `${count} tab${count === 1 ? "" : "s"}`;

/** The tab editor: a strip of tabs, the shown tab's text, and a Files panel for Load and Save. */
function setupEditor(node) {
  const original = node.widgets?.find((w) => w.name === NOTES_WIDGET);
  if (!original) return;
  // The editor replaces the plain text widget. It still holds the JSON, under the same name.
  original.inputEl?.remove?.();
  node.widgets.splice(node.widgets.indexOf(original), 1);

  let json = "[]";
  let tabs = [];
  let active = 0;
  node.properties ??= {};

  const root = document.createElement("div");
  Object.assign(root.style, {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    width: "100%",
    height: "100%",
    boxSizing: "border-box",
    font: FONT,
  });

  const bar = document.createElement("div");
  Object.assign(bar.style, { display: "flex", alignItems: "flex-end", gap: "3px", overflowX: "auto", flex: "0 0 auto" });

  const valueBox = document.createElement("textarea");
  valueBox.placeholder = "Text of this tab";
  valueBox.spellcheck = false;
  Object.assign(valueBox.style, {
    width: "100%",
    flex: "1 1 auto",
    minHeight: "80px",
    boxSizing: "border-box",
    padding: "6px 8px",
    resize: "none",
    background: PANEL,
    color: TEXT,
    border: `1px solid ${LINE}`,
    borderRadius: "0 6px 6px 6px",
    font: FONT,
    whiteSpace: "pre-wrap",
  });
  valueBox.addEventListener("wheel", (e) => e.stopPropagation(), { passive: true });

  const addButton = flatButton("+", "Add a tab");
  const filesButton = flatButton("Files", "Load and save the tabs in a JSON file");
  const deleteButton = flatButton("✕", "Delete the shown tab");
  const spacer = document.createElement("div");
  spacer.style.flex = "1 1 auto";

  // Files panel: path, Load and Save, and a line that says how the last one went.
  const panel = document.createElement("div");
  Object.assign(panel.style, { display: "none", flexDirection: "column", gap: "4px" });
  const pathInput = document.createElement("input");
  pathInput.type = "text";
  pathInput.placeholder = DEFAULT_PATH;
  Object.assign(pathInput.style, {
    width: "100%",
    boxSizing: "border-box",
    padding: "4px 6px",
    background: PANEL,
    color: TEXT,
    border: `1px solid ${LINE}`,
    borderRadius: "4px",
    font: FONT,
  });
  pathInput.addEventListener("wheel", (e) => e.stopPropagation(), { passive: true });
  const loadButton = boxButton("Load from file");
  const saveButton = boxButton("Save to file");
  const buttons = document.createElement("div");
  Object.assign(buttons.style, { display: "flex", gap: "4px" });
  buttons.append(loadButton, saveButton);
  const status = document.createElement("div");
  Object.assign(status.style, { font: FONT, color: MUTED, minHeight: "16px", whiteSpace: "pre-wrap" });
  panel.append(pathInput, buttons, status);

  root.append(bar, valueBox, panel);

  const setStatus = (text, ok) => {
    status.textContent = text;
    status.style.color = ok ? OK : FAILED;
  };

  const store = () => {
    json = JSON.stringify(tabs);
    node.setDirtyCanvas?.(true, true);
    updateMergesIn(node.graph);
  };

  const renameTab = (label, index) => {
    let done = false;
    const finish = (commit) => {
      if (done) return;
      done = true;
      label.contentEditable = "false";
      if (commit) {
        const others = tabs.filter((_, position) => position !== index).map((tab) => tab.name);
        tabs[index].name = uniqueName(label.textContent.trim() || `tab${index + 1}`, others);
        store();
      }
      render();
    };
    label.contentEditable = "true";
    label.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(label);
    selection.removeAllRanges();
    selection.addRange(range);
    label.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        finish(true);
      } else if (e.key === "Escape") {
        e.preventDefault();
        finish(false);
      }
    });
    label.addEventListener("blur", () => finish(true), { once: true });
  };

  const tabLabel = (tab, index) => {
    const isActive = index === active;
    const label = document.createElement("div");
    label.textContent = tab.name || `tab${index + 1}`;
    label.title = "Double-click to rename";
    Object.assign(label.style, {
      padding: "5px 12px",
      cursor: "pointer",
      userSelect: "none",
      whiteSpace: "nowrap",
      color: isActive ? TEXT : MUTED,
      background: isActive ? PANEL : "rgba(255, 255, 255, 0.05)",
      border: `1px solid ${isActive ? LINE : "transparent"}`,
      borderBottom: isActive ? `1px solid ${PANEL}` : `1px solid ${LINE}`,
      borderRadius: "6px 6px 0 0",
      marginBottom: "-1px",
    });
    label.addEventListener("click", () => {
      if (active === index || label.isContentEditable) return;
      active = index;
      render();
    });
    label.addEventListener("dblclick", () => renameTab(label, index));
    return label;
  };

  /** Draws the strip, the shown tab's text and the Files panel. */
  const render = () => {
    bar.replaceChildren(...tabs.map(tabLabel), addButton, spacer, filesButton, deleteButton);
    const tab = tabs[active];
    valueBox.value = tab?.value ?? "";
    valueBox.disabled = !tab;
    deleteButton.disabled = !tab;
    deleteButton.style.opacity = tab ? "1" : "0.4";
    const open = node.properties[FILES_OPEN_PROPERTY] === true;
    panel.style.display = open ? "flex" : "none";
    filesButton.style.color = open ? TEXT : MUTED;
    pathInput.value = node.properties[PATH_PROPERTY] || DEFAULT_PATH;
  };

  /** Reloads the editor from the JSON (after the workflow loads, or a file is loaded). */
  const refresh = () => {
    tabs = parseTabs(json);
    active = Math.min(active, Math.max(0, tabs.length - 1));
    render();
  };

  valueBox.addEventListener("input", () => {
    if (!tabs[active]) return;
    tabs[active].value = valueBox.value;
    store();
  });
  addButton.addEventListener("click", () => {
    const name = uniqueName(`tab${tabs.length + 1}`, tabs.map((tab) => tab.name));
    tabs.push({ name, value: "" });
    active = tabs.length - 1;
    render();
    store();
  });
  deleteButton.addEventListener("click", () => {
    if (!tabs[active]) return;
    tabs.splice(active, 1);
    active = Math.max(0, Math.min(active, tabs.length - 1));
    render();
    store();
  });
  filesButton.addEventListener("click", () => {
    node.properties[FILES_OPEN_PROPERTY] = !(node.properties[FILES_OPEN_PROPERTY] === true);
    render();
    node.setDirtyCanvas?.(true, true);
  });
  pathInput.addEventListener("change", () => {
    node.properties[PATH_PROPERTY] = pathInput.value.trim() || DEFAULT_PATH;
    pathInput.value = node.properties[PATH_PROPERTY];
  });

  loadButton.addEventListener("click", async () => {
    const path = node.properties[PATH_PROPERTY] || DEFAULT_PATH;
    try {
      const data = await post("/elegant/notes/load", { path });
      json = data.notes;
      refresh();
      updateMergesIn(node.graph);
      setStatus(`Loaded ${plural(tabs.length)} from ${path}`, true);
    } catch (error) {
      setStatus(`Load failed: ${error.message}`, false);
    }
  });
  saveButton.addEventListener("click", async () => {
    const path = node.properties[PATH_PROPERTY] || DEFAULT_PATH;
    try {
      const data = await post("/elegant/notes/save", { path, notes: json });
      setStatus(`Saved ${plural(tabs.length)} to ${path}`, true);
      status.title = data.path;
    } catch (error) {
      setStatus(`Save failed: ${error.message}`, false);
    }
  });

  node.addDOMWidget(NOTES_WIDGET, "elegant_notes", root, {
    // Serialized: the JSON is saved in the workflow and sent with the prompt.
    getValue: () => json,
    setValue: (value) => {
      json = value || "[]";
      refresh();
    },
    getMinHeight: () => MIN_HEIGHT,
  });
  node.__elegantNotes = { refresh };
  refresh();
  growToFit(node);
}

/** The node that feeds an input, found through the graph's links. */
function linkedOrigin(node, input) {
  const graph = node.graph;
  if (!graph || input?.link == null) return null;
  const link = graph.links?.get?.(input.link) ?? graph.links?.[input.link];
  return link ? graph.getNodeById(link.origin_id) : null;
}

/** Tabs the inputs of a Merge bring in, counted from the Notes nodes on the canvas. */
function countTabs(node, depth = 0) {
  if (depth > 32) return 0;
  let total = 0;
  for (const input of node.inputs ?? []) {
    const origin = linkedOrigin(node, input);
    if (!origin) continue;
    if (origin.type === NODE_IDS.notes) {
      total += parseTabs(origin.widgets?.find((w) => w.name === NOTES_WIDGET)?.value).length;
    } else if (origin.type === NODE_IDS.notesMerge) {
      total += countTabs(origin, depth + 1);
    }
  }
  return total;
}

/** Shows the count as a row like the widgets above it, and keeps the index between 1 and the count. */
function updateMerge(node) {
  const { label, indexWidget } = node.__elegantCount ?? {};
  const count = countTabs(node);
  if (label) label.textContent = String(count);
  if (indexWidget) {
    const top = Math.max(1, count);
    indexWidget.options ??= {};
    indexWidget.options.min = 1;
    indexWidget.options.max = top;
    if (indexWidget.value > top || indexWidget.value < 1) indexWidget.value = Math.min(Math.max(1, indexWidget.value), top);
  }
  node.setDirtyCanvas?.(true, true);
}

/** Updates every Merge node in the graph, e.g. after a Notes node changed. */
function updateMergesIn(graph) {
  for (const node of graph?.nodes ?? graph?._nodes ?? []) {
    if (node.type === NODE_IDS.notesMerge) updateMerge(node);
  }
}

/** Elegant Notes Merge: the index starts at 1, and a count row shows the tabs it brings in. */
function setupMerge(node) {
  const indexWidget = node.widgets?.find((w) => w.name === INDEX_WIDGET);
  if (indexWidget) {
    indexWidget.options ??= {};
    indexWidget.options.min = 1;
  }
  const row = document.createElement("div");
  Object.assign(row.style, {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    font: FONT,
    color: MUTED,
    padding: "2px 4px",
    userSelect: "none",
  });
  const name = document.createElement("span");
  name.textContent = "count";
  const value = document.createElement("span");
  value.style.color = TEXT;
  row.append(name, value);
  frontendOnly(node.addDOMWidget(COUNT_WIDGET, "elegant_label", row, { serialize: false, getMinHeight: () => 20 }));
  node.__elegantCount = { label: value, indexWidget };
  updateMerge(node);
  growToFit(node);
}

app.registerExtension({
  name: "elegant.notes",
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name === NODE_IDS.notesMerge) {
      onNodeCreated(nodeType, setupMerge);
      chainMethod(nodeType.prototype, "onConnectionsChange", (node) => updateMergesIn(node.graph));
      chainMethod(nodeType.prototype, "onConfigure", (node) => setTimeout(() => updateMerge(node), 0));
      return;
    }
    if (nodeData.name !== NODE_IDS.notes) return;
    onNodeCreated(nodeType, setupEditor);
    // A workflow that loads after the node exists: show its tabs and Files panel.
    chainMethod(nodeType.prototype, "onConfigure", (node) => {
      node.__elegantNotes?.refresh();
      setTimeout(() => updateMergesIn(node.graph), 0);
    });
  },
});
