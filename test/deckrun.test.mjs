import test from "node:test";
import assert from "node:assert/strict";
import { parseSlides } from "../dist/parser.js";
import {
  findTemplate,
  resolveTemplateName,
  templateSummaries,
  templateListing,
  findTransition,
  resolveTransitionName,
  transitionSummaries,
  transitionListing,
  TEMPLATE_CSS,
  TRANSITION_CSS,
} from "../dist/presentation-options.js";
import { richContentFeatures, richContentHead } from "../dist/rich-content.js";
import { lintMarkdown } from "../dist/lint.js";
import { generateHtml, generateDocHtml } from "../dist/generate.js";
import { generatePreviewHtml } from "../dist/preview.js";
import { generateEditorHtml } from "../dist/editor.js";
import { findFont, resolveThemeName } from "../dist/themes.js";
import { HIGHLIGHT_RUNTIME, HIGHLIGHT_WARNING } from "../dist/highlights.js";
import vm from "node:vm";

test("Parser handles slides, notes, images, math, and reveals", () => {
  const md = `# Slide 1
Welcome to deckrun

<!-- notes: Introduction slide notes -->
---
# Slide 2
Here is a list:
- Point A
- Point B {reveal}

{reveal}
> Important quote

$$
E = mc^2
$$

Inline math $a^2 + b^2 = c^2$ here.
`;

  const slides = parseSlides(md);
  assert.equal(slides.length, 2);
  assert.equal(slides[0].notes, "Introduction slide notes");
  assert.match(slides[1].html, /deckrun-fragment-marker/);
  assert.match(slides[1].html, /class="math-source"/);
  assert.match(slides[1].html, /data-display="true"/);
  assert.match(slides[1].html, /data-display="false"/);
});

test("Presentation options resolve correctly", () => {
  assert.equal(findTemplate("minimal"), "minimal");
  assert.equal(findTemplate("Minimal"), "minimal");
  assert.equal(findTemplate("non-existent"), null);
  assert.equal(resolveTemplateName("invalid"), "minimal");

  assert.equal(findTransition("fade"), "fade");
  assert.equal(findTransition("None"), "none");
  assert.equal(findTransition("non-existent"), null);
  assert.equal(resolveTransitionName("none"), "none");
  assert.equal(resolveTransitionName("invalid"), "slide");

  assert.equal(templateSummaries().length, 1);
  assert.equal(transitionSummaries().length, 3);
  assert.equal(templateListing().length, 1);
  assert.equal(transitionListing().length, 3);

  assert.ok(TEMPLATE_CSS.includes("minimal"));
  assert.ok(TRANSITION_CSS.includes("fade"));
});

test("Rich content detection and head tags work", () => {
  const slidesWithoutRich = parseSlides("# Simple\nHello");
  const feat1 = richContentFeatures(slidesWithoutRich);
  assert.equal(feat1.math, false);
  assert.equal(feat1.mermaid, false);
  assert.equal(richContentHead(feat1, "local"), "");

  const slidesWithRich = parseSlides("# Math\n$$\nx = y\n$$\n```mermaid\ngraph TD; A-->B;\n```");
  const feat2 = richContentFeatures(slidesWithRich);
  assert.equal(feat2.math, true);
  assert.equal(feat2.mermaid, true);

  const localHead = richContentHead(feat2, "local");
  assert.ok(localHead.includes("/__vendor/katex.min.css"));
  assert.ok(localHead.includes("/__vendor/mermaid.min.js"));

  const cdnHead = richContentHead(feat2, "cdn");
  assert.ok(cdnHead.includes("cdn.jsdelivr.net/npm/katex"));
  assert.ok(cdnHead.includes("cdn.jsdelivr.net/npm/mermaid"));
});

