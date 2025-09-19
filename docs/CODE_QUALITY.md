# Code Quality and Best Practices Guide

Comprehensive guide for writing clean, maintainable, and high-quality TypeScript code in the Saleor Configurator project. This guide emphasizes functional programming, type safety, declarative naming, and modern TypeScript features.

## Core Quality Principles

### 1. **Type Safety First**
- Use strict TypeScript configuration with no escape hatches
- Leverage advanced TypeScript features for better code safety
- Prefer type inference over explicit typing where clear
- Use branded types for domain modeling

### 2. **Functional Programming Approach**  
- Write small, pure functions with single responsibility
- Prefer immutable data structures and operations
- Use composition over inheritance
- Embrace declarative programming patterns

### 3. **Clean Code Fundamentals**
- Functions should do one thing and do it well
- Use meaningful, declarative names for variables and functions
- Keep functions small (ideally 10-20 lines maximum)
- Minimize cognitive complexity

### 4. **Zod-First Development**
- Define schemas before implementing logic
- Use Zod for runtime validation and TypeScript inference
- Share validation logic between runtime and tests
- Create reusable schema patterns

## TypeScript Best Practices

### Advanced Type System Usage

**Branded Types for Domain Safety:**
```typescript
// ✅ Use branded types for domain-specific values
type EntitySlug = string & { readonly __brand: unique symbol };
type EntityName = string & { readonly __brand: unique symbol };

function createEntitySlug(value: string): EntitySlug {
  if (!value.match(/^[a-z0-9-]+$/)) {
    throw new EntityValidationError('Invalid slug format');
  }
  return value as EntitySlug;
}

// ✅ Type-safe entity identification
interface Category {
  name: EntityName;
  slug: EntitySlug;
  parent?: EntitySlug;
}
```

**Utility Types and Type Guards:**
```typescript
// ✅ Create specific utility types
type EntityWithSlug = { slug: string };
type EntityWithName = { name: string };
type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// ✅ Type guard patterns
function isSlugBasedEntity(entity: unknown): entity is EntityWithSlug {
  return typeof entity === 'object' && entity !== null && 'slug' in entity;
}

function hasRequiredSlug<T extends EntityWithSlug>(
  entity: T
): entity is RequiredFields<T, 'slug'> {
  return entity.slug.length > 0;
}
```

**Discriminated Unions for Better Modeling:**
```typescript
// ✅ Model different entity types with discriminated unions
type EntityIdentifier = 
  | { type: 'slug'; value: EntitySlug }
  | { type: 'name'; value: EntityName }
  | { type: 'singleton' };

function getEntityIdentifier(entityType: string): EntityIdentifier {
  switch (entityType) {
    case 'categories':
    case 'products':
    case 'collections':
      return { type: 'slug', value: '' as EntitySlug };
    case 'productTypes':
    case 'pageTypes':
      return { type: 'name', value: '' as EntityName };
    case 'shop':
      return { type: 'singleton' };
    default:
      throw new EntityValidationError(`Unknown entity type: ${entityType}`);
  }
}
```

### Strict Configuration Enforcement

**Never Allow These:**
```typescript
// ❌ NEVER use any in production code
const result: any = someOperation(); // Forbidden

// ❌ NEVER use non-null assertion without strong justification
const value = maybeUndefined!; // Avoid unless absolutely necessary

// ❌ NEVER use function declarations in modules
function myFunction() {} // Use const myFunction = () => {}

// ❌ NEVER use var
var oldStyle = true; // Use const/let only
```

**Always Prefer These:**
```typescript
// ✅ Use const assertions for immutable data
const ENTITY_TYPES = ['categories', 'products', 'collections'] as const;
type EntityType = typeof ENTITY_TYPES[number];

// ✅ Use readonly for immutable interfaces
interface ReadonlyCategory {
  readonly name: string;
  readonly slug: string;
  readonly children?: readonly ReadonlyCategory[];
}

// ✅ Use arrow functions for consistency
const processEntity = async (entity: EntityInput): Promise<EntityResult> => {
  // Implementation
};

// ✅ Use template literals
const errorMessage = `Entity ${entityName} validation failed: ${reason}`;
```

## Functional Programming Patterns

