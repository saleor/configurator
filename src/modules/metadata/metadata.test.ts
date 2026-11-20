import { describe, expect, it } from "vitest";
import {
  diffMetadata,
  parseMetadataKeyFilter,
  readConfigMetadata,
  toMetadataInput,
} from "./metadata";

describe("toMetadataInput", () => {
  const remote = [
    { key: "erp.id", value: "W1" },
    { key: "erp.lastSyncedAt", value: "2026-11-19" },
    { key: "stripe.customer", value: "cus_1" },
    { key: "configurator.externalUrl", value: "https://example.com/a.jpg" },
  ];

  it("keeps every key except configurator-internal ones by default", () => {
    expect(toMetadataInput(remote)).toEqual({
      "erp.id": "W1",
      "erp.lastSyncedAt": "2026-11-19",
      "stripe.customer": "cus_1",
    });
  });

  it("applies include then exclude patterns", () => {
    expect(toMetadataInput(remote, { include: ["erp.*"], exclude: ["erp.lastSyncedAt"] })).toEqual({
      "erp.id": "W1",
    });
  });

  it("matches dots literally", () => {
    expect(
      toMetadataInput([{ key: "erpXid", value: "1" }], { include: ["erp.id"] })
    ).toBeUndefined();
  });

  it("returns undefined when no keys are left", () => {
    expect(toMetadataInput([])).toBeUndefined();
    expect(toMetadataInput(null)).toBeUndefined();
    expect(toMetadataInput(remote, { exclude: ["*"] })).toBeUndefined();
  });
});

describe("diffMetadata", () => {
  it("reports only keys listed in desired", () => {
    expect(
      diffMetadata({ region: "eu", tier: "gold" }, { region: "us", tier: "gold", other: "x" })
    ).toEqual([{ key: "region", current: "us", desired: "eu" }]);
  });

  it("reports keys missing on the current side as additions", () => {
    expect(diffMetadata({ region: "eu" }, undefined)).toEqual([
      { key: "region", current: undefined, desired: "eu" },
    ]);
  });

  it("treats missing desired metadata as unmanaged", () => {
    expect(diffMetadata(undefined, { region: "us" })).toEqual([]);
  });

  it("reports keys only on the current side as removals with includeUnlistedKeys", () => {
    expect(
      diffMetadata({ region: "eu" }, { region: "eu", dock: "3" }, { includeUnlistedKeys: true })
    ).toEqual([{ key: "dock", current: "3", desired: undefined }]);
    expect(diffMetadata(undefined, { dock: "3" }, { includeUnlistedKeys: true })).toEqual([
      { key: "dock", current: "3", desired: undefined },
    ]);
  });
});

describe("readConfigMetadata", () => {
  it("reads a string map and ignores other shapes", () => {
    expect(readConfigMetadata({ metadata: { a: "1" } })).toEqual({ a: "1" });
    expect(readConfigMetadata({ metadata: [{ key: "a", value: "1" }] })).toBeUndefined();
    expect(readConfigMetadata({ name: "x" })).toBeUndefined();
  });
});

describe("parseMetadataKeyFilter", () => {
  it("splits comma-separated patterns and drops blanks", () => {
    expect(
      parseMetadataKeyFilter({ metadataInclude: "erp.*, seo", metadataExclude: "stripe.*,," })
    ).toEqual({ include: ["erp.*", "seo"], exclude: ["stripe.*"] });
  });

  it("returns empty lists when flags are absent", () => {
    expect(parseMetadataKeyFilter({})).toEqual({ include: [], exclude: [] });
  });
});
