import { diffMetadata, readConfigMetadata } from "../../../modules/metadata/metadata";
import type { DiffChange, DiffChangeKind, DiffOptions } from "../types";
import { type FieldComparisonOptions, isUnmanagedField } from "./field-comparison";

/** Options every comparator receives from DiffService. */
export type ComparatorOptions = Pick<DiffOptions, "skipMedia" | "compareAllMetadataKeys"> &
  FieldComparisonOptions;

interface RecordedChange {
  /** Legacy `field` string; defaults to the path joined with dots. */
  readonly field?: string;
  readonly kind?: DiffChangeKind;
  readonly current: unknown;
  readonly desired: unknown;
  readonly description?: string;
}

/**
 * Collects the changes for one entity. Every change carries the path from the entity to the
 * changed value, so nested objects (a variant, a shipping method, a menu item) stay
 * identifiable wherever the change is shown.
 */
export class ChangeSet {
  private constructor(
    readonly options: ComparatorOptions,
    private readonly prefix: readonly string[],
    private readonly sink: DiffChange[]
  ) {}

  static create(options: ComparatorOptions = {}): ChangeSet {
    return new ChangeSet(options, [], []);
  }

  /** A change set for a nested object; its changes are recorded under `segments`. */
  at(...segments: string[]): ChangeSet {
    return new ChangeSet(this.options, [...this.prefix, ...segments], this.sink);
  }

  /** Records a change at `segments` below this change set's path. */
  record(segments: readonly string[], change: RecordedChange): void {
    const path = [...this.prefix, ...segments];
    this.sink.push({
      field: change.field ?? path.join("."),
      path,
      kind: change.kind ?? "changed",
      currentValue: change.current,
      desiredValue: change.desired,
      description:
        change.description ??
        `${change.field ?? path.join(".")}: "${serialize(change.current)}" → "${serialize(change.desired)}"`,
    });
  }

  /** Records a change when `desired` and `current` differ. */
  value(
    segment: string,
    desired: unknown,
    current: unknown,
    options: { readonly equals?: (a: unknown, b: unknown) => boolean; field?: string } = {}
  ): void {
    const equals = options.equals ?? Object.is;
    if (!equals(desired, current)) {
      this.record([segment], { field: options.field, current, desired });
    }
  }

  /**
   * Records a change when the values differ, unless the config leaves the field out and the
   * comparison treats absent fields as unmanaged (deploy direction).
   */
  managedValue(segment: string, desired: unknown, current: unknown, field?: string): void {
    if (isUnmanagedField(desired, this.options)) return;
    this.value(segment, desired, current, { field });
  }

  /** Records metadata keys that differ; see `diffMetadata` for which keys are compared. */
  metadata(desired: unknown, current: unknown): void {
    const changes = diffMetadata(readConfigMetadata(desired), readConfigMetadata(current), {
      includeUnlistedKeys: this.options.compareAllMetadataKeys ?? false,
    });
    const label = (value: string | undefined) => (value === undefined ? "(not set)" : `"${value}"`);
    for (const change of changes) {
      const field = [...this.prefix, "metadata", change.key].join(".");
      this.record(["metadata", change.key], {
        current: change.current ?? null,
        desired: change.desired ?? null,
        description: `${field}: ${label(change.current)} → ${label(change.desired)}`,
      });
    }
  }

  changes(): readonly DiffChange[] {
    return this.sink;
  }
}

function serialize(value: unknown): string {
  if (value === null || value === undefined) return String(value);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
