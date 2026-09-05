/**
 * The theme registry.
 *
 * ── Adding a theme ────────────────────────────────────────────────────────
 * Append one entry to `SPECS` below and it appears everywhere: the CLI's
 * `--theme` flag, the editor's theme menu, the live preview, the HTML export,
 * and the PDF. Nothing else needs touching.
 *
 * A spec is four things:
 *
 *   neutrals  An 11-step ramp from the page's outermost background (`crust`)
 *             to its strongest foreground (`text`). Light themes run the same
 *             direction: crust is still the backdrop, text is still the ink.
 *   accents   Eleven hues, named after the Catppuccin slots so palettes port
 *             across easily. They are the deck's paint box: `mark`, list
 *             markers, table headers, and the five pen colors all pull from
 *             here.
 *   roles     Which three of those colors lead. `accent` carries h1, the
 *             caret, focus rings, and every piece of chrome; `accent2` carries
 *             h2 and links; `accent3` carries h3. Point them at any neutral or
 *             accent key — that is how Nord leads with frost blue while
 *             Gruvbox leads with amber.
 *   type      A display face for headings, a body face for prose, a mono face
 *             for code, plus the weight and tracking that face wants. Faces
 *             come from `FONTS`; add an entry there to use a new one.
 *
 * `decor` picks the animated geometry that sits behind every slide. The
 * available names live in `DECORS` at the bottom of this file — each is a set
 * of CSS custom properties, so a new pattern is a new entry there and a
 * matching name here.
 *
 * Everything else — tints, overlays, shadows, glows, the decor's own colors —
 * is derived from the four inputs, so a new theme cannot fall out of step with
 * itself.
 *
 * The type scale lives at the bottom of this file. It is deliberately separate
 * from the themes: every theme can be set at any of the four sizes, so the two
 * choices compose instead of multiplying into fifty-six presets.
 */

// ── Color plumbing ────────────────────────────────────────────────────────

/** `#rrggbb` → `r, g, b`, ready to drop into an `rgba()`. */
function channels(hex: string): string {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3 ? h.split("").map((c) => c + c).join("") : h,
    16
  );
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

function alpha(hex: string, a: number): string {
  return `rgba(${channels(hex)}, ${a})`;
}

// ── Fonts ─────────────────────────────────────────────────────────────────

/**
 * A face, as Google Fonts wants it and as CSS wants it. `param` is the
 * `family=` query segment; the weights listed there are the only ones that
 * load, so a theme asking for weight 800 needs 800 in the param. `kind` only
 * groups the face in the editor's font menu.
 *
 * The human name is not stored: it is the family out of `param`, so the two
 * cannot disagree.
 */
interface FontFace {
  param: string;
  stack: string;
  kind: "sans" | "serif" | "mono";
}

/** "Space+Grotesk:wght@400;700" → "Space Grotesk". */
export function fontName(key: string): string {
  return FONTS[key].param.split(":")[0].replace(/\+/g, " ");
}

const SANS = "system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

export const FONTS: Record<string, FontFace> = {
  geist:      { param: "Geist:wght@400;500;600;700;800",                      stack: `'Geist', ${SANS}`, kind: "sans" },
  newsreader: { param: "Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400", stack: `'Newsreader', ${SERIF}`, kind: "serif" },
  fraunces:   { param: "Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;0,9..144,800;0,9..144,900;1,9..144,400", stack: `'Fraunces', ${SERIF}`, kind: "serif" },
  plexMono:   { param: "IBM+Plex+Mono:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400", stack: `'IBM Plex Mono', ${MONO}`, kind: "mono" },
};

/**
 * One stylesheet request covering every face the given themes need. Google
 * serves the @font-face rules for all of them but the browser only downloads
 * the files actually painted, so asking for the whole registry — which the
 * editor and its preview must do, since the theme changes at runtime — costs
 * one small CSS file.
 */
