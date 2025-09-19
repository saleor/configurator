export const PRODUCT_MEDIA_SOURCE_METADATA_KEY = "configurator.externalUrl";

export interface ProductMediaMetadataEntry {
  key?: string | null;
  value?: string | null;
}

export function extractSourceUrlFromMetadata(
  metadata: Array<ProductMediaMetadataEntry | null | undefined> | null | undefined
): string | undefined {
  if (!metadata) {
    return undefined;
  }

  for (const entry of metadata) {
    if (!entry) continue;
    if (entry.key !== PRODUCT_MEDIA_SOURCE_METADATA_KEY) continue;
    const value = entry.value?.trim();
    if (value) {
      return value;
    }
  }

  return undefined;
}
