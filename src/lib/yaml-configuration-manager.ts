import { readFile, writeFile } from "node:fs/promises";
import { stringify, parse } from "yaml";
import { configSchema, type SaleorConfig } from "./config-schema";

const CONFIG_PATH = "config.yml";

export class YamlConfigurationManager {
  async save(config: SaleorConfig) {
    const yml = stringify(config);
    await writeFile(CONFIG_PATH, yml);
    console.log(`Config saved to ${CONFIG_PATH}`);
  }

  async load() {
    try {
      const yml = await readFile(CONFIG_PATH, "utf-8");
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
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new Error(`Configuration file not found: ${CONFIG_PATH}`);
      }
      throw error;
    }
  }
}
