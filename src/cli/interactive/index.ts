/**
 * CLI Interactive Utilities
 *
 * This module provides interactive prompt functionality for better CLI user experience,
 * including confirmation prompts, selection menus, and diff display.
 */

import * as readline from "readline";

export interface PromptOptions {
  message: string;
  defaultValue?: boolean;
  type?: "confirm" | "select";
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
 * @param message - The question to ask the user
 * @param defaultValue - Default value if user just presses enter
 * @returns Promise resolving to the user's choice
 */
export async function confirmPrompt(message: string, defaultValue = false): Promise<boolean> {
  const rl = createInterface();
  const defaultText = defaultValue ? "[Y/n]" : "[y/N]";

  return new Promise((resolve) => {
    rl.question(`${message} ${defaultText}: `, (answer) => {
      rl.close();

      const normalized = answer.toLowerCase().trim();
      if (normalized === "") {
        resolve(defaultValue);
      } else if (normalized === "y" || normalized === "yes") {
        resolve(true);
      } else if (normalized === "n" || normalized === "no") {
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
 * @param message - The prompt message
 * @param choices - Array of choices to select from
 * @returns Promise resolving to the selected choice
 */
export async function selectPrompt(message: string, choices: string[]): Promise<string> {
  const rl = createInterface();

  console.log(`\n${message}`);
  choices.forEach((choice, index) => {
    console.log(`  ${index + 1}. ${choice}`);
  });

  return new Promise((resolve) => {
    rl.question("\nSelect an option (number): ", (answer) => {
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
 * Interface for diff summary data
 */
export interface DiffSummary {
  totalChanges: number;
  creates: number;
  updates: number;
  deletes: number;
}

/**
 * Displays a formatted diff summary
 * @param summary - The diff summary data to display
 */
export function displayDiffSummary(summary: DiffSummary): void {
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
