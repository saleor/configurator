import chalk from "chalk";
import type { DuplicateIssue } from "../../core/validation/preflight";
import type { Console } from "../console";

function formatIssue(i: DuplicateIssue): string {
  const section = chalk.white(i.section);
  const id = chalk.cyan(`'${i.identifier}'`);
  const times = chalk.yellow(`${i.count} ${i.count === 1 ? "time" : "times"}`);
  return `• ${section}: ${chalk.white(i.label)} ${id} appears ${times}`;
}

export function printDuplicateIssues(
  issues: readonly DuplicateIssue[],
  c: Console,
  configPath?: string
): void {
  if (!issues || issues.length === 0) return;

  const header = `${c.icon("warning")} ${chalk.bold.white(
    "Duplicate identifiers found in your configuration"
  )}`;
  c.warn(header);
  c.text("");

  const lines = issues.map(formatIssue);
  c.box(lines, "Duplicates");

  const fixLines = [
    `${c.icon("fix")} ${chalk.white("Fix: Ensure each identifier is unique.")}`,
    `  ${chalk.white("- For products, the unique key is ")}${chalk.bold("slug")}`,
    `  ${chalk.white("- For channels and categories, the unique key is ")}${chalk.bold("slug")}`,
    `  ${chalk.white("- For types/zones, the unique key is ")}${chalk.bold("name")}`,
  ];
  c.text("");
  fixLines.forEach((l) => c.info(l));

  if (configPath) {
    c.hint(
      `Edit ${c.path(configPath)} and resolve duplicates, then re-run ${chalk.bold(
        "deploy"
      )} or ${chalk.bold("diff")}`
    );
  }
}
