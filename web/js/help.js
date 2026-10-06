// Help: the cyan ? in each Elegant node's title (see title_buttons.js) opens a help dialog.

import { NODE_IDS } from "./common.js";
import { ICON_COLOR, ensureTitleButtonStyle, registerTitleButton } from "./title_buttons.js";

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
<p>The box is plain text (no Markdown); you can select and copy from it. Switch <b>wrap_text</b> on (an advanced input, off by default: click the <b>⚙</b> in the title to show it) to wrap long lines to the box width instead of scrolling sideways.</p>
<p>The last text is saved with the workflow (up to 10,000 characters), so it shows again after loading.</p>`,
  },

  [NODE_IDS.anyToStringMultiPreview]: {
    title: "Elegant Any to String Multi Preview",
    html: `
<p>Turns several values into text and joins them with a delimiter (<b>concat</b>), or picks one of them by index (<b>switch</b>).</p>
<p class="elegant-help-subgraph"><b>Works from the subgraph node.</b> After each run the joined text also appears on the subgraph node. Each copy of a subgraph shows its own value.</p>
<h3>Inputs</h3>
<table>
<tr><td><b>source_1, source_2, …</b></td><td>Connect values here. A new input appears each time you connect the last free one (up to 20). Disconnect one and the gap closes.</td></tr>
<tr><td><b>delimiter</b></td><td>concat: put between the values. <code>\\n</code> = new line (default), <code>\\t</code> = tab, <code>\\\\</code> = backslash. Anything else is used as typed, e.g. <code>, </code> or <code> | </code>.</td></tr>
<tr><td><b>wrap_text</b></td><td>(advanced) Wrap long lines to the box width instead of scrolling sideways.</td></tr>
<tr><td><b>mode</b></td><td><code>concat</code>: join all sources with the delimiter. <code>switch</code>: use only the source chosen by <b>index</b>. Only the settings the mode uses are shown: <b>delimiter</b> (and <b>prefix</b> / <b>suffix</b> when switched on) in concat, <b>index</b> in switch. The others move to the advanced settings (<b>⚙</b>) and are greyed out there.</td></tr>
<tr><td><b>index</b></td><td>switch: which source to use, counting from 1 (<code>source_1</code>). Connect a number to choose it from elsewhere, e.g. an <b>Elegant Random Number</b> for a random pick.</td></tr>
<tr><td><b>use_prefix</b>, <b>use_suffix</b></td><td>(advanced) concat: switch on to show the <b>prefix</b> / <b>suffix</b> field.</td></tr>
<tr><td><b>prefix</b>, <b>suffix</b></td><td>concat: text added before / after the joined text, exactly as typed (press Enter for a new line, no <code>\\n</code> needed).</td></tr>
</table>
<h3>Outputs</h3>
<table>
<tr><td><b>string</b></td><td>The joined text (concat) or the chosen source as text (switch).</td></tr>
<tr><td><b>value</b></td><td>switch: the chosen source <b>unchanged</b>, so the switch works for images, models, latents… anything. concat: the joined text.</td></tr>
</table>
<p>The preview shows which one was picked, e.g. <code>▶ source_2</code>. Note: ComfyUI still computes every connected source, also the ones not picked.</p>
<h3>Advanced: out of range</h3>
<p>Click the <b>⚙</b> in the title to show it. What an <b>index</b> outside the connected sources does:</p>
<table>
<tr><td><code>error</code></td><td>(default) stop the run with a message.</td></tr>
<tr><td><code>clamp</code></td><td>below 1 uses the first source, above the last uses the last.</td></tr>
<tr><td><code>wrap</code></td><td>count around: with 3 sources, 4 is the first again and 0 the last.</td></tr>
</table>
<p>Each value is converted like in <b>Elegant Any to String Preview</b>.</p>`,
  },

  [NODE_IDS.loadImageFromFolder]: {
    title: "Elegant Load Image (from Folder)",
    html: `
