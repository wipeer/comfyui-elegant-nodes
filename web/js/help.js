// Help: a cyan ? at the right end of each Elegant node's title opens a help dialog.

import { app } from "../../scripts/app.js";
import { NODE_IDS, onNodeCreated } from "./common.js";

// Help content per node id. Plain HTML; shown in the dialog below.
const HELP = {
  [NODE_IDS.seed]: {
    title: "Elegant Seed",
    html: `
<p>A seed you can keep fixed or have regenerated on every run.</p>
<p class="elegant-help-subgraph"><b>Works from the subgraph node.</b> Inside a subgraph, <code>seed</code> is promoted automatically and the three buttons appear on the subgraph node, acting on its own seed. Promote <code>mode</code> too to get the switch there. Each copy of a subgraph keeps its own seed.</p>
<h3>Controls</h3>
<table>
<tr><td><b>mode</b></td><td><code>random</code>: a new seed for every run. <code>fixed</code>: the seed in the field is always used.</td></tr>
<tr><td><b>seed</b></td><td>The seed. Type a number to use it for the next run, in either mode.</td></tr>
<tr><td><b>🎲 Random</b></td><td>New seed now, and switch to random mode.</td></tr>
<tr><td><b>♻️ Last seed → fixed</b></td><td>Put back the seed of the last <b>finished</b> run (the image you see) and switch to fixed. The label shows that seed. Runs still queued or generating don't count, so it's safe to click while the next one is running.</td></tr>
<tr><td><b>🎲 Random → fixed</b></td><td>New seed, and switch to fixed mode.</td></tr>
</table>
<h3>Before or after the run</h3>
<p>Random mode follows <i>Settings → Widget control mode</i>:</p>
<ul>
<li><b>after</b> (default): the run uses the seed you see, then a new one appears. To get back the seed of an image you liked, use <b>♻️ Last seed → fixed</b>.</li>
<li><b>before</b>: a new seed is made just before the run, so the field shows the seed that was used.</li>
</ul>
<h3>Outputs</h3>
<p><code>seed</code> (INT) for samplers, <code>seed_text</code> (STRING) for filenames or prompts.</p>
`,
  },

  [NODE_IDS.resolutionSelector]: {
    title: "Elegant Resolution Selector",
    html: `
<p>Width and height for an aspect ratio, keeping about the same number of pixels as a square of <b>base</b> × <b>base</b>.</p>
<p class="elegant-help-subgraph"><b>Works from the subgraph node.</b> Promote any of its widgets and the <b>result</b> field appears on the subgraph node, following the promoted values live.</p>
<h3>Controls</h3>
<table>
<tr><td><b>aspect_ratio</b></td><td>1:1, 5:4, 9:7, 4:3, 3:2, 16:9, 21:9. In portrait they show flipped (2:3, 9:16, …).</td></tr>
<tr><td><b>orientation</b></td><td>landscape (wider) or portrait (taller). No effect at 1:1.</td></tr>
<tr><td><b>base</b></td><td>Side of the square image. 1024 ≈ 1 MP for every ratio (SDXL, Flux); 512 for SD 1.5.</td></tr>
<tr><td><b>round_to</b></td><td>Width and height become multiples of this. 8 is the minimum, 16 suits Flux/SD3, 64 matches SDXL training sizes.</td></tr>
</table>
<p>The line at the bottom shows the result live, e.g. <code>1360 × 768 · 1.00 MP · 1.77:1</code>. The ratio shown is the one after rounding; MP uses 1 MP = 1024 × 1024.</p>
<h3>Formula</h3>
<p><code>width = base × √ratio</code>, <code>height = base ÷ √ratio</code>, each rounded to <b>round_to</b>.</p>
<h3>Examples (base 1024, round to 16)</h3>
<table>
<tr><td>1:1</td><td>1024 × 1024</td></tr><tr><td>4:3</td><td>1184 × 880</td></tr>
<tr><td>3:2</td><td>1248 × 832</td></tr><tr><td>16:9</td><td>1360 × 768</td></tr><tr><td>21:9</td><td>1568 × 672</td></tr>
</table>
<h3>Outputs</h3>
<p><code>width</code> and <code>height</code> (INT), e.g. into Empty Latent Image.</p>`,
  },

  [NODE_IDS.anyToStringPreview]: {
    title: "Elegant Any to String Preview",
    html: `
<p>Turns any value into text, shows it, and outputs it as a <code>string</code>.</p>
<p class="elegant-help-subgraph"><b>Works from the subgraph node.</b> The text also shows on the subgraph node, so you can check a value without opening it. Each copy of a subgraph shows its own value.</p>
<h3>Conversion</h3>
<ul>
<li>Text stays as it is.</li>
<li>Numbers and booleans become their value (<code>42</code>, <code>0.5</code>, <code>True</code>).</li>
<li>Lists and dictionaries become indented JSON.</li>
<li>Anything else (images, latents, models, …) is printed, with large tensors shortened.</li>
</ul>
<p>The box is plain text (no Markdown); you can select and copy from it.</p>
<p>The last text is saved with the workflow (up to 10,000 characters), so it shows again after loading.</p>`,
  },

  [NODE_IDS.anyToStringMultiPreview]: {
    title: "Elegant Any to String Multi Preview",
    html: `
<p>Turns several values into text and joins them with a delimiter.</p>
<p class="elegant-help-subgraph"><b>Works from the subgraph node.</b> After each run the joined text also appears on the subgraph node. Each copy of a subgraph shows its own value.</p>
<h3>Inputs</h3>
<table>
<tr><td><b>source_1, source_2, …</b></td><td>Connect values here. A new input appears each time you connect the last free one (up to 20). Disconnect one and the gap closes.</td></tr>
<tr><td><b>delimiter</b></td><td>Put between the values. <code>\\n</code> = new line (default), <code>\\t</code> = tab, <code>\\\\</code> = backslash. Anything else is used as typed, e.g. <code>, </code> or <code> | </code>.</td></tr>
</table>
<p>Each value is converted like in <b>Elegant Any to String Preview</b>. The joined text is shown and output as <code>string</code>.</p>`,
  },

  [NODE_IDS.anyMathMultiPreview]: {
    title: "Elegant Any Math Multi Preview",
    html: `
<p>Calculates an expression from the inputs <code>a</code>, <code>b</code>, <code>c</code>, … and outputs the result as int, float, boolean and string.</p>
<p>The preview shows the expression with the real numbers filled in, e.g. <code>1 + (2 / 2) - 3 = -1</code>, followed by all four outputs.</p>
<p class="elegant-help-subgraph"><b>Works from the subgraph node.</b> After each run the worked-out result also appears on the subgraph node. Each copy of a subgraph shows its own result.</p>

<h3>Inputs</h3>
<ul>
<li>Connect values to <code>a</code>, <code>b</code>, …; a new input appears each time you connect the last free one (up to <code>z</code>).</li>
<li>Any type is accepted. Text that looks like a number (<code>"12"</code>, <code>"0.5"</code>) is used as a number; other text stays text.</li>
<li><code>values</code> is the list of all inputs, e.g. <code>sum(values)</code> or <code>max(values)</code>.</li>
<li>Using an input that isn't connected stops the run with an error.</li>
</ul>

<h3>Operators</h3>
<table>
<tr><td><code>a + b</code></td><td>add (or join two texts)</td></tr>
<tr><td><code>a - b</code></td><td>subtract</td></tr>
<tr><td><code>a * b</code></td><td>multiply (text × number repeats it)</td></tr>
<tr><td><code>a / b</code></td><td>divide, always a decimal: <code>7 / 2 = 3.5</code></td></tr>
<tr><td><code>a // b</code></td><td>divide and round down: <code>7 // 2 = 3</code></td></tr>
<tr><td><code>a % b</code></td><td>remainder: <code>7 % 2 = 1</code></td></tr>
<tr><td><code>a ** b</code></td><td>power: <code>2 ** 10 = 1024</code></td></tr>
<tr><td><code>-a</code></td><td>negative</td></tr>
<tr><td><code>( … )</code></td><td>group, as usual</td></tr>
</table>

<h3>Comparisons and logic</h3>
<table>
<tr><td><code>== != &lt; &lt;= &gt; &gt;=</code></td><td>compare, gives True / False</td></tr>
<tr><td><code>and</code>, <code>or</code>, <code>not</code></td><td>combine conditions: <code>a &gt; 0 and b &gt; 0</code></td></tr>
<tr><td><code>x if condition else y</code></td><td>choose: <code>a if a &gt; b else b</code></td></tr>
</table>

<h3>Functions</h3>
<table>
<tr><td><code>min(a, b, …)</code>, <code>max(a, b, …)</code></td><td>smallest / largest</td></tr>
<tr><td><code>sum(values)</code> or <code>sum(a, b, …)</code></td><td>add up</td></tr>
<tr><td><code>abs(a)</code></td><td>without sign: <code>abs(-3) = 3</code></td></tr>
<tr><td><code>round(a)</code>, <code>round(a, 2)</code></td><td>round to whole / 2 decimals (halves go to the even number)</td></tr>
<tr><td><code>floor(a)</code>, <code>ceil(a)</code></td><td>round down / up</td></tr>
<tr><td><code>clamp(a, low, high)</code></td><td>keep between low and high</td></tr>
<tr><td><code>sqrt(a)</code>, <code>pow(a, b)</code>, <code>exp(a)</code></td><td>square root, power, e<sup>a</sup></td></tr>
<tr><td><code>log(a)</code>, <code>log2(a)</code>, <code>log10(a)</code></td><td>logarithms (<code>log(a, base)</code> also works)</td></tr>
<tr><td><code>sin(a)</code>, <code>cos(a)</code>, <code>tan(a)</code></td><td>trigonometry, in radians</td></tr>
<tr><td><code>int(a)</code>, <code>float(a)</code>, <code>str(a)</code>, <code>bool(a)</code></td><td>convert</td></tr>
</table>
<p>Constants: <code>pi</code> (3.14159…), <code>tau</code> (2π).</p>

<h3>Outputs</h3>
<table>
<tr><td><b>int</b></td><td>whole number; decimals are cut off (<code>1.77 → 1</code>, <code>-1.5 → -1</code>). Use <code>round(…)</code> in the expression to round instead.</td></tr>
<tr><td><b>float</b></td><td>decimal number</td></tr>
<tr><td><b>boolean</b></td><td>False for 0, empty text or False; otherwise True</td></tr>
<tr><td><b>string</b></td><td>the result as text</td></tr>
</table>
<p>If the result is text that isn't a number, int and float are 0.</p>

<h3>Examples</h3>
<table>
<tr><td><code>a / b</code></td><td>aspect ratio from width and height</td></tr>
<tr><td><code>round(a / 64) * 64</code></td><td>snap to a multiple of 64</td></tr>
<tr><td><code>a * 1.5</code></td><td>upscale size by 1.5×</td></tr>
<tr><td><code>max(a, b)</code></td><td>long side</td></tr>
<tr><td><code>a * b / 1048576</code></td><td>megapixels</td></tr>
<tr><td><code>clamp(a, 1, 150)</code></td><td>keep steps in range</td></tr>
<tr><td><code>a if a &gt; 0 else b</code></td><td>fallback value</td></tr>
<tr><td><code>a % 2 == 0</code></td><td>is even (boolean output)</td></tr>
<tr><td><code>a + "_" + str(b)</code></td><td>build a name like <code>img_42</code></td></tr>
</table>

<h3>Safety</h3>
<p>Expressions are evaluated with <i>simpleeval</i>, like ComfyUI's own Math Expression node: only math, no Python code, and very large powers are refused.</p>`,
  },
};

