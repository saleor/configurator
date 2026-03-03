import { z } from "zod";
import type { ConfigurationSection, ParsedSelectiveOptions } from "../../core/diff/types";

export type { ConfigurationSection } from "../../core/diff/types";

export const AVAILABLE_SECTIONS = [
  "shop",
  "channels",
  "productTypes",
  "pageTypes",
  "modelTypes",
  "categories",
  "collections",
  "menus",
  "models",
  "products",
  "productAttributes",
  "contentAttributes",
  "warehouses",
  "shippingZones",
  "taxClasses",
] as const satisfies readonly ConfigurationSection[];

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

export const selectiveOptionsWithOnlySchema = selectiveOptionsSchema.or(
  z.object({
    only: z.string().optional(),
    include: z.string().optional(),
    exclude: z.string().optional(),
  })
);

export type SelectiveOptionsWithOnly = z.infer<typeof selectiveOptionsWithOnlySchema>;

const parseSectionString = (sectionString: string): string[] => {
  return sectionString
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};

const SECTION_SET: ReadonlySet<string> = new Set(AVAILABLE_SECTIONS);

const isConfigurationSection = (s: string): s is ConfigurationSection => SECTION_SET.has(s);

const filterValidSections = (sections: string[]): ConfigurationSection[] => {
  return sections.filter(isConfigurationSection);
};

const validateSections = (
  _originalString: string,
  sections: string[],
  _validSections: ConfigurationSection[],
  optionName: string
): void => {
  const invalidSections = sections.filter((s) => !isConfigurationSection(s));
  if (invalidSections.length > 0) {
    throw new Error(
      `Invalid sections specified in ${optionName}: ${invalidSections.join(
        ", "
      )}. Available sections: ${AVAILABLE_SECTIONS.join(", ")}`
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
  const validatedOptions = selectiveOptionsWithOnlySchema.parse(options);

  const only = "only" in validatedOptions ? validatedOptions.only : undefined;
  const include = "include" in validatedOptions ? validatedOptions.include : undefined;
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

  if (includeSections.length > 0) {
    return includeSections.includes(section);
  }

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
