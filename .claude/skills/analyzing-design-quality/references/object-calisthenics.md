# Object Calisthenics for TypeScript

Condensed rules adapted for the Saleor Configurator project.

## 1. Max 3 Levels of Nesting

Use guard clauses to flatten logic.

```typescript
// Bad: 4 levels
function deployEntity(entity: Entity, config: Config) {
  if (entity.isValid()) {
    if (config.dryRun) {
      if (entity.hasChanges()) {
        if (entity.type === 'product') {
          // deeply nested logic
        }
      }
    }
  }
}

// Good: guard clauses
function deployEntity(entity: Entity, config: Config) {
  if (!entity.isValid()) {
    throw new ValidationError('Invalid entity');
  }
  if (!config.dryRun) {
    return;
  }
  if (!entity.hasChanges()) {
    return;
  }
  if (entity.type !== 'product') {
    return;
  }
  // flat logic
}
```

## 2. No `else` After `return`

```typescript
// Bad
function getLabel(entity: Entity): string {
  if (entity.type === 'product') {
    return entity.name;
  } else {
    return entity.slug;
  }
}

// Good
function getLabel(entity: Entity): string {
  if (entity.type === 'product') {
    return entity.name;
  }
  return entity.slug;
}
```

## 3. No `forEach` — Use Functional Transforms

```typescript
// Bad
const results: string[] = [];
items.forEach(item => {
  results.push(item.name);
});

// Good
const results = items.map(item => item.name);

// Bad
items.forEach(item => {
  if (item.isActive) {
    process(item);
  }
});

// Good
const activeItems = items.filter(item => item.isActive);
for (const item of activeItems) {
  process(item);
}
```

## 4. No Parameter Reassignment

```typescript
// Bad
function formatName(name: string) {
  name = name.trim();
  name = name.toLowerCase();
  return name;
}

// Good
function formatName(name: string) {
  const trimmed = name.trim();
  return trimmed.toLowerCase();
}
```

## 5. One Responsibility per Function

```typescript
// Bad
async function syncEntity(entity: Entity) {
  // validates
  const errors = validateSchema(entity);
  if (errors.length > 0) throw new ValidationError(errors);

  // transforms
  const transformed = {
    ...entity,
    slug: entity.slug.toLowerCase(),
    updatedAt: new Date(),
  };

  // persists
  await repository.save(transformed);

  // logs
  logger.info(`Synced ${entity.slug}`);
}

// Good
function validateEntity(entity: Entity): ValidatedEntity {
  return EntitySchema.parse(entity);
}

function normalizeEntity(entity: ValidatedEntity): NormalizedEntity {
  return { ...entity, slug: entity.slug.toLowerCase(), updatedAt: new Date() };
}

async function persistEntity(entity: NormalizedEntity): Promise<void> {
  await repository.save(entity);
}
```

## 6. Functions ≤ 50 Lines

When a function grows beyond 50 lines, extract named sub-functions:

```typescript
// Bad: 80-line function
function buildDeploymentPlan(config: Config) {
  // 20 lines of validation
  // 30 lines of ordering
  // 30 lines of formatting
}

// Good: composed small functions
function buildDeploymentPlan(config: Config) {
  const validated = validateDeploymentConfig(config);
  const ordered = orderEntitiesByDependency(validated.entities);
  return formatDeploymentSteps(ordered);
}
```

## Summary

| Rule | Enforcement |
|------|-------------|
| Max 3 nesting levels | Guard clauses, early returns |
| No else after return | Early returns |
| No forEach | `map`/`filter`/`for...of` |
| No parameter reassign | New `const` variables |
| One responsibility | Extract named functions |
| ≤50 lines | Compose small functions |
