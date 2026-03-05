/**
 * CI output mode detection for clean machine-readable output
 *
 * When CLI is running with --json or --github-comment flags, we suppress
 * decorative output (progress indicators, banners) for clean parseable output.
 */
type CiOutputFlag = `--${string}`;

export const CI_OUTPUT_FLAGS = [
  "--json",
  "--github-comment",
  "--githubComment",
] as const satisfies readonly CiOutputFlag[];

/**
 * Check if CLI is running in CI output mode (JSON, GitHub comment)
 */
export function isCiOutputMode(): boolean {
  return process.argv.some((arg) =>
    CI_OUTPUT_FLAGS.includes(arg as (typeof CI_OUTPUT_FLAGS)[number])
  );
}

/**
 * Returns true when running in a non-interactive environment where prompts
 * should be skipped automatically. Covers:
 * - Non-TTY stdin (pipes, CI runners, agent contexts)
 * - CI environment variable set (GitHub Actions, etc.)
 */
export function isNonInteractiveEnvironment(): boolean {
  return !process.stdin.isTTY || Boolean(process.env.CI);
}
