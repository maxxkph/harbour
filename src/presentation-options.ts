export type TemplateName = "minimal";
export type TransitionName = "slide" | "fade" | "none";

export const DEFAULT_TEMPLATE: TemplateName = "minimal";
export const DEFAULT_TRANSITION: TransitionName = "slide";

export const TEMPLATE_IDS: readonly TemplateName[] = ["minimal"] as const;

export const TRANSITION_IDS: readonly TransitionName[] = [
  "slide",
  "fade",
  "none",
] as const;

export interface OptionSummary<T extends string> {
  id: T;
  label: string;
  blurb: string;
}

export const TEMPLATE_SPECS: Record<TemplateName, { label: string; blurb: string }> = {
  minimal: {
    label: "Minimal",
    blurb: "Quiet surfaces, wider margins, fewer decorative treatments",
  },
};

export const TRANSITION_SPECS: Record<TransitionName, { label: string; blurb: string }> = {
  slide: {
    label: "Slide",
    blurb: "Horizontal sliding transition between slides",
  },
  fade: {
    label: "Fade",
    blurb: "Cross-fade between slides",
  },
  none: {
    label: "None",
    blurb: "Instant cut between slides",
  },
};

export function findTemplate(input: string | undefined | null): TemplateName | null {
  if (!input) return null;
  const key = String(input).trim().toLowerCase();
  for (const id of TEMPLATE_IDS) {
    if (id === key) return id;
    if (TEMPLATE_SPECS[id].label.toLowerCase() === key) return id;
  }
  return null;
}

export function resolveTemplateName(input: string | undefined | null): TemplateName {
  return findTemplate(input) ?? DEFAULT_TEMPLATE;
}

export function templateSummaries(): Array<OptionSummary<TemplateName>> {
  return TEMPLATE_IDS.map((id) => ({
    id,
    label: TEMPLATE_SPECS[id].label,
    blurb: TEMPLATE_SPECS[id].blurb,
  }));
}

export function templateListing(): string[] {
  const pad = Math.max(...TEMPLATE_IDS.map((id) => id.length));
  return TEMPLATE_IDS.map((id) => {
    const s = TEMPLATE_SPECS[id];
    return `${id.padEnd(pad)}  ${s.label.padEnd(10)}  ${s.blurb}`;
  });
}

export function findTransition(input: string | undefined | null): TransitionName | null {
  if (!input) return null;
  const key = String(input).trim().toLowerCase();
  for (const id of TRANSITION_IDS) {
    if (id === key) return id;
    if (TRANSITION_SPECS[id].label.toLowerCase() === key) return id;
  }
  return null;
}

export function resolveTransitionName(input: string | undefined | null): TransitionName {
  return findTransition(input) ?? DEFAULT_TRANSITION;
}

export function transitionSummaries(): Array<OptionSummary<TransitionName>> {
  return TRANSITION_IDS.map((id) => ({
    id,
    label: TRANSITION_SPECS[id].label,
    blurb: TRANSITION_SPECS[id].blurb,
  }));
}

export function transitionListing(): string[] {
  const pad = Math.max(...TRANSITION_IDS.map((id) => id.length));
  return TRANSITION_IDS.map((id) => {
    const s = TRANSITION_SPECS[id];
    return `${id.padEnd(pad)}  ${s.label.padEnd(8)}  ${s.blurb}`;
  });
}

export const TEMPLATE_CSS = `/* ── Templates ──────────────────────────────────────────────────────────── */

/* Minimal */
:root[data-template="minimal"] {
  --slide-pad-x: 10vw;
  --slide-pad-y: 8vh;
}
:root[data-template="minimal"] #backdrop {
  opacity: 0.15;
}
:root[data-template="minimal"] .slide__content h1 {
  letter-spacing: -0.02em;
}
`;

export const TRANSITION_CSS = `/* ── Transitions ────────────────────────────────────────────────────────── */

/* Fade */
:root[data-transition="fade"] .slide {
  transition: opacity 0.3s ease;
  transform: none !important;
}
:root[data-transition="fade"] .slide.exit-left,
:root[data-transition="fade"] .slide.exit-right,
:root[data-transition="fade"] .slide.enter-from-left,
:root[data-transition="fade"] .slide.enter-from-right {
  transform: none !important;
  opacity: 0;
}
:root[data-transition="fade"] .slide.is-active {
  opacity: 1;
  transform: none !important;
}

/* None */
:root[data-transition="none"] .slide,
:root[data-transition="none"] .slide.is-active,
:root[data-transition="none"] .slide.exit-left,
:root[data-transition="none"] .slide.exit-right,
:root[data-transition="none"] .slide.enter-from-left,
:root[data-transition="none"] .slide.enter-from-right {
  transition: none !important;
  transform: none !important;
}

@media (prefers-reduced-motion: reduce) {
  :root[data-transition] .slide {
    transition: opacity 0.2s linear !important;
    transform: none !important;
  }
}

@media print {
  :root[data-transition] .slide {
    transition: none !important;
    transform: none !important;
    opacity: 1 !important;
  }
}
`;
