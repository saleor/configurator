# Migration Guide

Comprehensive guide for schema evolution, migration procedures, and backward compatibility management in the Saleor Configurator. This guide covers version management, breaking changes, and safe migration strategies.

## Schema Evolution Principles

### Version Compatibility Philosophy

The Saleor Configurator follows **semantic versioning** with clear compatibility guarantees:

- **Patch versions (0.x.Y)**: Bug fixes, fully backward compatible
- **Minor versions (0.X.y)**: New features, backward compatible
- **Major versions (X.y.z)**: Breaking changes, migration required

### Compatibility Matrix

| Saleor Version | Configurator Version | Schema Version | Compatibility Status |
|----------------|---------------------|----------------|---------------------|
| 3.20.x         | 0.14.x+            | 3.20           | ✅ Current Support |
| 3.19.x         | 0.12.x-0.14.x      | 3.19           | ⚠️ Legacy Support |
| 3.18.x         | 0.10.x-0.12.x      | 3.18           | ❌ Deprecated |
| 3.17.x         | 0.8.x-0.10.x       | 3.17           | ❌ End of Life |

### Backward Compatibility Rules

**Field Evolution Rules:**
1. **Adding Fields**: Always backward compatible
2. **Making Fields Optional**: Backward compatible
3. **Making Fields Required**: Breaking change (major version)
4. **Removing Fields**: Breaking change (major version)
5. **Changing Field Types**: Breaking change (major version)
6. **Renaming Fields**: Breaking change (major version)

**Entity Evolution Rules:**
1. **Adding Entities**: Backward compatible
2. **Removing Entities**: Breaking change with deprecation period
3. **Changing Entity Identification**: Breaking change (major version)
4. **Modifying Entity Relationships**: Potentially breaking (case-by-case)

## Migration Strategies

### Strategy 1: Additive Changes (Non-Breaking)

**Use Case**: Adding new optional fields or new entity types

**Implementation Approach:**
```typescript
// Old schema (v0.12)
const categorySchema = z.object({
  name: z.string(),
  slug: z.string(),
  description: z.string().optional()
});

// New schema (v0.13) - backward compatible
const categorySchema = z.object({
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  // New optional fields
  isVisible: z.boolean().optional().default(true),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional()
});
```

**Migration Process:**
- No configuration changes required
- Existing configs continue to work
- New fields get default values
- Documentation updated with new capabilities

### Strategy 2: Deprecation with Transition (Soft Breaking)

**Use Case**: Changing field names or moving functionality

**Implementation Approach:**
```typescript
// Transition schema - supports both old and new formats
const categorySchemaTransition = z.object({
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  
  // Deprecated field (still accepted)
  parentCategory: z.string()
    .optional()
    .describe('DEPRECATED: Use parent instead'),
  
  // New field
  parent: z.string().optional()
});

// Migration transform function
function migrateCategoryConfiguration(oldConfig: any): CategoryInput {
  const migrated = { ...oldConfig };
  
  // Handle deprecated field
  if (oldConfig.parentCategory && !oldConfig.parent) {
    migrated.parent = oldConfig.parentCategory;
    delete migrated.parentCategory;
    
    console.warn(
      '⚠️  DEPRECATED: parentCategory field is deprecated. ' +
      'Please use parent instead.'
    );
  }
  
  return migrated;
}
```

**Deprecation Timeline:**
```markdown
v0.13: Add deprecation warnings
v0.14: Support both formats with warnings  
v0.15: Remove deprecated format (breaking change)
```

### Strategy 3: Breaking Changes (Major Version)

**Use Case**: Fundamental schema changes that cannot be backward compatible

**Implementation Approach:**
```typescript
// Example: Categories changing from name-based to slug-based identification
// Old schema (v0.x)
interface CategoryLegacy {
  name: string;
  slug?: string; // Optional
  parent?: string; // Reference by name
}

// New schema (v1.x) 
interface CategoryCurrent {
  name: string;
  slug: string; // Required
  parent?: string; // Reference by slug
}

// Migration function
function migrateCategoryIdentification(
  legacyConfig: ConfigLegacy
): ConfigCurrent {
  return {
    ...legacyConfig,
    categories: legacyConfig.categories?.map(category => ({
      name: category.name,
      slug: category.slug || generateSlug(category.name),
      parent: category.parent ? findSlugByName(category.parent) : undefined,
      description: category.description
    })) || []
  };
}
```

