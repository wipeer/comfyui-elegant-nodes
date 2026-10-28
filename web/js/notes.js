// Tab editor for Elegant Notes and Elegant Notes (File): tabs with a name and a text
// value. The tabs are kept as JSON in the node's "notes" widget, which is saved in the
// workflow and sent with the prompt. Elegant Notes (File) also has Load and Save buttons.

import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { NODE_IDS, chainMethod, frontendOnly, growToFit, onNodeCreated } from "./common.js";

const NOTES_WIDGET = "notes";
const PATH_WIDGET = "path";
const EDITOR_WIDGET = "elegant_notes_editor";
const MIN_HEIGHT = 180;

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

/** Builds the tab bar, the name field and the value box, and keeps them in step with the widget. */
function setupEditor(node) {
  const notesWidget = node.widgets?.find((w) => w.name === NOTES_WIDGET);
  if (!notesWidget) return;
  // The JSON stays the stored value; the editor below replaces its text box.
  notesWidget.hidden = true;

  let tabs = [];
  let active = 0;

  const root = document.createElement("div");
  Object.assign(root.style, { display: "flex", flexDirection: "column", gap: "6px", width: "100%", height: "100%", boxSizing: "border-box" });
  const font = "12px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  const field = (element) => {
    Object.assign(element.style, {
      boxSizing: "border-box",
      border: "1px solid var(--border-color, #444)",
      borderRadius: "6px",
      background: "var(--comfy-input-bg, #222)",
      color: "var(--input-text, #ddd)",
      font,
    });
    element.addEventListener("wheel", (e) => e.stopPropagation(), { passive: true });
    return element;
  };

  const bar = document.createElement("div");
  Object.assign(bar.style, { display: "flex", flexWrap: "wrap", gap: "4px" });

  const nameInput = field(document.createElement("input"));
  nameInput.placeholder = "Tab name";
  Object.assign(nameInput.style, { width: "100%", padding: "4px 6px" });

  const valueBox = field(document.createElement("textarea"));
  valueBox.placeholder = "Text of this tab";
  valueBox.spellcheck = false;
  Object.assign(valueBox.style, { width: "100%", flex: "1 1 auto", minHeight: "80px", padding: "6px 8px", resize: "none", whiteSpace: "pre", overflow: "auto" });

  const buttonStyle = { padding: "2px 8px", cursor: "pointer" };
  const addButton = document.createElement("button");
  addButton.textContent = "+";
  addButton.title = "Add a tab";
  Object.assign(addButton.style, buttonStyle);

  const deleteButton = document.createElement("button");
  deleteButton.textContent = "Delete tab";
  Object.assign(deleteButton.style, buttonStyle);

  const footer = document.createElement("div");
  Object.assign(footer.style, { display: "flex", gap: "4px", alignItems: "center" });
  footer.append(addButton, deleteButton);

  root.append(bar, nameInput, valueBox, footer);

  const store = () => {
    notesWidget.value = JSON.stringify(tabs);
    notesWidget.callback?.(notesWidget.value);
    node.setDirtyCanvas?.(true, true);
  };

  const showActive = () => {
    const tab = tabs[active];
    nameInput.value = tab?.name ?? "";
    valueBox.value = tab?.value ?? "";
    nameInput.disabled = valueBox.disabled = deleteButton.disabled = !tab;
  };

  const renderBar = () => {
    bar.replaceChildren(
      ...tabs.map((tab, index) => {
        const button = document.createElement("button");
        button.textContent = tab.name || `tab${index + 1}`;
        Object.assign(button.style, buttonStyle, {
          fontWeight: index === active ? "600" : "400",
          borderColor: index === active ? "var(--input-text, #ddd)" : "",
        });
        button.addEventListener("click", () => {
          active = index;
          renderBar();
          showActive();
        });
        return button;
      })
    );
  };

  /** Reloads the editor from the widget (after a load, paste or Load button). */
  const refresh = () => {
    tabs = readTabs(notesWidget);
    active = Math.min(active, Math.max(0, tabs.length - 1));
    renderBar();
    showActive();
  };

  nameInput.addEventListener("input", () => {
    if (!tabs[active]) return;
    tabs[active].name = nameInput.value;
    renderBar();
    store();
  });
  // When the name is left, a name another tab already has gets a suffix (tab2 → tab2_2).
  nameInput.addEventListener("change", () => {
    if (!tabs[active]) return;
    const others = tabs.filter((_, index) => index !== active).map((tab) => tab.name);
    tabs[active].name = uniqueName(nameInput.value.trim() || `tab${active + 1}`, others);
    nameInput.value = tabs[active].name;
    renderBar();
    store();
  });
  valueBox.addEventListener("input", () => {
    if (!tabs[active]) return;
    tabs[active].value = valueBox.value;
    store();
  });
  addButton.addEventListener("click", () => {
    tabs.push({ name: `tab${tabs.length + 1}`, value: "" });
    active = tabs.length - 1;
    renderBar();
    showActive();
    store();
    nameInput.focus();
  });
  deleteButton.addEventListener("click", () => {
    if (!tabs[active]) return;
    tabs.splice(active, 1);
    active = Math.max(0, Math.min(active, tabs.length - 1));
    renderBar();
    showActive();
    store();
  });

  const widget = frontendOnly(
    node.addDOMWidget(EDITOR_WIDGET, "elegant_notes", root, {
      serialize: false,
      getValue: () => notesWidget.value,
      setValue: () => refresh(),
      getMinHeight: () => MIN_HEIGHT,
    })
  );
  widget.refresh = refresh;
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

/** Elegant Notes Merge: the index can go up to the number of tabs of the last run ("count: N" in its preview). */
function limitIndexToCount(node, message) {
  const text = message?.text?.[0] ?? "";
  const count = Number(/^count: (\d+)/.exec(text)?.[1]);
  const indexWidget = node.widgets?.find((w) => w.name === "index");
  if (!indexWidget || !Number.isFinite(count)) return;
  indexWidget.options ??= {};
  indexWidget.options.max = Math.max(1, count);
  if (indexWidget.value > count) indexWidget.value = Math.max(1, count);
  node.setDirtyCanvas?.(true, true);
}

app.registerExtension({
  name: "elegant.notes",
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name === NODE_IDS.notesMerge) {
      chainMethod(nodeType.prototype, "onExecuted", (node, _result, args) => limitIndexToCount(node, args[0]));
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
