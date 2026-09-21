export const DEFAULT_BRANDING = {
  primaryColor: "#142d55",
  secondaryColor: "#dcdde2",
  accentColor: "#bb992f",
} as const;

export type BrandColors = { [K in keyof typeof DEFAULT_BRANDING]: string };

export function normalizeColor(value: unknown): string | null {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value.trim())
    ? value.trim().toLowerCase()
    : null;
}

export function resolveBranding(
  values?: Partial<Record<keyof BrandColors, string | null>> | null,
): BrandColors {
  return {
    primaryColor:
      normalizeColor(values?.primaryColor) ?? DEFAULT_BRANDING.primaryColor,
    secondaryColor:
      normalizeColor(values?.secondaryColor) ?? DEFAULT_BRANDING.secondaryColor,
    accentColor:
      normalizeColor(values?.accentColor) ?? DEFAULT_BRANDING.accentColor,
  };
}

// Choose the higher-contrast text color, including for very light school colors.
export function readableForeground(background: string): "#ffffff" | "#000000" {
  const hex = (
    normalizeColor(background) ?? DEFAULT_BRANDING.primaryColor
  ).slice(1);
  const channels = [0, 2, 4].map((index) => {
    const channel = parseInt(hex.slice(index, index + 2), 16) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance =
    channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05)
    ? "#000000"
    : "#ffffff";
}

export function schoolInitials(name: string) {
  return name.trim().slice(0, 2).toLocaleUpperCase("tr");
}
