// Elegant Group Bypasser and Elegant Group Muter: one toggle per group, to bypass (or mute)
// and enable all nodes inside it. One implementation, two variants.
//
// A port of "Fast Groups Bypasser" and "Fast Groups Muter" from rgthree-comfy (MIT, Copyright
// (c) 2023 Regis Gaughan, III): https://github.com/rgthree/rgthree-comfy. The originals paint their rows on
// the canvas, which the Vue nodes view cannot draw. Here the rows are ordinary toggle
// widgets and the settings ordinary widgets, so it works in both the classic canvas and
// the Vue nodes view. Frontend only: it never enters the prompt.

import { app } from "../../scripts/app.js";
import { markAdvancedForCanvas, syncClassicAdvanced, vueNodesEnabled } from "./advanced_toggle.js";
import { frontendOnly } from "./common.js";
import { addCanvasButtons } from "./title_buttons.js";

const CATEGORY = "elegant";

const MODE_ON = 0; // LiteGraph.ALWAYS

/** The two nodes: they differ only in the mode "no" puts nodes in, and in wording. */
const VARIANTS = [
  {
    type: "ElegantGroupBypasser",
    title: "Elegant Group Bypasser",
    verb: "bypass",
    offMode: 4, // bypass
    description: "One toggle per group in the graph, to bypass or enable all nodes inside it.",
    aliases: ["group", "groups", "bypass", "toggle groups", "fast groups bypasser", "rgthree"],
  },
  {
    type: "ElegantGroupMuter",
    title: "Elegant Group Muter",
    verb: "mute",
    offMode: 2, // LiteGraph.NEVER: muted
    description: "One toggle per group in the graph, to mute or enable all nodes inside it.",
    aliases: ["group", "groups", "mute", "toggle groups", "fast groups muter", "rgthree"],
  },
];

const SORTS = ["position", "alphanumeric"]; // alphanumeric: numbers by value, so 18 comes before 100
const RESTRICTIONS = ["default", "max one", "always one"];
const SETTINGS = { title: "match_title", colors: "match_colors", sort: "sort", restriction: "restriction" };

const REFRESH_MS = 500;
const MAX_NAV_ENTRIES = 20;

const liveNodes = new Set();

// ---------------------------------------------------------------------------
// Groups and their nodes
// ---------------------------------------------------------------------------

// Groups hold nodes, other groups and link reroutes; only nodes have a mode.
const isNode = (item) => typeof item?.mode === "number" && "type" in item;

/** The nodes inside a group, without the toggling node `self`. */
function nodesIn(group, self) {
  return [...(group._children ?? [])].filter((item) => isNode(item) && item !== self);
}

/** Sets the mode of nodes and, through subgraph nodes, of the nodes inside them. */
function setMode(nodes, mode) {
  const stack = [...nodes];
  for (let node; (node = stack.pop()); ) {
    node.mode = mode;
    if (node.isSubgraphNode?.() && node.subgraph) stack.push(...(node.subgraph.nodes ?? []));
  }
}

function setting(node, name) {
  return node.widgets?.find((w) => w.name === name)?.value;
}

function hexColor(color) {
  let hex = String(color ?? "").replace("#", "").trim().toLowerCase();
  if (hex.length === 3) hex = hex.replace(/(.)(.)(.)/, "$1$1$2$2$3$3");
  return hex ? `#${hex}` : "";
}

/** Colour names (red, pale_blue) or hex codes, comma separated, as group colours. */
function wantedColors(text) {
  return String(text ?? "")
    .split(",")
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean)
    .map((c) => hexColor(globalThis.LGraphCanvas?.node_colors?.[c]?.groupcolor ?? c));
}

/** The groups the node lists: those of its own graph that pass the title and colour filters. */
function listedGroups(node) {
  const groups = [...(node.graph?._groups ?? [])];

  const colors = wantedColors(setting(node, SETTINGS.colors));
  let titlePattern = null;
  const titleText = String(setting(node, SETTINGS.title) ?? "").trim();
  if (titleText) {
    try {
      titlePattern = new RegExp(titleText, "i");
    } catch {
      return []; // an unfinished expression matches nothing
    }
  }

  const listed = groups.filter(
    (group) =>
      (!colors.length || colors.includes(hexColor(group.color))) && (!titlePattern || titlePattern.test(group.title))
  );

  if (setting(node, SETTINGS.sort) === "alphanumeric") {
    return listed.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: "base" }));
  }
  // Top to bottom, then left to right, in rows 30 units high.
  return listed.sort((a, b) => {
    const rowA = Math.floor(a._pos[1] / 30);
    const rowB = Math.floor(b._pos[1] / 30);
    return rowA - rowB || Math.floor(a._pos[0] / 30) - Math.floor(b._pos[0] / 30);
  });
}

