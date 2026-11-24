import type { ProductVariantInput, SaleorConfig } from "../../../modules/config/schema/schema";
import type { ChangeSet } from "./change-set";
import { descriptionsEqual, normalizeDescription } from "./editorjs-description";
import { entityComparator } from "./entity-comparator";
import { isUnmanagedField, withoutUnmanagedFields } from "./field-comparison";

type ProductEntity = NonNullable<SaleorConfig["products"]>[number];

function normalizeChannelListing(listing: NonNullable<ProductEntity["channelListings"]>[number]) {
  // Keep a fixed key order and omit undefined values
  const normalized: Record<string, unknown> = { channel: listing.channel };

  const normalizeDateTime = (value: unknown): string | undefined => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === "string" || typeof value === "number") {
      const d = new Date(value as string | number);
      if (!Number.isNaN(d.getTime())) return d.toISOString();
      // Fallback to trimmed string to avoid false diffs due to formatting
      return String(value).trim();
    }
    return undefined;
  };

  if (listing.isPublished !== undefined) normalized.isPublished = listing.isPublished;
  if (listing.publishedAt !== undefined)
    normalized.publishedAt = normalizeDateTime(listing.publishedAt);
  if (listing.visibleInListings !== undefined)
    normalized.visibleInListings = listing.visibleInListings;
  // availableForPurchase may exist in schema though not mapped currently; include if present
  if (typeof (listing as { availableForPurchase?: unknown }).availableForPurchase !== "undefined") {
    const afp = (listing as { availableForPurchase?: string | number | null | undefined })
      .availableForPurchase;
    normalized.availableForPurchase = normalizeDateTime(afp);
  }
  return normalized;
}

function normalizeVariantChannelListing(
  listing: NonNullable<ProductVariantInput["channelListings"]>[number]
) {
  const normalized: Record<string, unknown> = { channel: listing.channel };
  if (listing.price !== undefined) normalized.price = listing.price;
  if (listing.costPrice !== undefined) normalized.costPrice = listing.costPrice;
  return normalized;
}

function equalsAttributeValue(a: unknown, b: unknown): boolean {
  const normalize = (v: unknown): unknown => {
    if (Array.isArray(v)) {
      return [...v].sort((x, y) => JSON.stringify(x).localeCompare(JSON.stringify(y)));
    }
    return v;
  };
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
}

function normalizeMediaArray(
  media: ProductEntity["media"] | undefined
): ReadonlyArray<{ externalUrl: string; alt?: string }> {
  if (!media) return [];
  return media
    .map((item) => ({
      externalUrl: item.externalUrl.trim(),
      alt: item.alt?.trim() || undefined,
    }))
    .sort((a, b) => a.externalUrl.localeCompare(b.externalUrl));
}

function equalsMedia(
  local: ReadonlyArray<{ externalUrl: string; alt?: string }>,
  remote: ReadonlyArray<{ externalUrl: string; alt?: string }>
): boolean {
  if (local.length !== remote.length) return false;
  for (let i = 0; i < local.length; i++) {
    const l = local[i];
    const r = remote[i];
    if (l.externalUrl !== r.externalUrl) return false;
    if ((l.alt || "") !== (r.alt || "")) return false;
  }
  return true;
}

/** Variants keyed by SKU; of duplicate SKUs, the one with more channel listings wins. */
function variantsBySku(variants: readonly ProductVariantInput[]): Map<string, ProductVariantInput> {
  const pickRicher = (a: ProductVariantInput, b: ProductVariantInput) => {
    const aLen = Array.isArray(a.channelListings) ? a.channelListings.length : 0;
    const bLen = Array.isArray(b.channelListings) ? b.channelListings.length : 0;
    return bLen > aLen ? b : a;
  };
  const bySku = new Map<string, ProductVariantInput>();
  for (const variant of variants) {
    const existing = bySku.get(variant.sku);
    bySku.set(variant.sku, existing ? pickRicher(existing, variant) : variant);
  }
  return bySku;
}

function compareDescription(changes: ChangeSet, desired: ProductEntity, current: ProductEntity) {
  if (descriptionsEqual(desired.description, current.description)) return;
  const currentDescription = normalizeDescription(current.description);
  const desiredDescription = normalizeDescription(desired.description);
  const isTextChange = (currentDescription?.text ?? "") !== (desiredDescription?.text ?? "");
  changes.record(
    ["description"],
    isTextChange
      ? {
          current: currentDescription?.text ?? "",
          desired: desiredDescription?.text ?? "",
          description: "Description text changed",
        }
      : {
          current: currentDescription?.blocks,
          desired: desiredDescription?.blocks,
          description: "Description block structure changed",
        }
  );
}

function compareChannelListings(
  changes: ChangeSet,
  desired: ProductEntity,
  current: ProductEntity
): void {
  const desiredByChannel = new Map((desired.channelListings || []).map((c) => [c.channel, c]));
  const currentByChannel = new Map((current.channelListings || []).map((c) => [c.channel, c]));
  const channels = new Set([...desiredByChannel.keys(), ...currentByChannel.keys()]);

  for (const channel of channels) {
    const desiredListing = desiredByChannel.get(channel);
    const currentListing = currentByChannel.get(channel);
    const field = `channels.${channel}`;

    if (!desiredListing && currentListing) {
      changes.record(["channels", channel], {
        field,
        kind: "removed",
        current: currentListing,
        desired: undefined,
        description: `Channel "${channel}" is only in Saleor (deploy does not remove it)`,
      });
    } else if (desiredListing && !currentListing) {
      changes.record(["channels", channel], {
        field,
        kind: "added",
        current: undefined,
        desired: desiredListing,
        description: `Channel "${channel}" will be added`,
      });
    } else if (desiredListing && currentListing) {
      // Order-agnostic, undefined values dropped; fields the config omits are unmanaged.
      const desiredNormalized = normalizeChannelListing(desiredListing);
      const currentNormalized = withoutUnmanagedFields(
        normalizeChannelListing(currentListing),
        desiredNormalized,
        changes.options
      );
      if (JSON.stringify(desiredNormalized) !== JSON.stringify(currentNormalized)) {
        changes.record(["channels", channel], {
          field,
          current: currentNormalized,
          desired: desiredNormalized,
          description: `Channel "${channel}" settings changed`,
        });
      }
    }
  }
}

