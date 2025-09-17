import type { ProductVariantInput, SaleorConfig } from "../../../modules/config/schema/schema";
import type { DiffChange } from "../types";
import { BaseEntityComparator } from "./base-comparator";

/**
 * Product entity type for type safety
 */
type ProductEntity = NonNullable<SaleorConfig["products"]>[number];

/**
 * Comparator for product entities
 */
export class ProductComparator extends BaseEntityComparator<
  readonly ProductEntity[],
  readonly ProductEntity[],
  ProductEntity
> {
  protected readonly entityType = "Products";

  /**
   * Compares local and remote product arrays
   */
  compare(
    local: readonly ProductEntity[],
    remote: readonly ProductEntity[]
  ): readonly import("../types").DiffResult[] {
    // Validate unique identifiers and block on duplicates
    this.validateUniqueIdentifiers(local);
    this.validateUniqueIdentifiers(remote);

    const results: import("../types").DiffResult[] = [];
    const remoteByName = this.createEntityMap(remote);
    const localByName = this.createEntityMap(local);

    // Check for creates and updates
    for (const localProduct of local) {
      const remoteProduct = remoteByName.get(this.getEntityName(localProduct));

      if (!remoteProduct) {
        results.push(this.createCreateResult(localProduct));
      } else {
        // Check for updates
        const changes = this.compareEntityFields(localProduct, remoteProduct);
        if (changes.length > 0) {
          results.push(this.createUpdateResult(localProduct, remoteProduct, changes));
        }
      }
    }

    // Check for deletes
    for (const remoteProduct of remote) {
      if (!localByName.has(this.getEntityName(remoteProduct))) {
        results.push(this.createDeleteResult(remoteProduct));
      }
    }

    return results;
  }

  /**
   * Gets the identifier of a product entity (uses slug for identification)
   */
  protected getEntityName(entity: ProductEntity): string {
    if (!entity.slug) {
      throw new Error("Product must have a valid slug");
    }
    return entity.slug;
  }

  /**
   * Compares fields between local and remote product entities
   */
  protected compareEntityFields(local: ProductEntity, remote: ProductEntity): DiffChange[] {
    const changes: DiffChange[] = [];

    // Compare basic fields
    if (local.name !== remote.name) {
      changes.push(this.createFieldChange("name", remote.name, local.name));
    }

    // Compare description by text content only (EditorJS JSON → plain text)
    const extractText = (value: unknown): string | undefined => {
      if (!value || typeof value !== "string") return undefined;
      const raw = value.trim();
      const decodeEntities = (s: string) =>
        s
          .replace(/&nbsp;/gi, " ")
          .replace(/&amp;/gi, "&")
          .replace(/&lt;/gi, "<")
          .replace(/&gt;/gi, ">")
          .replace(/&quot;/gi, '"')
          .replace(/&#39;/gi, "'");
      const stripTags = (s: string) => s.replace(/<[^>]*>/g, "");
      try {
        const json = JSON.parse(raw);
        if (json && Array.isArray(json.blocks)) {
          type EditorJsBlock = { data?: { text?: string } } | null | undefined;
          const parts = json.blocks
            .map((b: EditorJsBlock) => (b?.data?.text && typeof b.data.text === "string" ? b.data.text : ""))
            .filter((t: string) => t.length > 0);
          const joined = parts.join(" ");
          return stripTags(decodeEntities(joined)).replace(/\s+/g, " ").trim();
        }
        // If not EditorJS-like, fall back to raw
        return stripTags(decodeEntities(raw)).replace(/\s+/g, " ").trim();
      } catch {
        return stripTags(decodeEntities(raw)).replace(/\s+/g, " ").trim();
      }
    };

    const localDesc = extractText(local.description);
    const remoteDesc = extractText(remote.description);
    if (localDesc !== remoteDesc) {
      changes.push(
        this.createFieldChange("description", remoteDesc ?? "", localDesc ?? "", "Description text changed")
      );
    }

    // Compare product type
    if (local.productType !== remote.productType) {
      changes.push(this.createFieldChange("productType", remote.productType, local.productType));
    }

    // Compare category
    if (local.category !== remote.category) {
      changes.push(this.createFieldChange("category", remote.category, local.category));
    }

    // Compare tax class
    if (local.taxClass !== remote.taxClass) {
      changes.push(this.createFieldChange("taxClass", remote.taxClass, local.taxClass));
    }

    // Compare attributes
    const localAttributes = local.attributes || {};
    const remoteAttributes = remote.attributes || {};

    // Check for attribute changes with normalized comparison (order-insensitive arrays)
    const allAttributeKeys = new Set([
      ...Object.keys(localAttributes),
      ...Object.keys(remoteAttributes),
    ]);

    for (const key of allAttributeKeys) {
      const localValue = localAttributes[key];
      const remoteValue = remoteAttributes[key];

      if (!this.equalsAttributeValue(localValue, remoteValue)) {
        changes.push(
          this.createFieldChange(
            `attributes.${key}`,
            remoteValue,
            localValue,
            `Attribute "${key}": ${JSON.stringify(remoteValue)} → ${JSON.stringify(localValue)}`
          )
        );
      }
    }

    // Compare channel listings
    const localChannelListings = local.channelListings || [];
    const remoteChannelListings = remote.channelListings || [];

    const localChannelListingMap = new Map(localChannelListings.map((c) => [c.channel, c]));
    const remoteChannelListingMap = new Map(remoteChannelListings.map((c) => [c.channel, c]));

    // Check for channel listing changes
    const allChannels = new Set([
      ...localChannelListingMap.keys(),
      ...remoteChannelListingMap.keys(),
    ]);

    for (const channel of allChannels) {
      const localChannelListing = localChannelListingMap.get(channel);
      const remoteChannelListing = remoteChannelListingMap.get(channel);

      if (!localChannelListing && remoteChannelListing) {
        changes.push(
          this.createFieldChange(
            `channels.${channel}`,
            undefined,
            remoteChannelListing,
            `Channel "${channel}" will be added`
          )
        );
      } else if (localChannelListing && !remoteChannelListing) {
        changes.push(
          this.createFieldChange(
            `channels.${channel}`,
            localChannelListing,
            undefined,
            `Channel "${channel}" will be removed`
          )
        );
      } else if (localChannelListing && remoteChannelListing) {
        // Compare channel properties with stable normalization (order-agnostic, undefineds dropped)
        if (!this.equalsChannelListing(localChannelListing, remoteChannelListing)) {
          changes.push(
            this.createFieldChange(
              `channels.${channel}`,
              this.normalizeChannelListing(remoteChannelListing),
              this.normalizeChannelListing(localChannelListing),
              `Channel "${channel}" settings changed`
            )
          );
        }
      }
    }

    // Deep variant comparison
    const localVariants = local.variants || [];
    const remoteVariants = remote.variants || [];

    // Map variants by SKU for comparison (dedupe by picking the richer entry)
    const pickRicher = (a: ProductVariantInput, b: ProductVariantInput) => {
      const aLen = Array.isArray(a.channelListings) ? a.channelListings.length : 0;
      const bLen = Array.isArray(b.channelListings) ? b.channelListings.length : 0;
      return bLen > aLen ? b : a;
    };

    const localVariantMap = new Map<string, ProductVariantInput>();
    for (const v of localVariants) {
      const existing = localVariantMap.get(v.sku);
      localVariantMap.set(v.sku, existing ? pickRicher(existing, v) : v);
    }

    const remoteVariantMap = new Map<string, ProductVariantInput>();
    for (const v of remoteVariants) {
      const existing = remoteVariantMap.get(v.sku);
      remoteVariantMap.set(v.sku, existing ? pickRicher(existing, v) : v);
    }

    // Check for variant changes
    const allVariantSkus = new Set([...localVariantMap.keys(), ...remoteVariantMap.keys()]);

    for (const sku of allVariantSkus) {
      const localVariant = localVariantMap.get(sku);
      const remoteVariant = remoteVariantMap.get(sku);

      if (!localVariant && remoteVariant) {
        changes.push(
          this.createFieldChange(
            `variants.${sku}`,
            undefined,
            remoteVariant,
            `Variant "${sku}" will be added`
          )
        );
      } else if (localVariant && !remoteVariant) {
        changes.push(
          this.createFieldChange(
            `variants.${sku}`,
            localVariant,
            undefined,
            `Variant "${sku}" will be removed`
          )
        );
      } else if (localVariant && remoteVariant) {
        // Compare variant properties
        const variantChanges = this.compareVariants(localVariant, remoteVariant, sku);
        changes.push(...variantChanges);
      }
    }

    const localMedia = this.normalizeMediaArray(local.media);
    const remoteMedia = this.normalizeMediaArray(remote.media);

    if (!this.equalsMedia(localMedia, remoteMedia)) {
      changes.push(
        this.createFieldChange(
          "media",
          remoteMedia,
          localMedia,
          "Product media entries changed"
        )
      );
    }

    return changes;
  }

  private normalizeMediaArray(
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

  private equalsMedia(
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

  /**
   * Compares variant fields in detail
   */
  private compareVariants(
    local: ProductVariantInput,
    remote: ProductVariantInput,
    sku: string
  ): DiffChange[] {
    const changes: DiffChange[] = [];

    // Skip name comparison to prevent cosmetic diffs

    // Compare weight
    if (local.weight !== remote.weight) {
      changes.push(
        this.createFieldChange(
          `variants.${sku}.weight`,
          remote.weight,
          local.weight,
          `Variant "${sku}" weight changed`
        )
      );
    }

    // Compare variant attributes
    if (JSON.stringify(local.attributes) !== JSON.stringify(remote.attributes)) {
      changes.push(
        this.createFieldChange(
          `variants.${sku}.attributes`,
          remote.attributes,
          local.attributes,
          `Variant "${sku}" attributes changed`
        )
      );
    }

    // Compare channel listings per channel with stable normalization
    const localVCL = Array.isArray(local.channelListings) ? local.channelListings : [];
    const remoteVCL = Array.isArray(remote.channelListings) ? remote.channelListings : [];

    const toMap = (
      arr: NonNullable<ProductVariantInput["channelListings"]>
    ): Map<string, Record<string, unknown>> =>
      new Map(
        arr.map((l) => [l.channel, this.normalizeVariantChannelListing(l)] as const)
      );

    const lMap = toMap(localVCL);
    const rMap = toMap(remoteVCL);

    const allVChannels = new Set([...lMap.keys(), ...rMap.keys()]);
    const diffs: string[] = [];

    for (const ch of allVChannels) {
      const l = lMap.get(ch);
      const r = rMap.get(ch);
      if (!l && r) {
        diffs.push(`+${ch}`);
      } else if (l && !r) {
        diffs.push(`-${ch}`);
      } else if (l && r && JSON.stringify(l) !== JSON.stringify(r)) {
        diffs.push(`~${ch}`);
      }
    }

    if (diffs.length > 0) {
      changes.push(
        this.createFieldChange(
          `variants.${sku}.channelListings`,
          remote.channelListings,
          local.channelListings,
          `Variant "${sku}" channel listings changed (${diffs.join(", ")})`
        )
      );
    }

    return changes;
  }

  private normalizeChannelListing(listing: NonNullable<ProductEntity["channelListings"]>[number]) {
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
    if (
      typeof (listing as { availableForPurchase?: unknown }).availableForPurchase !== "undefined"
    ) {
      const afp = (listing as { availableForPurchase?: string | number | null | undefined })
        .availableForPurchase;
      normalized.availableForPurchase = normalizeDateTime(afp);
    }
    return normalized;
  }

  private equalsChannelListing(
    a: NonNullable<ProductEntity["channelListings"]>[number],
    b: NonNullable<ProductEntity["channelListings"]>[number]
  ): boolean {
    const na = this.normalizeChannelListing(a);
    const nb = this.normalizeChannelListing(b);
    return JSON.stringify(na) === JSON.stringify(nb);
  }

  private normalizeVariantChannelListing(
    listing: NonNullable<ProductVariantInput["channelListings"]>[number]
  ) {
    const normalized: Record<string, unknown> = { channel: listing.channel };
    if (listing.price !== undefined) normalized.price = listing.price;
    if (listing.costPrice !== undefined) normalized.costPrice = listing.costPrice;
    return normalized;
  }

  private equalsAttributeValue(a: unknown, b: unknown): boolean {
    const normalize = (v: unknown): unknown => {
      if (Array.isArray(v)) {
        return [...v].sort((x, y) => JSON.stringify(x).localeCompare(JSON.stringify(y)));
      }
      return v;
    };
    return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
  }
}