// ---------------------------------------------------------------------------
// Advanced settings
// ---------------------------------------------------------------------------

const settingWidgets = (node) => (node.widgets ?? []).filter((w) => !w.__elegantGroup);

// The settings are the advanced widgets; the classic canvas needs help hiding them.
const syncAdvanced = (node, options) => syncClassicAdvanced(node, settingWidgets(node), options);

// ---------------------------------------------------------------------------
// Toggles
// ---------------------------------------------------------------------------

const isToggle = (widget) => !!widget.__elegantGroup;
const toggles = (node) => (node.widgets ?? []).filter(isToggle);

/** Switches off (false: bypass or mute) or enables (true) the nodes in the toggle's group, and shows it. */
function applyToggle(node, widget, active) {
  const group = widget.__elegantGroup;
  group.recomputeInsideNodes?.();
  setMode(nodesIn(group, node), active ? MODE_ON : node.__variant.offMode);
  widget.value = active;
  node.graph?.setDirtyCanvas?.(true, false);
}

/** A click on a toggle, honouring the restriction ("max one" / "always one"). */
function onToggleClicked(node, widget, value) {
  const restriction = setting(node, SETTINGS.restriction);
  const others = toggles(node).filter((w) => w !== widget);
  if (value && restriction !== "default") {
    for (const other of others) applyToggle(node, other, false);
  } else if (!value && restriction === "always one" && others.every((w) => !w.value)) {
    value = true; // the last one on can't be switched off
  }
  applyToggle(node, widget, value);
}

/**
 * The Vue nodes view draws a switch when the toggle has no on / off text (and a yes / no button
 * pair when it has); the classic canvas would write true / false, so it gets on / off.
 */
function syncToggleText(widget) {
  widget.options ??= {};
  if (vueNodesEnabled()) {
    delete widget.options.on;
    delete widget.options.off;
  } else {
    widget.options.on = "on";
    widget.options.off = "off";
  }
}

function addToggle(node, group) {
  const widget = node.addWidget("toggle", `group:${group.id}`, false, (value) => onToggleClicked(node, widget, value));
  frontendOnly(widget);
  widget.__elegantGroup = group;
  syncToggleText(widget);
  return widget;
}

/** Brings the toggles in line with the groups: adds, removes, orders, and shows their state. */
function refresh(node) {
  if (!node.graph || !node.widgets) return;
  syncAdvanced(node);

  // Don't recompute nodes in groups while one is being dragged (the lists would flicker).
  const busy = !!app.canvas?.selected_group_moving;
  const groups = listedGroups(node);
  const existing = new Map(toggles(node).map((w) => [w.__elegantGroup, w]));
  let changed = false;

  for (const [group, widget] of existing) {
    if (groups.includes(group)) continue;
    node.removeWidget?.(widget);
    existing.delete(group);
    changed = true;
  }

  const ordered = groups.map((group) => {
    let widget = existing.get(group);
    if (!widget) {
      widget = addToggle(node, group);
      changed = true;
    }
    if (widget.label !== group.title) {
      widget.label = group.title;
      changed = true;
    }
    if (!busy) {
      group.recomputeInsideNodes?.();
      const active = nodesIn(group, node).some((n) => n.mode === MODE_ON);
      if (widget.value !== active) {
        widget.value = active;
        changed = true;
      }
    }
    return widget;
  });

  const others = node.widgets.filter((w) => !isToggle(w));
  const current = toggles(node);
  if (current.length !== ordered.length || current.some((w, i) => w !== ordered[i])) {
    node.widgets.splice(0, node.widgets.length, ...others, ...ordered);
    changed = true;
  }

  if (changed) {
    const [minWidth, minHeight] = node.computeSize();
    node.setSize([Math.max(node.size[0], minWidth), minHeight]);
    node.setDirtyCanvas?.(true, true);
  }
}

setInterval(() => {
  for (const node of liveNodes) {
    if (!node.graph) liveNodes.delete(node);
    else refresh(node);
  }
}, REFRESH_MS);

// ---------------------------------------------------------------------------
// Context menu: all at once, and go to a group
// ---------------------------------------------------------------------------