// ---------------------------------------------------------------------------
// Dialog
// ---------------------------------------------------------------------------

const HELP_COLOR = "#22d3ee"; // cyan
const TITLE_BUTTON_NAME = "elegant_help";

const STYLE = `
.elegant-help-icon { display: inline-flex; align-items: center; justify-content: center; flex: none;
  width: 16px; height: 16px; box-sizing: border-box; border: 1.5px solid ${HELP_COLOR}; border-radius: 50%;
  color: ${HELP_COLOR}; font: bold 11px/1 sans-serif; }
.elegant-help-overlay { position: fixed; inset: 0; z-index: 10000; display: flex; align-items: center; justify-content: center;
  background: rgba(0, 0, 0, 0.5); }
.elegant-help { width: min(680px, calc(100vw - 32px)); max-height: min(80vh, 900px); display: flex; flex-direction: column;
  background: var(--comfy-menu-bg, #202020); color: var(--fg-color, #ddd); border: 1px solid var(--border-color, #444);
  border-radius: 10px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5); font: 14px/1.5 sans-serif; }
.elegant-help header { display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 12px 16px; border-bottom: 1px solid var(--border-color, #444); }
.elegant-help header h2 { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 16px; }
.elegant-help header button { background: none; border: 0; color: inherit; font-size: 18px; cursor: pointer; line-height: 1;
  padding: 4px 8px; border-radius: 6px; }
.elegant-help header button:hover { background: var(--comfy-input-bg, #333); }
.elegant-help .body { padding: 4px 16px 16px; overflow: auto; }
.elegant-help h3 { margin: 16px 0 6px; font-size: 14px; }
.elegant-help .elegant-help-subgraph { margin: 10px 0; padding: 8px 12px; border-left: 3px solid ${HELP_COLOR};
  background: rgba(34, 211, 238, 0.08); border-radius: 0 6px 6px 0; }
.elegant-help p, .elegant-help ul { margin: 6px 0; }
.elegant-help ul { padding-left: 20px; }
.elegant-help table { border-collapse: collapse; width: 100%; margin: 6px 0; }
.elegant-help td { padding: 4px 8px; border-top: 1px solid var(--border-color, #3a3a3a); vertical-align: top; }
.elegant-help td:first-child { white-space: nowrap; width: 1%; }
.elegant-help code { font: 12.5px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  background: var(--comfy-input-bg, #2a2a2a); padding: 1px 4px; border-radius: 4px; }
/* margin-right keeps the button clear of the Vue node's top-right resize handle */
.elegant-help-button { margin-left: auto; margin-right: 14px; padding: 2px; background: none; border: 0; cursor: pointer;
  line-height: 0; opacity: 0.85; border-radius: 50%; }
.elegant-help-button:hover { opacity: 1; background: rgba(34, 211, 238, 0.15); }
`;