### Strategy 4: Data Structure Changes

**Use Case**: Changing how data is organized or represented

**Implementation Approach:**
```typescript
// Old structure - flat attributes
interface ProductLegacy {
  name: string;
  authorAttribute: string;
  genreAttribute: string;
  colorAttribute: string;
}

// New structure - grouped attributes
interface ProductCurrent {
  name: string;
  attributes: {
    [key: string]: string | string[];
  };
}

// Migration transform
function migrateProductAttributes(legacy: ProductLegacy): ProductCurrent {
  const { authorAttribute, genreAttribute, colorAttribute, ...base } = legacy;
  
  return {
    ...base,
    attributes: {
      ...(authorAttribute && { Author: authorAttribute }),
      ...(genreAttribute && { Genre: genreAttribute }),
      ...(colorAttribute && { Color: colorAttribute })
    }
  };
}
```

## Migration Tools and Procedures

### Automated Migration Tool

**CLI Migration Command:**
```bash
# Check configuration compatibility  
pnpm configurator migrate --check --config=config.yml

# Migrate configuration to current version
pnpm configurator migrate --from=0.12 --to=0.14 --config=config.yml

# Preview migration changes
pnpm configurator migrate --from=0.12 --to=0.14 --config=config.yml --dry-run

# Migrate with backup
pnpm configurator migrate --from=0.12 --to=0.14 --config=config.yml --backup
```

**Migration Service Implementation:**
```typescript
export class MigrationService {
  private migrations = new Map<string, MigrationHandler>();
  
  constructor() {
    this.registerMigrations();
  }
  
  async migrate(
    config: any,
    fromVersion: string,
    toVersion: string
  ): Promise<MigrationResult> {
    const migrationPath = this.findMigrationPath(fromVersion, toVersion);
    
    let currentConfig = config;
    const appliedMigrations: string[] = [];
    
    for (const migration of migrationPath) {
      try {
        console.log(`Applying migration: ${migration.id}`);
        
        currentConfig = await migration.migrate(currentConfig);
        appliedMigrations.push(migration.id);
        
        console.log(`✅ Migration ${migration.id} completed`);
        
      } catch (error) {
        console.error(`❌ Migration ${migration.id} failed:`, error);
        
        // Attempt rollback
        await this.rollbackMigrations(config, appliedMigrations);
        
        throw new MigrationError(
          `Migration failed at step ${migration.id}`,
          error
        );
      }
    }
    
    return {
      originalConfig: config,
      migratedConfig: currentConfig,
      appliedMigrations,
      warnings: this.collectWarnings(migrationPath)
    };
  }
  
  private registerMigrations(): void {
    // Register migration handlers
    this.migrations.set('0.12-to-0.13', new Migration_0_12_to_0_13());
    this.migrations.set('0.13-to-0.14', new Migration_0_13_to_0_14());
    this.migrations.set('0.14-to-1.0', new Migration_0_14_to_1_0());
  }
}
```

### Migration Handler Interface

**Standard Migration Pattern:**
```typescript
interface MigrationHandler {
  id: string;
  fromVersion: string;
  toVersion: string;
  description: string;
  
  // Migration function
  migrate(config: any): Promise<any>;
  
  // Validation function
  validate(config: any): Promise<ValidationResult>;
  
  // Rollback function (if possible)
  rollback?(config: any): Promise<any>;
  
  // Warning generation
  getWarnings(config: any): MigrationWarning[];
}

class Migration_0_12_to_0_13 implements MigrationHandler {
  id = '0.12-to-0.13';
  fromVersion = '0.12';
  toVersion = '0.13';
  description = 'Add support for category visibility and SEO fields';
  
  async migrate(config: ConfigV0_12): Promise<ConfigV0_13> {
    return {
      ...config,
      categories: config.categories?.map(category => ({
        ...category,
        // Add default values for new fields
        isVisible: true,
        seoTitle: category.name,
        seoDescription: category.description
      })) || []
    };
  }
  
  async validate(config: ConfigV0_13): Promise<ValidationResult> {
    // Validate migrated configuration
    try {
      configSchemaV0_13.parse(config);
      return { isValid: true, errors: [] };
    } catch (error) {
      if (error instanceof ZodError) {
        return {
          isValid: false,
          errors: error.issues.map(issue => ({
            path: issue.path.join('.'),
            message: issue.message
          }))
        };
      }
      throw error;
    }
  }
  
  getWarnings(config: ConfigV0_12): MigrationWarning[] {
    const warnings: MigrationWarning[] = [];
    
    if (config.categories?.some(cat => !cat.description)) {
      warnings.push({
        type: 'data_quality',
        message: 'Some categories have no description. SEO description will use category name.',
        severity: 'info'
      });
    }
    
    return warnings;
  }
}
```

