import type { DiffChange } from "./types";

/** Which side a comparison writes: deploy writes the config to Saleor, introspect the reverse. */
export type DiffDirection = "deploy" | "introspect";

/**
 * How a change reads to a user. Every formatter and the `description` on each change come from
 * here, so a change reads the same in `diff`, the deploy preview, introspect and PR comments.
 */
interface RenderedChange {
  /** Where the change is, e.g. `variants.TEE-S.weight`. */
  readonly label: string;
  /** What happens there: `"Shirts" → "Tees"`, `added`, `only in Saleor`. */
  readonly summary: string;
}

/**
 * `desiredValue` is always the side the command writes: the config for deploy, Saleor's state
 * for introspect. So a change always reads current → desired.
 */
function renderChange(change: DiffChange, direction: DiffDirection): RenderedChange {
  const label = changeLabel(change);
  switch (change.kind) {
    case "added":
      return { label, summary: withMemberValue("added", change.desiredValue, change) };
    case "removed":
      return {
        label,
        summary: withMemberValue(
          direction === "deploy" ? "only in Saleor" : "removed",
          change.currentValue,
          change
        ),
      };
    default:
      return {
        label,
        summary: `${formatValue(change.currentValue)} → ${formatValue(change.desiredValue)}`,
      };
  }
}

/** The change as one plain line, e.g. `metadata.erpid: (not set) → "41"`. */
export function describeChange(change: DiffChange, direction: DiffDirection): string {
  const { label, summary } = renderChange(change, direction);
  return `${label}: ${summary}`;
}

function changeLabel(change: DiffChange): string {
  return change.path.length > 0 ? change.path.join(".") : change.field;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "(not set)";
  if (typeof value === "string") return `"${value}"`;
  if (Array.isArray(value)) return `[${value.map(formatValue).join(", ")}]`;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** Adds a scalar member's value when its key doesn't already say it, e.g. `added (25)`. */
function withMemberValue(word: string, value: unknown, change: DiffChange): string {
  const isScalar = value !== null && value !== undefined && typeof value !== "object";
  const key = change.path.at(-1);
  return isScalar && String(value) !== key ? `${word} (${formatValue(value)})` : word;
}

/**
 * Renders an entity's changes, folding members added or removed under the same parent into one
 * line (`values: added Blue; only in Saleor Green`), so long lists of values stay readable.
 */
export function renderChanges(
  changes: readonly DiffChange[],
  direction: DiffDirection
): readonly RenderedChange[] {
  const membersByParent = new Map<string, DiffChange[]>();
  for (const change of changes) {
    if (isMemberChange(change)) {
      const parent = parentLabel(change);
      membersByParent.set(parent, [...(membersByParent.get(parent) ?? []), change]);
    }
  }

  const rendered: RenderedChange[] = [];
  const folded = new Set<string>();
  for (const change of changes) {
    const parent = isMemberChange(change) ? parentLabel(change) : undefined;
    const siblings = parent === undefined ? undefined : membersByParent.get(parent);
    if (parent === undefined || !siblings || siblings.length < 2) {
      rendered.push(renderChange(change, direction));
      continue;
    }
    if (folded.has(parent)) continue;
    folded.add(parent);
    const keys = (kind: DiffChange["kind"]) =>
      siblings
        .filter((member) => member.kind === kind)
        .map((member) =>
          withMemberValue(
            String(member.path.at(-1)),
            kind === "added" ? member.desiredValue : member.currentValue,
            member
          )
        );
    const groups = [
      ["added", keys("added")],
      [direction === "deploy" ? "only in Saleor" : "removed", keys("removed")],
    ] as const;
    rendered.push({
      label: parent,
      summary: groups
        .filter(([, members]) => members.length > 0)
        .map(([word, members]) => `${word} ${members.join(", ")}`)
        .join("; "),
    });
  }
  return rendered;
}

function isMemberChange(change: DiffChange): boolean {
  return (change.kind === "added" || change.kind === "removed") && change.path.length > 1;
}

function parentLabel(change: DiffChange): string {
  return change.path.slice(0, -1).join(".");
}
