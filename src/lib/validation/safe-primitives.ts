import path from "node:path";
import { z } from "zod";

// biome-ignore lint/suspicious/noControlCharactersInRegex: intentional control character stripping for input sanitization
const CONTROL_CHARS_RE = /[\x00-\x1f\x7f]/g;

function hasParentSegment(p: string): boolean {
  return p.split(/[\\/]/).includes("..");
}

function isWithinWorkingDirectory(p: string): boolean {
  const relative = path.relative(process.cwd(), p);
  return relative === "" || (!hasParentSegment(relative) && !path.isAbsolute(relative));
}

export function safePath() {
  return z
    .string()
    .transform((p) => path.normalize(p))
    .refine((p) => !hasParentSegment(p), "Path traversal not allowed")
    .refine(
      (p) => !path.isAbsolute(p) || isWithinWorkingDirectory(p),
      "Path must be within working directory"
    );
}

// Plain HTTP is only allowed for local development instances
const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

function usesAllowedProtocol(u: string): boolean {
  try {
    const { protocol, hostname } = new URL(u);
    return protocol === "https:" || (protocol === "http:" && LOOPBACK_HOSTNAMES.has(hostname));
  } catch {
    return false;
  }
}

export function saleorUrl() {
  return z
    .string()
    .refine((u) => {
      try {
        new URL(u);
        return true;
      } catch {
        return false;
      }
    }, "Must be a valid URL")
    .refine(usesAllowedProtocol, "Must use HTTPS (HTTP is only allowed for localhost)")
    .refine((u) => {
      const withoutQuery = u.split("?")[0].split("#")[0];
      return withoutQuery.endsWith("/graphql/") || withoutQuery.endsWith("/graphql");
    }, "Must point to Saleor GraphQL endpoint")
    .refine(
      (u) => !u.includes("?") && !u.includes("#"),
      "URL must not contain query parameters or fragments"
    )
    .transform((u) => (u.endsWith("/") ? u : `${u}/`));
}

export function safeString() {
  return z.string().transform((s) => s.replace(CONTROL_CHARS_RE, ""));
}

export function safeIdentifier() {
  return z
    .string()
    .refine((s) => !/[?#%]/.test(s), "Identifier must not contain ?, #, or %")
    .pipe(safeString());
}

export function safeToken() {
  return z
    .string()
    .min(1, "Token is required")
    .transform((s) => s.replace(CONTROL_CHARS_RE, ""))
    .refine((s) => !/\s/.test(s), "Token must not contain whitespace");
}