### Configuration Transformation

**Transform Pipeline:**
```typescript
export class ConfigurationTransformer {
  async transform(
    config: any,
    transformations: TransformRule[]
  ): Promise<TransformResult> {
    
    let transformedConfig = JSON.parse(JSON.stringify(config));
    const appliedTransforms: string[] = [];
    
    for (const rule of transformations) {
      if (rule.condition(transformedConfig)) {
        transformedConfig = await rule.transform(transformedConfig);
        appliedTransforms.push(rule.id);
      }
    }
    
    return {
      originalConfig: config,
      transformedConfig,
      appliedTransforms
    };
  }
}

// Example transformation rules
const CATEGORY_SLUG_MIGRATION: TransformRule = {
  id: 'category-slug-migration',
  description: 'Ensure all categories have slugs',
  
  condition: (config) => 
    config.categories?.some((cat: any) => !cat.slug),
  
  transform: async (config) => ({
    ...config,
    categories: config.categories?.map((cat: any) => ({
      ...cat,
      slug: cat.slug || generateSlug(cat.name)
    }))
  })
};
```

## Breaking Change Procedures

### Pre-Release Breaking Change Testing

**Testing Protocol for Breaking Changes:**
```bash
#!/bin/bash
# breaking-change-test.sh

echo "Testing breaking change migration..."

# 1. Setup test environment with old version
git checkout v0.12.0
pnpm install
pnpm build

# 2. Create test configuration with old format
cat > test-config-old.yml << 'EOF'
categories:
  - name: "Electronics"
    parentCategory: "Root"  # Old field name
  - name: "Computers"  
    parentCategory: "Electronics"
EOF

# 3. Test introspection with old version
pnpm dev introspect --url=$TEST_URL --token=$TEST_TOKEN --config=test-config-old.yml

# 4. Switch to new version
git checkout v1.0.0
pnpm install
pnpm build

# 5. Test migration
pnpm configurator migrate --from=0.12 --to=1.0 --config=test-config-old.yml --dry-run

# 6. Apply migration
pnpm configurator migrate --from=0.12 --to=1.0 --config=test-config-old.yml

# 7. Test deployment with migrated config
pnpm dev deploy --url=$TEST_URL --token=$TEST_TOKEN --config=test-config-old.yml --dry-run

echo "Breaking change test completed"
```

### Communication Strategy

**Breaking Change Announcement:**
```markdown
# Breaking Change Notice: v1.0.0

## Summary
Version 1.0.0 introduces breaking changes to category configuration format.

## What's Changing
- Categories now use `parent` field instead of `parentCategory`
- Category `slug` field is now required
- Category identification switched from name-based to slug-based

## Migration Required
All existing configurations must be migrated before upgrading to v1.0.0.

## Migration Steps
1. Backup your current configuration
2. Run migration tool: `pnpm configurator migrate --from=0.x --to=1.0`
3. Review migrated configuration
4. Test deployment in development environment
5. Deploy to production

## Rollback Plan
If migration fails, restore from backup and continue using v0.x until issues are resolved.

## Support Timeline
- v0.14.x: Supported until 2024-12-31
- v1.0.x: Long-term support version
```

### Rollback and Recovery

