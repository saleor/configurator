const SALEOR_MINOR_PATTERN = /^(\d+)\.(\d+)(?:[.\-+]|$)/;

export function getSaleorMinor(version: string | null | undefined): string | undefined {
  if (!version) return undefined;

  const match = version.match(SALEOR_MINOR_PATTERN);
  if (!match) return undefined;

  return `${match[1]}.${match[2]}`;
}

export function isSaleorMinorMismatch(
  actualVersion: string | null | undefined,
  supportedMinor: string
): boolean {
  const actualMinor = getSaleorMinor(actualVersion);

  return actualMinor !== undefined && actualMinor !== supportedMinor;
}
