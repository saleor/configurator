import { object } from "./object";
import { describe, it, expect } from "vitest";

describe("object", () => {
  describe("filterUndefinedValues", () => {
    it("should filter out undefined values from a flat object", () => {
      const obj = { a: 1, b: undefined, c: 3, d: null, e: 0, f: "" };
      expect(object.filterUndefinedValues(obj)).toEqual({
        a: 1,
        c: 3,
        d: null,
        e: 0,
        f: "",
      });
    });

    it("should handle nested objects", () => {
      const obj = {
        a: 1,
        b: {
          c: undefined,
          d: 2,
          e: {
            f: undefined,
            g: 3,
          },
        },
        h: undefined,
      };
      expect(object.filterUndefinedValues(obj)).toEqual({
        a: 1,
        b: {
          d: 2,
          e: {
            g: 3,
          },
        },
      });
    });

    it("should handle arrays", () => {
      const obj = {
        a: [1, undefined, 3],
        b: undefined,
        c: [
          { d: 1, e: undefined },
          { f: undefined, g: 2 },
        ],
      };
      expect(object.filterUndefinedValues(obj)).toEqual({
        a: [1, undefined, 3], // Arrays should preserve undefined values
        c: [{ d: 1 }, { g: 2 }],
      });
    });

    it("should return empty object when all values are undefined", () => {
      const obj = { a: undefined, b: undefined };
      expect(object.filterUndefinedValues(obj)).toEqual({});
    });

    it("should handle empty objects", () => {
      expect(object.filterUndefinedValues({})).toEqual({});
    });

    it("should preserve falsy values except undefined", () => {
      const obj = {
        a: false,
        b: 0,
        c: "",
        d: null,
        e: undefined,
        f: NaN,
      };
      expect(object.filterUndefinedValues(obj)).toEqual({
        a: false,
        b: 0,
        c: "",
        d: null,
        f: NaN,
      });
    });
  });
});
