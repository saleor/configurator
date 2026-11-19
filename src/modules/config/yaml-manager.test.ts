import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { logger } from "../../lib/logger";
import type { SaleorConfig } from "./schema/schema";
import { type FileSystem, YamlConfigurationManager } from "./yaml-manager";

describe("YamlConfigurationManager", () => {
  let mockFs: FileSystem;
  let manager: YamlConfigurationManager;
  const CONFIG_PATH = "test-config.yml";

  beforeEach(() => {
    mockFs = {
      readFile: vi.fn(),
      writeFile: vi.fn(),
    } as unknown as FileSystem;
    manager = new YamlConfigurationManager(CONFIG_PATH, mockFs);
  });

  it("should save configuration to YAML file", async () => {
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

  it("should load configuration from YAML file", async () => {
    const yamlContent = `
      shop:
        defaultMailSenderName: Test Store
        defaultMailSenderAddress: test@example.com
    `;
    (mockFs.readFile as unknown as Mock).mockResolvedValue(yamlContent);

    const config = await manager.load();

    expect(config).toEqual({
      shop: {
        defaultMailSenderName: "Test Store",
        defaultMailSenderAddress: "test@example.com",
      },
    });
  });

  describe("unknown keys", () => {
    const withUnknownKey = "shop:\n  headerText: Shop\n  headrText: Typo\n";

    it("warns once when the same file is loaded repeatedly", async () => {
      const warn = vi.spyOn(logger, "warn").mockImplementation(() => undefined);
      (mockFs.readFile as unknown as Mock).mockResolvedValue(withUnknownKey);

      await manager.load();
      await manager.load();

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(
        'Unknown key "shop.headrText" is not supported and was ignored'
      );
      warn.mockRestore();
    });

    it("warns again after the file changes", async () => {
      const warn = vi.spyOn(logger, "warn").mockImplementation(() => undefined);
      (mockFs.readFile as unknown as Mock)
        .mockResolvedValueOnce(withUnknownKey)
        .mockResolvedValueOnce(`${withUnknownKey}  footrText: Typo\n`);

      await manager.load();
      await manager.load();

      expect(warn).toHaveBeenCalledTimes(3);
      warn.mockRestore();
    });

    it("returns an independent copy on every load", async () => {
      (mockFs.readFile as unknown as Mock).mockResolvedValue("shop:\n  headerText: Shop\n");

      const first = await manager.load();
      if (first.shop) first.shop.headerText = "Changed";
      const second = await manager.load();

      expect(second.shop?.headerText).toBe("Shop");
    });
  });

  it("should throw error when file not found", async () => {
    const error = new Error("File not found");
    (error as NodeJS.ErrnoException).code = "ENOENT";
    (mockFs.readFile as unknown as Mock).mockRejectedValue(error);

    await expect(manager.load()).rejects.toThrow(`Configuration file not found: ${CONFIG_PATH}`);
  });

  it("should throw error when YAML is invalid", async () => {
    (mockFs.readFile as unknown as Mock).mockResolvedValue("invalid: yaml: content:");

    await expect(manager.load()).rejects.toThrow();
  });
});
