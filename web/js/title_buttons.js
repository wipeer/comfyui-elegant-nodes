// Cyan icon buttons at the right end of Elegant node titles (? help, ⚙ advanced).
// Classic canvas: litegraph title buttons. Vue nodes: buttons added to the node
// header, since the Vue renderer doesn't draw title buttons.

import { app } from "../../scripts/app.js";
import { NODE_IDS, onNodeCreated } from "./common.js";

export const ICON_COLOR = "#22d3ee"; // cyan
const ICON_SIZE = 16;
const ELEGANT_NODE_TYPES = new Set(Object.values(NODE_IDS));

/**
 * Registered buttons, rightmost first (lowest `order`). Each:
 * { name, order, glyph, tooltip, appliesTo(nodeId, node), onClick(node, nodeId), isActive?(node) }
 */
const BUTTONS = [];

export function registerTitleButton(button) {
  BUTTONS.push(button);
  BUTTONS.sort((a, b) => a.order - b.order);
}

/** Updates the active look of the Vue header buttons, e.g. after a toggle. */
export function refreshTitleButtons() {
  scheduleDecorate();
}

const STYLE = `
.elegant-icon { display: inline-flex; align-items: center; justify-content: center; flex: none;
  width: ${ICON_SIZE}px; height: ${ICON_SIZE}px; box-sizing: border-box; border: 1.5px solid ${ICON_COLOR};
  border-radius: 50%; color: ${ICON_COLOR}; font: bold 11px/1 sans-serif; }
.elegant-icon.active { background: ${ICON_COLOR}; color: #0f172a; }
/* margin-right keeps the buttons clear of the Vue node's top-right resize handle */
.elegant-title-buttons { display: inline-flex; flex-direction: row-reverse; gap: 4px; margin-left: auto; margin-right: 14px; }
.elegant-title-button { padding: 2px; background: none; border: 0; cursor: pointer; line-height: 0; opacity: 0.85;
  border-radius: 50%; }
.elegant-title-button:hover { opacity: 1; background: rgba(34, 211, 238, 0.15); }
`;

export function ensureTitleButtonStyle() {
  if (document.getElementById("elegant-title-button-style")) return;
  const style = document.createElement("style");
  style.id = "elegant-title-button-style";
  style.textContent = STYLE;
  document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// Classic canvas
// ---------------------------------------------------------------------------

function drawIcon(ctx, left, top, height, glyph, active) {
  const cx = left + ICON_SIZE / 2;
  const cy = top + height / 2;
  ctx.save();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = ICON_COLOR;
  ctx.beginPath();
  ctx.arc(cx, cy, ICON_SIZE / 2 - 1, 0, Math.PI * 2);
  if (active) {
    ctx.fillStyle = ICON_COLOR;
    ctx.fill();
  }
  ctx.stroke();
  ctx.fillStyle = active ? "#0f172a" : ICON_COLOR;
  ctx.font = "bold 11px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(glyph, cx, cy + 0.5);
  ctx.restore();
}

function addCanvasButtons(node, nodeId) {
  if (!node.addTitleButton) return;
  for (const spec of BUTTONS) {
    if (!spec.appliesTo(nodeId, node) || node.title_buttons?.some((b) => b.name === spec.name)) continue;
    const button = node.addTitleButton({ name: spec.name, text: spec.glyph, bgColor: "transparent", xOffset: -6 });
    // Title buttons draw in the title colour; draw the cyan ring icon instead.
    button.getWidth = () => ICON_SIZE;
    button.draw = function (ctx, x, y) {
      if (!this.visible) return;
      const left = x + this.xOffset;
      const top = y + this.yOffset;
      this._last_area[0] = left;
      this._last_area[1] = top;
      this._last_area[2] = ICON_SIZE;
      this._last_area[3] = this.height;
      drawIcon(ctx, left, top, this.height, spec.glyph, !!spec.isActive?.(node));
    };
  }

  if (node.__elegantTitleClick) return;
  node.__elegantTitleClick = true;
  const original = node.onTitleButtonClick;
  node.onTitleButtonClick = function (clicked, canvas) {
    const spec = BUTTONS.find((b) => b.name === clicked?.name);
    if (spec) return spec.onClick(this, nodeId);
    return original?.call(this, clicked, canvas);
  };
}

// ---------------------------------------------------------------------------
// Vue nodes
// ---------------------------------------------------------------------------

function nodeForHeader(header) {
  const id = header.dataset.testid?.slice("node-header-".length);
  if (!id) return null;
  const graph = app.canvas?.graph ?? app.graph;
  return graph?.getNodeById?.(id) ?? graph?.getNodeById?.(Number(id)) ?? null;
}

function decorateVueHeaders() {
  for (const header of document.querySelectorAll('[data-testid^="node-header-"]')) {
    const node = nodeForHeader(header);
    // The header row: title group on the left (it has mr-auto), badges on the right.
    const row = header.firstElementChild;
    if (!row) continue;

    let container = row.querySelector(":scope > .elegant-title-buttons");
    // Vue may reuse a removed node's header for another node: drop buttons made for another node.
    if (container && (container.dataset.nodeId !== String(node?.id) || container.__elegantNode !== node)) {
      container.remove();
      container = null;
    }
    if (!node || !ELEGANT_NODE_TYPES.has(node.type)) continue;

    if (!container) {
      ensureTitleButtonStyle();
      container = document.createElement("span");
      container.className = "elegant-title-buttons";
      container.dataset.nodeId = String(node.id);
      container.__elegantNode = node;
      row.appendChild(container);
    }

    for (const spec of BUTTONS) {
      if (!spec.appliesTo(node.type, node)) continue;
      let button = container.querySelector(`[data-elegant-button="${spec.name}"]`);
      if (!button) {
        button = document.createElement("button");
        button.type = "button";
        button.className = "elegant-title-button";
        button.dataset.elegantButton = spec.name;
        button.title = spec.tooltip;
        button.innerHTML = `<span class="elegant-icon">${spec.glyph}</span>`;
        // Don't start a drag or select the node.
        for (const type of ["pointerdown", "mousedown", "dblclick"]) {
          button.addEventListener(type, (e) => e.stopPropagation());
        }
        button.addEventListener("click", (e) => {
          e.stopPropagation();
          spec.onClick(node, node.type);
          scheduleDecorate();
        });
        container.appendChild(button);
      }
      button.firstElementChild.classList.toggle("active", !!spec.isActive?.(node));
    }
  }
}

let scheduled = false;
function scheduleDecorate() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    decorateVueHeaders();
  });
}

let observer;
function watchVueNodes() {
  if (observer) return;
  // Re-check on DOM changes (Vue re-renders headers, or reuses one for another node),
  // batched to one scan per frame.
  observer = new MutationObserver(scheduleDecorate);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-testid"] });
  scheduleDecorate();
}

app.registerExtension({
  name: "elegant.title_buttons",
  setup() {
    watchVueNodes();
  },
  // nodeCreated runs before a node's type is set, so hook each node type instead.
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (ELEGANT_NODE_TYPES.has(nodeData.name)) onNodeCreated(nodeType, (node) => addCanvasButtons(node, nodeData.name));
  },
});