test("Linting catches errors and warnings properly", () => {
  // Empty deck
  const emptyRes = lintMarkdown("   ");
  assert.equal(emptyRes.errors, 1);
  assert.equal(emptyRes.issues[0].rule, "empty-deck");

  // Valid deck
  const validMd = `# Clean Slide
- Item 1
- Item 2
`;
  const validRes = lintMarkdown(validMd);
  assert.equal(validRes.errors, 0);
  assert.equal(validRes.warnings, 0);

  // Deck with untagged fence and unclosed fence
  const unclosedMd = `# Slide
\`\`\`
unclosed code
`;
  const unclosedRes = lintMarkdown(unclosedMd);
  assert.ok(unclosedRes.issues.some((i) => i.rule === "untagged-code-fence"));
  assert.ok(unclosedRes.issues.some((i) => i.rule === "unclosed-code-fence"));
  assert.equal(unclosedRes.errors, 1);

  // Deck with empty alt image and invalid opacity
  const badImgMd = `# Slide
![](pic.png "opacity=2.5")
`;
  const badImgRes = lintMarkdown(badImgMd);
  assert.ok(badImgRes.issues.some((i) => i.rule === "missing-image-alt"));
  assert.ok(badImgRes.issues.some((i) => i.rule === "invalid-image-opacity"));

  // Deck with unclosed math, long heading, dense slide, excessive reveals
  const complexBadMd = `# Slide with an extraordinarily long heading that exceeds eighty characters in length by a substantial margin
$$
x + y = z
---
# Dense slide
- A
- B
- C
- D
- E
- F
- G
- H
- I
{reveal} 1 {reveal} 2 {reveal} 3 {reveal} 4 {reveal} 5 {reveal} 6 {reveal} 7 {reveal} 8 {reveal} 9 {reveal} 10 {reveal} 11
`;
  const complexRes = lintMarkdown(complexBadMd);
  assert.ok(complexRes.issues.some((i) => i.rule === "unclosed-math"));
  assert.ok(complexRes.issues.some((i) => i.rule === "long-heading"));
  assert.ok(complexRes.issues.some((i) => i.rule === "dense-slide"));
  assert.ok(complexRes.issues.some((i) => i.rule === "reveal-excessive"));
});

test("Generate HTML produces valid complete document with templates and transitions", () => {
  const slides = parseSlides("# Slide 1\nHello\n<!-- notes: Test note -->");
  const html = generateHtml(
    slides,
    "My Test Deck",
    false,
    "maxx-mellow",
    { head: null, body: null },
    { template: "minimal", transition: "fade" }
  );

  assert.ok(html.includes('data-theme="maxx-mellow"'));
  assert.ok(html.includes('data-template="minimal"'));
  assert.ok(html.includes('data-transition="fade"'));
  assert.ok(html.includes("Test note"));
});

test("Generate Doc HTML produces valid standalone document wrapper", () => {
  const docHtml = generateDocHtml("/__remote-doc", "My Remote Doc", false, "maxx-mellow-dawn");
  assert.ok(docHtml.includes('data-theme="maxx-mellow-dawn"'));
  assert.ok(docHtml.includes('src="/__remote-doc"'));
  assert.ok(docHtml.includes("My Remote Doc"));
});

test("Editor bootstraps with the opened file, and without one when absent", () => {
  const plain = generateEditorHtml("maxx-mellow", {}, "minimal", "slide");
  assert.ok(plain.includes('"file":null'));

  const backed = generateEditorHtml("maxx-mellow", {}, "minimal", "slide", {
    name: "slides.md",
    kind: "markdown",
    writable: true,
    watched: true,
  });
  assert.ok(backed.includes('"name":"slides.md"'));
  assert.ok(backed.includes('"writable":true'));
  assert.ok(backed.includes('"watched":true'));
  // The runtime that loads, saves, and live-reloads the file rides along.
  assert.ok(backed.includes("/__file"));
  assert.ok(backed.includes("EventSource('/__events')"));
});

test("Generate preview HTML produces valid preview structure", () => {
  const html = generatePreviewHtml("maxx-mellow-dawn", {}, "minimal", "none");
  assert.ok(html.includes('data-theme="maxx-mellow-dawn"'));
  assert.ok(html.includes('data-template="minimal"'));
  assert.ok(html.includes('data-transition="none"'));
  assert.ok(html.includes('id="presentation"'));
});

test("Generate editor HTML produces valid editor interface", () => {
  const html = generateEditorHtml("maxx-mellow", { head: "geist", body: "newsreader" }, "minimal", "fade");
  assert.ok(html.includes('data-theme="maxx-mellow"'));
  assert.ok(html.includes('data-template="minimal"'));
  assert.ok(html.includes('data-transition="fade"'));
  assert.ok(html.includes("deckrun · editor"));
});

