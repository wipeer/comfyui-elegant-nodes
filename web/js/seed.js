// Elegant Seed: random/fixed switch, buttons, and seed control on queue.

import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import {
  NODE_IDS,
  chainMethod,
  collectPromoted,
  frontendOnly,
  groupsSignature,
  hostInputConnected,
  inputIsLinked,
  liveWidget,
  onNodeCreated,
  replaceHostWidgets,
  watchSubgraphHost,
} from "./common.js";

// Seed of the last run that finished, saved in the workflow: one value on the
// node itself, and a map by interior node id on subgraph nodes.
const LAST_SEED_PROPERTY = "elegant_last_seed";
const HOST_LAST_SEEDS_PROPERTY = "elegant_last_seeds";

/** A random seed in the widget's range, capped like ComfyUI's own randomize to what JS represents exactly. */
function randomSeed(seedWidget) {
  const min = Math.max(0, seedWidget.options?.min ?? 0);
  const max = Math.min(Number.MAX_SAFE_INTEGER, seedWidget.options?.max ?? Number.MAX_SAFE_INTEGER);
  return Math.min(max, min + Math.floor(Math.random() * (max - min + 1)));
}

/** Global setting "Widget control mode": randomize before (true) or after (false) queueing. */
function controlRunsBefore() {
  const setting =
    app.extensionManager?.setting?.get?.("Comfy.WidgetControlMode") ??
    app.ui?.settings?.getSettingValue?.("Comfy.WidgetControlMode");
  return setting === "before";
}

/**
 * Adds the three buttons to `owner` and drives the seed around each queued prompt.
 *
 * The seed and mode widgets are looked up on every use because on a subgraph
 * node they are store-backed projections that the frontend may recreate.
 */
function createSeedController({ owner, getSeedWidget, getModeWidget, isActive, lastSeed, labelSuffix = "" }) {
  // The seed we last left in the field. A different value at queue time means the
  // user typed one, which is then used for the next run as-is.
  let lastSeen = getSeedWidget()?.value;
  // Set by the buttons: use the seed they put in the field for the next run.
  let keepNextSeed = false;
  // Whether this controller drives the queued prompt (captured before it is built).
  let queued = false;

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
    const button = owner.addWidget("button", label + labelSuffix, null, () => {
      if (getSeedWidget()) onClick();
    });
    button.tooltip = tooltip;
    return frontendOnly(button);
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
    "Put back the seed of the last finished run (the image you see) and switch to fixed mode.",
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
    const shown = typeof last === "number" ? last : "none yet";
    lastButton.label = `♻️ Last seed → fixed (${shown})${labelSuffix}`;
    lastSeen = getSeedWidget()?.value;
    redraw();
  };
  refresh();

  // The frontend calls these on every widget around each queued prompt (per batch item).
  randomButton.beforeQueued = () => {
    const seedWidget = getSeedWidget();
    queued = !!seedWidget && isActive();
    if (!queued) return;
    const userChangedSeed = seedWidget.value !== lastSeen;
    if (isRandom() && controlRunsBefore() && !keepNextSeed && !userChangedSeed) {
      setSeed(randomSeed(seedWidget));
    }
    keepNextSeed = false;
    lastSeen = seedWidget.value;
  };

  randomButton.afterQueued = () => {
    if (!queued) return;
    queued = false;
    const seedWidget = getSeedWidget();
    if (seedWidget && isRandom() && !controlRunsBefore()) {
      setSeed(randomSeed(seedWidget));
    }
  };

  // Called when a run that used `seed` has finished (see the execution_success listener).
  const recordFinished = (seed) => {
    lastSeed.set(seed);
    refresh();
  };

  return { widgets: [randomButton, lastButton, fixedButton], refresh, recordFinished };
}

