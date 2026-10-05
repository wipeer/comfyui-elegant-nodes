// Shared helpers for the Elegant nodes' frontend code.

/** Node ids, as defined in ../../nodes/*.py. */
export const NODE_IDS = {
  seed: "ElegantSeed",
  resolutionSelector: "ElegantResolutionSelector",
  anyToStringPreview: "ElegantAnyToStringPreview",
  anyToStringMultiPreview: "ElegantAnyToStringMultiPreview",
  anyMathMultiPreview: "ElegantAnyMathMultiPreview",
  randomNumber: "ElegantRandomNumber",
};

/** Runs `after(this, result, args)` after `object[name](...args)`, keeping the original. */
export function chainMethod(object, name, after) {
  const original = object[name];
  object[name] = function (...args) {
    const result = original?.apply(this, args);
    after(this, result, args);
    return result;
  };
}

/** Calls `setup(node)` for every new node of the given node type. */
export function onNodeCreated(nodeType, setup) {
  chainMethod(nodeType.prototype, "onNodeCreated", (node) => setup(node));
}

/** Enlarges the node to its computed minimum size; never shrinks it. */
export function growToFit(node) {
  const [minWidth, minHeight] = node.computeSize?.() ?? node.size;
  if (node.size[0] < minWidth || node.size[1] < minHeight) {
    node.setSize?.([Math.max(node.size[0], minWidth), Math.max(node.size[1], minHeight)]);
  }
  node.setDirtyCanvas?.(true, true);
}

/** Marks a frontend-only widget so it is saved neither in the workflow nor in the prompt. */
export function frontendOnly(widget) {
  widget.serialize = false;
  widget.options ??= {};
  widget.options.serialize = false;
  return widget;
}

export function inputIsLinked(node, widgetName) {
  return !!node.inputs?.some((input) => input.widget?.name === widgetName && input.link != null);
}

// ---------------------------------------------------------------------------
// Subgraphs: when widgets of an Elegant node are promoted to a subgraph node,
// the subgraph node's (store-backed) widgets hold the values that are used.
// ---------------------------------------------------------------------------

/** Follows a subgraph node input to the interior widgets it feeds, through nested subgraphs. */
function resolvePromotedTargets(host, input, nodeType, depth = 0) {
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

    if (node.type === nodeType && nodeInput.widget?.name) {
      targets.push({ node, widgetName: nodeInput.widget.name });
    } else if (node.isSubgraphNode?.()) {
      targets.push(...resolvePromotedTargets(node, nodeInput, nodeType, depth + 1));
    }
  }
  return targets;
}

/**
 * Groups a subgraph node's promoted inputs by the interior node of `nodeType`
 * they lead to: [{ inner, inputs: { widgetName: hostInput } }].
 */
export function collectPromoted(host, nodeType) {
  const groups = new Map();
  for (const input of host.inputs ?? []) {
    if (!input._subgraphSlot) continue;
    for (const { node, widgetName } of resolvePromotedTargets(host, input, nodeType)) {
      const group = groups.get(node.id) ?? { inner: node, inputs: {} };
      group.inputs[widgetName] = input;
      groups.set(node.id, group);
    }
  }
  return [...groups.values()];
}

/** A string that changes whenever the promoted groups change. */
export function groupsSignature(groups) {
  return groups
    .map((g) => `${g.inner.id}:${Object.entries(g.inputs).map(([w, i]) => `${w}=${i.name}`).sort().join(",")}`)
    .sort()
    .join("|");
}

function hostWidgetFor(host, input) {
  return (
    host.getWidgetFromSlot?.(input) ??
    host.widgets?.find((w) => (input.widgetId && w.widgetId === input.widgetId) || w.name === input.name)
  );
}

export function hostInputConnected(host, input) {
  const index = host.inputs.indexOf(input);
  return index !== -1 && host.isInputConnected(index);
}

/**
 * The widget that holds the live value of `widgetName` for a promoted group:
 * the subgraph node's widget when promoted, otherwise the interior node's.
 */
export function liveWidget(host, group, widgetName) {
  const input = group.inputs[widgetName];
  return input ? hostWidgetFor(host, input) : group.inner.widgets?.find((w) => w.name === widgetName);
}

/**
 * Calls `sync(host)` (deferred) whenever widgets may have been promoted or
 * demoted on the subgraph node, or its links changed. Several features can
 * register on the same subgraph node.
 */
export function watchSubgraphHost(host, sync) {
  if (!host.__elegantWatch) {
    const syncs = [];
    let scheduled = false;
    const scheduleSync = () => {
      if (scheduled) return;
      scheduled = true;
      setTimeout(() => {
        scheduled = false;
        if (host.graph) for (const fn of syncs) fn(host);
      }, 0);
    };

    const abort = new AbortController();
    for (const type of ["widget-promoted", "widget-demoted", "input-added", "removing-input"]) {
      host.subgraph?.events?.addEventListener?.(type, scheduleSync, { signal: abort.signal });
    }
    chainMethod(host, "onConfigure", scheduleSync);
    chainMethod(host, "onConnectionsChange", scheduleSync);
    chainMethod(host, "onRemoved", () => abort.abort());

    host.__elegantWatch = { syncs, scheduleSync };
  }
  host.__elegantWatch.syncs.push(sync);
  host.__elegantWatch.scheduleSync();
}

/** Replaces the widgets previously added under `key` on the subgraph node with `build()`'s. */
export function replaceHostWidgets(host, key, build) {
  const state = (host.__elegantWidgets ??= {});
  for (const widget of state[key] ?? []) host.removeWidget?.(widget);
  state[key] = build();
  keepPreviewsLast(host);
  host.setSize?.(host.computeSize?.() ?? host.size);
  host.setDirtyCanvas?.(true, true);
}

/**
 * Moves preview text boxes (web/js/text_preview.js) to the end of a subgraph
 * node's own widgets, so buttons and results stay next to the promoted fields.
 */
export function keepPreviewsLast(host) {
  const extra = host._extraWidgets; // the subgraph node's non-promoted widgets
  if (!Array.isArray(extra)) return;
  const isPreview = (w) => w.name?.startsWith("elegant_text:");
  const previews = extra.filter(isPreview);
  if (!previews.length || extra.slice(-previews.length).every(isPreview)) return;
  const others = extra.filter((w) => !isPreview(w));
  extra.splice(0, extra.length, ...others, ...previews);
}