function ensureStyle() {
  if (document.getElementById("elegant-help-style")) return;
  const style = document.createElement("style");
  style.id = "elegant-help-style";
  style.textContent = STYLE;
  document.head.appendChild(style);
}

function showHelp(nodeId) {
  const help = HELP[nodeId];
  if (!help) return;
  ensureStyle();
  document.querySelector(".elegant-help-overlay")?.remove();

  const overlay = document.createElement("div");
  overlay.className = "elegant-help-overlay";
  overlay.innerHTML = `
<div class="elegant-help" role="dialog" aria-modal="true" aria-label="${help.title} help">
  <header><h2><span class="elegant-help-icon">?</span>${help.title}</h2><button type="button" aria-label="Close">✕</button></header>
  <div class="body">${help.html}</div>
</div>`;

  const close = () => {
    overlay.remove();
    document.removeEventListener("keydown", onKey, true);
  };
  const onKey = (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      close();
    }
  };
  overlay.addEventListener("pointerdown", (e) => {
    if (e.target === overlay) close();
  });
  overlay.querySelector("header button").addEventListener("click", close);
  // Keep keys and wheel inside the dialog away from the canvas.
  overlay.addEventListener("wheel", (e) => e.stopPropagation(), { passive: true });
  document.addEventListener("keydown", onKey, true);
  document.body.appendChild(overlay);
  overlay.querySelector("header button").focus();
}

