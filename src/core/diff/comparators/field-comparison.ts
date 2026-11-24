export interface FieldComparisonOptions {
  /**
   * Treat a field the local side leaves out as unmanaged: it is not compared, so the remote
   * value stays as it is. Set for deploy-direction diffs, where local is the config file and
   * deploy doesn't send fields the config omits.
   */
  readonly skipUnmanagedFields?: boolean;
}

/** Whether a field the local side leaves out should be left out of the comparison. */
export function isUnmanagedField(localValue: unknown, options?: FieldComparisonOptions): boolean {
  return options?.skipUnmanagedFields === true && localValue === undefined;
}

/**
 * Keeps only the remote fields the local side manages, so whole-record comparisons
 * (normalized listings) ignore fields the config leaves out.
 */
export function withoutUnmanagedFields(
  remote: Readonly<Record<string, unknown>>,
  local: Readonly<Record<string, unknown>>,
  options?: FieldComparisonOptions
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(remote).filter(([field]) => !isUnmanagedField(local[field], options))
  );
}
