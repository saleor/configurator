/** The part of a terminal spinner that other output has to step around. */
export interface TerminalSpinner {
  readonly isSpinning: boolean;
  clear(): unknown;
  render(): unknown;
}

let activeSpinner: TerminalSpinner | undefined;

/** Registers the spinner currently drawn on the terminal; the latest one started wins. */
export function trackSpinner(spinner: TerminalSpinner): void {
  activeSpinner = spinner;
}

/**
 * Writes output on its own line while a spinner is running: clears the spinner line,
 * writes, then redraws the spinner below it.
 */
export function writeAboveSpinner(write: () => void): void {
  const spinner = activeSpinner?.isSpinning ? activeSpinner : undefined;
  spinner?.clear();
  write();
  spinner?.render();
}