### Pure Functions and Immutability

**Pure Function Examples:**
```typescript
// ✅ Pure function - no side effects, deterministic
const generateSlug = (name: string): EntitySlug => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') as EntitySlug;
};

// ✅ Pure transformation function
const enrichEntityWithSlug = <T extends { name: string }>(
  entity: T
): T & { slug: EntitySlug } => ({
  ...entity,
  slug: generateSlug(entity.name),
});

// ✅ Pure validation function
const validateEntityUniqueness = (
  entities: ReadonlyArray<{ slug: string }>,
  newEntity: { slug: string }
): ValidationResult => {
  const isDuplicate = entities.some(entity => entity.slug === newEntity.slug);
  
  return {
    isValid: !isDuplicate,
    errors: isDuplicate ? [`Duplicate slug: ${newEntity.slug}`] : [],
  };
};
```

**Immutable Data Operations:**
```typescript
// ✅ Use immutable array operations
const addEntityToCollection = <T>(
  collection: ReadonlyArray<T>,
  newEntity: T
): ReadonlyArray<T> => [...collection, newEntity];

const updateEntityInCollection = <T extends { slug: string }>(
  collection: ReadonlyArray<T>,
  updatedEntity: T
): ReadonlyArray<T> => 
  collection.map(entity => 
    entity.slug === updatedEntity.slug ? updatedEntity : entity
  );

// ✅ Immutable object updates
const updateEntityMetadata = <T extends Record<string, unknown>>(
  entity: T,
  metadata: Record<string, unknown>
): T => ({
  ...entity,
  metadata: {
    ...('metadata' in entity ? entity.metadata as Record<string, unknown> : {}),
    ...metadata,
  },
});
```

### Composition Over Inheritance

**Function Composition Patterns:**
```typescript
// ✅ Compose small functions into larger operations
const pipe = <T>(...functions: Array<(arg: T) => T>) => (input: T): T =>
  functions.reduce((acc, fn) => fn(acc), input);

// ✅ Entity processing pipeline
const processEntityPipeline = pipe(
  validateEntityInput,
  enrichEntityWithDefaults,
  generateEntitySlug,
  assignEntityTimestamps
);

// ✅ Higher-order functions for reusable logic
const withErrorHandling = <T extends readonly unknown[], R>(
  operation: (...args: T) => Promise<R>
) => async (...args: T): Promise<R> => {
  try {
    return await operation(...args);
  } catch (error) {
    if (error instanceof BaseError) {
      throw error;
    }
    throw new UnknownError(`Operation failed: ${error}`);
  }
};
```

## Zod-First Development

### Schema Definition Patterns

**Comprehensive Schema Design:**
```typescript
// ✅ Build schemas from primitives
const EntitySlugSchema = z
  .string()
  .min(1, 'Slug is required')
  .max(50, 'Slug must be less than 50 characters')
  .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
  .transform((value) => value as EntitySlug);

const EntityNameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must be less than 100 characters')
  .transform((value) => value.trim() as EntityName);

// ✅ Compose reusable schema patterns
const BaseEntitySchema = z.object({
  name: EntityNameSchema,
  description: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// ✅ Entity-specific schemas extend base
const CategorySchema = BaseEntitySchema.extend({
  slug: EntitySlugSchema,
  parent: EntitySlugSchema.optional(),
  isVisible: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional(),
});

// ✅ Use discriminated unions for variant types
const EntityInputSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('category'),
    data: CategorySchema,
  }),
  z.object({
    type: z.literal('product'),
    data: ProductSchema,
  }),
]);
```

**Schema Validation and Error Handling:**
```typescript
// ✅ Centralized validation with detailed errors
const validateWithDetailedErrors = <T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context: string
): T => {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    const errorDetails = result.error.issues.map(issue => ({
      path: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));
    
    throw new EntityValidationError(
      `Validation failed for ${context}`,
      errorDetails
    );
  }
  
  return result.data;
};

// ✅ Schema-driven type inference
type CategoryInput = z.infer<typeof CategorySchema>;
type EntityInput = z.infer<typeof EntityInputSchema>;

// ✅ Schema reuse in tests
const createValidCategory = (overrides: Partial<CategoryInput> = {}): CategoryInput => {
  const baseCategory: CategoryInput = {
    name: 'Test Category' as EntityName,
    slug: 'test-category' as EntitySlug,
    description: 'A test category',
    isVisible: true,
  };
  
  return CategorySchema.parse({ ...baseCategory, ...overrides });
};
```

