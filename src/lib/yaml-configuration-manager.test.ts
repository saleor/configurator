import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SaleorConfig } from "./config-schema";
import {
  YamlConfigurationManager,
  type FileSystem,
} from "./yaml-configuration-manager";

describe("YamlConfigurationManager", () => {
  let mockFs: FileSystem;
  let manager: YamlConfigurationManager;
  const CONFIG_PATH = "test-config.yml";

  beforeEach(() => {
    mockFs = {
      readFile: vi.fn(),
      writeFile: vi.fn(),
    };
    manager = new YamlConfigurationManager(CONFIG_PATH, mockFs);
  });

  describe("load", () => {
    it("should load and parse valid configuration", async () => {
      const mockYaml = `
        shop:
          defaultMailSenderName: "Test Store"
          defaultMailSenderAddress: "test@example.com"
      `;

      vi.mocked(mockFs.readFile).mockResolvedValueOnce(mockYaml);

      const config = await manager.load();

      expect(mockFs.readFile).toHaveBeenCalledWith(CONFIG_PATH, "utf-8");
      expect(config.shop).toEqual({
        defaultMailSenderName: "Test Store",
        defaultMailSenderAddress: "test@example.com",
      });
    });

    it("should throw error when file is not found", async () => {
      const error = new Error() as NodeJS.ErrnoException;
      error.code = "ENOENT";
      vi.mocked(mockFs.readFile).mockRejectedValueOnce(error);

      await expect(manager.load()).rejects.toThrow(
        "Configuration file not found: test-config.yml"
      );
    });

    it("should throw error when configuration is invalid", async () => {
      const mockYaml = `
        invalid: yaml
      `;

      vi.mocked(mockFs.readFile).mockResolvedValueOnce(mockYaml);

      // Then we can update this to match the actual error
      await expect(manager.load()).rejects.toThrow(
        "Invalid configuration file"
      );
    });

    it("should throw error when YAML is malformed", async () => {
      const mockYaml = `
        shop:
          - invalid: yaml: format
      `;

      vi.mocked(mockFs.readFile).mockResolvedValueOnce(mockYaml);

      await expect(manager.load()).rejects.toThrow();
    });
  });

  describe("save", () => {
    it("should save valid configuration", async () => {
      const config: SaleorConfig = {
        shop: {
          defaultMailSenderName: "Test Store",
          defaultMailSenderAddress: "test@example.com",
        },
      };

      await manager.save(config);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        CONFIG_PATH,
        expect.stringContaining("defaultMailSenderName: Test Store")
      );
    });

    it("should throw error when write fails", async () => {
      const config: SaleorConfig = {
        shop: {
          defaultMailSenderName: "Test Store",
        },
      };

      vi.mocked(mockFs.writeFile).mockRejectedValueOnce(
        new Error("Write failed")
      );

      await expect(manager.save(config)).rejects.toThrow("Write failed");
    });
  });
});