test("Theme and font resolvers function properly", () => {
  assert.equal(resolveThemeName("maxx-mellow"), "maxx-mellow");
  assert.equal(resolveThemeName("Maxx-Mellow"), "maxx-mellow");
  assert.equal(resolveThemeName("invalid-theme"), "maxx-mellow");

  assert.equal(findFont("geist"), "geist");
  assert.equal(findFont("Geist"), "geist");
  assert.equal(findFont("non-existent-font"), null);
});

test("Theme-dependent text selection highlight is configured", async () => {
  const { themeRootCss, themeSwitchableCss } = await import("../dist/themes.js");
  const nordCss = themeRootCss("nord");
  assert.ok(nordCss.includes("--selection-bg:"));
  assert.ok(nordCss.includes("--selection-text:"));

  const switchableCss = themeSwitchableCss();
  assert.ok(switchableCss.includes("--selection-bg:"));

  const slides = parseSlides("# Test\nSelection styling");
  const html = generateHtml(slides, "Test Deck", false, "nord", "m");
  assert.ok(html.includes("::selection"));
  assert.ok(html.includes("var(--selection-bg"));
});


test("Session highlights ship on every surface that renders a document", () => {
  const slides = parseSlides("# Slide 1\nHighlight me");

  // The deck reads hl=... so the tab present opens knows whose marks these are.
  const deck = generateHtml(slides, "Deck");
  assert.ok(deck.includes("window.deckrunHighlights"));
  assert.ok(deck.includes("scopes: 'slides'"));
  assert.ok(deck.includes("get('hl')"));

  // An HTML doc is one scope, highlighted through the presenter wrapper.
  const doc = generateDocHtml("/?deck=1", "Doc");
  assert.ok(doc.includes("window.deckrunHighlights"));
  assert.ok(doc.includes("scopes: 'doc'"));

  // The editor drives both of its previews and hands the key to present.
  const editor = generateEditorHtml();
  assert.ok(editor.includes("frame: frame"));
  assert.ok(editor.includes("frame: frameHtml"));
  assert.ok(editor.includes("'&hl=' + encodeURIComponent(highlightKey())"));

  // Exports and PDFs are built from the same markdown with no hl= on them,
  // so a printed deck never carries somebody's session marks.
  assert.ok(!deck.includes("&hl="));
});

test("Highlight runtime is valid, self-installing JavaScript", () => {
  assert.doesNotThrow(() => new vm.Script(HIGHLIGHT_RUNTIME));
  assert.ok(HIGHLIGHT_RUNTIME.includes("window.deckrunHighlights = {"));
  // Session storage only: nothing reaches localStorage or the server.
  assert.ok(HIGHLIGHT_RUNTIME.includes("sessionStorage"));
  assert.ok(!HIGHLIGHT_RUNTIME.includes("localStorage"));
  assert.ok(!HIGHLIGHT_RUNTIME.includes("fetch("));
  // Tabs of one session stay in step, which is how a highlight made in the
  // editor is already on the slide in the deck tab.
  assert.ok(HIGHLIGHT_RUNTIME.includes("BroadcastChannel"));
});

test("First use warns that highlights are session-only", () => {
  assert.match(HIGHLIGHT_WARNING, /session/i);
  assert.match(HIGHLIGHT_WARNING, /Nothing is written to disk/);
  const deck = generateHtml(parseSlides("# One"), "Deck");
  assert.ok(deck.includes(HIGHLIGHT_WARNING));
  assert.ok(generateEditorHtml().includes(HIGHLIGHT_WARNING));
});