## Clean Code Practices

### Function Design Principles

**Single Responsibility Functions:**
```typescript
// ✅ Each function has one clear purpose
const extractEntitySlugFromInput = (input: EntityInput): EntitySlug => {
  if (!input.slug) {
    throw new EntityValidationError('Entity must have a slug');
  }
  return input.slug;
};

const validateSlugUniqueness = (
  existingSlugs: ReadonlyArray<EntitySlug>,
  newSlug: EntitySlug
): void => {
  if (existingSlugs.includes(newSlug)) {
    throw new EntityValidationError(`Slug already exists: ${newSlug}`);
  }
};

const createEntityFromInput = async (
  input: EntityInput,
  repository: EntityRepository
): Promise<Entity> => {
  const slug = extractEntitySlugFromInput(input);
  const existingEntity = await repository.findBySlug(slug);
  
  if (existingEntity) {
    throw new EntityAlreadyExistsError(`Entity with slug ${slug} already exists`);
  }
  
  return repository.create(input);
};
```

**Declarative Naming Conventions:**
```typescript
// ✅ Function names describe what they do, not how
const isEntitySlugUnique = async (slug: EntitySlug): Promise<boolean> => {
  // Implementation
};

const findEntitiesByCategory = (category: EntitySlug): Promise<Entity[]> => {
  // Implementation  
};

const transformRemoteEntityToLocal = (remoteEntity: RemoteEntity): LocalEntity => {
  // Implementation
};

// ✅ Variable names are descriptive and context-specific
const categoriesToProcess = await fetchPendingCategories();
const validatedCategoryInputs = categoriesToProcess.map(validateCategoryInput);
const processedCategoryResults = await Promise.all(
  validatedCategoryInputs.map(processCategoryInput)
);
```

### Error Handling Patterns

**Comprehensive Error Design:**
```typescript
// ✅ Specific error types with context
class EntityValidationError extends BaseError {
  constructor(
    message: string,
    public readonly validationIssues: ValidationIssue[] = []
  ) {
    super(message, 'ENTITY_VALIDATION_ERROR');
  }
  
  get isRecoverable(): boolean {
    return true;
  }
  
  getSuggestions(): string[] {
    return [
      'Check the entity configuration against the schema',
      'Verify all required fields are present',
      'Ensure field values match expected formats',
    ];
  }
}

// ✅ Result type for operations that can fail
type OperationResult<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

const safeEntityOperation = async <T>(
  operation: () => Promise<T>
): Promise<OperationResult<T, BaseError>> => {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    const baseError = error instanceof BaseError 
      ? error 
      : new UnknownError(`Unexpected error: ${error}`);
    return { success: false, error: baseError };
  }
};
```

## Service Architecture Patterns

### Clean Service Design

**Service Interface Definition:**
```typescript
// ✅ Interface segregation - specific, focused interfaces
interface EntityValidator<T> {
  validateInput(input: unknown): Promise<T>;
  validateUniqueness(entity: T): Promise<void>;
}

interface EntityRepository<T, TInput> {
  findBySlug(slug: EntitySlug): Promise<T | null>;
  create(input: TInput): Promise<T>;
  update(slug: EntitySlug, input: Partial<TInput>): Promise<T>;
  delete(slug: EntitySlug): Promise<void>;
}

interface EntityService<T, TInput> {
  processEntity(input: TInput): Promise<T>;
  validateEntity(input: unknown): Promise<TInput>;
}
```