// ---------------------------------------------------------------------------
// Classic canvas nodes: a title button
// ---------------------------------------------------------------------------

function addTitleHelpButton(node, nodeId) {
  if (!node.addTitleButton || node.title_buttons?.some((b) => b.name === TITLE_BUTTON_NAME)) return;
  const button = node.addTitleButton({
    name: TITLE_BUTTON_NAME,
    text: "?",
    fontSize: 11,
    bgColor: "transparent",
    xOffset: -6,
  });
  // Title buttons draw in the title colour; draw a cyan "?" in a ring instead.
  const SIZE = 16;
  button.getWidth = () => SIZE;
  button.draw = function (ctx, x, y) {
    if (!this.visible) return;
    const left = x + this.xOffset;
    const top = y + this.yOffset;
    this._last_area[0] = left;
    this._last_area[1] = top;
    this._last_area[2] = SIZE;
    this._last_area[3] = this.height;

    const cx = left + SIZE / 2;
    const cy = top + this.height / 2;
    ctx.save();
    ctx.strokeStyle = HELP_COLOR;
    ctx.fillStyle = HELP_COLOR;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, SIZE / 2 - 1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("?", cx, cy + 0.5);
    ctx.restore();
  };
  const original = node.onTitleButtonClick;
  node.onTitleButtonClick = function (clicked, canvas) {
    if (clicked?.name === TITLE_BUTTON_NAME) return showHelp(nodeId);
    return original?.call(this, clicked, canvas);
  };
}

