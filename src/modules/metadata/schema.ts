import { z } from "zod";

/**
 * Public metadata as a key → value map.
 *
 * Only keys listed here are managed: deploy adds or overwrites them, and keys that exist
 * on Saleor but not in config are left untouched. Omitting the field leaves metadata unmanaged.
 */
export const metadataSchema = z
  .record(z.string().min(1), z.string())
  .describe(
    "Public metadata managed by the configurator. Only listed keys are written; other keys on Saleor are left untouched."
  );

export type MetadataInput = z.infer<typeof metadataSchema>;

export interface MetadataItem {
  readonly key: string;
  readonly value: string;
}