**Service Implementation Pattern:**
```typescript
// ✅ Dependency injection with clear dependencies
class CategoryService implements EntityService<Category, CategoryInput> {
  constructor(
    private readonly validator: EntityValidator<CategoryInput>,
    private readonly repository: EntityRepository<Category, CategoryInput>,
    private readonly logger: Logger
  ) {}
  
  // ✅ Public methods are simple orchestration
  async processEntity(input: CategoryInput): Promise<Category> {
    const validatedInput = await this.validateEntity(input);
    await this.validator.validateUniqueness(validatedInput);
    
    return this.repository.create(validatedInput);
  }
  
  async validateEntity(input: unknown): Promise<CategoryInput> {
    return this.validator.validateInput(input);
  }
  
  // ✅ Private methods handle specific concerns
  private async ensureSlugUniqueness(slug: EntitySlug): Promise<void> {
    const existing = await this.repository.findBySlug(slug);
    if (existing) {
      throw new EntityAlreadyExistsError(`Category with slug ${slug} already exists`);
    }
  }
}
```

## Testing Best Practices

### Test Structure and Quality

**Test Organization:**
```typescript
describe('CategoryService', () => {
  let categoryService: CategoryService;
  let mockValidator: EntityValidator<CategoryInput>;
  let mockRepository: EntityRepository<Category, CategoryInput>;
  
  beforeEach(() => {
    // ✅ Use actual service types, not mock interfaces
    mockValidator = {
      validateInput: vi.fn(),
      validateUniqueness: vi.fn(),
    } as EntityValidator<CategoryInput>;
    
    mockRepository = {
      findBySlug: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    } as EntityRepository<Category, CategoryInput>;
    
    categoryService = new CategoryService(
      mockValidator,
      mockRepository,
      createTestLogger()
    );
  });
  
  describe('processEntity', () => {
    it('should successfully create category when input is valid', async () => {
      // ✅ Use schema-generated test data
      const validInput = createValidCategory({
        name: 'Electronics' as EntityName,
        slug: 'electronics' as EntitySlug,
      });
      
      const expectedCategory: Category = {
        ...validInput,
        id: 'cat-1',
        createdAt: new Date(),
      };
      
      // ✅ Setup mocks with proper typing
      vi.mocked(mockValidator.validateInput).mockResolvedValue(validInput);
      vi.mocked(mockValidator.validateUniqueness).mockResolvedValue();
      vi.mocked(mockRepository.create).mockResolvedValue(expectedCategory);
      
      // ✅ Act and assert
      const result = await categoryService.processEntity(validInput);
      
      expect(result).toEqual(expectedCategory);
      expect(mockValidator.validateInput).toHaveBeenCalledWith(validInput);
      expect(mockRepository.create).toHaveBeenCalledWith(validInput);
    });
    
    it('should throw EntityValidationError when input is invalid', async () => {
      // ✅ Test error scenarios explicitly
      const invalidInput = { name: '' }; // Missing required fields
      const validationError = new EntityValidationError('Invalid input');
      
      vi.mocked(mockValidator.validateInput).mockRejectedValue(validationError);
      
      await expect(categoryService.processEntity(invalidInput as CategoryInput))
        .rejects.toThrow(EntityValidationError);
    });
  });
});
```

**Schema Reuse in Tests:**
```typescript
// ✅ Create test data builders using schemas
class CategoryTestBuilder {
  private data: Partial<CategoryInput> = {};
  
  withName(name: string): this {
    this.data.name = name as EntityName;
    return this;
  }
  
  withSlug(slug: string): this {
    this.data.slug = slug as EntitySlug;
    return this;
  }
  
  withParent(parent: string): this {
    this.data.parent = parent as EntitySlug;
    return this;
  }
  
  build(): CategoryInput {
    const defaultData: CategoryInput = {
      name: 'Test Category' as EntityName,
      slug: 'test-category' as EntitySlug,
      isVisible: true,
    };
    
    return CategorySchema.parse({ ...defaultData, ...this.data });
  }
}

// ✅ Use builders in tests
const category = new CategoryTestBuilder()
  .withName('Electronics')
  .withSlug('electronics')
  .build();
```

## Code Quality Checklist

### Pre-Commit Quality Gates

**MANDATORY Quality Checklist:**

```bash
# ✅ 1. Auto-fix code style and imports
pnpm check:fix

# ✅ 2. Verify TypeScript compilation with strict checking
pnpm build
npx tsc --noEmit

# ✅ 3. Run comprehensive test suite
pnpm test

# ✅ 4. Final validation check
pnpm check:ci
```

### Code Review Checklist

