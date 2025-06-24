import * as readline from 'readline';

/**
 * Interactive prompt utilities for better CLI experience
 */

export interface PromptOptions {
  message: string;
  defaultValue?: boolean;
  type?: 'confirm' | 'select';
  choices?: string[];
}

/**
 * Creates a readline interface for user input
 */
function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Prompts user for confirmation (y/n)
 */
export async function confirmPrompt(message: string, defaultValue = false): Promise<boolean> {
  const rl = createInterface();
  const defaultText = defaultValue ? '[Y/n]' : '[y/N]';
  
  return new Promise((resolve) => {
    rl.question(`${message} ${defaultText}: `, (answer) => {
      rl.close();
      
      const normalized = answer.toLowerCase().trim();
      if (normalized === '') {
        resolve(defaultValue);
      } else if (normalized === 'y' || normalized === 'yes') {
        resolve(true);
      } else if (normalized === 'n' || normalized === 'no') {
        resolve(false);
      } else {
        // Invalid input, use default
        resolve(defaultValue);
      }
    });
  });
}

/**
 * Prompts user to select from multiple options
 */
export async function selectPrompt(message: string, choices: string[]): Promise<string> {
  const rl = createInterface();
  
  console.log(`\n${message}`);
  choices.forEach((choice, index) => {
    console.log(`  ${index + 1}. ${choice}`);
  });
  
  return new Promise((resolve) => {
    rl.question('\nSelect an option (number): ', (answer) => {
      rl.close();
      
      const index = parseInt(answer) - 1;
      if (index >= 0 && index < choices.length) {
        resolve(choices[index]);
      } else {
        // Invalid selection, default to first choice
        resolve(choices[0]);
      }
    });
  });
}

/**
 * Displays a formatted diff summary
 */
export function displayDiffSummary(summary: {
  totalChanges: number;
  creates: number;
  updates: number;
  deletes: number;
}): void {
  if (summary.totalChanges === 0) {
    console.log("\n✅ No differences found - configurations are already in sync");
    return;
  }

  console.log(`\n📊 Configuration Differences Summary:`);
  console.log(`   Total Changes: ${summary.totalChanges}`);
  
  if (summary.creates > 0) {
    console.log(`   🟢 Creates: ${summary.creates}`);
  }
  if (summary.updates > 0) {
    console.log(`   🟡 Updates: ${summary.updates}`);
  }
  if (summary.deletes > 0) {
    console.log(`   🔴 Deletes: ${summary.deletes}`);
  }
  console.log("");
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