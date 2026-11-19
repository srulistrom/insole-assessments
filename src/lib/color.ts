function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

function luminance(hex: string) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Readable text colour (white or near-black) on top of the given colour. */
export function readableOn(hex: string) {
  const L = luminance(hex);
  const contrastWhite = 1.05 / (L + 0.05);
  const contrastDark = (L + 0.05) / 0.05;
  return contrastWhite >= contrastDark * 0.9 ? "#ffffff" : "#0B1324";
}

export function rgb(hex: string) {
  return hexToRgb(hex);
}

/** CSS for the dynamic brand theme, injected server-side so there is no colour flash. */
export function themeCss(primary: string, accent: string) {
  return `:root{--primary:${primary};--primary-foreground:${readableOn(primary)};--gold:${accent};--gold-foreground:${readableOn(accent)};}`;
}
