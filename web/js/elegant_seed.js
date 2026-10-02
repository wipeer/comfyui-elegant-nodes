import { app } from "../../scripts/app.js";

const NODE_ID = "ElegantSeed";
const LAST_SEED_PROPERTY = "elegant_last_seed";
// On subgraph nodes, last seeds are kept per interior Elegant Seed node id.
const HOST_LAST_SEEDS_PROPERTY = "elegant_last_seeds";

// Same as ComfyUI's built-in randomize: never go past what JS can represent exactly.
function randomSeed(seedWidget) {
  const min = Math.max(0, seedWidget.options?.min ?? 0);
  const max = Math.min(Number.MAX_SAFE_INTEGER, seedWidget.options?.max ?? Number.MAX_SAFE_INTEGER);
  return Math.min(max, min + Math.floor(Math.random() * (max - min + 1)));
}

// Global "Settings > Node Widget > Widget control mode": "before" or "after".
function controlRunsBefore() {
  const setting =
    app.extensionManager?.setting?.get?.("Comfy.WidgetControlMode") ??
    app.ui?.settings?.getSettingValue?.("Comfy.WidgetControlMode");
  return setting === "before";
}

function inputIsLinked(node, widgetName) {
  return !!node.inputs?.some((input) => input.widget?.name === widgetName && input.link != null);
}

/**
 * Adds the three buttons to `owner` and drives the seed on queue.
 *
 * The seed and mode widgets are looked up on every use because on a subgraph
 * node they are store-backed projections that the frontend may recreate.
 */
function createSeedController({ owner, getSeedWidget, getModeWidget, isActive, lastSeed, suffix = "" }) {
  // Seed value we last left in the field. A different value at queue time means
  // the user typed one, which is then used for the next run as-is.
  let lastSeen = getSeedWidget()?.value;
  let keepNextSeed = false;
  // Seed captured right before the prompt is built; confirmed once it is queued.
  let pendingSeed;

  const redraw = () => owner.setDirtyCanvas?.(true, true);

  const isRandom = () => !!getModeWidget()?.value;

  const setSeed = (value) => {
    const seedWidget = getSeedWidget();
    if (!seedWidget) return;
    seedWidget.value = value;
    lastSeen = value;
    redraw();
  };

  const setMode = (random) => {
    const modeWidget = getModeWidget();
    if (!modeWidget || modeWidget.value === random) return;
    modeWidget.value = random;
    modeWidget.callback?.(random);
    redraw();
  };

  const addButton = (label, tooltip, onClick) => {
    const button = owner.addWidget("button", label + suffix, null, () => {
      if (getSeedWidget()) onClick();
    });
    button.serialize = false;
    button.options ??= {};
    button.options.serialize = false;
    button.tooltip = tooltip;
    return button;
  };

  const randomButton = addButton(
    "🎲 Random",
    "Generate a new seed now and switch to random mode. Later seeds are generated before or after each run, per the 'Widget control mode' setting.",
    () => {
      setSeed(randomSeed(getSeedWidget()));
      keepNextSeed = true;
      setMode(true);
    }
  );

  const lastButton = addButton(
    "♻️ Last seed → fixed",
    "Put the seed used by the last queued run back in the field and switch to fixed mode.",
    () => {
      const last = lastSeed.get();
      if (typeof last !== "number") return;
      setSeed(last);
      keepNextSeed = true;
      setMode(false);
    }
  );

  const fixedButton = addButton("🎲 Random → fixed", "Generate a new seed and switch to fixed mode.", () => {
    setSeed(randomSeed(getSeedWidget()));
    keepNextSeed = true;
    setMode(false);
  });

  const refresh = () => {
    const last = lastSeed.get();
    lastButton.label =
      (typeof last === "number" ? `♻️ Last seed → fixed (${last})` : "♻️ Last seed → fixed (none yet)") + suffix;
    lastSeen = getSeedWidget()?.value;
    redraw();
  };
  refresh();

  // The frontend calls these on every widget of every node around each queued prompt.
  randomButton.beforeQueued = () => {
    const seedWidget = getSeedWidget();
    if (!seedWidget || !isActive()) {
      pendingSeed = undefined;
      return;
    }
    const userChangedSeed = seedWidget.value !== lastSeen;
    if (isRandom() && controlRunsBefore() && !keepNextSeed && !userChangedSeed) {
      setSeed(randomSeed(seedWidget));
    }
    keepNextSeed = false;
    pendingSeed = seedWidget.value;
    lastSeen = seedWidget.value;
  };

  randomButton.afterQueued = () => {
    if (pendingSeed === undefined) return;
    lastSeed.set(pendingSeed);
    pendingSeed = undefined;
    const seedWidget = getSeedWidget();
    if (seedWidget && isRandom() && !controlRunsBefore()) {
      setSeed(randomSeed(seedWidget));
    }
    refresh();
  };

  return {
    widgets: [randomButton, lastButton, fixedButton],
    refresh,
  };
}

