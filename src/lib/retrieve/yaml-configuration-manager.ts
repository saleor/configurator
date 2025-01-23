import { stringify, parse } from "yaml";
import type { SaleorConfig } from "../configurator";

const CONFIG_PATH = "config.yml";

export class YamlConfigurationManager {
  save(config: SaleorConfig) {
    const yml = stringify(config);
    const file = Bun.file(CONFIG_PATH);
    file.write(yml);
    console.log(`Config saved to ${CONFIG_PATH}`);
  }

  async load() {
    const file = Bun.file(CONFIG_PATH);
    const exists = await file.exists();

    if (!exists) {
      throw new Error(`Configuration file not found: ${CONFIG_PATH}`);
    }

    const yml = await file.text();
    const config = parse(yml);

    // TODO: Validate the config
    return config as SaleorConfig;
  }
}
