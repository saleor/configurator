import { z } from "zod";

export const AVAILABLE_SECTIONS = [
  "shop",
  "channels",
  "productTypes",
  "pageTypes",
  "categories",
  "products",
  "attributes",
] as const;

export type ConfigurationSection = (typeof AVAILABLE_SECTIONS)[number];

export const selectiveOptionsSchema = z.object({
  only: z
    .string()
    .optional()
    .describe("Comma-separated list of sections to include (e.g., 'channels,shop')"),
  include: z
    .string()
    .optional()
    .describe("Comma-separated list of sections to include (e.g., 'channels,shop')"),
  exclude: z.string().optional().describe("Comma-separated list of sections to exclude"),
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

export type SelectiveOptionsWithOnly = z.infer<typeof selectiveOptionsWithOnlySchema>;

export interface ParsedSelectiveOptions {
  includeSections: ConfigurationSection[];
  excludeSections: ConfigurationSection[];
}

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
      `Invalid sections specified in ${optionName}: ${invalidSections.join(", ")}. Available sections: ${AVAILABLE_SECTIONS.join(", ")}`
    );
  }
};

const parseIncludeSections = (only?: string, include?: string): ConfigurationSection[] => {
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
  const include = "include" in validatedOptions ? validatedOptions.include : undefined;
  const exclude = validatedOptions.exclude;

  return {
    includeSections: parseIncludeSections(only, include),
    excludeSections: parseExcludeSections(exclude),
  };
};

const isIncludedByOnlyFilter = (
  section: ConfigurationSection,
  includeSections: ConfigurationSection[]
): boolean => {
  return includeSections.length === 0 || includeSections.includes(section);
};

const isExcludedByExcludeFilter = (
  section: ConfigurationSection,
  excludeSections: ConfigurationSection[]
): boolean => {
  return excludeSections.length > 0 && excludeSections.includes(section);
};

export const shouldIncludeSection = (
  section: ConfigurationSection,
  options: ParsedSelectiveOptions
): boolean => {
  const { includeSections, excludeSections } = options;

  if (!isIncludedByOnlyFilter(section, includeSections)) {
    return false;
  }

  if (isExcludedByExcludeFilter(section, excludeSections)) {
    return false;
  }

  return true;
};

const createIncludeMessage = (includeSections: ConfigurationSection[]): string | undefined => {
  return includeSections.length > 0
    ? `📋 Including only: ${includeSections.join(", ")}`
    : undefined;
};

const createExcludeMessage = (excludeSections: ConfigurationSection[]): string | undefined => {
  return excludeSections.length > 0 ? `📋 Excluding: ${excludeSections.join(", ")}` : undefined;
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
