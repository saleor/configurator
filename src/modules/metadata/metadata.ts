import type { MetadataInput, MetadataItem } from "./schema";

/** Metadata keys the configurator writes for its own bookkeeping; never exposed in config. */
const INTERNAL_KEY_PATTERNS = ["configurator.*"] as const;

export interface MetadataKeyFilter {
  /** Glob patterns (`*` wildcard) of keys to keep. Defaults to every key. */
  readonly include?: readonly string[];
  /** Glob patterns (`*` wildcard) of keys to drop. Applied after `include`. */
  readonly exclude?: readonly string[];
}

interface MetadataChange {
  readonly key: string;
  readonly current: string | undefined;
  /** Undefined when the key is removed (only reported with `includeUnlistedKeys`). */
  readonly desired: string | undefined;
}

type RemoteMetadata = ReadonlyArray<MetadataItem | null | undefined> | null | undefined;

const escapeRegExp = (value: string) => value.replace(/[.+?^${}()|[\]\\]/g, "\\$&");

const toKeyRegExp = (pattern: string) =>
  new RegExp(`^${pattern.split("*").map(escapeRegExp).join(".*")}$`);

const matchesAny = (key: string, patterns: readonly string[]) =>
  patterns.some((pattern) => toKeyRegExp(pattern).test(key));

/**
 * Maps Saleor metadata items to the config representation, dropping configurator-internal keys
 * and keys rejected by the filter. Returns undefined when nothing is left, so the field is omitted.
 */
export const toMetadataInput = (
  items: RemoteMetadata,
  filter: MetadataKeyFilter = {}
): MetadataInput | undefined => {
  const include = filter.include?.length ? filter.include : ["*"];
  const exclude = [...INTERNAL_KEY_PATTERNS, ...(filter.exclude ?? [])];

  const entries = (items ?? [])
    .filter((item): item is MetadataItem => Boolean(item?.key))
    .filter(({ key }) => matchesAny(key, include) && !matchesAny(key, exclude))
    .map(({ key, value }) => [key, value] as const);

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
};

/**
 * Lists keys whose desired value differs from the current one. By default only keys present in
 * `desired` are considered, so keys that exist only on the current side are never reported
 * (per-key ownership). `includeUnlistedKeys` also reports those keys as removals.
 */
export const diffMetadata = (
  desired: MetadataInput | undefined,
  current: MetadataInput | undefined,
  { includeUnlistedKeys = false }: { includeUnlistedKeys?: boolean } = {}
): MetadataChange[] => {
  const changed = Object.entries(desired ?? {})
    .filter(([key, value]) => current?.[key] !== value)
    .map(([key, value]) => ({ key, current: current?.[key], desired: value }));

  if (!includeUnlistedKeys) return changed;

  const removed = Object.entries(current ?? {})
    .filter(([key]) => desired?.[key] === undefined)
    .map(([key, value]) => ({ key, current: value, desired: undefined }));

  return [...changed, ...removed];
};

export const toMetadataItems = (changes: readonly MetadataChange[]): MetadataItem[] =>
  changes.flatMap(({ key, desired }) => (desired === undefined ? [] : [{ key, value: desired }]));

const isStringRecord = (value: unknown): value is MetadataInput =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  Object.values(value).every((entry) => typeof entry === "string");

/** Reads the config-shaped `metadata` map from an entity, if it has one. */
export const readConfigMetadata = (entity: unknown): MetadataInput | undefined => {
  if (typeof entity !== "object" || entity === null || !("metadata" in entity)) return undefined;
  return isStringRecord(entity.metadata) ? entity.metadata : undefined;
};

const parsePatternList = (value?: string): string[] =>
  (value ?? "")
    .split(",")
    .map((pattern) => pattern.trim())
    .filter(Boolean);

/** Builds a key filter from the comma-separated `--metadata-include` / `--metadata-exclude` flags. */
export const parseMetadataKeyFilter = (flags: {
  readonly metadataInclude?: string;
  readonly metadataExclude?: string;
}): MetadataKeyFilter => ({
  include: parsePatternList(flags.metadataInclude),
  exclude: parsePatternList(flags.metadataExclude),
});
