/**
 * CLI Validation Utilities
 * 
 * This module contains validation functions specific to CLI operations,
 * including URL validation, format checking, and input sanitization.
 */

/**
 * Validates and suggests corrections for Saleor GraphQL URLs
 * @param url - The URL to validate
 * @param quiet - Whether to suppress warning messages
 * @returns The validated and potentially corrected URL
 */
export function validateSaleorUrl(url: string, quiet: boolean = false): string {
  try {
    const urlObj = new URL(url);
    
    if (!urlObj.pathname.includes('/graphql')) {
      const correctedUrl = url.endsWith('/') 
        ? `${url}graphql/` 
        : `${url}/graphql/`;
      
      if (!quiet) {
        console.warn(`\n⚠️  Warning: URL missing GraphQL endpoint`);
        console.warn(`   Original: ${url}`);
        console.warn(`   Using: ${correctedUrl}\n`);
      }
      
      return correctedUrl;
    }
    
    return url;
  } catch {
    throw new Error(`Invalid URL format: ${url}`);
  }
}

/**
 * Validates configuration file path format
 * @param configPath - Path to validate
 * @returns True if the path appears valid
 */
export function validateConfigPath(configPath: string): boolean {
  // Basic validation - could be enhanced
  return configPath.length > 0 && !configPath.includes('\0');
}

/**
 * Validates command format options
 * @param format - Format string to validate
 * @param allowedFormats - Array of allowed format values
 * @returns True if format is valid
 */
export function validateFormat(format: string, allowedFormats: string[]): boolean {
  return allowedFormats.includes(format);
} 