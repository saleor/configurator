import type { AttributeValueInput } from "../../lib/graphql/graphql-types";
import { logger } from "../../lib/logger";
import {
  cachedToResolverAttribute,
  type IAttributeCache,
  type ResolverAttribute,
} from "../attribute/attribute-cache";

/**
 * Resolves model/page attribute values into typed AttributeValueInput payloads.
 * Uses the shared attribute cache — no API calls.
 */
export class ModelAttributeResolver {
  constructor(private readonly cache: IAttributeCache) {}

  async resolveAttributes(
    attributes: Record<string, unknown> = {}
  ): Promise<AttributeValueInput[]> {
    const names = Object.keys(attributes);
    if (names.length === 0) return [];

    const results: AttributeValueInput[] = [];
    for (const name of names) {
      const value = attributes[name];
      const cached = this.cache.getContentAttribute(name);
      if (!cached) {
        throw new Error(
          `Content attribute "${name}" not found in attribute cache. ` +
            `Ensure it is defined in contentAttributes config.`
        );
      }
      const resolved = cachedToResolverAttribute(cached);
      const payload = this.toPayload(resolved, value);
      if (payload) results.push(payload);
    }
    return results;
  }

  private toPayload(attribute: ResolverAttribute, raw: unknown): AttributeValueInput | null {
    const inputType = (attribute.inputType || "").toUpperCase();
    const ensureArray = (v: unknown) =>
      Array.isArray(v) ? v : v === undefined || v === null ? [] : [v];

    if (inputType === "PLAIN_TEXT") {
      const vals = ensureArray(raw).map((x) => String(x));
      const first = vals[0] ?? "";
      return { id: attribute.id, plainText: first };
    }

    if (inputType === "NUMERIC") {
      const vals = ensureArray(raw).map((x) => String(x));
      return { id: attribute.id, numeric: vals[0] ?? "" } as AttributeValueInput;
    }

    if (inputType === "BOOLEAN") {
      const vals = ensureArray(raw).map((x) => String(x).toLowerCase());
      const token = vals[0] ?? "";
      const truthy = ["true", "1", "yes", "y"];
      const falsy = ["false", "0", "no", "n"];
      let b: boolean | undefined;
      if (truthy.includes(token)) b = true;
      else if (falsy.includes(token)) b = false;
      else b = token.length > 0;
      return { id: attribute.id, boolean: b } as AttributeValueInput;
    }

    if (inputType === "DATE") {
      const vals = ensureArray(raw).map((x) => String(x));
      return { id: attribute.id, date: vals[0] ?? "" } as AttributeValueInput;
    }

    if (inputType === "DATE_TIME") {
      const vals = ensureArray(raw).map((x) => String(x));
      return { id: attribute.id, dateTime: vals[0] ?? "" } as AttributeValueInput;
    }

    if (inputType === "RICH_TEXT") {
      const vals = ensureArray(raw).map((x) => String(x));
      let json = vals[0] ?? "";
      const t = json.trim();
      if (!(t.startsWith("{") && t.endsWith("}"))) {
        json = JSON.stringify({
          time: Date.now(),
          blocks: [{ id: `attr-${Date.now()}`, data: { text: json }, type: "paragraph" }],
          version: "2.24.3",
        });
      }
      return { id: attribute.id, richText: json } as AttributeValueInput;
    }

    if (inputType === "FILE") {
      const vals = ensureArray(raw).map((x) => String(x));
      return { id: attribute.id, file: vals[0] ?? "" } as AttributeValueInput;
    }

    if (inputType === "DROPDOWN" || inputType === "SWATCH" || inputType === "MULTISELECT") {
      const values = ensureArray(raw).map((x) => String(x));
      const choice = (name: string) => {
        const edge = attribute.choices?.edges?.find((e) => e?.node?.name === name) ?? null;
        const id = edge?.node?.id ?? undefined;
        return id ? { id } : { value: name };
      };

      if (inputType === "MULTISELECT") {
        return { id: attribute.id, multiselect: values.map(choice) } as AttributeValueInput;
      }
      if (inputType === "SWATCH") {
        return { id: attribute.id, swatch: choice(values[0] ?? "") } as AttributeValueInput;
      }
      return { id: attribute.id, dropdown: choice(values[0] ?? "") } as AttributeValueInput;
    }

    logger.warn(`Unsupported page attribute input type: ${attribute.inputType}`);
    return null;
  }
}
