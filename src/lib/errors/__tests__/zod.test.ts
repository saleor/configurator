import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ZodValidationError } from "../zod";

describe("ZodValidationError", () => {
  describe("fromZodError", () => {
    it("should format basic validation errors", () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(18),
      });

      const result = schema.safeParse({
        email: "invalid-email",
        age: 16,
      });

      if (!result.success) {
        const error = ZodValidationError.fromZodError(result.error);

        expect(error).toBeInstanceOf(ZodValidationError);
        expect(error.code).toBe("ZOD_VALIDATION_ERROR");
        expect(error.message).toContain("email: Must be a valid email");
        expect(error.message).toContain("age: Must be at least 18");
      } else {
        throw new Error("Expected validation to fail");
      }
    });

    it("should handle string validation errors", () => {
      const schema = z.object({
        username: z.string().min(3).max(20),
        password: z.string().regex(/[A-Z]/, "Must contain uppercase letter"),
      });

      const result = schema.safeParse({
        username: "ab",
        password: "lowercase",
      });

      if (!result.success) {
        const error = ZodValidationError.fromZodError(result.error);

        expect(error.message).toContain("username: Must be at least 3 characters long");
        expect(error.message).toContain("password: Must contain uppercase letter");
      }
    });

    it("should handle required field errors", () => {
      const schema = z.object({
        name: z.string(),
        email: z.string().email(),
      });

      const result = schema.safeParse({
        name: "John",
        // email is missing
      });

      if (!result.success) {
        const error = ZodValidationError.fromZodError(result.error);

        expect(error.message).toContain("email: This field is required");
      }
    });

    it("should handle nested object validation", () => {
      const schema = z.object({
        user: z.object({
          profile: z.object({
            age: z.number().min(0),
          }),
        }),
      });

      const result = schema.safeParse({
        user: {
          profile: {
            age: -5,
          },
        },
      });

      if (!result.success) {
        const error = ZodValidationError.fromZodError(result.error);

        expect(error.message).toContain("user.profile.age: Must be at least 0");
      }
    });

    it("should handle array validation errors", () => {
      const schema = z.object({
        tags: z.array(z.string()).min(1).max(5),
      });

      const result = schema.safeParse({
        tags: [],
      });

      if (!result.success) {
        const error = ZodValidationError.fromZodError(result.error);

        expect(error.message).toContain("tags: Must contain at least 1 item");
      }
    });

    it("should handle union type errors", () => {
      const schema = z.object({
        value: z.union([z.string(), z.number()]),
      });

      const result = schema.safeParse({
        value: true, // boolean is not allowed
      });

      if (!result.success) {
        const error = ZodValidationError.fromZodError(result.error);

        expect(error.message).toContain("value: Value doesn't match any of the expected types");
      }
    });

    it("should handle enum validation", () => {
      const schema = z.object({
        role: z.enum(["admin", "user", "guest"]),
      });

      const result = schema.safeParse({
        role: "superuser",
      });

      if (!result.success) {
        const error = ZodValidationError.fromZodError(result.error);

        expect(error.message).toContain("role: Must be one of: admin, user, guest");
      }
    });

    it("should handle custom error messages", () => {
      const schema = z.object({
        email: z.string().email(),
      });

      const result = schema.safeParse({
        email: "not-an-email",
      });

      if (!result.success) {
        const error = ZodValidationError.fromZodError(
          result.error,
          "Configuration validation failed"
        );

        expect(error.message).toContain("Configuration validation failed");
        expect(error.message).toContain("email: Must be a valid email");
      }
    });

    it("should format literal type errors", () => {
      const schema = z.object({
        type: z.literal("product"),
      });

      const result = schema.safeParse({
        type: "item",
      });

      if (!result.success) {
        const error = ZodValidationError.fromZodError(result.error);

        expect(error.message).toContain('type: Must be exactly "product"');
      }
    });

    it("should handle custom validation errors", () => {
      const schema = z.object({
        password: z
          .string()
          .refine((val) => val.length >= 8, "Password must be at least 8 characters"),
      });

      const result = schema.safeParse({
        password: "short",
      });

      if (!result.success) {
        const error = ZodValidationError.fromZodError(result.error);

        expect(error.message).toContain("password: Password must be at least 8 characters");
      }
    });
  });
});