**Type Safety:**
- [ ] No `any` types in production code
- [ ] Proper type guards for runtime validation
- [ ] Branded types used for domain-specific values
- [ ] Union types preferred over inheritance

**Function Quality:**
- [ ] Functions are pure where possible
- [ ] Single responsibility principle followed
- [ ] Functions are small (< 20 lines ideally)
- [ ] Meaningful, declarative names used

**Zod Integration:**
- [ ] Schemas defined for all data structures
- [ ] Runtime validation uses Zod schemas
- [ ] Test data generated from schemas
- [ ] Type inference used from schemas

**Error Handling:**
- [ ] Specific error types for different scenarios
- [ ] Errors extend BaseError
- [ ] Error messages are actionable
- [ ] Recovery suggestions provided where applicable

**Testing:**
- [ ] Comprehensive test coverage (>90%)
- [ ] Both positive and negative test cases
- [ ] Integration tests for cross-module functionality
- [ ] Schema validation tested with invalid inputs

### Performance Considerations

**Efficient Patterns:**
```typescript
// ✅ Use readonly for immutable data
const SUPPORTED_ENTITY_TYPES = [
  'categories',
  'products', 
  'collections'
] as const;

// ✅ Prefer `Map` for frequent lookups
const entityIndexBySlug = new Map(
  entities.map(entity => [entity.slug, entity])
);

// ✅ Use lazy evaluation for expensive operations
const memoizedValidator = memoize((schema: z.ZodSchema) => 
  (data: unknown) => schema.parse(data)
);
```

**Avoid Performance Anti-patterns:**
```typescript
// ❌ Don't create functions in render/loop contexts
entities.map(entity => {
  return processEntity(entity); // ✅ Good - function reference
});

// ❌ Avoid unnecessary object creation
const result = entities.reduce((acc, entity) => {
  return { ...acc, [entity.slug]: entity }; // ❌ Creates new object each time
}, {});

// ✅ Use Map for better performance
const result = entities.reduce((acc, entity) => {
  acc.set(entity.slug, entity); // ✅ Mutates existing Map
  return acc;
}, new Map());
```

## GraphQL & External Integrations

### Operation Authoring Standards
- Use `gql.tada` tagged templates for every query/mutation so TypeScript infers the response shape. Store operations in `src/lib/graphql/operations` and keep fragments close to their domain modules.
- Regenerate `schema.json` with `pnpm fetch-schema` whenever Saleor introduces new capabilities (for example, external product media URLs) and commit the schema update alongside implementation changes.
- Introduce typed mappers that convert GraphQL responses into domain models instead of threading optional chaining throughout business logic.

### Validation & Error Handling
- Wrap remote failures with `GraphQLError.fromCombinedError()` and include operation names/variables in logger metadata for actionable diagnostics.
- Extend relevant Zod schemas as new GraphQL fields unlock so validation stays aligned with the backend contract.
- Mirror new fields in mocks under `src/lib/graphql/__mocks__` to keep unit and integration tests catching schema drift early.

## Continuous Improvement

### Code Metrics Tracking

Monitor these quality metrics:
- **TypeScript strict mode compliance**: 100%
- **Test coverage**: >90%
- **Biome rule compliance**: 100%
- **Function complexity**: Average < 5
- **File size**: < 300 lines per file
- **Import dependencies**: Minimal coupling

### Regular Quality Reviews

**Weekly Quality Practices:**
- Review code complexity metrics
- Identify opportunities for function extraction
- Update type definitions for better safety
- Refactor toward more functional patterns
- Add missing test scenarios

**Monthly Architecture Reviews:**
- Evaluate service boundaries and coupling
- Review error handling patterns
- Assess schema evolution needs
- Optimize performance bottlenecks
- Update quality standards based on learnings

---

**Related Documentation:**
- [ARCHITECTURE.md](ARCHITECTURE.md) - Service architecture and design patterns
- [TESTING_PROTOCOLS.md](TESTING_PROTOCOLS.md) - Comprehensive testing strategies
- [DEVELOPMENT_WORKFLOWS.md](DEVELOPMENT_WORKFLOWS.md) - Development process integration
- [CLAUDE.md](CLAUDE.md) - Main navigation hub
- [../AGENTS.md](../AGENTS.md) - Quick reference guide for incoming agents
