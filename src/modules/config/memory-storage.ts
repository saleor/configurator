import type { SaleorConfig } from "./schema/schema";
import type { ConfigurationStorage } from "./yaml-manager";

/** Keeps a private snapshot; service mutations never escape to the caller. */
export class MemoryConfigurationStorage implements ConfigurationStorage {
  private config: SaleorConfig;

  constructor(config: SaleorConfig) {
    this.config = structuredClone(config);
  }

  async load(): Promise<SaleorConfig> {
    return structuredClone(this.config);
  }

  async save(config: SaleorConfig): Promise<void> {
    this.config = structuredClone(config);
  }
}
