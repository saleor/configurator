import { readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { configSchema } from "../src/modules/config/schema/schema";

const schema = JSON.parse(readFileSync(new URL("../schema.json", import.meta.url), "utf8"));
const ajv = new Ajv2020({ strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

describe("published configuration input schema", () => {
  it.each([
    { productTypes: [{ name: "T-Shirt" }] },
    {
      channels: [{ name: "Main", slug: "main", currencyCode: "USD", defaultCountry: "US" }],
    },
    {
      products: [
        {
          name: "Tee",
          slug: "tee",
          productType: "T-Shirt",
          category: "clothing",
          channelListings: [{ channel: "main" }],
          variants: [{ name: "Default", sku: "TEE-001" }],
        },
      ],
    },
  ])("accepts omitted defaulted fields: %j", (config) => {
    expect(configSchema.safeParse(config).success).toBe(true);
    expect(validate(config), JSON.stringify(validate.errors)).toBe(true);
  });

  it.each([
    { productTypes: [{}] },
    { productTypes: [{ name: "T-Shirt", isShippingRequired: "yes" }] },
    { channels: [{ name: "Main", slug: "main", currencyCode: "USD" }] },
  ])("still rejects invalid configuration: %j", (config) => {
    expect(configSchema.safeParse(config).success).toBe(false);
    expect(validate(config)).toBe(false);
  });

  it("validates the plugin's minimal example with the runtime and published schemas", () => {
    const skill = readFileSync(
      new URL("../plugin/skills/configurator-schema/SKILL.md", import.meta.url),
      "utf8"
    );
    const yaml = skill.match(/```yaml\n([\s\S]*?)```/)?.[1];
    expect(yaml).toBeDefined();
    const config = parse(yaml ?? "");
    const result = configSchema.safeParse(config);
    expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
    expect(validate(config), JSON.stringify(validate.errors)).toBe(true);
  });
});
