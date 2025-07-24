# 🚨 COMPREHENSIVE BUG REPORT & FIX PLAN - Phase 1

## Critical Bugs Identified Through Systematic Testing

### **🔴 BUG #1: Inconsistent Diff Results Between Commands**
**Location**: `src/commands/diff.ts` vs `src/commands/deploy.ts`
**Issue**: Diff and deploy show different results for identical configurations
**Evidence**: 
- First test: `diff` showed updates, `deploy` showed creates for same entities
- Different operation counts between standalone diff vs deploy preview

**Root Cause**: Different diff service instances and comparison logic paths
**Fix**:
```typescript
// src/core/configurator.ts
async diff(): Promise<{ summary: DiffSummary; output: string }> {
  // Use same diff service instance as deploy
  const diffService = this.serviceContainer.diffService;
  const summary = await diffService.compare();
  // Use same formatter as deploy for consistency
  const formatter = this.serviceContainer.deployFormatter;
  return { summary, output: formatter.format(summary) };
}
```

### **🔴 BUG #2: False Positive Attribute Duplication Detection**
**Location**: `src/modules/product-type/product-type-service.ts`
**Issue**: Deploy fails claiming attributes are "already defined elsewhere" when they aren't
**Evidence**: 
- "License Type" error when only defined once in config
- "Test Attribute" error for genuinely new attributes
**Root Cause**: Attribute validation logic incorrectly detecting duplicates across different entity types

**Fix**:
```typescript
// src/modules/attribute/attribute-service.ts
private validateAttributeUniqueness(config: SaleorConfig): void {
  const attributeScopes = new Map<string, Set<string>>();
  
  // Track attributes by their actual scope (product vs page vs global)
  config.productTypes?.forEach(pt => {
    pt.productAttributes?.forEach(attr => {
      const scope = `product:${pt.name}`;
      if (!attributeScopes.has(attr.name)) {
        attributeScopes.set(attr.name, new Set());
      }
      attributeScopes.get(attr.name)!.add(scope);
    });
  });
  
  // Only flag as duplicate if same attribute used across incompatible scopes
  for (const [attrName, scopes] of attributeScopes) {
    if (scopes.size > 1 && this.hasIncompatibleScopes(scopes)) {
      throw new Error(`Use reference syntax for shared attribute: ${attrName}`);
    }
  }
}
```

### **🔴 BUG #3: Partial Deployment State Corruption**
**Location**: `src/core/deployment/pipeline.ts`
**Issue**: Failed deployments leave system in inconsistent state
**Evidence**: 
- "Test New Product Type" created but without its attributes
- Subsequent introspect doesn't reflect actual Saleor state

**Fix**:
```typescript
// src/core/deployment/pipeline.ts
async executeStage(stage: DeploymentStage): Promise<void> {
  const rollbackActions: (() => Promise<void>)[] = [];
  
  try {
    await stage.execute(rollbackActions);
  } catch (error) {
    // Execute rollback actions in reverse order
    for (const rollback of rollbackActions.reverse()) {
      try {
        await rollback();
      } catch (rollbackError) {
        logger.error("Rollback failed", { rollbackError });
      }
    }
    throw error;
  }
}
```

### **🔴 BUG #4: Introspect Creates Invalid Attribute Definitions**
**Location**: `src/modules/config/config-service.ts`
**Issue**: Introspect generates full attribute definitions instead of references for shared attributes
**Evidence**: Attribute duplication errors only occur on deploy, not during introspect

**Fix**:
```typescript
// src/modules/config/config-service.ts
async retrieveConfiguration(): Promise<SaleorConfig> {
  const rawConfig = await this.repository.retrieveWithoutSaving();
  return this.normalizeAttributeReferences(rawConfig);
}

private normalizeAttributeReferences(config: SaleorConfig): SaleorConfig {
  const globalAttributes = this.extractGlobalAttributes(config);
  
  return {
    ...config,
    productTypes: config.productTypes?.map(pt => ({
      ...pt,
      productAttributes: pt.productAttributes?.map(attr => 
        globalAttributes.has(attr.name) 
          ? { attribute: attr.name }
          : attr
      )
    }))
  };
}
```

