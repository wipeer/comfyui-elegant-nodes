// Tab editor for Elegant Notes and Elegant Notes (File): tabs with a name and a text
// value. The tabs are kept as JSON in the node's "notes" widget, which is saved in the
// workflow and sent with the prompt; the node shows the editor instead of that JSON.
// Elegant Notes (File) also has Load and Save buttons. Elegant Notes Merge shows its
// count as a label and limits its index to the tabs of the last run.

import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { NODE_IDS, chainMethod, frontendOnly, growToFit, onNodeCreated } from "./common.js";

const NOTES_WIDGET = "notes";
const PATH_WIDGET = "path";
const INDEX_WIDGET = "index";
const EDITOR_WIDGET = "elegant_notes_editor";
const COUNT_WIDGET = "elegant_count";
const MIN_HEIGHT = 150;

// Colours and font follow ComfyUI's theme variables, so the editor matches the rest of the node.
const FONT = "12px system-ui, sans-serif";
const TEXT = "var(--input-text, #ddd)";
const MUTED = "var(--descrip-text, #999)";
const LINE = "var(--border-color, #444)";
const ACCENT = "var(--p-primary-color, #60a5fa)";

/** The tabs in the widget's JSON, or none when it doesn't hold a list of tabs. */
function readTabs(widget) {
  try {
    const data = JSON.parse(widget?.value || "[]");
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

/** Hides the widget that stores the JSON, so the node shows the editor and not the raw text. */
function hideWidget(widget) {
  widget.hidden = true;
  widget.computeSize = () => [0, -4];
  for (const element of [widget.inputEl, widget.element]) {
    if (element) element.style.display = "none";
  }
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

/** A tab strip with a text box below it. Double-click a tab to rename it. */
function setupEditor(node) {
  const notesWidget = node.widgets?.find((w) => w.name === NOTES_WIDGET);
  if (!notesWidget) return;
  hideWidget(notesWidget);

  let tabs = [];
  let active = 0;

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
  Object.assign(bar.style, {
    display: "flex",
    alignItems: "flex-end",
    gap: "2px",
    borderBottom: `1px solid ${LINE}`,
    overflowX: "auto",
    flex: "0 0 auto",
  });

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
    background: "var(--comfy-input-bg, #222)",
    color: TEXT,
    border: `1px solid ${LINE}`,
    borderRadius: "4px",
    font: FONT,
    whiteSpace: "pre-wrap",
  });
  valueBox.addEventListener("wheel", (e) => e.stopPropagation(), { passive: true });

  const addButton = flatButton("+", "Add a tab");
  const deleteButton = flatButton("✕", "Delete the shown tab");
  const spacer = document.createElement("div");
  spacer.style.flex = "1 1 auto";

  root.append(bar, valueBox);

  const store = () => {
    notesWidget.value = JSON.stringify(tabs);
    notesWidget.callback?.(notesWidget.value);
    node.setDirtyCanvas?.(true, true);
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
      padding: "4px 10px",
      cursor: "pointer",
      userSelect: "none",
      whiteSpace: "nowrap",
      color: isActive ? TEXT : MUTED,
      borderBottom: `2px solid ${isActive ? ACCENT : "transparent"}`,
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

  /** Draws the strip and the shown tab's text. */
  const render = () => {
    bar.replaceChildren(...tabs.map(tabLabel), addButton, spacer, deleteButton);
    const tab = tabs[active];
    valueBox.value = tab?.value ?? "";
    valueBox.disabled = !tab;
    deleteButton.disabled = !tab;
    deleteButton.style.opacity = tab ? "1" : "0.4";
  };

  /** Reloads the editor from the widget (after a load, paste or Load button). */
  const refresh = () => {
    tabs = readTabs(notesWidget);
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

  frontendOnly(
    node.addDOMWidget(EDITOR_WIDGET, "elegant_notes", root, {
      serialize: false,
      getValue: () => notesWidget.value,
      setValue: () => refresh(),
      getMinHeight: () => MIN_HEIGHT,
    })
  );
  node.__elegantNotes = { refresh, notesWidget };
  refresh();
  growToFit(node);
}

/** Buttons for the file node: Load fills the tabs from the file, Save writes them out. */
function addFileButtons(node) {
  const pathWidget = node.widgets?.find((w) => w.name === PATH_WIDGET);
  const post = async (url, body) => {
    const response = await api.fetchApi(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    return data;
  };
  const report = (message) => {
    const toast = app.extensionManager?.toast;
    if (toast) toast.add({ severity: "error", summary: "Elegant Notes", detail: message, life: 5000 });
    else alert(message);
  };

  const load = frontendOnly(
    node.addWidget("button", "Load from file", null, async () => {
      try {
        const data = await post("/elegant/notes/load", { path: pathWidget?.value });
        const { notesWidget } = node.__elegantNotes ?? {};
        if (notesWidget) {
          notesWidget.value = data.notes;
          node.__elegantNotes.refresh();
        }
      } catch (error) {
        report(error.message);
      }
    })
  );
  const save = frontendOnly(
    node.addWidget("button", "Save to file", null, async () => {
      try {
        const { notesWidget } = node.__elegantNotes ?? {};
        await post("/elegant/notes/save", { path: pathWidget?.value, notes: notesWidget?.value ?? "[]" });
      } catch (error) {
        report(error.message);
      }
    })
  );
  return [load, save];
}

/** Elegant Notes Merge: the index starts at 1, and a label shows the count of the last run. */
function setupMerge(node) {
  const indexWidget = node.widgets?.find((w) => w.name === INDEX_WIDGET);
  if (indexWidget) {
    indexWidget.options ??= {};
    indexWidget.options.min = 1;
  }
  const label = document.createElement("div");
  Object.assign(label.style, { font: FONT, color: MUTED, padding: "2px 4px", userSelect: "none" });
  label.textContent = "count: –";
  frontendOnly(node.addDOMWidget(COUNT_WIDGET, "elegant_label", label, { serialize: false, getMinHeight: () => 20 }));
  node.__elegantCount = { label, indexWidget };
  growToFit(node);
}

/** Shows the count of the last run (from the node's "count: N" text) and caps the index at it. */
function showCount(node, message) {
  const text = message?.text?.[0] ?? "";
  const count = Number(/^count: (\d+)/.exec(text)?.[1]);
  if (!Number.isFinite(count)) return;
  const { label, indexWidget } = node.__elegantCount ?? {};
  if (label) label.textContent = `count: ${count}`;
  if (indexWidget) {
    const top = Math.max(1, count);
    indexWidget.options ??= {};
    indexWidget.options.min = 1;
    indexWidget.options.max = top;
    if (indexWidget.value > top || indexWidget.value < 1) indexWidget.value = Math.min(Math.max(1, indexWidget.value), top);
  }
  node.setDirtyCanvas?.(true, true);
}

app.registerExtension({
  name: "elegant.notes",
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name === NODE_IDS.notesMerge) {
      onNodeCreated(nodeType, setupMerge);
      chainMethod(nodeType.prototype, "onExecuted", (node, _result, args) => showCount(node, args[0]));
      return;
    }
    if (nodeData.name !== NODE_IDS.notes && nodeData.name !== NODE_IDS.notesFile) return;
    onNodeCreated(nodeType, (node) => {
      setupEditor(node);
      if (nodeData.name === NODE_IDS.notesFile) addFileButtons(node);
    });
    // Workflows that load after the node exists: show their tabs.
    chainMethod(nodeType.prototype, "onConfigure", (node) => node.__elegantNotes?.refresh());
  },
});
