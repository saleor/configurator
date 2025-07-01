/**
 * CLI Help Display
 *
 * This module handles the display and rendering of help text to the console.
 * It provides utilities for showing help information in a user-friendly format.
 */

import type { HelpDisplayOptions } from "../errors/types";
import { generateHelpSections } from "./formatter";

/**
 * Display comprehensive help for a command
 * @param options - Help display options containing command name and schema
 */
export function displayHelp({ commandName, schema }: HelpDisplayOptions): void {
  const sections = generateHelpSections(commandName, schema);

  // Clear screen for better visibility (optional)
  // console.clear();

  console.log(`\n📖 ${commandName.toUpperCase()} Command Help\n`);

  sections.forEach((section) => {
    console.log(section);
  });

  // Add final separator for better readability
  console.log("─".repeat(60));
  console.log("");
}