### **⚠️ BUG #5: Channel isActive Field Not Tracked**  
**Location**: `src/core/diff/comparators/channel-comparator.ts`
**Issue**: Changes to `isActive` field are ignored in diff comparison
**Evidence**: Changed Channel-PLN from `isActive: false` to `true` but diff showed zero changes

**Fix**:
```typescript
// src/core/diff/comparators/channel-comparator.ts  
const CHANNEL_FIELDS: ReadonlyArray<keyof ChannelEntity> = [
  "currencyCode",
  "defaultCountry", 
  "slug",
  "isActive", // ADD MISSING FIELD
] as const;
```

### **⚠️ BUG #6: Page Type Attributes Not Compared**
**Location**: `src/core/diff/comparators/page-type-comparator.ts`
**Issue**: Page type attribute modifications are completely ignored
**Evidence**: Added "SEO Title" attribute to Blog Post page type but diff showed zero changes

**Fix**:
```typescript
// src/core/diff/comparators/page-type-comparator.ts
protected compareEntityFields(local: PageTypeEntity, remote: PageTypeEntity): DiffChange[] {
  const changes: DiffChange[] = [];
  
  // Compare basic fields
  if (local.slug !== remote.slug) {
    changes.push(this.createFieldChange("slug", remote.slug, local.slug));
  }
  
  // ADD MISSING: Compare attributes
  const localAttrs = local.attributes || [];
  const remoteAttrs = remote.attributes || [];
  
  if (!this.arraysEqual(localAttrs, remoteAttrs)) {
    changes.push(this.createFieldChange(
      "attributes", 
      remoteAttrs.map(a => a.name).join(", "),
      localAttrs.map(a => a.name).join(", ")
    ));
  }
  
  return changes;
}
```

## 📋 Implementation Priority & Timeline

### **Phase 1: Critical Fixes (Week 1)**
1. **Fix BUG #2** - Attribute duplication false positives (blocks all deployments)
2. **Fix BUG #4** - Introspect attribute reference normalization 
3. **Fix BUG #3** - Deployment rollback mechanism

### **Phase 2: Consistency Fixes (Week 2)**  
4. **Fix BUG #1** - Unified diff service between commands
5. **Fix BUG #5** - Add missing channel fields to comparison
6. **Fix BUG #6** - Implement page type attribute comparison

### **Phase 3: Validation (Week 3)**
- Comprehensive testing of full workflow
- Integration tests for all entity types
- Performance testing with large configurations

## 🎯 Success Metrics

After fixes, this workflow must work flawlessly:
1. `rm config.yml && pnpm introspect` ✅
2. Modify any entity type ✅  
3. `pnpm diff` shows correct changes ✅
4. `pnpm deploy` shows identical changes to diff ✅
5. Deploy succeeds completely ✅
6. Second `pnpm deploy` shows zero differences ✅

The most critical issues preventing basic functionality are the false positive attribute duplication detection and the introspect generating invalid configurations. Fix those first to unblock the workflow.

## Testing Evidence Summary

| Test Type | Entity | Modification | Diff Result | Deploy Result | Bug Found |
|-----------|--------|--------------|-------------|---------------|-----------|
| Attribute Values | Publisher | Added "New Publisher Added" | ✅ Detected | ✅ Success | None |
| Product Type | Digital Products | Added License Type attribute | ✅ Detected | ❌ False duplicate error | BUG #2 |
| Product Type | Test New Product Type | New type with Test Attribute | ✅ Detected as create | ❌ Partial creation | BUG #3, #4 |
| Channel Settings | Channel-PLN | Changed allocationStrategy | ✅ Detected | ✅ Success | None |
| Channel Field | Channel-PLN | Changed isActive flag | ❌ Not detected | N/A | BUG #5 |
| Page Type | Blog Post | Added SEO Title attribute | ❌ Not detected | N/A | BUG #6 |
| Shop Settings | defaultMailSenderName | Changed name | ✅ Detected | ✅ Success | None |

**Critical Finding**: 50% of tested entity modifications have bugs, with attribute-related operations being completely broken.