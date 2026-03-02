import { describe, expect, it } from "vitest";
import { findSimilarNames, levenshteinDistance, toSlug } from "./string";

describe("levenshteinDistance", () => {
  it("returns 0 for empty strings", () => {
    expect(levenshteinDistance("", "")).toBe(0);
  });

  it("returns 0 for identical strings", () => {
    expect(levenshteinDistance("abc", "abc")).toBe(0);
  });

  it("calculates correct distance for 'kitten' → 'sitting'", () => {
    expect(levenshteinDistance("kitten", "sitting")).toBe(3);
  });

  it("returns length of other string when one is empty", () => {
    expect(levenshteinDistance("", "abc")).toBe(3);
    expect(levenshteinDistance("abc", "")).toBe(3);
  });

  it("handles single character differences", () => {
    expect(levenshteinDistance("cat", "car")).toBe(1);
  });
});

describe("toSlug", () => {
  it("converts name to lowercase slug", () => {
    expect(toSlug("Hello World!")).toBe("hello-world");
  });

  it("strips leading and trailing hyphens", () => {
    expect(toSlug("-leading-and-trailing-")).toBe("leading-and-trailing");
  });

  it("returns empty string for empty input", () => {
    expect(toSlug("")).toBe("");
  });

  it("lowercases already-sluggish input", () => {
    expect(toSlug("Already-slug")).toBe("already-slug");
  });

  it("collapses multiple non-alphanumeric chars to single hyphen", () => {
    expect(toSlug("foo   bar")).toBe("foo-bar");
    expect(toSlug("foo!!!bar")).toBe("foo-bar");
  });
});

describe("findSimilarNames", () => {
  it("finds similar names within distance threshold", () => {
    const result = findSimilarNames("color", ["colour", "Color", "size"]);
    expect(result).toContain("colour");
  });

  it("excludes exact case-insensitive matches (distance 0)", () => {
    const result = findSimilarNames("color", ["Color", "colour"]);
    // "Color" is distance 0 (case-insensitive exact match), should be excluded
    expect(result).not.toContain("Color");
    expect(result).toContain("colour");
  });

  it("returns empty array when all candidates are too distant", () => {
    const result = findSimilarNames("xyz", ["abcdefgh", "mnopqrst"]);
    expect(result).toEqual([]);
  });

  it("sorts results by ascending distance", () => {
    const result = findSimilarNames("color", ["colour", "collar", "cooler"]);
    // "colour" is distance 1, the others are further
    expect(result[0]).toBe("colour");
  });

  it("returns empty array for empty candidates", () => {
    expect(findSimilarNames("color", [])).toEqual([]);
  });
});
