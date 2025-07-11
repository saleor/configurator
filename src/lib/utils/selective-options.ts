import { z } from "zod";
import type {
  ConfigurationSection,
  ParsedSelectiveOptions,
} from "../../core/diff/types";

// Re-export types for backwards compatibility
export type { ConfigurationSection } from "../../core/diff/types";

export const AVAILABLE_SECTIONS = [
  "shop",
  "channels",
  "productTypes",
  "pageTypes",
  "categories",
  "products",
  "attributes",
] as const satisfies readonly ConfigurationSection[];

export const selectiveOptionsSchema = z.object({
  only: z
    .string()
    .optional()
    .describe(
      "Comma-separated list of sections to include (e.g., 'channels,shop')"
    ),
  include: z
    .string()
    .optional()
    .describe(
      "Comma-separated list of sections to include (e.g., 'channels,shop')"
    ),
  exclude: z
    .string()
    .optional()
    .describe("Comma-separated list of sections to exclude"),
});

export type SelectiveOptions = z.infer<typeof selectiveOptionsSchema>;

// Extended schema for backward compatibility with 'only' parameter
export const selectiveOptionsWithOnlySchema = selectiveOptionsSchema.or(
  z.object({
    only: z.string().optional(),
    include: z.string().optional(),
    exclude: z.string().optional(),
  })
);

export type SelectiveOptionsWithOnly = z.infer<
  typeof selectiveOptionsWithOnlySchema
>;

// Remove local interface definition since we import it from types

const parseSectionString = (sectionString: string): string[] => {
  return sectionString
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};

const filterValidSections = (sections: string[]): ConfigurationSection[] => {
  return sections.filter((s) =>
    AVAILABLE_SECTIONS.includes(s as ConfigurationSection)
  ) as ConfigurationSection[];
};

const validateSections = (
  originalString: string,
  sections: string[],
  validSections: ConfigurationSection[],
  optionName: string
): void => {
  const invalidSections = sections.filter(
    (s) => !AVAILABLE_SECTIONS.includes(s as ConfigurationSection)
  );
  if (invalidSections.length > 0) {
    throw new Error(
      `Invalid sections specified in ${optionName}: ${invalidSections.join(
        ", "
      )}. Available sections: ${AVAILABLE_SECTIONS.join(", ")}`
    );
  }
};

const parseIncludeSections = (
  only?: string,
  include?: string
): ConfigurationSection[] => {
  const includeString = include || only;
  if (!includeString) return [];

  const sections = parseSectionString(includeString);
  const validSections = filterValidSections(sections);
  const optionName = include ? "--include" : "--only";
  validateSections(includeString, sections, validSections, optionName);

  return validSections;
};

const parseExcludeSections = (exclude?: string): ConfigurationSection[] => {
  if (!exclude) return [];

  const sections = parseSectionString(exclude);
  const validSections = filterValidSections(sections);
  validateSections(exclude, sections, validSections, "--exclude");

  return validSections;
};

export const parseSelectiveOptions = (
  options: SelectiveOptionsWithOnly
): ParsedSelectiveOptions => {
  // Validate the options with zod schema
  const validatedOptions = selectiveOptionsWithOnlySchema.parse(options);

  // Type-safe access to properties
  const only = "only" in validatedOptions ? validatedOptions.only : undefined;
  const include =
    "include" in validatedOptions ? validatedOptions.include : undefined;
  const exclude = validatedOptions.exclude;

  return {
    includeSections: parseIncludeSections(only, include),
    excludeSections: parseExcludeSections(exclude),
  };
};

const isExcludedByExcludeFilter = (
  section: ConfigurationSection,
  excludeSections: readonly ConfigurationSection[]
): boolean => {
  return excludeSections.length > 0 && excludeSections.includes(section);
};

export const shouldIncludeSection = (
  section: ConfigurationSection,
  options: ParsedSelectiveOptions
): boolean => {
  const { includeSections, excludeSections } = options;

  // If includeSections is not empty, only include sections that are explicitly included
  // (exclude filter is ignored when include filter is active)
  if (includeSections.length > 0) {
    return includeSections.includes(section);
  }

  // If includeSections is empty, include all sections except those explicitly excluded
  if (isExcludedByExcludeFilter(section, excludeSections)) {
    return false;
  }

  return true;
};

const createIncludeMessage = (
  includeSections: readonly ConfigurationSection[]
): string | undefined => {
  return includeSections.length > 0
    ? `📋 Including only: ${includeSections.join(", ")}`
    : undefined;
};

const createExcludeMessage = (
  excludeSections: readonly ConfigurationSection[]
): string | undefined => {
  return excludeSections.length > 0
    ? `📋 Excluding: ${excludeSections.join(", ")}`
    : undefined;
};

export const getSelectiveOptionsSummary = (
  options: ParsedSelectiveOptions
): {
  includeMessage?: string;
  excludeMessage?: string;
} => {
  const { includeSections, excludeSections } = options;

  return {
    includeMessage: createIncludeMessage(includeSections),
    excludeMessage: createExcludeMessage(excludeSections),
  };
};
