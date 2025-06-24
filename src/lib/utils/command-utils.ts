import { createClient } from "../graphql/client";
import { ServiceComposer } from "../../core/service-container";
import { SaleorConfigurator } from "../../core/configurator";
import { logger } from "../logger";
import * as fs from 'fs';
import * as path from 'path';

/**
 * Validates and suggests corrections for Saleor GraphQL URLs
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
  } catch (error) {
    throw new Error(`Invalid URL format: ${url}`);
  }
}

/**
 * Determines the error type based on error message patterns
 */
function getErrorType(errorMessage: string): string {
  const patterns: Record<string, string[]> = {
    'forbidden': ['GraphQL Error: Forbidden (403)', '[Network] Forbidden', '403'],
    'not-found': ['GraphQL Error: Not Found (404)', '[Network]', '404'],
    'connection-failed': ['GraphQL Error: Connection Failed', 'ENOTFOUND', 'ECONNREFUSED'],
    'unauthorized': ['GraphQL Error: Unauthorized (401)', 'Unauthorized', '401'],
    'config-error': ['ENOENT', 'config'],
    'network-error': ['fetch', 'network'],
  };

  for (const [type, matchPatterns] of Object.entries(patterns)) {
    if (matchPatterns.every(pattern => errorMessage.includes(pattern))) {
      return type;
    }
    if (matchPatterns.some(pattern => errorMessage.includes(pattern))) {
      return type;
    }
  }

  return 'unknown';
}

/**
 * Handles error display based on error type
 */
export function handleErrorDisplay(error: Error): void {
  const errorType = getErrorType(error.message);

  switch (errorType) {
    case 'forbidden':
    case 'not-found':
    case 'connection-failed':
    case 'unauthorized':
      console.error(`\n❌ ${error.message}`);
      break;

    case 'config-error':
      console.error(`\n❌ Error: ${error.message}`);
      console.error("💡 Make sure the config directory is writable");
      break;

    case 'network-error':
      console.error(`\n❌ Error: ${error.message}`);
      console.error("💡 Check your Saleor URL and network connection");
      break;

    default:
      console.error(`\n❌ Error: ${error.message}`);
      break;
  }
}

/**
 * Common configuration for command arguments
 */
export interface BaseCommandArgs {
  url: string;
  token: string;
  config: string;
  quiet: boolean;
  verbose: boolean;
}

/**
 * Sets up logger level based on command flags
 */
export function setupLogger(verbose: boolean, quiet: boolean): void {
  if (verbose) {
    process.env.LOG_LEVEL = "debug";
  } else if (quiet) {
    process.env.LOG_LEVEL = "error";
  }
}

/**
 * Displays configuration information
 */
export function displayConfig(args: BaseCommandArgs & Record<string, any>, quiet: boolean): void {
  if (quiet) return;

  console.log("📋 Configuration:");
  console.log(`   URL: ${args.url}`);
  console.log(`   Config: ${args.config}`);
  
  // Display additional args (format, filter, etc.)
  Object.entries(args).forEach(([key, value]) => {
    if (!['url', 'token', 'config', 'quiet', 'verbose'].includes(key) && value !== undefined) {
      console.log(`   ${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`);
    }
  });
  
  console.log("");
}

/**
 * Creates and configures a Saleor configurator
 */
export function createConfigurator(token: string, url: string, configPath: string): SaleorConfigurator {
  const client = createClient(token, url);
  const services = ServiceComposer.compose(client, configPath);
  return new SaleorConfigurator(services);
}

/**
 * Generic command error handler
 */
export function handleCommandError(error: unknown, commandName: string): void {
  logger.error(`${commandName} command failed`, { error });
  
  if (error instanceof Error) {
    handleErrorDisplay(error);
  } else {
    console.error("\n❌ An unexpected error occurred");
  }
  
  process.exit(1);
}

/**
 * Creates a backup file with timestamp
 */
export function createBackupPath(originalPath: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const parts = originalPath.split('.');
  const extension = parts.pop();
  const baseName = parts.join('.');
  return `${baseName}.backup.${timestamp}.${extension}`;
}

/**
 * Creates a backup of the specified file
 */
export async function createBackup(filePath: string): Promise<string | null> {
  try {
    if (!fs.existsSync(filePath)) {
      return null; // No file to backup
    }

    const backupPath = createBackupPath(filePath);
    await fs.promises.copyFile(filePath, backupPath);
    return backupPath;
  } catch (error) {
    logger.warn(`Failed to create backup of ${filePath}`, { error });
    return null;
  }
}

/**
 * Checks if a file exists
 */
export function fileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
} 