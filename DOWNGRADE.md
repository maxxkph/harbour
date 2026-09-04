# Feature Downgrade Plan

Working doc to track which features we're keeping, trimming, or removing.
Status values: `keep` / `trim` / `remove` / `tbd` / `done`

| Feature | Status | Notes |
|---|---|---|
| Markdown decks (slide-by-slide) | keep | |
| Self-contained HTML docs (continuous scroll) | keep | |
| Live editor + autosave + deck library | keep | |
| Themes | done | Cut from 14 to 2: `maxx-mellow` (dark, default) + `maxx-mellow-dawn` (light). Palette from nikhar.dev/maxx-mellow. |
| Fonts | done | Cut to 3: `geist` (sans, default head+body), `newsreader` (serif alt), `plexMono` (mono, code). |
| Templates | done | Cut from 4 to 1: `minimal` (now also the default). |
| Transitions | done | Cut from 5 to 3: `slide`, `fade`, `none`. Removed `zoom`, `lift`. |
| Editor + deck UI borders/shadows | done | Full flat redesign across editor.ts, generate.ts, preview.ts, highlights.ts. Shadows/hairline neutralized via theme vars; hover/selected states moved to background-tint (`color-mix`) instead of border-color swaps. |
| Blinking presentation cursor | done | Removed entirely (CSS, markup, fade-out list) from generate.ts. |
| Presentation pets | done | Removed entirely (CSS `.pet`, `spawnPets()` JS, fade-out list) from generate.ts. |
| Pet companion (codex-pets style) | not started | Future nice-to-have, low priority. |
| Laser pointer / pen visual polish | not started | Low priority, deferred. |
| KaTeX equations | keep | |
| Mermaid diagrams | keep | |
| Incremental reveals | keep | |
| Deck linting (`deckrun lint`) | keep | |
| Presenter tools (laser pointer, pen, blank canvas, blackout) | keep | |
| Highlights + comments | keep | |
| Presenter notes panel | keep | |
| Export: Markdown | keep | |
| Export: HTML | keep | |
| Export: PDF (headless render) | keep | |
| Export: standalone presenter HTML | keep | |

## Notes / decisions

1. Too many options to choose theme, font, style, etc. — keep it simple.
   Template: only `minimal`. Transitions: `slide`, `fade`, `none`.
   Fonts: `newsreader`, mono `IBM Plex Mono`, `Geist`. Theme: only
   `maxx-mellow` and `maxx-mellow-dawn` (https://nikhar.dev/maxx-mellow).
   **Done** — see `src/themes.ts` and `src/presentation-options.ts`.

2. UI should follow maxx-mellow only, with no borders or shadows anywhere
   ("full flat redesign" — border-based hover/selected states replaced with
   background-tint or color changes instead). **Done** across editor.ts,
   generate.ts, preview.ts, highlights.ts. Deck-content typographic borders
   (blockquote bar, table header rule, nested bullets, kbd keys) were also
   converted to background-tint treatments. Kept as-is (functional, not
   chrome): the `<mark>` highlighter inset effect and the laser pointer glow.

3. Presentation guide:
   - No blinking cursor on the slides. **Done.**
   - No pets for now, but later a single pet (like the codex-pets one —
     https://codex-pets.net/#/pets/raoul). **Pets removed; new pet not
     started, low priority.**
   - Improve laser and pen effects. **Not started, low priority.**

## Follow-ups / not yet done

- README.md was updated for accuracy (theme/font/template/transition counts,
  removed pets/cursor mentions) but hasn't been read end-to-end — it's a
  large file and may have a few more stale spots.
- A single custom pet companion and laser/pen visual polish are still open,
  per note 3 above.