export function googleFontsHref(
  themes: ThemeName[] = THEME_IDS.slice(),
  extra: Array<string | null | undefined> = []
): string {
  const wanted = new Set<string>();
  wanted.add("plexMono");
  for (const input of themes) {
    const t = THEMES[resolveThemeName(input)];
    wanted.add(t.type.display);
    wanted.add(t.type.body);
    wanted.add(t.type.mono);
  }
  // A deck set in a face its theme does not use still has to fetch it.
  for (const key of extra) if (key && FONTS[key]) wanted.add(key);
  const families = [...wanted]
    .map((key) => FONTS[key].param)
    .sort()
    .map((param) => `family=${param}`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

// ── Theme shape ───────────────────────────────────────────────────────────

export type Mood = "dark" | "light";

interface Neutrals {
  crust: string; mantle: string; base: string;
  surface0: string; surface1: string; surface2: string;
  overlay0: string; overlay1: string;
  subtext0: string; subtext1: string; text: string;
}

interface Accents {
  lavender: string; blue: string; sapphire: string; sky: string;
  teal: string; green: string; yellow: string; peach: string;
  red: string; mauve: string; pink: string;
}

type ColorKey = keyof Neutrals | keyof Accents;

interface Roles {
  accent: ColorKey;
  accent2: ColorKey;
  accent3: ColorKey;
}

interface TypeSpec {
  /** Key into `FONTS` for headings. */
  display: keyof typeof FONTS | string;
  /** Key into `FONTS` for prose. */
  body: keyof typeof FONTS | string;
  /** Key into `FONTS` for code, `kbd`, and the deck's own chrome. */
  mono: keyof typeof FONTS | string;
  /** Heading weight. Must be one of the weights `FONTS[display].param` loads. */
  weight?: number;
  /** Heading letter-spacing. Big display faces usually want a negative value. */
  tracking?: string;
  /** Body letter-spacing, for faces that read better slightly opened up. */
  bodyTracking?: string;
  /** `uppercase` turns h1 into a banner. Leave off for sentence case. */
  case?: "none" | "uppercase";
}

interface ThemeSpec {
  label: string;
  mood: Mood;
  blurb: string;
  neutrals: Neutrals;
  accents: Accents;
  roles: Roles;
  type: TypeSpec;
  decor: DecorName;
}

export interface Theme extends ThemeSpec {
  id: string;
}

// ── The themes ────────────────────────────────────────────────────────────

const SPECS: Record<string, ThemeSpec> = {
  "maxx-mellow": {
    label: "maxx mellow",
    mood: "dark",
    blurb: "Low-contrast, warm-muted. Dark is the primary identity, drifting orbs.",
    neutrals: {
      crust: "#131314", mantle: "#161617", base: "#19191a",
      surface0: "#222223", surface1: "#2a2a2c", surface2: "#3b3b3e",
      overlay0: "#57575b", overlay1: "#747377",
      subtext0: "#908f94", subtext1: "#adabb0", text: "#c9c7cd",
    },
    accents: {
      lavender: "#aca1cf", blue: "#92a2d5", sapphire: "#acb1d7", sky: "#97c0c4",
      teal: "#85b5ba", green: "#90b99f", yellow: "#e6b99d", peach: "#f5a191",
      red: "#ea83a5", mauve: "#b7aed5", pink: "#e29eca",
    },
    roles: { accent: "lavender", accent2: "blue", accent3: "teal" },
    type: { display: "geist", body: "geist", mono: "plexMono", weight: 600, tracking: "-0.015em" },
    decor: "orbs",
  },

  "maxx-mellow-dawn": {
    label: "maxx mellow dawn",
    mood: "light",
    blurb: "The mellow palette re-tuned for daylight, not inverted.",
    neutrals: {
      crust: "#eae7e3", mantle: "#f4f2f0", base: "#fefdfd",
      surface0: "#f7f5f4", surface1: "#efedeb", surface2: "#e0ddd9",
      overlay0: "#c4c1c0", overlay1: "#a7a5a6",
      subtext0: "#8b888d", subtext1: "#6e6c73", text: "#52505a",
    },
    accents: {
      lavender: "#7c70a8", blue: "#5f6fb0", sapphire: "#53619f", sky: "#437a7f",
      teal: "#4d868b", green: "#588368", yellow: "#a9744f", peach: "#bd6650",
      red: "#b25c7e", mauve: "#6f6299", pink: "#9c5695",
    },
    roles: { accent: "lavender", accent2: "blue", accent3: "teal" },
    type: { display: "geist", body: "geist", mono: "plexMono", weight: 600, tracking: "-0.015em" },
    decor: "orbs",
  },
};

/** Dark first, then its light companion. */
export const THEME_IDS = ["maxx-mellow", "maxx-mellow-dawn"] as const;

export type ThemeName = string;

export const THEMES: Record<string, Theme> = Object.fromEntries(
  THEME_IDS.map((id) => [id, { id, ...SPECS[id] }])
);

/** `dark` and `light` predate the registry and still name the two originals. */
const ALIASES: Record<string, string> = {
  dark: "maxx-mellow",
  light: "maxx-mellow-dawn",
  mellow: "maxx-mellow",
  dawn: "maxx-mellow-dawn",
};

export const DEFAULT_THEME = "maxx-mellow";

/** A theme id from untrusted input, or `null` if it names nothing. */
export function findTheme(input: string | undefined | null): string | null {
  if (!input) return null;
  const key = String(input).trim().toLowerCase();
  if (THEMES[key]) return key;
  return ALIASES[key] ?? null;
}

/** A theme id from untrusted input, falling back to the default. */
export function resolveThemeName(input: string | undefined | null): ThemeName {
  return findTheme(input) ?? DEFAULT_THEME;
}

export interface ThemeSummary {
  id: string;
  label: string;
  mood: Mood;
  blurb: string;
  decor: DecorName;
  /** Enough of the palette for the editor to paint a live thumbnail. */
  colors: {
    crust: string; mantle: string; base: string; surface0: string;
    overlay1: string; subtext1: string; text: string;
    accent: string; accent2: string; accent3: string;
  };
  /** Real font stacks, so each card is set in the face it is offering. */
  fonts: { display: string; body: string; mono: string };
}

/** What the editor's theme picker and the CLI's `--theme` help text list. */
export function themeSummaries(): ThemeSummary[] {
  return THEME_IDS.map((id) => {
    const t = THEMES[id];
    const n = t.neutrals;
    return {
      id,
      label: t.label,
      mood: t.mood,
      blurb: t.blurb,
      decor: t.decor,
      colors: {
        crust: n.crust, mantle: n.mantle, base: n.base, surface0: n.surface0,
        overlay1: n.overlay1, subtext1: n.subtext1, text: n.text,
        accent: role(t, "accent"),
        accent2: role(t, "accent2"),
        accent3: role(t, "accent3"),
      },
      fonts: {
        display: FONTS[t.type.display].stack,
        body: FONTS[t.type.body].stack,
        mono: FONTS[t.type.mono].stack,
      },
    };
  });
}

/** One line per theme, for `harbour --list-themes`. */
export function themeListing(): string[] {
  const pad = Math.max(...THEME_IDS.map((id) => id.length));
  return THEME_IDS.map((id) => {
    const t = THEMES[id];
    return `${id.padEnd(pad)}  ${t.mood === "dark" ? "dark " : "light"}  ${t.blurb}`;
  });
}

function palette(t: Theme): Record<string, string> {
  return { ...t.neutrals, ...t.accents };
}

function role(t: Theme, which: keyof Roles): string {
  return palette(t)[t.roles[which]];
}

// ── CSS emission ──────────────────────────────────────────────────────────

/**
 * Every custom property a theme owns. The palette slots come out verbatim;
 * everything below them is derived, so the tints, shadows, and decor colors
 * of a new theme land in the right register without being hand-picked.
 */
function themeVars(t: Theme): string {
  const n = t.neutrals;
  const a = t.accents;
  const dark = t.mood === "dark";
  const accent = role(t, "accent");
  const accent2 = role(t, "accent2");
  const accent3 = role(t, "accent3");

  const lines: Array<[string, string]> = [
    ["crust", n.crust], ["mantle", n.mantle], ["base", n.base],
    ["surface0", n.surface0], ["surface1", n.surface1], ["surface2", n.surface2],
    ["overlay0", n.overlay0], ["overlay1", n.overlay1],
    ["subtext0", n.subtext0], ["subtext1", n.subtext1], ["text", n.text],

    // All eleven ship whether or not the stylesheet names each one: they are
    // the paint box a deck reaches into, and the deck reads several of them
    // back out at runtime for the pen's color swatches.
    ["lavender", a.lavender], ["blue", a.blue], ["sapphire", a.sapphire],
    ["sky", a.sky], ["teal", a.teal], ["green", a.green], ["yellow", a.yellow],
    ["peach", a.peach], ["red", a.red], ["mauve", a.mauve], ["pink", a.pink],

    // The three leading colors, and the tints every surface borrows from them.
    ["accent", accent],
    ["accent-2", accent2],
    ["accent-3", accent3],
    ["accent-soft", alpha(accent, dark ? 0.1 : 0.09)],
    ["accent-line", alpha(accent, dark ? 0.42 : 0.34)],
    ["glow", alpha(accent, dark ? 0.34 : 0.22)],
    ["gradient", `linear-gradient(115deg, ${accent}, ${accent2} 58%, ${accent3})`],
    ["accent-fade", `linear-gradient(90deg, ${accent}, ${alpha(accent, 0.45)} 62%, transparent)`],
    ["selection-bg", alpha(accent, dark ? 0.22 : 0.18)],
    ["selection-text", "inherit"],

    ["surface-soft", alpha(n.surface0, dark ? 0.34 : 0.42)],
    ["crust-overlay", alpha(n.crust, dark ? 0.84 : 0.88)],
    ["scrim", dark ? "rgba(0, 0, 0, 0.5)" : alpha(n.text, 0.26)],
    // No borders in this system: panels lean on background contrast alone.
    ["hairline", "transparent"],

    // No shadows in this system: panels lean on background contrast alone.
    ["shadow-md", "none"],
    ["shadow-lg", "none"],
    ["code-shadow", "none"],

    ["font-display", FONTS[t.type.display].stack],
    ["font-body", FONTS[t.type.body].stack],
    ["font-mono", FONTS[t.type.mono].stack],
    ["display-weight", String(t.type.weight ?? 700)],
    ["display-tracking", t.type.tracking ?? "-0.02em"],
    ["display-case", t.type.case ?? "none"],
    ["body-tracking", t.type.bodyTracking ?? "0"],

    // Decor colors. Light themes take darker lines and gentler glows, since a
    // pale wash on paper reads as a smudge rather than as light.
    ["decor-line", alpha(n.text, dark ? 0.05 : 0.07)],
    ["decor-dot", alpha(n.text, dark ? 0.085 : 0.1)],
    ["decor-glow-1", alpha(accent, dark ? 0.2 : 0.15)],
    ["decor-glow-2", alpha(accent2, dark ? 0.16 : 0.12)],
    ["decor-glow-3", alpha(accent3, dark ? 0.13 : 0.1)],
  ];

  const pad = Math.max(...lines.map(([k]) => k.length));
  return lines
    .map(([k, v]) => `  --${k}:${" ".repeat(pad - k.length + 1)}${v};`)
    .join("\n");
}

/** The palette for one baked-in theme, for a deck that never switches. */
export function themeRootCss(theme: ThemeName): string {
  return `:root {\n${themeVars(THEMES[resolveThemeName(theme)])}\n}`;
}

/** Every palette, switchable at runtime via `[data-theme]` on the root. */
export function themeSwitchableCss(): string {
  const blocks = THEME_IDS.map((id) => {
    const selector = id === DEFAULT_THEME
      ? `:root, :root[data-theme="${id}"]`
      : `:root[data-theme="${id}"]`;
    return `${selector} {\n${themeVars(THEMES[id])}\n}`;
  });
  return blocks.join("\n\n");
}

/** `{ midnight: "orbs", … }`, so a theme swap swaps its backdrop with it. */
export function decorMapJson(): string {
  return JSON.stringify(
    Object.fromEntries(THEME_IDS.map((id) => [id, THEMES[id].decor]))
  );
}

export function decorOf(theme: ThemeName): DecorName {
  return THEMES[resolveThemeName(theme)].decor;
}

// ── Syntax highlighting ───────────────────────────────────────────────────

/**
 * Highlight.js token colors, pulled straight from the active theme's own
 * accent slots instead of a separate third-party stylesheet. A code block
 * repaints with the rest of the deck on a theme switch, and never falls out
 * of step with maxx-mellow's palette the way a generic Atom One theme would.
 */
export const HLJS_CSS = `/* ── Syntax highlighting ──────────────────────────────────────────────── */
.hljs { color: var(--text); background: transparent; }
.hljs-comment, .hljs-quote { color: var(--subtext0); font-style: italic; }
.hljs-doctag, .hljs-formula, .hljs-keyword { color: var(--lavender); }
.hljs-deletion, .hljs-name, .hljs-section, .hljs-selector-tag, .hljs-subst { color: var(--red); }
.hljs-literal { color: var(--sky); }
.hljs-addition, .hljs-attribute, .hljs-meta .hljs-string, .hljs-regexp, .hljs-string { color: var(--green); }
.hljs-attr, .hljs-number, .hljs-selector-attr, .hljs-selector-class, .hljs-selector-pseudo,
.hljs-template-variable, .hljs-type, .hljs-variable { color: var(--peach); }
.hljs-bullet, .hljs-link, .hljs-meta, .hljs-selector-id, .hljs-symbol, .hljs-title { color: var(--blue); }
.hljs-title.function_ { color: var(--teal); }
.hljs-built_in, .hljs-class .hljs-title, .hljs-title.class_ { color: var(--yellow); }
.hljs-emphasis { font-style: italic; }
.hljs-strong { font-weight: 700; }
.hljs-link { text-decoration: underline; }`;

// ── Decor ─────────────────────────────────────────────────────────────────

/**
 * Each pattern is nothing but custom properties, read by the two rules in
 * `DECOR_CSS` that paint the backdrop. So a new pattern is a new entry here
 * plus its name in `DecorName` — no new selectors, and it works on screen and
 * in the PDF alike.
 *
 *   --dc-layers / -size / -pos / -repeat   the texture, as background layers
 *   --dc-mask                              vignette, applied to the container
 *   --dc-inset                             overscan, so motion never shows an edge
 *   --dc-anim + --dc-dx/-dy                the drift; dx/dy must equal exactly
 *                                          one tile of the pattern, or the loop
 *                                          visibly jumps
 *   --dc-glow*                             a second layer of pure light
 */
const DECORS: Record<string, string> = {
  none: `
  --dc-glow:
    radial-gradient(closest-side, var(--decor-glow-1), transparent),
    radial-gradient(closest-side, var(--decor-glow-2), transparent);
  --dc-glow-size: 74vmax 74vmax, 58vmax 58vmax;
  --dc-glow-pos: 92% -20%, -14% 112%;
  --dc-glow-anim: dc-breathe 34s ease-in-out infinite;`,

  grid: `
  --dc-layers:
    linear-gradient(to right, var(--decor-line) 1px, transparent 1px),
    linear-gradient(to bottom, var(--decor-line) 1px, transparent 1px);
  --dc-size: 72px 72px;
  --dc-mask: radial-gradient(ellipse 88% 76% at 50% 40%, #000 24%, transparent 82%);
  --dc-anim: dc-pan 150s linear infinite;
  --dc-dx: 72px;
  --dc-dy: 72px;
  --dc-glow:
    radial-gradient(closest-side, var(--decor-glow-1), transparent),
    radial-gradient(closest-side, var(--decor-glow-2), transparent);
  --dc-glow-size: 70vmax 70vmax, 56vmax 56vmax;
  --dc-glow-pos: 90% -22%, -12% 110%;
  --dc-glow-anim: dc-breathe 30s ease-in-out infinite;`,

  dots: `
  --dc-layers: radial-gradient(var(--decor-dot) 1.4px, transparent 1.6px);
  --dc-size: 30px 30px;
  --dc-mask: radial-gradient(ellipse 92% 80% at 50% 42%, #000 20%, transparent 84%);
  --dc-anim: dc-pan 160s linear infinite;
  --dc-dx: 30px;
  --dc-dy: 30px;
  --dc-glow:
    radial-gradient(closest-side, var(--decor-glow-1), transparent),
    radial-gradient(closest-side, var(--decor-glow-3), transparent);
  --dc-glow-size: 64vmax 64vmax, 50vmax 50vmax;
  --dc-glow-pos: -14% -18%, 106% 96%;
  --dc-glow-anim: dc-breathe 36s ease-in-out infinite;`,

  topo: `
  --dc-layers: repeating-linear-gradient(52deg,
    var(--decor-line) 0 1px,
    transparent 1px 22px);
  --dc-mask: radial-gradient(ellipse 92% 84% at 46% 44%, #000 18%, transparent 86%);
  --dc-anim: dc-pan 90s linear infinite;
  --dc-dx: 17.34px;
  --dc-dy: -13.54px;
  --dc-glow:
    radial-gradient(closest-side, var(--decor-glow-1), transparent),
    radial-gradient(closest-side, var(--decor-glow-2), transparent);
  --dc-glow-size: 72vmax 72vmax, 52vmax 52vmax;
  --dc-glow-pos: 96% 8%, -10% 104%;
  --dc-glow-anim: dc-breathe 32s ease-in-out infinite;`,

  beams: `
  --dc-layers: repeating-linear-gradient(105deg,
    transparent 0 44px,
    var(--decor-glow-1) 44px 118px,
    transparent 118px 166px,
    var(--decor-glow-2) 166px 214px,
    transparent 214px 300px);
  --dc-mask: linear-gradient(to bottom, transparent, #000 22%, #000 70%, transparent);
  --dc-inset: -30%;
  --dc-anim: dc-pan 44s linear infinite;
  --dc-dx: 289.8px;
  --dc-dy: 77.6px;
  --dc-glow: radial-gradient(closest-side, var(--decor-glow-3), transparent);
  --dc-glow-size: 80vmax 80vmax;
  --dc-glow-pos: 50% 118%;
  --dc-glow-anim: dc-breathe 26s ease-in-out infinite;`,

  rings: `
  --dc-layers: repeating-radial-gradient(circle at 50% 50%,
    transparent 0 78px,
    var(--decor-line) 78px 79px,
    transparent 79px 158px);
  --dc-size: 100% 100%;
  --dc-repeat: no-repeat;
  --dc-mask: radial-gradient(circle at 50% 46%, #000 12%, transparent 74%);
  --dc-inset: -45%;
  --dc-anim: dc-zoom 52s ease-in-out infinite;
  --dc-glow:
    radial-gradient(closest-side, var(--decor-glow-1), transparent),
    radial-gradient(closest-side, var(--decor-glow-2), transparent);
  --dc-glow-size: 62vmax 62vmax, 48vmax 48vmax;
  --dc-glow-pos: 8% 4%, 96% 92%;
  --dc-glow-anim: dc-breathe 38s ease-in-out infinite;`,

  waves: `
  --dc-layers:
    radial-gradient(130% 62% at 50% 128%, transparent 57.6%, var(--decor-line) 58%, transparent 58.4%),
    radial-gradient(130% 66% at 46% 140%, transparent 57.6%, var(--decor-line) 58%, transparent 58.4%),
    radial-gradient(140% 72% at 54% 154%, transparent 57.6%, var(--decor-line) 58%, transparent 58.4%),
    radial-gradient(150% 80% at 50% 172%, transparent 57.6%, var(--decor-line) 58%, transparent 58.4%);
  --dc-size: 100% 100%;
  --dc-repeat: no-repeat;
  --dc-inset: -14%;
  --dc-anim: dc-sway 40s ease-in-out infinite;
  --dc-glow:
    radial-gradient(closest-side, var(--decor-glow-1), transparent),
    radial-gradient(closest-side, var(--decor-glow-3), transparent);
  --dc-glow-size: 76vmax 60vmax, 54vmax 54vmax;
  --dc-glow-pos: 50% 116%, 88% -16%;
  --dc-glow-anim: dc-breathe 30s ease-in-out infinite;`,

  orbs: `
  --dc-layers:
    radial-gradient(closest-side, var(--decor-glow-1), transparent),
    radial-gradient(closest-side, var(--decor-glow-2), transparent),
    radial-gradient(closest-side, var(--decor-glow-3), transparent);
  --dc-size: 64vmax 64vmax, 50vmax 50vmax, 42vmax 42vmax;
  --dc-pos: 10% 6%, 86% 28%, 60% 98%;
  --dc-repeat: no-repeat;
  --dc-inset: -22%;
  --dc-anim: dc-float 56s ease-in-out infinite;`,

  mesh: `
  --dc-layers:
    radial-gradient(closest-side, var(--decor-glow-1), transparent),
    radial-gradient(closest-side, var(--decor-glow-2), transparent),
    radial-gradient(closest-side, var(--decor-glow-3), transparent),
    radial-gradient(var(--decor-dot) 1px, transparent 1.4px);
  --dc-size: 58vmax 58vmax, 54vmax 54vmax, 46vmax 46vmax, 26px 26px;
  --dc-pos: -8% -14%, 98% 16%, 44% 106%, 0 0;
  --dc-repeat: no-repeat, no-repeat, no-repeat, repeat;
  --dc-inset: -20%;
  --dc-anim: dc-float 62s ease-in-out infinite;`,

  aurora: `
  --dc-layers:
    radial-gradient(ellipse 72% 34% at 20% 20%, var(--decor-glow-1), transparent 68%),
    radial-gradient(ellipse 62% 30% at 78% 34%, var(--decor-glow-2), transparent 68%),
    radial-gradient(ellipse 94% 28% at 50% 84%, var(--decor-glow-3), transparent 70%);
  --dc-size: 100% 100%;
  --dc-repeat: no-repeat;
  --dc-inset: -18%;
  --dc-anim: dc-aurora 58s ease-in-out infinite;`,
};

export type DecorName = keyof typeof DECORS | string;

/**
 * The backdrop: one fixed layer behind every slide on screen, and the same
 * geometry re-attached to each page when the deck is printed, since a fixed
 * element does not repeat across a paged medium.
 */
export const DECOR_CSS = `/* ── Backdrop geometry ────────────────────────────────────────────────── */
${Object.entries(DECORS)
  .map(([name, vars]) => `:root[data-decor="${name}"] {${vars}\n}`)
  .join("\n\n")}

#backdrop {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  -webkit-mask-image: var(--dc-mask, none);
          mask-image: var(--dc-mask, none);
}

#backdrop::before,
#backdrop::after {
  content: '';
  position: absolute;
  inset: var(--dc-inset, -12%);
  background-repeat: var(--dc-repeat, repeat);
  will-change: transform;
}

#backdrop::before {
  background-image: var(--dc-layers, none);
  background-size: var(--dc-size, auto);
  background-position: var(--dc-pos, 0 0);
  animation: var(--dc-anim, none);
}

#backdrop::after {
  background-image: var(--dc-glow, none);
  background-size: var(--dc-glow-size, auto);
  background-position: var(--dc-glow-pos, 0 0);
  background-repeat: no-repeat;
  animation: var(--dc-glow-anim, none);
}

/* One tile of travel per cycle, so the pattern lands back on itself. */
@keyframes dc-pan {
  to { transform: translate3d(var(--dc-dx, 0px), var(--dc-dy, 0px), 0); }
}

@keyframes dc-float {
  0%, 100% { transform: translate3d(-1.5%, -1%, 0) scale(1); }
  34%      { transform: translate3d(2%, 1.5%, 0)   scale(1.06); }
  67%      { transform: translate3d(-1%, 2%, 0)    scale(0.97); }
}

@keyframes dc-sway {
  0%, 100% { transform: translate3d(-2.5%, 0, 0) scale(1); }
  50%      { transform: translate3d(2.5%, 1.5%, 0) scale(1.04); }
}

@keyframes dc-zoom {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.1); }
}

@keyframes dc-aurora {
  0%, 100% { transform: translate3d(0, 0, 0) skewY(0deg); }
  50%      { transform: translate3d(3%, -2%, 0) skewY(-1.6deg); }
}

@keyframes dc-breathe {
  0%, 100% { opacity: 0.75; transform: scale(1); }
  50%      { opacity: 1;    transform: scale(1.07); }
}

/* A drifting backdrop is exactly the kind of motion this setting turns off. */
@media (prefers-reduced-motion: reduce) {
  #backdrop::before,
  #backdrop::after { animation: none !important; }
}

@media print {
  /* Fixed elements do not repeat across pages, so the backdrop is rebuilt on
     each slide instead — same custom properties, no second definition. */
  #backdrop { display: none !important; }

  .slide::before,
  .slide::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 0;
    animation: none !important;
    -webkit-mask-image: var(--dc-mask, none);
            mask-image: var(--dc-mask, none);
  }

  .slide::before {
    background-image: var(--dc-layers, none);
    background-size: var(--dc-size, auto);
    background-position: var(--dc-pos, 0 0);
    background-repeat: var(--dc-repeat, repeat);
  }

  .slide::after {
    background-image: var(--dc-glow, none);
    background-size: var(--dc-glow-size, auto);
    background-position: var(--dc-glow-pos, 0 0);
    background-repeat: no-repeat;
  }
}`;

// ── Font overrides ────────────────────────────────────────────────────────

/**
 * A theme names a display face and a body face. Either can be replaced without
 * leaving the theme, and the two are chosen separately, so a serif heading over
 * a sans body — or the reverse — is a setting rather than a fork.
 *
 * The monospace face stays the theme's: code wants the face the palette's
 * highlighting was picked against.
 *
 * Overrides are attributes rather than a second palette. `[data-head]` and
 * `[data-body]` carry the same specificity as `[data-theme]`, and the blocks
 * below are emitted after it, so source order decides and the override wins.
 * No attribute means the theme's own face, which is why there is no "default"
 * entry to keep in step with anything.
 */
export const FONT_IDS: string[] = Object.keys(FONTS);

/** A font key from untrusted input, or `null` for "leave it to the theme". */
export function findFont(input: string | undefined | null): string | null {
  if (!input) return null;
  const key = String(input).trim();
  if (FONTS[key]) return key;
  // Also accept the human name: "space grotesk", "IBM Plex Mono".
  const wanted = key.toLowerCase().replace(/[\s_-]+/g, "");
  for (const id of FONT_IDS) {
    if (id.toLowerCase() === wanted) return id;
    if (fontName(id).toLowerCase().replace(/\s+/g, "") === wanted) return id;
  }
  return null;
}

export interface FontSummary {
  id: string;
  name: string;
  kind: FontFace["kind"];
  stack: string;
}

/** What the editor's font menu lists, in catalog order. */
export function fontSummaries(): FontSummary[] {
  return FONT_IDS.map((id) => ({
    id,
    name: fontName(id),
    kind: FONTS[id].kind,
    stack: FONTS[id].stack,
  }));
}

/** One line per face, for `harbour --list-fonts`. */
export function fontListing(): string[] {
  const pad = Math.max(...FONT_IDS.map((id) => id.length));
  return FONT_IDS.map(
    (id) => `${id.padEnd(pad)}  ${FONTS[id].kind.padEnd(5)}  ${fontName(id)}`
  );
}

/**
 * Every face, in both slots. Emitted once and shared by the deck, the editor,
 * and the preview, so a runtime change is an attribute swap rather than a
 * restyle.
 */
export function fontOverrideCss(): string {
  const blocks: string[] = [];
  for (const id of FONT_IDS) {
    blocks.push(`:root[data-head="${id}"] { --font-display: ${FONTS[id].stack}; }`);
  }
  for (const id of FONT_IDS) {
    blocks.push(`:root[data-body="${id}"] { --font-body: ${FONTS[id].stack}; }`);
  }
  return `/* ── Font overrides ───────────────────────────────────────────────────── */\n${blocks.join("\n")}`;
}
