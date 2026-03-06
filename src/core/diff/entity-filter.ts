import type { DiffResult, DiffSummary, EntityType } from "./types";
import { ENTITY_TYPES } from "./types";

export interface EntityFilterOptions {
  entityType?: string;
  entity?: string;
}

function isEntityType(value: string): value is EntityType {
  return (ENTITY_TYPES as readonly string[]).includes(value);
}

function validateEntityType(value: string): EntityType {
  if (!isEntityType(value)) {
    throw new Error(
      `Invalid entity type "${value}". Valid types: ${ENTITY_TYPES.join(", ")}`
    );
  }
  return value;
}

export function filterDiffResults(summary: DiffSummary, options: EntityFilterOptions): DiffSummary {
  if (!options.entityType && !options.entity) return summary;

  let filtered: readonly DiffResult[];

  if (options.entity) {
    if (!options.entity.includes("/")) {
      throw new Error(
        `Invalid --entity format "${options.entity}". Expected "EntityType/name" (e.g., "Categories/electronics")`
      );
    }
    const [type, ...nameParts] = options.entity.split("/");
    const entityType = validateEntityType(type);
    const name = nameParts.join("/");
    if (!name) {
      throw new Error(
        `Invalid --entity format "${options.entity}". Entity name cannot be empty (e.g., "Categories/electronics")`
      );
    }
    filtered = summary.results.filter((r) => r.entityType === entityType && r.entityName === name);
  } else if (options.entityType) {
    const entityType = validateEntityType(options.entityType);
    filtered = summary.results.filter((r) => r.entityType === entityType);
  } else {
    // Unreachable: early return at line 23 guarantees at least one option is set
    return summary;
  }

  const counts = filtered.reduce(
    (acc, r) => {
      if (r.operation === "CREATE") acc.creates++;
      else if (r.operation === "UPDATE") acc.updates++;
      else if (r.operation === "DELETE") acc.deletes++;
      return acc;
    },
    { creates: 0, updates: 0, deletes: 0 }
  );

  return {
    totalChanges: counts.creates + counts.updates + counts.deletes,
    ...counts,
    results: filtered,
  };
}