<p>Loads every image in a folder, like ComfyUI's <b>Load Image (from Folder)</b>, and also gives each image's file name.</p>
<p class="elegant-help-subgraph"><b>Works from the subgraph node.</b> After each run the list of loaded files also appears on the subgraph node. Each copy of a subgraph shows its own.</p>
<h3>Inputs</h3>
<table>
<tr><td><b>folder</b></td><td>A folder inside ComfyUI's <code>input</code> directory. Images directly in it are loaded (PNG, JPG, WEBP, BMP, TIFF), not those in its subfolders. Press <b>R</b> to refresh the list after adding a folder.</td></tr>
<tr><td><b>filename_format</b></td><td>(advanced, click the <b>⚙</b>) What <b>filename</b> holds: <code>file name</code> (photo.png, default), <code>name without extension</code> (photo) or <code>full path</code> (the file's path on the ComfyUI server).</td></tr>
</table>
<h3>Outputs</h3>
<table>
<tr><td><b>images</b></td><td>The images as a list: the nodes after it run once per image, so images may have different sizes.</td></tr>
<tr><td><b>filename</b></td><td>The file name of each image, in the same order, e.g. into a Save Image prefix to keep the names.</td></tr>
</table>
<p>Files are loaded in name order, with numbers by value (img2 before img10). Camera rotation (EXIF) is applied. The node runs again when files in the folder are added, removed or changed.</p>`,
  },

  [NODE_IDS.randomNumber]: {
    title: "Elegant Random Number",
    html: `
<p>A random number between <b>min</b> and <b>max</b>, drawn from a seed: the same seed always gives the same number, so you can get a value back.</p>
<p class="elegant-help-subgraph"><b>Works from the subgraph node.</b> <code>seed</code> is promoted automatically and the seed buttons appear on the subgraph node; the value shows there after each run. <i>control after generate</i> stays on the node inside the subgraph. Each copy of a subgraph keeps its own seed.</p>
<h3>Controls</h3>
<table>
<tr><td><b>seed</b></td><td>ComfyUI's standard seed, like KSampler's. Type one to use it for the next run.</td></tr>
<tr><td><b>control after generate</b></td><td>ComfyUI's own: <code>randomize</code> for a new seed (and number) every run, <code>fixed</code> to keep it, or <code>increment</code> / <code>decrement</code>.</td></tr>
<tr><td><b>min</b>, <b>max</b></td><td>The range, both included. Swapped automatically if min is larger.</td></tr>
<tr><td><b>number_type</b></td><td><code>int</code>: a whole number. <code>float</code>: a decimal number.</td></tr>
<tr><td><b>🎲 Random</b></td><td>New seed now, and set the control to <code>randomize</code>.</td></tr>
<tr><td><b>♻️ Last seed → fixed</b></td><td>Put back the seed of the last finished run and set the control to <code>fixed</code>, to keep a number you liked.</td></tr>
<tr><td><b>🎲 Random → fixed</b></td><td>New seed, and set the control to <code>fixed</code>.</td></tr>
</table>
<p>ComfyUI changes the seed before or after each run, per <i>Settings → Widget control mode</i>.</p>
<h3>Outputs</h3>
<p><code>int</code>, <code>float</code> and <code>string</code>. Tip: connect <code>int</code> to the <b>index</b> of a Multi Preview in switch mode for a random pick.</p>`,
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
<tr><td><code>rand(seed)</code></td><td>random decimal from 0 to 1</td></tr>
<tr><td><code>randint(seed, low, high)</code></td><td>random whole number, low and high included</td></tr>
<tr><td><code>uniform(seed, low, high)</code></td><td>random decimal between low and high</td></tr>
</table>
<p>Constants: <code>pi</code> (3.14159…), <code>tau</code> (2π).</p>
<p>The random functions are <b>seeded</b>: the same seed always gives the same number, so connect an <b>Elegant Seed</b> (e.g. as <code>a</code>) and use <code>randint(a, 1, 6)</code>. For a standalone random value use <b>Elegant Random Number</b>.</p>

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


const STYLE = `
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
.elegant-help .elegant-help-subgraph { margin: 10px 0; padding: 8px 12px; border-left: 3px solid ${ICON_COLOR};
  background: rgba(34, 211, 238, 0.08); border-radius: 0 6px 6px 0; }
.elegant-help p, .elegant-help ul { margin: 6px 0; }
.elegant-help ul { padding-left: 20px; }
.elegant-help table { border-collapse: collapse; width: 100%; margin: 6px 0; }
.elegant-help td { padding: 4px 8px; border-top: 1px solid var(--border-color, #3a3a3a); vertical-align: top; }
.elegant-help td:first-child { white-space: nowrap; width: 1%; }
.elegant-help code { font: 12.5px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  background: var(--comfy-input-bg, #2a2a2a); padding: 1px 4px; border-radius: 4px; }
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
  ensureTitleButtonStyle();
  document.querySelector(".elegant-help-overlay")?.remove();

  const overlay = document.createElement("div");
  overlay.className = "elegant-help-overlay";
  overlay.innerHTML = `
<div class="elegant-help" role="dialog" aria-modal="true" aria-label="${help.title} help">
  <header><h2><span class="elegant-icon">?</span>${help.title}</h2><button type="button" aria-label="Close">✕</button></header>
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

registerTitleButton({
  name: "elegant_help",
  order: 0, // rightmost
  glyph: "?",
  tooltip: "Help",
  appliesTo: (nodeId) => !!HELP[nodeId],
  onClick: (node, nodeId) => showHelp(nodeId),
});
