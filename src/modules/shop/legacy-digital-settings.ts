export const LEGACY_DIGITAL_SHOP_SETTINGS_WARNING =
  "Legacy digital shop settings were removed from Saleor 3.23 and are ignored by Configurator 1.x.";

export const LEGACY_DIGITAL_SHOP_SETTINGS = [
  "automaticFulfillmentDigitalProducts",
  "defaultDigitalMaxDownloads",
  "defaultDigitalUrlValidDays",
] as const;

type LegacyDigitalShopSetting = (typeof LEGACY_DIGITAL_SHOP_SETTINGS)[number];

export function hasLegacyDigitalShopSettings(input: Record<string, unknown>): boolean {
  return LEGACY_DIGITAL_SHOP_SETTINGS.some((field) =>
    Object.prototype.hasOwnProperty.call(input, field)
  );
}

export function stripLegacyDigitalShopSettings<T extends Record<string, unknown>>(
  input: T
): Omit<T, LegacyDigitalShopSetting> {
  const sanitized = { ...input };

  for (const field of LEGACY_DIGITAL_SHOP_SETTINGS) {
    delete sanitized[field];
  }

  return sanitized;
}
