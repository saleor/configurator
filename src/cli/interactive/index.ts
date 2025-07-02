/**
 * CLI Interactive Utilities
 * 
 * This module provides interactive prompt functionality for better CLI user experience,
 * including confirmation prompts, selection menus, diff display, and deployment approval workflows.
 */

import * as readline from 'readline';

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
 * @param message - The question to ask the user
 * @param defaultValue - Default value if user just presses enter
 * @returns Promise resolving to the user's choice
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
 * Enhanced deployment confirmation with destructive change warnings
 * @param options - Deployment confirmation options
 * @returns Promise resolving to user's deployment decision
 */
export async function deploymentConfirmationPrompt(options: {
  totalChanges: number;
  creates: number;
  updates: number;
  deletes: number;
  hasDestructiveChanges: boolean;
  affectedResources?: string[];
  environment?: string;
}): Promise<'proceed' | 'plan' | 'cancel'> {
  const { totalChanges, creates, updates, deletes, hasDestructiveChanges, affectedResources, environment } = options;
  
  console.log('\n📋 Deployment Confirmation');
  console.log('═'.repeat(50));
  
  if (environment) {
    console.log(`🎯 Environment: ${environment}`);
  }
  
  console.log(`📊 Changes Summary:`);
  console.log(`   Total: ${totalChanges} changes`);
  if (creates > 0) console.log(`   🟢 Creates: ${creates}`);
  if (updates > 0) console.log(`   🟡 Updates: ${updates}`);
  if (deletes > 0) console.log(`   🔴 Deletes: ${deletes}`);
  
  if (hasDestructiveChanges) {
    console.log('\n⚠️  DESTRUCTIVE CHANGES DETECTED');
    console.log('   This deployment will modify or delete existing resources.');
    console.log('   Please review carefully before proceeding.');
  }
  
  if (affectedResources && affectedResources.length > 0) {
    console.log('\n📝 Affected Resources:');
    affectedResources.slice(0, 5).forEach(resource => {
      console.log(`   • ${resource}`);
    });
    if (affectedResources.length > 5) {
      console.log(`   ... and ${affectedResources.length - 5} more`);
    }
  }
  
  console.log('\n🤔 What would you like to do?');
  
  const choices = [
    'Proceed with deployment',
    'Show detailed plan first',
    'Cancel deployment'
  ];
  
  const selection = await selectPrompt('Choose an action:', choices);
  
  switch (selection) {
    case 'Proceed with deployment':
      return 'proceed';
    case 'Show detailed plan first':
      return 'plan';
    case 'Cancel deployment':
    default:
      return 'cancel';
  }
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

/**
 * Enhanced deployment summary with better formatting
 * @param summary - The deployment summary data
 * @param environment - Optional environment name
 */
export function displayDeploymentSummary(
  summary: DiffSummary & { 
    duration?: number; 
    successful?: boolean;
    errors?: string[];
  }, 
  environment?: string
): void {
  const { totalChanges, creates, updates, deletes, duration, successful, errors } = summary;
  
  console.log(`\n${'═'.repeat(60)}`);
  console.log('📊 DEPLOYMENT SUMMARY');
  console.log('═'.repeat(60));
  
  if (environment) {
    console.log(`🎯 Environment: ${environment}`);
  }
  
  console.log(`📈 Changes Applied: ${totalChanges}`);
  if (creates > 0) console.log(`   🟢 Created: ${creates} resources`);
  if (updates > 0) console.log(`   🟡 Updated: ${updates} resources`);
  if (deletes > 0) console.log(`   🔴 Deleted: ${deletes} resources`);
  
  if (duration) {
    console.log(`⏱️  Duration: ${(duration / 1000).toFixed(2)}s`);
  }
  
  console.log(`${successful ? '✅' : '❌'} Status: ${successful ? 'SUCCESS' : 'FAILED'}`);
  
  if (errors && errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach(error => {
      console.log(`   • ${error}`);
    });
  }
  
  console.log('═'.repeat(60));
  console.log('');
} 