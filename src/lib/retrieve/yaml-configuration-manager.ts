import { stringify, parse } from "yaml";
import { configSchema, type SaleorConfig } from "../config-schema";

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
    const rawConfig = parse(yml);

    const { success, data, error } = configSchema.safeParse(rawConfig);

    if (!success) {
      console.log(error);
      throw new Error(
        "Invalid configuration file. " +
          error.issues.map((issue) => issue.message).join(", ")
      );
    }

    return data;
  }
}
