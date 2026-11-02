import { describe, expect, it } from "vitest";
import { descriptionsEqual, normalizeDescription } from "./editorjs-description";

const editorJs = (blocks: unknown[]) => JSON.stringify({ time: 1, blocks, version: "2.24.3" });

describe("normalizeDescription", () => {
  it("extracts text from list, table, quote and code blocks", () => {
    const result = normalizeDescription(
      editorJs([
        { type: "header", data: { text: "Specs", level: 2 } },
        { type: "list", data: { style: "unordered", items: ["Fast", "Light"] } },
        { type: "list", data: { items: [{ content: "Nested", items: [{ content: "Deep" }] }] } },
        { type: "table", data: { content: [["Size", "M"]] } },
        { type: "quote", data: { text: "Great", caption: "A customer" } },
        { type: "code", data: { code: "npm i" } },
      ])
    );

    expect(result?.text).toBe("Specs Fast Light Nested Deep Size M Great A customer npm i");
  });

  it("ignores EditorJS metadata and empty paragraphs", () => {
    const a = editorJs([{ id: "1", type: "paragraph", data: { text: "Hi" } }]);
    const b = JSON.stringify({
      time: 999,
      version: "2.30.0",
      blocks: [
        { id: "x", type: "paragraph", data: { text: "Hi" } },
        { id: "y", type: "paragraph", data: { text: "" } },
      ],
    });

    expect(descriptionsEqual(a, b)).toBe(true);
  });
});

describe("descriptionsEqual", () => {
  it("treats plain text and an equivalent paragraph as equal", () => {
    expect(
      descriptionsEqual(
        "Hello world!",
        editorJs([{ type: "paragraph", data: { text: "Hello world!" } }])
      )
    ).toBe(true);
  });

  it("detects changes inside list items", () => {
    const before = editorJs([{ type: "list", data: { items: ["Fast", "Light"] } }]);
    const after = editorJs([{ type: "list", data: { items: ["Fast", "Heavy"] } }]);

    expect(descriptionsEqual(after, before)).toBe(false);
  });

  it("detects block type changes when both sides are EditorJS", () => {
    const paragraph = editorJs([{ type: "paragraph", data: { text: "Specs" } }]);
    const header = editorJs([{ type: "header", data: { text: "Specs", level: 2 } }]);

    expect(descriptionsEqual(header, paragraph)).toBe(false);
  });

  it("treats missing and empty descriptions as equal", () => {
    expect(descriptionsEqual(undefined, "")).toBe(true);
  });
});
