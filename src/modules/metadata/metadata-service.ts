import { logger } from "../../lib/logger";
import { diffMetadata, toMetadataInput, toMetadataItems } from "./metadata";
import type { MetadataOperations } from "./repository";
import type { MetadataInput, MetadataItem } from "./schema";

type CurrentMetadata = ReadonlyArray<MetadataItem | null | undefined> | null | undefined;

export class MetadataService {
  constructor(private readonly repository: MetadataOperations) {}

  /**
   * Writes the keys listed in config that differ from the object's current metadata.
   * Keys on Saleor that aren't in config are left untouched.
   */
  async syncMetadata(
    id: string,
    desired: MetadataInput | undefined,
    current?: CurrentMetadata
  ): Promise<void> {
    const changes = diffMetadata(desired, toMetadataInput(current));
    if (changes.length === 0) return;

    logger.debug("Updating metadata", { id, keys: changes.map((change) => change.key) });
    await this.repository.updateMetadata(id, toMetadataItems(changes));
  }
}