test("Highlight colors are fixed, not borrowed from the theme", async () => {
  const { themeRootCss, THEME_IDS } = await import("../dist/themes.js");

  // A tint of the accent reads as part of the design; a highlight has to be
  // findable at a glance on every palette, so it carries its own colors.
  for (const id of THEME_IDS) {
    assert.ok(!themeRootCss(id).includes("--mark"), id + " defines no highlight color");
  }
  assert.ok(!HIGHLIGHT_RUNTIME.includes("var(--mark"),
    "the mark styles do not reach for a theme variable");

  // Pen yellow, its own dark ink, and a second pen for commented highlights.
  assert.ok(HIGHLIGHT_RUNTIME.includes("background: #ffe75e"));
  assert.ok(HIGHLIGHT_RUNTIME.includes("mark.dr-hl * { color: #15161a !important; }"));
  assert.ok(HIGHLIGHT_RUNTIME.includes("background: #7ae6ff"));

  // The popups are chrome, so those still match whatever theme is on.
  assert.ok(HIGHLIGHT_RUNTIME.includes("var(--mantle,"));
});

test("Only maxx-mellow and its dawn companion remain registered", async () => {
  const { THEME_IDS, THEMES, themeSummaries, themeRootCss, resolveThemeName: resolveTheme } =
    await import("../dist/themes.js");

  assert.deepEqual([...THEME_IDS], ["maxx-mellow", "maxx-mellow-dawn"]);

  const flavors = {
    "maxx-mellow": { mood: "dark", background: "#161617", text: "#c9c7cd" },
    "maxx-mellow-dawn": { mood: "light", background: "#f4f2f0", text: "#52505a" },
  };

  for (const [id, expected] of Object.entries(flavors)) {
    assert.equal(resolveTheme(id), id, id + " resolves to itself, not a fallback");

    const theme = THEMES[id];
    assert.equal(theme.mood, expected.mood, id + " has the right light/dark mood");
    assert.equal(theme.neutrals.mantle, expected.background, id + " background matches the brand hex");
    assert.equal(theme.neutrals.text, expected.text, id + " text matches the brand hex");

    const css = themeRootCss(id);
    assert.ok(css.includes("--accent:"), id + " emits an accent role");

    const slides = parseSlides("# Maxx Mellow\nPalette check");
    const html = generateHtml(slides, "Deck", false, id, "m");
    assert.ok(html.includes(`data-theme="${id}"`), id + " renders with its own data-theme attribute");
  }

  const summaries = themeSummaries();
  assert.equal(summaries.length, 2);
  for (const s of summaries) {
    assert.equal(s.mood, flavors[s.id].mood, s.id + " summary mood matches");
  }

  // Every previously-shipped theme is gone and falls back to the default.
  for (const gone of [
    "midnight", "tokyo", "nord", "dracula", "gruvbox", "rosepine", "forest",
    "onedarkpro", "catppuccin-frappe", "catppuccin-macchiato", "catppuccin-mocha",
    "neon", "daylight", "arctic", "solarized", "paper", "rosequartz", "swiss",
    "catppuccin-latte",
  ]) {
    assert.equal(THEMES[gone], undefined, gone + " is no longer registered");
    assert.equal(resolveTheme(gone), "maxx-mellow", gone + " falls back to the default");
  }
});

test("The type size option is gone from every surface", async () => {
  const themes = await import("../dist/themes.js");
  for (const gone of ["SIZE_IDS", "DEFAULT_SIZE", "findSize", "resolveSizeName",
                      "sizeSummaries", "sizeListing", "sizeRootCss", "sizeSwitchableCss"]) {
    assert.equal(themes[gone], undefined, gone + " is no longer exported");
  }

  // Nothing keys off a size any more: no attribute, no switchable scale, and
  // no multiplier left over from one.
  const deck = generateHtml(parseSlides("# One\nBody"), "Deck");
  const preview = generatePreviewHtml();
  const editor = generateEditorHtml();
  for (const [name, html] of Object.entries({ deck, preview, editor })) {
    assert.ok(!html.includes("data-size"), name + " sets no data-size");
    assert.ok(!html.includes("--type-display"), name + " has no type multiplier");
    assert.ok(!html.includes("--type-body"), name + " has no type multiplier");
  }
  assert.ok(!editor.includes("sz-btn"), "the editor has no size control");
  assert.ok(!editor.includes("th-size"), "the theme picker has no size row");
  assert.ok(!editor.includes('"sizes"'), "the editor is not handed a size list");

  // The one scale the deck now renders at still reaches the templates.
  assert.ok(deck.includes("--slide-pad-y: 4.4rem"));
  assert.ok(deck.includes("--slide-pad-x: 6rem"));
});
