import { readFile, writeFile } from "node:fs/promises";
import { stringify, parse } from "yaml";
import { configSchema, type SaleorConfig } from "./config-schema";

// Interface for file system operations
export interface FileSystem {
  readFile(path: string, encoding: string): Promise<string>;
  writeFile(path: string, data: string): Promise<void>;
}

// Default implementation using node:fs
export class NodeFileSystem implements FileSystem {
  async readFile(path: string, encoding: BufferEncoding): Promise<string> {
    return readFile(path, encoding);
  }

  async writeFile(path: string, data: string): Promise<void> {
    return writeFile(path, data);
  }
}

export class YamlConfigurationManager {
  constructor(
    private readonly configPath: string = "config.yml",
    private readonly fs: FileSystem = new NodeFileSystem()
  ) {}

  async save(config: SaleorConfig) {
    const yml = stringify(config);
    await this.fs.writeFile(this.configPath, yml);
    console.log(`Config saved to ${this.configPath}`);
  }

  async load(): Promise<SaleorConfig> {
    try {
      const yml = await this.fs.readFile(this.configPath, "utf-8");
      const rawConfig = parse(yml);

      const { success, data, error } = configSchema.safeParse(rawConfig);

      if (!success) {
        throw new Error(
          "Invalid configuration file. " +
            error.errors.map((issue) => issue.message).join(", ")
        );
      }

      return data;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new Error(`Configuration file not found: ${this.configPath}`);
      }
      throw error;
    }
  }
}
