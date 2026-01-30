---
name: configurator-workflow
description: Complete store configuration workflow that orchestrates multiple agents through discovery, setup, import, review, and deployment phases
allowed-tools: Bash, Read, Write, Edit, AskUserQuestion, Glob, Grep, Task
argument-hint: [phase]
---

# Configurator Workflow

You are orchestrating a complete Saleor store configuration workflow. This command coordinates multiple agents through discrete phases, ensuring quality at each step.

## Overview

This workflow guides users through the complete journey from zero configuration to deployed store. Each phase builds on the previous and includes quality gates.

## Workflow Phases

### Phase 1: Context Discovery

**Goal**: Understand the starting point before making any changes.

**Actions**:
1. Check for existing config.yml:
   ```bash
   test -f config.yml && echo "CONFIG_EXISTS" || echo "NO_CONFIG"
   ```

2. Check for Saleor credentials:
   ```bash
   [ -n "$SALEOR_API_URL" ] && [ -n "$SALEOR_TOKEN" ] && echo "CREDENTIALS_SET" || echo "NO_CREDENTIALS"
   ```

3. **If existing store** (credentials set):
   - Launch **discover** agent to analyze current Saleor state
   - Compare with local config.yml if exists
   - Report gaps and synchronization status

4. **If no config exists**:
   - Ask user about their starting point:
     - Fresh start (no existing data)
     - Has Saleor store to import from
     - Has spreadsheet/CSV to import
     - Migrating from another platform

**Output**: Clear understanding of starting point and recommended next phase.

### Phase 2: Configuration Setup

**Goal**: Create or update config.yml based on discovery findings.

**Actions based on user's situation**:

**Fresh Start**:
- Run `/configurator-setup` wizard
- Guide through business type, channels, product types
- Generate initial config.yml

**Import from Saleor**:
- Run `npx configurator introspect --url=$SALEOR_API_URL --token=$SALEOR_TOKEN`
- Review generated config.yml
- Suggest improvements

**Import from Spreadsheet**:
- Proceed to Phase 3 (Import) first
- Return here after import completes

**Migrate from Platform**:
- Ask about source platform (Shopify, WooCommerce, etc.)
- Guide through export process
- Proceed to Phase 3 (Import)

**Quality Gate**: Config.yml must exist before proceeding.

### Phase 3: Data Import (Optional)

**Goal**: Import external product data into configuration.

**Actions**:
1. Ask user for import files:
   - CSV files
   - Excel spreadsheets
   - Platform exports (Shopify, etc.)

2. **Detect format and delegate**:
   - **Shopify format detected** (Handle, Title, Option columns): Launch **shopify-importer** agent
   - **Generic CSV/Excel**: Launch **csv-importer** agent

3. **Merge strategy**:
   - Ask: Replace existing products or merge?
   - If merge: Handle duplicate SKUs/slugs

4. **Post-import validation**:
   - Verify all references are valid
   - Check for duplicate identifiers
   - Report import summary

**Quality Gate**: Imported data must pass basic validation.

### Phase 4: Configuration Review

**Goal**: Comprehensive quality check before deployment.

**Actions**:
1. Launch **config-review** agent on config.yml
2. Review findings by confidence level:
   - **Critical (90-100)**: Must fix before deployment
   - **High (75-89)**: Should fix for best practices
   - **Medium (60-74)**: Consider fixing

3. **If critical issues found**:
   - Present issues with specific fixes
   - Guide user through corrections
   - Re-run review after fixes

4. **If only warnings**:
   - Present recommendations
   - Let user decide whether to address
   - Proceed to deployment if approved

**Quality Gate**: No critical issues (90+) remaining.

### Phase 5: Deployment

**Goal**: Safely deploy configuration to Saleor instance.

**Pre-deployment checks**:
1. Verify credentials are set
2. Run dry-run first:
   ```bash
   npx configurator deploy --url=$SALEOR_API_URL --token=$SALEOR_TOKEN --dry-run
   ```

3. **Analyze dry-run output**:
   - Count: creates, updates, deletes
   - **If deletions detected**: Warn user explicitly
   - Show what will change

4. **User confirmation required** for:
   - Any deletions
   - Large number of changes (>50 entities)
   - Production deployments

**Deployment execution**:
```bash
npx configurator deploy --url=$SALEOR_API_URL --token=$SALEOR_TOKEN
```

**Post-deployment**:
- Report success/failure
- If failed: Launch **troubleshoot** agent automatically
- If success: Suggest verification steps

### Phase 6: Verification

**Goal**: Confirm deployment succeeded and configuration is live.

**Actions**:
1. Run diff to verify no remaining changes:
   ```bash
   npx configurator diff --url=$SALEOR_API_URL --token=$SALEOR_TOKEN
   ```

2. **If diff shows changes**:
   - Investigate discrepancies
   - May indicate deployment issues
   - Offer to redeploy or troubleshoot

3. **If no changes (expected)**:
   - Deployment confirmed successful
   - Provide Saleor Dashboard links
   - Suggest next steps (add products, test storefront)

## Phase Selection

User can skip to specific phase using argument:

- `/configurator-workflow discover` - Start at Phase 1
- `/configurator-workflow setup` - Start at Phase 2
- `/configurator-workflow import` - Start at Phase 3
- `/configurator-workflow review` - Start at Phase 4
- `/configurator-workflow deploy` - Start at Phase 5
- `/configurator-workflow verify` - Start at Phase 6

Without argument, start from Phase 1 and progress through all phases.

## Progress Tracking

Use TaskCreate/TaskUpdate/TaskList to track workflow progress:

```
Phase 1: Context Discovery    [ ] Pending / [~] In Progress / [x] Complete
Phase 2: Configuration Setup  [ ] Pending / [~] In Progress / [x] Complete
Phase 3: Data Import          [ ] Skipped / [~] In Progress / [x] Complete
Phase 4: Configuration Review [ ] Pending / [~] In Progress / [x] Complete
Phase 5: Deployment           [ ] Pending / [~] In Progress / [x] Complete
Phase 6: Verification         [ ] Pending / [~] In Progress / [x] Complete
```

Create tasks for each phase when starting workflow:
1. Use TaskCreate for each phase
2. Update status as phases progress
3. Mark skipped phases appropriately
4. User sees clear progress throughout

## Error Recovery

**At any phase failure**:
1. Identify the error type
2. Offer specific recovery actions
3. Allow resuming from failed phase
4. Never lose user's work

**Common recovery patterns**:
- Review failed → Fix issues and re-review
- Deploy failed → Troubleshoot and retry
- Import failed → Adjust mapping and retry

## Output Format

Report workflow status clearly:

```
═══════════════════════════════════════════════════
  Configurator Workflow Status
═══════════════════════════════════════════════════

Current Phase: [Phase Name]
Progress: [X/6] phases complete

COMPLETED PHASES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Phase 1: Discovered existing store with 45 products
✓ Phase 2: Configuration updated with 3 new product types

CURRENT PHASE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 4: Configuration Review
Status: In Progress
Action: Running config-review agent...

NEXT STEPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Review findings from config-review agent
2. Address any critical issues
3. Proceed to deployment phase
```

## Skills to Reference

- `configurator-cli` for CLI commands
- `configurator-schema` for config structure
- `saleor-domain` for entity relationships
- `data-importer` for import patterns
