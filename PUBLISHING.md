# NPM Publishing Guide

This document outlines how to publish the Saleor Configurator to npm as a CLI tool using Changesets for version management.

## Package Configuration

The package is configured as `@saleor/configurator` for CLI usage only, following Saleor's established publishing patterns.

### CLI Usage
```bash
# Use via npx/pnpm dlx (recommended)
npx @saleor/configurator start
pnpm dlx @saleor/configurator start

# Install globally (alternative)
npm install -g @saleor/configurator
pnpm add -g @saleor/configurator

# After global install
saleor-configurator start
```

## Publishing Workflows

### Automated Publishing (Recommended)

Publishing is automated through GitHub Actions using Changesets:

1. **Create a changeset**:
   ```bash
   pnpm changeset
   ```
   - Describe your changes
   - Select the appropriate version bump (patch/minor/major)

2. **Open a PR** with your changes and the changeset

3. **Merge to main** - The release workflow will:
   - Run tests (`pnpm run test:ci`)
   - Run linting (`pnpm run lint`)
   - Create a release PR or publish automatically
   - Tag the release and push git tags

### Manual Publishing (Development)

For development/testing purposes:

```bash
# Production release
pnpm run publish:ci-prod

# Development snapshot (for PRs)
pnpm run publish:ci-dev
```

### Local Testing

```bash
# Test CLI functionality
./bin/saleor-configurator.js --help

# Run tests
pnpm run test:ci

# Run linting
pnpm run lint
```

## Publishing Scripts

The package includes comprehensive publishing scripts following Saleor patterns:

- **`publish:ci-prod`**: Production publishing with git tagging
  - Publishes to npm
  - Creates git tags with `changeset tag`
  - Pushes tags to repository

- **`publish:ci-dev`**: Development snapshot publishing
  - Creates snapshot versions for PRs
  - Publishes with `dev` tag
  - No git checks required

- **`test:ci`**: CI-optimized test execution
  - Silent output for cleaner CI logs
  - `CI=true` environment flag

## GitHub Workflow

The release workflow (`.github/workflows/release.yml`) handles:

1. **Quality checks**: Tests and linting
2. **Version management**: Via Changesets
3. **Publishing**: Automated npm publishing
4. **Git tagging**: Automatic release tags
5. **GitHub releases**: Created automatically

### Required Secrets

Ensure these secrets are configured in your GitHub repository:

- `NPM_TOKEN`: npm authentication token for publishing
- `GITHUB_TOKEN`: Automatically provided by GitHub Actions

## Testing the Publishing Setup

Before publishing to production, thoroughly test all publishing-related functionality:

### 1. Verify Package Configuration

```bash
# Check package.json is valid
npm pkg get name version bin files

# Verify all required files exist
ls -la bin/saleor-configurator.js
ls -la src/
ls -la README.md LICENSE

# Test file permissions (CLI must be executable)
ls -la bin/saleor-configurator.js | grep -q "x" && echo "✓ Executable" || echo "✗ Not executable"
```

### 2. Test Package Contents

```bash
# Preview what will be published (dry run)
npm pack --dry-run

# Create actual package and inspect
npm pack
tar -tzf saleor-configurator-*.tgz

# Clean up
rm saleor-configurator-*.tgz
```

Expected contents:
- `bin/saleor-configurator.js` (executable CLI script)
- `src/` directory with all TypeScript source files
- `package.json`, `README.md`, `LICENSE`
- No `dist/`, `node_modules/`, or test files

### 3. Test CLI Functionality

```bash
# Test basic CLI functionality
./bin/saleor-configurator.js --help
./bin/saleor-configurator.js --version

# Test commands work
./bin/saleor-configurator.js push --help
./bin/saleor-configurator.js diff --help
./bin/saleor-configurator.js introspect --help
./bin/saleor-configurator.js start --help
```

### 4. Test Publishing Scripts

```bash
# Test CI scripts locally
pnpm run test:ci
pnpm run lint

# Test dry run publishing (safe - won't actually publish)
npm publish --dry-run

# Verify changeset functionality
pnpm changeset --empty
```

### 5. Test Development Publishing

For safe testing with real npm:

```bash
# Create and publish a development snapshot
pnpm run publish:ci-dev
```

This creates a snapshot version (e.g., `0.5.0-pr-123-20240710`) and publishes with `dev` tag, allowing you to test real installation without affecting the main package.

### 6. Test Installation and Usage

After publishing a dev version:

```bash
# Test different installation methods
npm install -g @saleor/configurator@dev
npx @saleor/configurator@dev --help
pnpm dlx @saleor/configurator@dev --help

# Test in a fresh directory
mkdir test-install && cd test-install
npx @saleor/configurator@dev --version
cd .. && rm -rf test-install
```

### 7. Test Version Management

```bash
# Test changeset creation
pnpm changeset
# - Select appropriate version bump
# - Add meaningful description
# - Verify .changeset file is created

# Test version command
pnpm run version
# - Should update package.json version
# - Should create/update CHANGELOG.md
# - Should remove consumed changeset files
```

### 8. Pre-Production Checklist

Before your first production release:

- [ ] ✅ CLI executable works locally
- [ ] ✅ All tests pass (`pnpm run test:ci`)
- [ ] ✅ Linting passes (`pnpm run lint`)
- [ ] ✅ Package contents are correct (`npm pack --dry-run`)
- [ ] ✅ Dev publishing works (`pnpm run publish:ci-dev`)
- [ ] ✅ Installation from npm works (`npx @saleor/configurator@dev`)
- [ ] ✅ GitHub repository has `NPM_TOKEN` secret configured
- [ ] ✅ Repository permissions allow publishing
- [ ] ✅ Package name is available on npm (first time only)

### Common Issues and Solutions

**CLI not executable**: 
```bash
chmod +x bin/saleor-configurator.js
```

**tsx not found**: Ensure `tsx` is in `dependencies`, not `devDependencies`

**Import errors**: Check all imports use correct file extensions for ES modules

**Permission denied on npm**: Verify NPM_TOKEN has publish permissions for the @saleor scope

**Package name conflicts**: Ensure `@saleor/configurator` is available or you have permissions

**Changeset issues**: Ensure `.changeset/config.json` exists and is properly configured

## Package Structure

```
bin/                    # CLI executables
└── saleor-configurator.js

src/                    # Source TypeScript files (included for tsx execution)
├── cli/                # CLI modules
├── commands/           # Command implementations
├── core/               # Core business logic
├── lib/                # Utilities and libraries
└── modules/            # Feature modules

.github/workflows/      # GitHub Actions
└── release.yml         # Automated publishing workflow
```

## Key Features

- **CLI-only**: Focused on command-line usage
- **Automated releases**: Powered by Changesets and GitHub Actions
- **TypeScript**: Full TypeScript development experience
- **ES Modules**: Modern module system
- **tsx execution**: Development-friendly CLI execution without compilation
- **Scoped package**: Published under `@saleor/` namespace
- **Git tagging**: Automatic release tagging and GitHub releases

## Dependencies

The package includes source files and uses `tsx` for execution:
- CLI requires `tsx` and source files for execution
- All dependencies are properly declared in package.json
- No build step required for publishing
- Follows Saleor's established patterns for consistency