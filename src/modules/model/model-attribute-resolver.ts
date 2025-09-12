import type { AttributeValueInput } from "../../lib/graphql/graphql-types";
import { logger } from "../../lib/logger";
import type { AttributeOperations } from "../attribute/repository";

/**
 * Resolves model/page attribute values into typed AttributeValueInput payloads,
 * mirroring the product AttributeResolver logic but scoped for PAGE_TYPE attributes.
 */
export class ModelAttributeResolver {
  constructor(private readonly attributeRepo: AttributeOperations) {}

  async resolveAttributes(attributes: Record<string, unknown> = {}): Promise<AttributeValueInput[]> {
    const names = Object.keys(attributes);
    if (names.length === 0) return [];

    // Fetch metadata for PAGE_TYPE attributes by names
    const meta = await this.attributeRepo.getAttributesByNames({ names, type: "PAGE_TYPE" });
    const byName = new Map((meta || []).map((a) => [a.name, a] as const));

    const results: AttributeValueInput[] = [];
    for (const name of names) {
      const value = attributes[name];
      const attr = byName.get(name);
      if (!attr) {
        logger.warn(`Page attribute "${name}" not found; skipping`);
        continue;
      }
      const payload = this.toPayload(attr, value);
      if (payload) results.push(payload);
    }
    return results;
  }

  private toPayload(
    attribute: {
      id: string;
      inputType?: string | null;
      // choices: { edges?: { node: { name?: string | null; id?: string | null } }[] } | null;
      choices?: { edges?: Array<{ node: { id?: string | null; name?: string | null } | null } | null> } | null;
    },
    raw: unknown
  ): AttributeValueInput | null {
    const inputType = (attribute.inputType || "").toUpperCase();
    const ensureArray = (v: unknown) => (Array.isArray(v) ? v : v === undefined || v === null ? [] : [v]);

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
      const truthy = ["true", "1", "yes", "y"]; const falsy = ["false", "0", "no", "n"];
      let b: boolean | undefined;
      if (truthy.includes(token)) b = true; else if (falsy.includes(token)) b = false; else b = token.length > 0;
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
        json = JSON.stringify({ time: Date.now(), blocks: [{ id: `attr-${Date.now()}`, data: { text: json }, type: "paragraph" }], version: "2.24.3" });
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