function setAll(node, mode) {
  const all = toggles(node);
  all.forEach((widget, index) => {
    let active;
    if (mode === "off") active = setting(node, SETTINGS.restriction) === "always one" && index === 0;
    else if (mode === "enable") active = setting(node, SETTINGS.restriction) === "default" || index === 0;
    else active = !widget.value;
    applyToggle(node, widget, active);
  });
}

function goToGroup(group) {
  const canvas = app.canvas;
  if (!canvas || !group) return;
  canvas.centerOnNode?.(group);
  const zoomX = canvas.canvas.width / group._size[0] - 0.02;
  const zoomY = canvas.canvas.height / group._size[1] - 0.02;
  canvas.setZoom?.(Math.min(canvas.ds?.scale ?? 1, zoomX, zoomY), [canvas.canvas.width / 2, canvas.canvas.height / 2]);
  canvas.setDirty?.(true, true);
}

function extraMenuOptions(node, options) {
  options.push(
    null,
    { content: `${node.__variant.verb[0].toUpperCase()}${node.__variant.verb.slice(1)} all`, callback: () => setAll(node, "off") },
    { content: "Enable all", callback: () => setAll(node, "enable") },
    { content: "Toggle all", callback: () => setAll(node, "toggle") }
  );
  const groups = toggles(node).map((w) => w.__elegantGroup);
  if (groups.length) {
    options.push(null);
    for (const group of groups.slice(0, MAX_NAV_ENTRIES)) {
      options.push({ content: `Go to group: ${group.title}`, callback: () => goToGroup(group) });
    }
  }
}

// ---------------------------------------------------------------------------
// Node
// ---------------------------------------------------------------------------

function registerNode(variant) {
  const { LiteGraph, LGraphNode } = globalThis;
  if (!LiteGraph || !LGraphNode) return;

  class ElegantGroupToggles extends LGraphNode {
    static type = variant.type;
    static title = variant.title;
    static category = CATEGORY;
    static description = variant.description;

    constructor(title = variant.title) {
      super(title);
      this.__variant = variant;
      this.isVirtualNode = true; // frontend only: not part of the prompt
      this.serialize_widgets = true; // saves the four settings; the group toggles opt out themselves
      this.properties ??= {};
      this.addWidget("text", SETTINGS.title, "", () => refresh(this), {
        advanced: true,
        tooltip: "Only list groups whose title matches (text or regular expression).",
      });
      this.addWidget("text", SETTINGS.colors, "", () => refresh(this), {
        advanced: true,
        tooltip: "Only list groups of these colours: names (red, pale_blue) or hex codes (#a4d399), comma separated.",
      });
      this.addWidget("combo", SETTINGS.sort, SORTS[0], () => refresh(this), { values: SORTS, advanced: true });
      this.addWidget("combo", SETTINGS.restriction, RESTRICTIONS[0], () => refresh(this), {
        values: RESTRICTIONS,
        advanced: true,
        tooltip:
          "max one: switching a group on switches the others off. always one: also keeps one group on. " +
          "Only enforced by clicks on this node.",
      });
      // The settings are advanced inputs (set when created), shown with the cyan ⚙ (see advanced_toggle.js). Nodes
      // with a Python definition get the classic canvas wiring from their extensions; this one
      // is frontend only, so it does the same itself.
      markAdvancedForCanvas(this);
      addCanvasButtons(this, variant.type);
      syncAdvanced(this, { resize: true });
      this.size = [260, this.computeSize()[1]];
      liveNodes.add(this);
      setTimeout(() => refresh(this), 0);
    }

    onAdded() {
      liveNodes.add(this);
    }

    // Classic canvas: follow the ⚙ at once instead of at the next refresh.
    onDrawBackground() {
      syncAdvanced(this);
    }

    onRemoved() {
      liveNodes.delete(this);
    }

    onConfigure() {
      setTimeout(() => refresh(this), 0);
    }

    getExtraMenuOptions(_canvas, options) {
      extraMenuOptions(this, options);
    }
  }

  LiteGraph.registerNodeType(variant.type, ElegantGroupToggles);
  ElegantGroupToggles.category = CATEGORY;
}

app.registerExtension({
  name: "elegant.group_toggles",
  registerCustomNodes() {
    VARIANTS.forEach(registerNode);
  },
  // The Vue app lists frontend-only nodes by their type id; give these their titles.
  beforeRegisterVueAppNodeDefs(nodeDefs) {
    for (const def of nodeDefs) {
      const variant = VARIANTS.find((v) => v.type === def.name);
      if (!variant) continue;
      def.display_name = variant.title;
      def.description = variant.description;
      def.search_aliases = variant.aliases;
    }
  },
});