function setupSeedNode(node) {
  const findWidget = (name) => node.widgets?.find((w) => w.name === name);
  if (!findWidget("mode") || !findWidget("seed")) return;
  node.properties ??= {};

  const controller = createSeedController({
    owner: node,
    getSeedWidget: () => findWidget("seed"),
    getModeWidget: () => findWidget("mode"),
    // Seed or mode fed by a link (e.g. promoted to a subgraph node): the value
    // here isn't the one used; the subgraph node takes over.
    isActive: () => !inputIsLinked(node, "seed") && !inputIsLinked(node, "mode"),
    lastSeed: {
      get: () => node.properties[LAST_SEED_PROPERTY],
      set: (value) => (node.properties[LAST_SEED_PROPERTY] = value),
    },
  });
  node.__elegantSeedController = controller;
  chainMethod(node, "onConfigure", () => controller.refresh());
}

/** Shows the buttons on a subgraph node for each Elegant Seed whose seed or mode it promotes. */
function syncSubgraphNode(host) {
  const state = (host.__elegantSeed ??= { signature: null, controllers: [], byInnerId: new Map() });
  const groups = collectPromoted(host, NODE_IDS.seed).filter((g) => g.inputs.seed || g.inputs.mode);
  const signature = groupsSignature(groups);

  if (signature === state.signature) {
    for (const controller of state.controllers) controller.refresh();
    return;
  }
  state.signature = signature;
  host.properties ??= {};

  replaceHostWidgets(host, "seed", () => {
    state.byInnerId = new Map();
    state.controllers = groups.map((group) => {
      const { inner, inputs } = group;
      const controller = createSeedController({
        owner: host,
        getSeedWidget: () => liveWidget(host, group, "seed"),
        getModeWidget: () => liveWidget(host, group, "mode"),
        isActive: () => {
          // Fed from outside this subgraph node (e.g. an outer subgraph): not ours to drive.
          if (inputs.seed && hostInputConnected(host, inputs.seed)) return false;
          if (inputs.mode && hostInputConnected(host, inputs.mode)) return false;
          // Seed not promoted: the interior widget is used, unless something else feeds it.
          if (!inputs.seed && inputIsLinked(inner, "seed")) return false;
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
        labelSuffix: groups.length > 1 ? ` · #${inner.id}` : "",
      });
      state.byInnerId.set(String(inner.id), controller);
      return controller;
    });
    return state.controllers.flatMap((controller) => controller.widgets);
  });
}

// ---------------------------------------------------------------------------
// "Last seed": the seed of the last run that finished, read back from the
// server's history, so it matches the image you see even when more runs were
// queued after it (batch count, Run again, Instant mode).
// ---------------------------------------------------------------------------

/** The controller that owns the Elegant Seed at execution id path `ids` (e.g. ["12", "5"]). */
function controllerForExecutionPath(ids) {
  const graph = app.rootGraph ?? app.graph;
  const top = graph?.getNodeById?.(ids[0]);
  if (!top) return null;
  if (ids.length === 1) return top.__elegantSeedController ?? null;

  // Inside a subgraph: the subgraph node drives it when seed/mode are promoted…
  const fromHost = top.__elegantSeed?.byInnerId?.get(String(ids.at(-1)));
  if (fromHost) return fromHost;
  // …otherwise the Elegant Seed node inside does.
  let node = top;
  for (const id of ids.slice(1)) node = node?.subgraph?.getNodeById?.(id);
  return node?.__elegantSeedController ?? null;
}

api.addEventListener("execution_success", async ({ detail }) => {
  const promptId = detail?.prompt_id;
  if (!promptId) return;
  try {
    const history = await (await api.fetchApi(`/history/${encodeURIComponent(promptId)}`)).json();
    const prompt = history?.[promptId]?.prompt?.[2] ?? {};
    for (const [executionId, node] of Object.entries(prompt)) {
      const seed = node?.inputs?.seed;
      if (node?.class_type !== NODE_IDS.seed || typeof seed !== "number") continue; // linked seeds are [id, slot]
      controllerForExecutionPath(executionId.split(":"))?.recordFinished(seed);
    }
  } catch (error) {
    console.warn("[Elegant Seed] Couldn't read the finished run's seed", error);
  }
});

app.registerExtension({
  name: "elegant.seed",
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name === NODE_IDS.seed) onNodeCreated(nodeType, setupSeedNode);
  },
  nodeCreated(node) {
    if (node.isSubgraphNode?.()) watchSubgraphHost(node, syncSubgraphNode);
  },
});
