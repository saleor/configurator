import { describe, expect, it, vi } from "vitest";
import { MetadataService } from "./metadata-service";

const createService = () => {
  const repository = { updateMetadata: vi.fn().mockResolvedValue(undefined) };
  return { repository, service: new MetadataService(repository) };
};

describe("MetadataService.syncMetadata", () => {
  it("writes only keys that differ from current metadata", async () => {
    const { repository, service } = createService();

    await service.syncMetadata("W1", { region: "eu", tier: "gold" }, [
      { key: "region", value: "us" },
      { key: "tier", value: "gold" },
      { key: "erp.apiUrl", value: "https://erp.dev" },
    ]);

    expect(repository.updateMetadata).toHaveBeenCalledWith("W1", [{ key: "region", value: "eu" }]);
  });

  it("writes every listed key when current metadata is unknown", async () => {
    const { repository, service } = createService();

    await service.syncMetadata("W1", { region: "eu" });

    expect(repository.updateMetadata).toHaveBeenCalledWith("W1", [{ key: "region", value: "eu" }]);
  });

  it("skips the request when nothing changed or metadata is unmanaged", async () => {
    const { repository, service } = createService();

    await service.syncMetadata("W1", { region: "eu" }, [{ key: "region", value: "eu" }]);
    await service.syncMetadata("W1", undefined, [{ key: "region", value: "us" }]);

    expect(repository.updateMetadata).not.toHaveBeenCalled();
  });
});
