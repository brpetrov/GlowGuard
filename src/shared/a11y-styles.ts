import type { AccessibilitySettings } from "../types/settings";

const READABLE_FONT_CSS = "";

const CONTRAST_FIX_CSS = "";

const THIN_FONT_FIX_CSS = "";

const LINK_VISIBILITY_CSS = "";

export function buildAccessibilityCss(a11y: AccessibilitySettings): string {
  const rules: string[] = [];

  if (a11y.readableFont) rules.push(READABLE_FONT_CSS);
  if (a11y.contrastFix) rules.push(CONTRAST_FIX_CSS);
  if (a11y.thinFontFix) rules.push(THIN_FONT_FIX_CSS);
  if (a11y.linkVisibility) rules.push(LINK_VISIBILITY_CSS);

  return rules.filter(Boolean).join("\n");
}
