import { diffMetadata, readConfigMetadata } from "../../../modules/metadata/metadata";
import { type DiffDirection, describeChange } from "../render-change";
import type { DiffChange, DiffChangeKind, DiffOptions } from "../types";
import { type FieldComparisonOptions, isUnmanagedField } from "./field-comparison";

/** Options every comparator receives from DiffService. */
export type ComparatorOptions = Pick<DiffOptions, "skipMedia" | "compareAllMetadataKeys"> &
  FieldComparisonOptions & {
    /** Which side the command writes; only changes how each change's description reads. */
    readonly direction?: DiffDirection;
  };

interface ValueOptions {
  readonly equals?: (a: unknown, b: unknown) => boolean;
}

interface RecordedChange {
  readonly kind?: DiffChangeKind;
  readonly current: unknown;
  readonly desired: unknown;
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
    const recorded: DiffChange = {
      field: path.join("."),
      path,
      kind: change.kind ?? "changed",
      currentValue: change.current,
      desiredValue: change.desired,
    };
    this.sink.push({
      ...recorded,
      description: describeChange(recorded, this.options.direction ?? "deploy"),
    });
  }

  /** Records a change when `desired` and `current` differ. */
  value(segment: string, desired: unknown, current: unknown, options: ValueOptions = {}): void {
    const equals = options.equals ?? ((a: unknown, b: unknown) => a === b);
    if (!equals(desired, current)) {
      this.record([segment], { current, desired });
    }
  }

  /**
   * Records a change when the values differ, unless the config leaves the field out and the
   * comparison treats absent fields as unmanaged (deploy direction).
   */
  managedValue(
    segment: string,
    desired: unknown,
    current: unknown,
    options: ValueOptions = {}
  ): void {
    if (isUnmanagedField(desired, this.options)) return;
    this.value(segment, desired, current, options);
  }

  /** Records members of an unordered list that only one side has, e.g. `countries.SE: added`. */
  set(segment: string, desired: readonly string[], current: readonly string[]): void {
    const desiredSet = new Set(desired);
    const currentSet = new Set(current);
    for (const member of desiredSet) {
      if (!currentSet.has(member)) {
        this.record([segment, member], { kind: "added", current: undefined, desired: member });
      }
    }
    for (const member of currentSet) {
      if (!desiredSet.has(member)) {
        this.record([segment, member], { kind: "removed", current: member, desired: undefined });
      }
    }
  }

  /**
   * Compares two lists of records matched by `key`: records only one side has are added or
   * removed members; matched ones are compared with `compare` under their key.
   */
  members<T>(
    segment: string,
    desired: readonly T[],
    current: readonly T[],
    key: (item: T) => string,
    compare: (changes: ChangeSet, desired: T, current: T) => void
  ): void {
    const currentByKey = new Map(current.map((item) => [key(item), item]));
    const desiredKeys = new Set(desired.map(key));
    for (const item of desired) {
      const existing = currentByKey.get(key(item));
      if (existing === undefined) {
        this.record([segment, key(item)], { kind: "added", current: undefined, desired: item });
      } else {
        compare(this.at(segment, key(item)), item, existing);
      }
    }
    for (const item of current) {
      if (!desiredKeys.has(key(item))) {
        this.record([segment, key(item)], { kind: "removed", current: item, desired: undefined });
      }
    }
  }

  /** Records each key whose value differs between two flat records. */
  fields(desired: Readonly<Record<string, unknown>>, current: Readonly<Record<string, unknown>>) {
    for (const key of new Set([...Object.keys(desired), ...Object.keys(current)])) {
      if (JSON.stringify(desired[key]) !== JSON.stringify(current[key])) {
        this.record([key], { current: current[key], desired: desired[key] });
      }
    }
  }

  /** Records metadata keys that differ; see `diffMetadata` for which keys are compared. */
  metadata(desired: unknown, current: unknown): void {
    const changes = diffMetadata(readConfigMetadata(desired), readConfigMetadata(current), {
      includeUnlistedKeys: this.options.compareAllMetadataKeys ?? false,
    });
    for (const change of changes) {
      this.record(["metadata", change.key], { current: change.current, desired: change.desired });
    }
  }

  changes(): readonly DiffChange[] {
    return this.sink;
  }
}
