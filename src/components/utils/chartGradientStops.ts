export type GradientStop = { offset: string; color: string };

export function parseCssColorToRgb(color: string): { r: number; g: number; b: number } | null {
  if (!color || typeof color !== 'string') return null;
  const c = color.trim();
  const hexMatch = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(c);
  if (hexMatch) {
    let h = hexMatch[1];
    if (h.length === 3) {
      h = h
        .split('')
        .map((ch) => ch + ch)
        .join('');
    }
    if (h.length >= 6) {
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      if ([r, g, b].every((n) => !Number.isNaN(n))) return { r, g, b };
    }
  }
  const rgbMatch = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i.exec(c);
  if (rgbMatch) {
    const r = Math.round(Number(rgbMatch[1]));
    const g = Math.round(Number(rgbMatch[2]));
    const b = Math.round(Number(rgbMatch[3]));
    if ([r, g, b].every((n) => Number.isFinite(n) && n >= 0 && n <= 255)) return { r, g, b };
  }
  return null;
}

export function colorToRgba(color: string, alpha: number): string {
  const rgb = parseCssColorToRgb(color);
  if (!rgb) {
    return `rgba(59,130,246,${alpha})`;
  }
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
}

export function lightenColor(color: string, ratio: number): string {
  const rgb = parseCssColorToRgb(color);
  if (!rgb) return color;
  const r = Math.round(rgb.r + (255 - rgb.r) * ratio);
  const g = Math.round(rgb.g + (255 - rgb.g) * ratio);
  const b = Math.round(rgb.b + (255 - rgb.b) * ratio);
  return `rgb(${r},${g},${b})`;
}

export function darkenColor(color: string, ratio: number): string {
  const rgb = parseCssColorToRgb(color);
  if (!rgb) return color;
  const r = Math.round(rgb.r * (1 - ratio));
  const g = Math.round(rgb.g * (1 - ratio));
  const b = Math.round(rgb.b * (1 - ratio));
  return `rgb(${r},${g},${b})`;
}

export function getTopToBottomGradientStops(color: string): GradientStop[] {
  const topHighlight = lightenColor(color, 0.52);
  const upperBody = lightenColor(color, 0.22);
  const lowerBody = darkenColor(color, 0.08);
  const bottomFade = colorToRgba(darkenColor(color, 0.22), 0.26);
  return [
    { offset: '0%', color: topHighlight },
    { offset: '16%', color: upperBody },
    { offset: '68%', color: lowerBody },
    { offset: '100%', color: bottomFade }
  ];
}

export function getLineAreaGradientStops(color: string): GradientStop[] {
  return [
    { offset: '0%', color: colorToRgba(color, 0.28) },
    { offset: '35%', color: colorToRgba(color, 0.12) },
    { offset: '100%', color: colorToRgba(color, 0) }
  ];
}