// ---------------------------------------------------------------------------
// Vue nodes: the frontend doesn't render title buttons there, so add one to the header
// ---------------------------------------------------------------------------

function nodeForHeader(header) {
  const id = header.dataset.testid?.slice("node-header-".length);
  if (!id) return null;
  const graph = app.canvas?.graph ?? app.graph;
  return graph?.getNodeById?.(id) ?? graph?.getNodeById?.(Number(id)) ?? null;
}

function decorateVueHeaders() {
  for (const header of document.querySelectorAll('[data-testid^="node-header-"]')) {
    if (header.querySelector(".elegant-help-button")) continue;
    const node = nodeForHeader(header);
    if (!node || !HELP[node.type]) continue;
    // The header row: title group on the left (it has mr-auto), badges on the right.
    const row = header.firstElementChild;
    if (!row) continue;

    ensureStyle();
    const button = document.createElement("button");
    button.type = "button";
    button.className = "elegant-help-button";
    button.innerHTML = '<span class="elegant-help-icon">?</span>';
    button.title = "Help";
    // Don't start a drag or select the node.
    for (const type of ["pointerdown", "mousedown", "dblclick"]) {
      button.addEventListener(type, (e) => e.stopPropagation());
    }
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      showHelp(node.type);
    });
    row.appendChild(button);
  }
}

let observer;
function watchVueNodes() {
  if (observer) return;
  // Batch DOM changes to one scan per frame.
  let scheduled = false;
  observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      decorateVueHeaders();
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
  decorateVueHeaders();
}

app.registerExtension({
  name: "elegant.help",
  setup() {
    watchVueNodes();
  },
  // nodeCreated runs before a node's type is set, so hook each node type instead.
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (HELP[nodeData.name]) onNodeCreated(nodeType, (node) => addTitleHelpButton(node, nodeData.name));
  },
});