function setupElegantSeed(node) {
  const findWidget = (name) => node.widgets?.find((w) => w.name === name);
  if (!findWidget("mode") || !findWidget("seed")) return;

  node.properties ??= {};

  const controller = createSeedController({
    owner: node,
    getSeedWidget: () => findWidget("seed"),
    getModeWidget: () => findWidget("mode"),
    // When the seed or mode is fed by a link (e.g. promoted to a subgraph node),
    // the value here is not the one that gets used; the subgraph node takes over.
    isActive: () => !inputIsLinked(node, "seed") && !inputIsLinked(node, "mode"),
    lastSeed: {
      get: () => node.properties[LAST_SEED_PROPERTY],
      set: (value) => (node.properties[LAST_SEED_PROPERTY] = value),
    },
  });

  const originalOnConfigure = node.onConfigure;
  node.onConfigure = function (...args) {
    const result = originalOnConfigure?.apply(this, args);
    controller.refresh();
    return result;
  };
}

// ---------------------------------------------------------------------------
// Subgraph support: when an Elegant Seed's "seed" or "mode" widget is promoted
// to a subgraph node, the buttons are shown on the subgraph node as well, and
// the subgraph node's (store-backed) widgets become the ones that are driven.
// ---------------------------------------------------------------------------

/** Follows a subgraph node input to the interior widget it feeds, through nested subgraphs. */
function resolvePromotedTarget(host, input, depth = 0) {
  const subgraph = host.subgraph;
  const subgraphInput = input._subgraphSlot;
  if (!subgraph || !subgraphInput || depth > 16) return [];

  const targets = [];
  for (const linkId of subgraphInput.linkIds ?? []) {
    const link = subgraph.getLink?.(linkId) ?? subgraph.links?.get?.(linkId) ?? subgraph.links?.[linkId];
    if (!link) continue;
    const node = subgraph.getNodeById(link.target_id);
    const nodeInput = node?.inputs?.[link.target_slot];
    if (!node || !nodeInput) continue;

    if (node.type === NODE_ID && (nodeInput.widget?.name === "seed" || nodeInput.widget?.name === "mode")) {
      targets.push({ node, widgetName: nodeInput.widget.name });
    } else if (node.isSubgraphNode?.()) {
      targets.push(...resolvePromotedTarget(node, nodeInput, depth + 1));
    }
  }
  return targets;
}

function hostWidgetFor(host, input) {
  return (
    host.getWidgetFromSlot?.(input) ??
    host.widgets?.find((w) => (input.widgetId && w.widgetId === input.widgetId) || w.name === input.name)
  );
}

/** Groups the subgraph node's promoted inputs by the interior Elegant Seed node they lead to. */
function collectPromotedSeeds(host) {
  const groups = new Map();
  for (const input of host.inputs ?? []) {
    if (!input._subgraphSlot) continue;
    for (const { node, widgetName } of resolvePromotedTarget(host, input)) {
      const group = groups.get(node.id) ?? { inner: node };
      group[widgetName] = input;
      groups.set(node.id, group);
    }
  }
  return [...groups.values()];
}

