import { z } from "zod";

export const AVAILABLE_SECTIONS = [
  'shop',
  'channels',
  'productTypes',
  'pageTypes',
  'categories',
  'products',
  'attributes'
] as const;

export type ConfigurationSection = typeof AVAILABLE_SECTIONS[number];

export const selectiveOptionsSchema = z.object({
  only: z.string().optional().describe("Comma-separated list of sections to include (e.g., 'channels,shop')"),
  exclude: z.string().optional().describe("Comma-separated list of sections to exclude"),
});

export type SelectiveOptions = z.infer<typeof selectiveOptionsSchema>;

export interface ParsedSelectiveOptions {
  includeSections: ConfigurationSection[];
  excludeSections: ConfigurationSection[];
}

const parseSectionString = (sectionString: string): string[] => {
  return sectionString.split(',').map(s => s.trim()).filter(Boolean);
};

const filterValidSections = (sections: string[]): ConfigurationSection[] => {
  return sections.filter(s => AVAILABLE_SECTIONS.includes(s as ConfigurationSection)) as ConfigurationSection[];
};

const validateSections = (originalString: string, validSections: ConfigurationSection[], optionName: string): void => {
  if (validSections.length === 0) {
    throw new Error(`Invalid sections specified in ${optionName}: ${originalString}. Available: ${AVAILABLE_SECTIONS.join(', ')}`);
  }
};

const parseIncludeSections = (only?: string): ConfigurationSection[] => {
  if (!only) return [];
  
  const sections = parseSectionString(only);
  const validSections = filterValidSections(sections);
  validateSections(only, validSections, '--only');
  
  return validSections;
};

const parseExcludeSections = (exclude?: string): ConfigurationSection[] => {
  if (!exclude) return [];
  
  const sections = parseSectionString(exclude);
  const validSections = filterValidSections(sections);
  validateSections(exclude, validSections, '--exclude');
  
  return validSections;
};

export const parseSelectiveOptions = (options: SelectiveOptions): ParsedSelectiveOptions => {
  return {
    includeSections: parseIncludeSections(options.only),
    excludeSections: parseExcludeSections(options.exclude)
  };
};

const isIncludedByOnlyFilter = (section: ConfigurationSection, includeSections: ConfigurationSection[]): boolean => {
  return includeSections.length === 0 || includeSections.includes(section);
};

const isExcludedByExcludeFilter = (section: ConfigurationSection, excludeSections: ConfigurationSection[]): boolean => {
  return excludeSections.length > 0 && excludeSections.includes(section);
};

export const shouldIncludeSection = (section: ConfigurationSection, options: ParsedSelectiveOptions): boolean => {
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
  return includeSections.length > 0 ? `📋 Including only: ${includeSections.join(', ')}` : undefined;
};

const createExcludeMessage = (excludeSections: ConfigurationSection[]): string | undefined => {
  return excludeSections.length > 0 ? `📋 Excluding: ${excludeSections.join(', ')}` : undefined;
};

export const getSelectiveOptionsSummary = (options: ParsedSelectiveOptions): {
  includeMessage?: string;
  excludeMessage?: string;
} => {
  const { includeSections, excludeSections } = options;
  
  return {
    includeMessage: createIncludeMessage(includeSections),
    excludeMessage: createExcludeMessage(excludeSections)
  };
}; 