**Migration Rollback Service:**
```typescript
export class MigrationRollbackService {
  async rollback(
    migratedConfig: any,
    backupConfig: any,
    appliedMigrations: string[]
  ): Promise<RollbackResult> {
    
    console.log('🔄 Starting migration rollback...');
    
    try {
      // 1. Validate backup configuration
      await this.validateBackupConfig(backupConfig);
      
      // 2. Check if rollback is safe
      const rollbackSafety = await this.assessRollbackSafety(
        migratedConfig,
        backupConfig
      );
      
      if (!rollbackSafety.isSafe) {
        console.warn('⚠️ Rollback may cause data loss:');
        rollbackSafety.warnings.forEach(warning => 
          console.warn(`  - ${warning}`)
        );
      }
      
      // 3. Perform rollback
      await this.restoreConfiguration(backupConfig);
      
      console.log('✅ Migration rollback completed');
      
      return {
        success: true,
        restoredConfig: backupConfig,
        warnings: rollbackSafety.warnings
      };
      
    } catch (error) {
      console.error('❌ Migration rollback failed:', error);
      
      return {
        success: false,
        error: error.message,
        recommendedAction: 'Manual intervention required'
      };
    }
  }
  
  private async assessRollbackSafety(
    current: any,
    backup: any
  ): Promise<RollbackSafetyAssessment> {
    
    const warnings: string[] = [];
    
    // Check for data that would be lost
    const currentEntities = this.countEntities(current);
    const backupEntities = this.countEntities(backup);
    
    for (const [entityType, currentCount] of Object.entries(currentEntities)) {
      const backupCount = backupEntities[entityType] || 0;
      
      if (currentCount > backupCount) {
        warnings.push(
          `${currentCount - backupCount} ${entityType} entities would be lost`
        );
      }
    }
    
    return {
      isSafe: warnings.length === 0,
      warnings
    };
  }
}
```

## Version Detection and Compatibility

### Schema Version Detection

**Automatic Version Detection:**
```typescript
export class SchemaVersionDetector {
  detectVersion(config: any): DetectedVersion {
    // Check for version field
    if (config.version) {
      return {
        version: config.version,
        confidence: 'high',
        source: 'explicit'
      };
    }
    
    // Detect by schema characteristics
    if (this.hasV1Characteristics(config)) {
      return {
        version: '1.0',
        confidence: 'medium',
        source: 'schema_analysis'
      };
    }
    
    if (this.hasV0_13Characteristics(config)) {
      return {
        version: '0.13',
        confidence: 'medium', 
        source: 'schema_analysis'
      };
    }
    
    // Default to oldest supported version
    return {
      version: '0.12',
      confidence: 'low',
      source: 'default'
    };
  }
  
  private hasV1Characteristics(config: any): boolean {
    // V1 has required slug fields for categories
    return config.categories?.every((cat: any) => 
      typeof cat.slug === 'string' && cat.slug.length > 0
    ) || false;
  }
  
  private hasV0_13Characteristics(config: any): boolean {
    // V0.13 introduced isVisible field for categories
    return config.categories?.some((cat: any) => 
      'isVisible' in cat
    ) || false;
  }
}
```

### Compatibility Validation

**Pre-Deployment Compatibility Check:**
```typescript
export class CompatibilityValidator {
  async validateCompatibility(
    config: any,
    targetSaleorVersion: string,
    configuratorVersion: string
  ): Promise<CompatibilityResult> {
    
    const checks = await Promise.all([
      this.checkSaleorCompatibility(config, targetSaleorVersion),
      this.checkSchemaCompatibility(config, configuratorVersion),
      this.checkFeatureCompatibility(config, targetSaleorVersion)
    ]);
    
    const allPassed = checks.every(check => check.compatible);
    
    return {
      compatible: allPassed,
      checks,
      recommendations: this.generateCompatibilityRecommendations(checks)
    };
  }
  
  private async checkSaleorCompatibility(
    config: any,
    saleorVersion: string
  ): Promise<CompatibilityCheck> {
    
    // Check if configuration uses features not available in target Saleor version
    const unavailableFeatures = this.findUnavailableFeatures(config, saleorVersion);
    
    return {
      name: 'Saleor Version Compatibility',
      compatible: unavailableFeatures.length === 0,
      issues: unavailableFeatures.map(feature => 
        `Feature '${feature}' not available in Saleor ${saleorVersion}`
      )
    };
  }
}
```

## Deprecation Management

### Deprecation Timeline