function compareVariants(changes: ChangeSet, desired: ProductEntity, current: ProductEntity) {
  const desiredBySku = variantsBySku(desired.variants || []);
  const currentBySku = variantsBySku(current.variants || []);
  const skus = new Set([...desiredBySku.keys(), ...currentBySku.keys()]);

  for (const sku of skus) {
    const desiredVariant = desiredBySku.get(sku);
    const currentVariant = currentBySku.get(sku);
    const field = `variants.${sku}`;

    if (!desiredVariant && currentVariant) {
      changes.record(["variants", sku], {
        field,
        kind: "removed",
        current: currentVariant,
        desired: undefined,
        description: `Variant "${sku}" is only in Saleor (deploy does not remove it)`,
      });
    } else if (desiredVariant && !currentVariant) {
      changes.record(["variants", sku], {
        field,
        kind: "added",
        current: undefined,
        desired: desiredVariant,
        description: `Variant "${sku}" will be added`,
      });
    } else if (desiredVariant && currentVariant) {
      compareVariant(changes.at("variants", sku), desiredVariant, currentVariant, sku);
    }
  }
}

/** Compares one variant; the name is skipped to avoid cosmetic diffs. */
function compareVariant(
  changes: ChangeSet,
  desired: ProductVariantInput,
  current: ProductVariantInput,
  sku: string
): void {
  if (!isUnmanagedField(desired.weight, changes.options) && desired.weight !== current.weight) {
    changes.record(["weight"], {
      field: `variants.${sku}.weight`,
      current: current.weight,
      desired: desired.weight,
      description: `Variant "${sku}" weight changed`,
    });
  }

  if (JSON.stringify(desired.attributes) !== JSON.stringify(current.attributes)) {
    changes.record(["attributes"], {
      field: `variants.${sku}.attributes`,
      current: current.attributes,
      desired: desired.attributes,
      description: `Variant "${sku}" attributes changed`,
    });
  }

  const listingsByChannel = (listings: ProductVariantInput["channelListings"]) =>
    new Map(
      (Array.isArray(listings) ? listings : []).map(
        (listing) => [listing.channel, normalizeVariantChannelListing(listing)] as const
      )
    );
  const desiredListings = listingsByChannel(desired.channelListings);
  const currentListings = listingsByChannel(current.channelListings);
  const channels = new Set([...desiredListings.keys(), ...currentListings.keys()]);
  const diffs: string[] = [];

  for (const channel of channels) {
    const desiredListing = desiredListings.get(channel);
    const currentListing = currentListings.get(channel);
    if (!desiredListing && currentListing) {
      diffs.push(`+${channel}`);
    } else if (desiredListing && !currentListing) {
      diffs.push(`-${channel}`);
    } else if (
      desiredListing &&
      currentListing &&
      JSON.stringify(desiredListing) !==
        JSON.stringify(withoutUnmanagedFields(currentListing, desiredListing, changes.options))
    ) {
      diffs.push(`~${channel}`);
    }
  }

  if (diffs.length > 0) {
    changes.record(["channelListings"], {
      field: `variants.${sku}.channelListings`,
      current: current.channelListings,
      desired: desired.channelListings,
      description: `Variant "${sku}" channel listings changed (${diffs.join(", ")})`,
    });
  }
}

/** Compares products by slug, including channel listings, variants and media. */
export const productComparator = entityComparator<ProductEntity>({
  entityType: "Products",

  identify(product) {
    if (!product.slug) {
      throw new Error("Product must have a valid slug");
    }
    return product.slug;
  },

  compareFields(changes, desired, current) {
    changes.value("name", desired.name, current.name);
    compareDescription(changes, desired, current);
    changes.value("productType", desired.productType, current.productType);
    changes.value("category", desired.category, current.category);
    changes.value("taxClass", desired.taxClass, current.taxClass);

    // Attribute values compare order-insensitively.
    const desiredAttributes = desired.attributes || {};
    const currentAttributes = current.attributes || {};
    const keys = new Set([...Object.keys(desiredAttributes), ...Object.keys(currentAttributes)]);
    for (const key of keys) {
      const desiredValue = desiredAttributes[key];
      const currentValue = currentAttributes[key];
      if (!equalsAttributeValue(desiredValue, currentValue)) {
        changes.record(["attributes", key], {
          current: currentValue,
          desired: desiredValue,
          description: `Attribute "${key}": ${JSON.stringify(currentValue)} → ${JSON.stringify(desiredValue)}`,
        });
      }
    }

    compareChannelListings(changes, desired, current);
    compareVariants(changes, desired, current);

    if (!(changes.options.skipMedia ?? false)) {
      const desiredMedia = normalizeMediaArray(desired.media);
      const currentMedia = normalizeMediaArray(current.media);
      if (!equalsMedia(desiredMedia, currentMedia)) {
        changes.record(["media"], {
          current: currentMedia,
          desired: desiredMedia,
          description: "Product media entries changed",
        });
      }
    }
  },
});
