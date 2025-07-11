import { EntityValidationError } from "../errors";
import type { DiffChange, DiffResult, EntityType } from "../types";

/**
 * Base interface for entity comparators following Single Responsibility Principle
 * @template TLocal The type of the local entity
 * @template TRemote The type of the remote entity
 */
export interface EntityComparator<TLocal = unknown, TRemote = unknown> {
  /**
   * Compares local and remote entities and returns diff results
   * @param local Local entities from configuration
   * @param remote Remote entities from Saleor
   * @returns Array of diff results
   */
  compare(
    local: TLocal,
    remote: TRemote
  ): Promise<readonly DiffResult[]> | readonly DiffResult[];
}

/**
 * Abstract base class for entity comparators with common functionality
 * @template TLocal The type of local entities (usually arrays)
 * @template TRemote The type of remote entities (usually arrays)
 * @template TEntity The type of individual entities
 */
export abstract class BaseEntityComparator<
  TLocal,
  TRemote,
  TEntity extends Record<string, unknown>
> implements EntityComparator<TLocal, TRemote>
{
  /**
   * The entity type name for diff results
   */
  protected abstract readonly entityType: EntityType;

  /**
   * Compares local and remote entity collections
   */
  abstract compare(local: TLocal, remote: TRemote): readonly DiffResult[];

  /**
   * Gets the name/identifier of an entity
   * @param entity The entity to get the name from
   * @returns The entity name
   */
  protected abstract getEntityName(entity: TEntity): string;

  /**
   * Compares two entities of the same type and returns field changes
   * @param local Local entity
   * @param remote Remote entity
   * @returns Array of field changes
   */
  protected abstract compareEntityFields(
    local: TEntity,
    remote: TEntity
  ): DiffChange[];

  /**
   * Creates a map of entities by their names for efficient lookup
   * @param entities Array of entities
   * @returns Map of entity name to entity
   */
  protected createEntityMap(
    entities: readonly TEntity[]
  ): ReadonlyMap<string, TEntity> {
    return new Map(
      entities.map((entity) => [this.getEntityName(entity), entity])
    );
  }

  /**
   * Validates that entity names are unique within a collection
   * @param entities Array of entities to validate
   * @throws Error if duplicate names are found
   */
  protected validateUniqueNames(entities: readonly TEntity[]): void {
    const names = new Set<string>();
    const duplicates = new Set<string>();

    for (const entity of entities) {
      const name = this.getEntityName(entity);
      if (names.has(name)) {
        duplicates.add(name);
      }
      names.add(name);
    }

    if (duplicates.size > 0) {
      throw new EntityValidationError(
        `Duplicate entity names found in ${this.entityType}: ${Array.from(
          duplicates
        ).join(", ")}`
      );
    }
  }

  /**
   * Creates a CREATE diff result
   * @param entity The entity to create
   * @returns Diff result for creation
   */
  protected createCreateResult(entity: TEntity): DiffResult<TEntity> {
    return {
      operation: "CREATE",
      entityType: this.entityType,
      entityName: this.getEntityName(entity),
      desired: entity,
    };
  }

  /**
   * Creates an UPDATE diff result
   * @param local Local entity
   * @param remote Remote entity
   * @param changes Array of field changes
   * @returns Diff result for update
   */
  protected createUpdateResult(
    local: TEntity,
    remote: TEntity,
    changes: readonly DiffChange[]
  ): DiffResult {
    return {
      operation: "UPDATE",
      entityType: this.entityType,
      entityName: this.getEntityName(local),
      current: remote,
      desired: local,
      changes,
    };
  }

  /**
   * Creates a DELETE diff result
   * @param entity The entity to delete
   * @returns Diff result for deletion
   */
  protected createDeleteResult(entity: TEntity): DiffResult {
    return {
      operation: "DELETE",
      entityType: this.entityType,
      entityName: this.getEntityName(entity),
      current: entity,
    };
  }

  /**
   * Creates a field change object
   * @param field Field name
   * @param currentValue Current value from remote
   * @param desiredValue Desired value from local
   * @param description Optional description
   * @returns Field change object
   */
  protected createFieldChange(
    field: string,
    currentValue: unknown,
    desiredValue: unknown,
    description?: string
  ): DiffChange {
    return {
      field,
      currentValue,
      desiredValue,
      description:
        description || `${field}: "${currentValue}" → "${desiredValue}"`,
    };
  }
}
