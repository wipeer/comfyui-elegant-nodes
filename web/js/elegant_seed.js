import { app } from "../../scripts/app.js";

const NODE_ID = "ElegantSeed";
const LAST_SEED_PROPERTY = "elegant_last_seed";

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

function setupElegantSeed(node) {
  const modeWidget = node.widgets?.find((w) => w.name === "mode");
  const seedWidget = node.widgets?.find((w) => w.name === "seed");
  if (!modeWidget || !seedWidget) return;

  node.properties ??= {};

  // A seed the user just typed or generated is used for the next run as-is,
  // even when randomization runs before queueing.
  let keepNextSeed = false;
  // Seed captured right before the prompt is built; confirmed once it is queued.
  let pendingSeed;

  const isRandom = () => !!modeWidget.value;
  const seedIsLinked = () =>
    !!node.inputs?.some((input) => input.widget?.name === "seed" && input.link != null);

  const redraw = () => node.setDirtyCanvas?.(true, true);

  const setSeed = (value) => {
    seedWidget.value = value;
    redraw();
  };

  const setMode = (random) => {
    if (modeWidget.value === random) return;
    modeWidget.value = random;
    modeWidget.callback?.(random);
    redraw();
  };

  const originalSeedCallback = seedWidget.callback;
  seedWidget.callback = function (...args) {
    keepNextSeed = true;
    return originalSeedCallback?.apply(this, args);
  };

  const addButton = (label, tooltip, onClick) => {
    const button = node.addWidget("button", label, null, onClick);
    button.serialize = false;
    button.options ??= {};
    button.options.serialize = false;
    button.tooltip = tooltip;
    return button;
  };

  addButton(
    "🎲 Random",
    "Generate a new seed now and switch to random mode. Later seeds are generated before or after each run, per the 'Widget control mode' setting.",
    () => {
      setSeed(randomSeed(seedWidget));
      keepNextSeed = true;
      setMode(true);
    }
  );

  const lastButton = addButton(
    "♻️ Last seed → fixed",
    "Put the seed used by the last queued run back in the field and switch to fixed mode.",
    () => {
      const last = node.properties[LAST_SEED_PROPERTY];
      if (typeof last !== "number") return;
      setSeed(last);
      keepNextSeed = true;
      setMode(false);
    }
  );

  addButton("🎲 Random → fixed", "Generate a new seed and switch to fixed mode.", () => {
    setSeed(randomSeed(seedWidget));
    keepNextSeed = true;
    setMode(false);
  });

  const updateLastButtonLabel = () => {
    const last = node.properties[LAST_SEED_PROPERTY];
    lastButton.label =
      typeof last === "number" ? `♻️ Last seed → fixed (${last})` : "♻️ Last seed → fixed (none yet)";
    redraw();
  };
  updateLastButtonLabel();

  const originalOnConfigure = node.onConfigure;
  node.onConfigure = function (...args) {
    const result = originalOnConfigure?.apply(this, args);
    updateLastButtonLabel();
    return result;
  };

  seedWidget.beforeQueued = () => {
    if (seedIsLinked()) {
      pendingSeed = undefined;
      return;
    }
    if (isRandom() && controlRunsBefore() && !keepNextSeed) {
      setSeed(randomSeed(seedWidget));
    }
    keepNextSeed = false;
    pendingSeed = seedWidget.value;
  };

  seedWidget.afterQueued = () => {
    if (pendingSeed === undefined) return;
    node.properties[LAST_SEED_PROPERTY] = pendingSeed;
    pendingSeed = undefined;
    if (isRandom() && !controlRunsBefore()) {
      setSeed(randomSeed(seedWidget));
    }
    updateLastButtonLabel();
  };
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
});
