// Elegant Seed: random/fixed switch, buttons, and seed control on queue.

import { app } from "../../scripts/app.js";
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

// Last queued seed, saved in the workflow: one value on the node itself, and a
// map by interior node id on subgraph nodes.
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
  // Seed captured right before the prompt is built; recorded once it is queued.
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
    const shown = typeof last === "number" ? last : "none yet";
    lastButton.label = `♻️ Last seed → fixed (${shown})${labelSuffix}`;
    lastSeen = getSeedWidget()?.value;
    redraw();
  };
  refresh();

  // The frontend calls these on every widget around each queued prompt (per batch item).
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

  return { widgets: [randomButton, lastButton, fixedButton], refresh };
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
  chainMethod(node, "onConfigure", () => controller.refresh());
}

/** Shows the buttons on a subgraph node for each Elegant Seed whose seed or mode it promotes. */
function syncSubgraphNode(host) {
  const state = (host.__elegantSeed ??= { signature: null, controllers: [] });
  const groups = collectPromoted(host, NODE_IDS.seed).filter((g) => g.inputs.seed || g.inputs.mode);
  const signature = groupsSignature(groups);

  if (signature === state.signature) {
    for (const controller of state.controllers) controller.refresh();
    return;
  }
  state.signature = signature;
  host.properties ??= {};

  replaceHostWidgets(host, "seed", () => {
    state.controllers = groups.map((group) => {
      const { inner, inputs } = group;
      return createSeedController({
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
    });
    return state.controllers.flatMap((controller) => controller.widgets);
  });
}

app.registerExtension({
  name: "elegant.seed",
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name === NODE_IDS.seed) onNodeCreated(nodeType, setupSeedNode);
  },
  nodeCreated(node) {
    if (node.isSubgraphNode?.()) watchSubgraphHost(node, syncSubgraphNode);
  },
});
