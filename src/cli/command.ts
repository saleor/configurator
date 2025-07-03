import { Command } from '@commander-js/extra-typings';
import { input, password, confirm, select } from '@inquirer/prompts';
import { z } from 'zod';
import chalk from 'chalk';
import { cliConsole } from './console';

export const baseCommandArgsSchema = z.object({
  url: z.string({ required_error: "URL is required" }).describe("Saleor instance URL"),
  token: z.string({ required_error: "Token is required" }).describe("Saleor API token"),
  config: z.string().default("config.yml").describe("Configuration file path"),
  quiet: z.boolean().default(false).describe("Suppress output"),
});

export type BaseCommandArgs = z.infer<typeof baseCommandArgsSchema>;

/**
 * Prompts for missing required arguments interactively
 */
export async function promptForMissingArgs(
  args: Partial<BaseCommandArgs>, 
  requiredFields: Array<keyof BaseCommandArgs> = ['url', 'token']
): Promise<BaseCommandArgs> {
  const result = { ...args };
  
  // Prompt for URL if missing
  if (requiredFields.includes('url') && !result.url) {
    result.url = await input({
      message: 'Enter your Saleor instance URL:',
      validate: (value) => {
        if (!value) return 'URL is required';
        try {
          new URL(value);
          return true;
        } catch {
          return 'Please enter a valid URL (e.g., https://your-store.saleor.cloud/graphql/)';
        }
      },
      default: 'https://your-store.saleor.cloud/graphql/',
    });
  }
  
  // Prompt for token if missing  
  if (requiredFields.includes('token') && !result.token) {
    result.token = await password({
      message: 'Enter your Saleor API token:',
      validate: (value) => {
        if (!value) return 'Token is required';
        if (value.length < 10) return 'Token seems too short';
        return true;
      },
      mask: '*',
    });
  }
  
  // Set defaults for optional fields
  result.config = result.config || 'config.yml';
  result.quiet = result.quiet || false;
  
  return baseCommandArgsSchema.parse(result);
}

/**
 * Prompts for confirmation with enhanced messaging
 */
export async function confirmAction(
  message: string, 
  details?: string,
  defaultValue = false
): Promise<boolean> {
  if (details) {
    console.log(chalk.yellow(`\n${details}\n`));
  }
  
  return confirm({
    message,
    default: defaultValue,
  });
}

/**
 * Prompts for selection from a list of options
 */
export async function selectOption<T extends string>(
  message: string,
  choices: Array<{ name: string; value: T; description?: string }>
): Promise<T> {
  return select({
    message,
    choices,
  });
}

export interface CommandConfig<T extends z.ZodTypeAny> {
  name: string;
  description: string;
  schema: T;
  handler: (args: z.infer<T>) => Promise<void>;
  examples?: string[];
  requiresInteractive?: boolean;
}

/**
 * Creates a Commander.js command with enhanced TypeScript support and interactive prompts
 */
export function createCommand<T extends z.ZodTypeAny>(
  config: CommandConfig<T>
): Command {
  const command = new Command()
    .name(config.name)
    .description(config.description);

  // Add common options with short flags
  command
    .option('-u, --url <url>', 'Saleor instance URL')
    .option('-t, --token <token>', 'Saleor API token')  
    .option('-c, --config <file>', 'Configuration file path', 'config.yml')
    .option('-q, --quiet', 'Suppress output', false);

  // Add examples to help
  if (config.examples?.length) {
    const originalHelp = command.helpInformation.bind(command);
    command.helpInformation = () => {
      let help = originalHelp();
      help += `\n${chalk.bold('Examples:')}\n`;
      for (const example of config.examples!) {
        help += `${chalk.gray(`  ${example}`)}\n`;
      }
      return help;
    };
  }

  // Set action with interactive prompts and validation
  command.action(async (options: any) => {
    try {
      const console = cliConsole;
      
      // Handle interactive mode for missing arguments
      let validatedArgs: z.infer<T>;
      
      if (config.requiresInteractive && (!options.url || !options.token)) {
        console.info(chalk.blue('🔧 Interactive mode: Let\'s set up your configuration\n'));
        const interactiveArgs = await promptForMissingArgs(options);
        validatedArgs = config.schema.parse(interactiveArgs);
      } else {
        validatedArgs = config.schema.parse(options);
      }
      
      // Execute the command handler
      await config.handler(validatedArgs);
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error(chalk.red('❌ Invalid arguments:'));
        for (const issue of error.errors) {
          const path = issue.path.length ? `${issue.path.join('.')}: ` : '';
          console.error(chalk.red(`  • ${path}${issue.message}`));
        }
        
        // Suggest interactive mode for missing required fields
        const missingRequired = error.errors.some(e => 
          e.code === 'invalid_type' && ['url', 'token'].includes(e.path[0] as string)
        );
        
        if (missingRequired) {
          console.error(chalk.yellow('\n💡 Tip: Run without arguments for interactive mode'));
        }
        
        process.exit(1);
      } else if (error instanceof Error) {
        console.error(chalk.red(`❌ ${error.message}`));
        process.exit(1);
      } else {
        console.error(chalk.red(`❌ Unknown error: ${String(error)}`));
        process.exit(1);
      }
    }
  });

  return command;
}

/**
 * Validates and normalizes a Saleor URL
 */
export function validateSaleorUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);
    
    // Auto-append /graphql/ if missing
    if (!parsedUrl.pathname.endsWith('/graphql/')) {
      if (parsedUrl.pathname.endsWith('/')) {
        parsedUrl.pathname += 'graphql/';
      } else {
        parsedUrl.pathname += '/graphql/';
      }
    }
    
    return parsedUrl.toString();
  } catch {
    throw new Error(`Invalid URL format: ${url}. Expected format: https://your-store.saleor.cloud/graphql/`);
  }
}

/**
 * Enhanced schema with URL validation and normalization
 */
export const baseCommandArgsSchemaWithValidation = baseCommandArgsSchema.extend({
  url: z.string()
    .describe("Saleor instance URL")
    .transform(validateSaleorUrl),
});

export type BaseCommandArgsWithValidation = z.infer<typeof baseCommandArgsSchemaWithValidation>; 