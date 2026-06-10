export function isPageBright(): boolean {
  const bg =
    getBackgroundColor(document.body) ||
    getBackgroundColor(document.documentElement);

  if (!bg) return true;

  const [r, g, b] = parseRgb(bg);
  if (r === -1) return true;

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.85;
}

function getBackgroundColor(el: Element | null): string | null {
  if (!el) return null;
  const style = getComputedStyle(el);
  const bg = style.backgroundColor;
  if (!bg || bg === "transparent" || bg === "rgba(0, 0, 0, 0)") return null;
  return bg;
}

function parseRgb(color: string): [number, number, number] {
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return [-1, -1, -1];
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}
