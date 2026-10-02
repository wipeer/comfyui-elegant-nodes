// Shared helpers for Elegant nodes promoted into subgraphs.

export function inputIsLinked(node, widgetName) {
  return !!node.inputs?.some((input) => input.widget?.name === widgetName && input.link != null);
}

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

export function groupsSignature(groups) {
  return groups
    .map((g) => `${g.inner.id}:${Object.entries(g.inputs).map(([w, i]) => `${w}=${i.name}`).sort().join(",")}`)
    .sort()
    .join("|");
}

export function hostWidgetFor(host, input) {
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
 * For a promoted group: the widget that holds the live value of `widgetName`.
 * That is the subgraph node's widget when promoted, else the interior node's.
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

    for (const hook of ["onConfigure", "onConnectionsChange"]) {
      const original = host[hook];
      host[hook] = function (...args) {
        const result = original?.apply(this, args);
        scheduleSync();
        return result;
      };
    }

    const originalOnRemoved = host.onRemoved;
    host.onRemoved = function (...args) {
      abort.abort();
      return originalOnRemoved?.apply(this, args);
    };

    host.__elegantWatch = { syncs, scheduleSync };
  }
  host.__elegantWatch.syncs.push(sync);
  host.__elegantWatch.scheduleSync();
}

/** Replaces the widgets previously added by `key` on the subgraph node. */
export function replaceHostWidgets(host, key, build) {
  const state = (host.__elegantWidgets ??= {});
  for (const widget of state[key] ?? []) host.removeWidget?.(widget);
  state[key] = build();
  host.setSize?.(host.computeSize?.() ?? host.size);
  host.setDirtyCanvas?.(true, true);
}