**Standard Deprecation Process:**
```markdown
## Phase 1: Deprecation Notice (Version N)
- Add deprecation warnings to console output
- Update documentation with migration paths  
- Announce deprecation in release notes

## Phase 2: Deprecation Period (Version N+1)
- Continue showing deprecation warnings
- Provide migration tools
- Support both old and new formats

## Phase 3: Removal (Version N+2)
- Remove deprecated functionality
- Breaking change - major version bump
- Migration required for upgrade
```

**Deprecation Warning System:**
```typescript
export class DeprecationWarningService {
  private warnings = new Set<string>();
  
  warnDeprecated(
    feature: string,
    version: string,
    alternative?: string,
    removeVersion?: string
  ): void {
    const warningKey = `${feature}-${version}`;
    
    if (this.warnings.has(warningKey)) {
      return; // Avoid duplicate warnings
    }
    
    this.warnings.add(warningKey);
    
    let message = `⚠️ DEPRECATED: ${feature} is deprecated since v${version}`;
    
    if (alternative) {
      message += `. Use ${alternative} instead`;
    }
    
    if (removeVersion) {
      message += `. Will be removed in v${removeVersion}`;
    }
    
    console.warn(message);
    console.warn('   See migration guide: https://docs.saleor.io/configurator/migration');
  }
}
```

### Feature Flag System

**Gradual Feature Rollout:**
```typescript
export class FeatureFlagService {
  constructor(private flags: FeatureFlags) {}
  
  isEnabled(feature: string, version: string): boolean {
    const flag = this.flags[feature];
    
    if (!flag) {
      return false; // Feature not defined
    }
    
    // Check if feature is enabled for this version
    return this.compareVersions(version, flag.enabledSince) >= 0 &&
           (!flag.removedSince || this.compareVersions(version, flag.removedSince) < 0);
  }
  
  getAvailableFeatures(version: string): string[] {
    return Object.entries(this.flags)
      .filter(([_, flag]) => this.isEnabled(_, version))
      .map(([feature]) => feature);
  }
}

interface FeatureFlags {
  [feature: string]: {
    enabledSince: string;
    removedSince?: string;
    description: string;
    migrationPath?: string;
  };
}

const FEATURE_FLAGS: FeatureFlags = {
  'category-seo-fields': {
    enabledSince: '0.13.0',
    description: 'SEO title and description fields for categories'
  },
  'category-name-identification': {
    enabledSince: '0.1.0',
    removedSince: '1.0.0',
    description: 'Category identification by name (deprecated)',
    migrationPath: 'category-slug-identification'
  },
  'category-slug-identification': {
    enabledSince: '0.12.0',
    description: 'Category identification by slug (recommended)'
  }
};
```

## Testing Migration Procedures

### Migration Test Suite

**Comprehensive Migration Testing:**
```typescript
describe('Migration System', () => {
  describe('Schema Evolution', () => {
    test('should migrate v0.12 to v0.13 configuration', async () => {
      // Arrange
      const v0_12_config = {
        categories: [
          { name: 'Electronics', slug: 'electronics' }
        ]
      };
      
      const migrationService = new MigrationService();
      
      // Act
      const result = await migrationService.migrate(v0_12_config, '0.12', '0.13');
      
      // Assert
      expect(result.migratedConfig.categories[0]).toMatchObject({
        name: 'Electronics',
        slug: 'electronics',
        isVisible: true,
        seoTitle: 'Electronics'
      });
    });
    
    test('should handle breaking change migration', async () => {
      // Test v0.x to v1.0 migration with breaking changes
      const legacyConfig = {
        categories: [
          { name: 'Books', parentCategory: 'Literature' }
        ]
      };
      
      const migrationService = new MigrationService();
      
      const result = await migrationService.migrate(legacyConfig, '0.14', '1.0');
      
      expect(result.migratedConfig.categories[0]).toMatchObject({
        name: 'Books',
        slug: 'books',
        parent: 'literature'
      });
    });
  });
  
  describe('Rollback System', () => {
    test('should successfully rollback migration', async () => {
      // Test migration rollback functionality
    });
  });
});
```

---

**Related Documentation:**
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture supporting migrations
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Migration failure resolution
- [DEVELOPMENT_WORKFLOWS.md](DEVELOPMENT_WORKFLOWS.md) - Migration development procedures
- [TESTING_PROTOCOLS.md](TESTING_PROTOCOLS.md) - Migration testing strategies
- [CLAUDE.md](CLAUDE.md) - Main navigation hub