function groupsSignature(groups) {
  return groups
    .map((g) => `${g.inner.id}:${g.seed?.name ?? "-"}:${g.mode?.name ?? "-"}`)
    .sort()
    .join("|");
}

function syncSubgraphHost(host) {
  const state = (host.__elegantSeed ??= { signature: "", widgets: [], controllers: [] });
  const groups = collectPromotedSeeds(host);
  const signature = groupsSignature(groups);

  if (signature === state.signature) {
    for (const controller of state.controllers) controller.refresh();
    return;
  }

  for (const widget of state.widgets) host.removeWidget?.(widget);
  state.widgets = [];
  state.controllers = [];
  state.signature = signature;

  host.properties ??= {};
  for (const group of groups) {
    const { inner } = group;
    const innerWidget = (name) => inner.widgets?.find((w) => w.name === name);
    const hostInputConnected = (input) => {
      const index = host.inputs.indexOf(input);
      return index !== -1 && host.isInputConnected(index);
    };

    const controller = createSeedController({
      owner: host,
      getSeedWidget: () => (group.seed ? hostWidgetFor(host, group.seed) : innerWidget("seed")),
      getModeWidget: () => (group.mode ? hostWidgetFor(host, group.mode) : innerWidget("mode")),
      isActive: () => {
        // Fed from outside this subgraph node (e.g. an outer subgraph): not ours to drive.
        if (group.seed && hostInputConnected(group.seed)) return false;
        if (group.mode && hostInputConnected(group.mode)) return false;
        // Seed not promoted: the interior widget is used, unless something else feeds it.
        if (!group.seed && inputIsLinked(inner, "seed")) return false;
        return true;
      },
      lastSeed: {
        get: () => host.properties[HOST_LAST_SEEDS_PROPERTY]?.[inner.id],
        set: (value) => {
          host.properties[HOST_LAST_SEEDS_PROPERTY] = {
            ...host.properties[HOST_LAST_SEEDS_PROPERTY],
            [inner.id]: value,
          };
        },
      },
      suffix: groups.length > 1 ? ` · #${inner.id}` : "",
    });
    state.controllers.push(controller);
    state.widgets.push(...controller.widgets);
  }

  host.setSize?.(host.computeSize?.() ?? host.size);
  host.setDirtyCanvas?.(true, true);
}

function setupSubgraphHost(host) {
  if (host.__elegantSeedSetup) return;
  host.__elegantSeedSetup = true;

  let scheduled = false;
  const scheduleSync = () => {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      if (host.graph) syncSubgraphHost(host);
    }, 0);
  };

  const events = host.subgraph?.events;
  const abort = new AbortController();
  for (const type of ["widget-promoted", "widget-demoted", "input-added", "removing-input"]) {
    events?.addEventListener?.(type, scheduleSync, { signal: abort.signal });
  }

  const originalOnConfigure = host.onConfigure;
  host.onConfigure = function (...args) {
    const result = originalOnConfigure?.apply(this, args);
    scheduleSync();
    return result;
  };

  const originalOnConnectionsChange = host.onConnectionsChange;
  host.onConnectionsChange = function (...args) {
    const result = originalOnConnectionsChange?.apply(this, args);
    scheduleSync();
    return result;
  };

  const originalOnRemoved = host.onRemoved;
  host.onRemoved = function (...args) {
    abort.abort();
    return originalOnRemoved?.apply(this, args);
  };

  scheduleSync();
}

app.registerExtension({
  name: "elegant.seed",
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name !== NODE_ID) return;
    const onNodeCreated = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function (...args) {
      const result = onNodeCreated?.apply(this, args);
      setupElegantSeed(this);
      return result;
    };
  },
  nodeCreated(node) {
    if (node.isSubgraphNode?.()) setupSubgraphHost(node);
  },
});
