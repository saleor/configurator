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
configurator start
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
./bin/cli.mjs --help

# Run tests
pnpm run test:ci

# Run linting
pnpm run lint
```

## Publishing Scripts

The package includes comprehensive publishing scripts following Saleor patterns:

- **`publish:ci-prod`**: Production publishing with git tagging
  - Creates git tags with `changeset tag`
  - Publishes to npm
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

### Quick Local Verification

```bash
# 1. Verify CLI works locally
./bin/cli.mjs --help

# 2. Test package contents
npm pack --dry-run

# 3. Run tests and linting
pnpm run test:ci && pnpm run lint

# 4. Test publishing dry run
npm publish --dry-run
```

If all these pass, you're ready for detailed testing:

### 1. Verify Package Configuration

```bash
# Check package.json is valid
npm pkg get name version bin files

# Verify all required files exist
ls -la bin/cli.mjs
ls -la src/
ls -la README.md LICENSE

# Test file permissions (CLI must be executable)
ls -la bin/cli.mjs | grep -q "x" && echo "✓ Executable" || echo "✗ Not executable"
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
- `bin/cli.mjs` (executable CLI script)
- `src/` directory with all TypeScript source files
- `package.json`, `README.md`, `LICENSE`
- No `dist/`, `node_modules/`, or test files

### 3. Test CLI Functionality

```bash
# Verify the bin file exists and is executable
ls -la bin/cli.mjs

# Test basic CLI functionality
./bin/cli.mjs --help
./bin/cli.mjs --version

# Test all commands work
./bin/cli.mjs push --help
./bin/cli.mjs diff --help
./bin/cli.mjs introspect --help
./bin/cli.mjs start --help

# Test that tsx dependency is accessible
node -e "console.log(require.resolve('tsx'))"

# Test TypeScript compilation works
./bin/cli.mjs --version | grep -q "0\." && echo "✓ CLI works" || echo "✗ CLI failed"
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
chmod +x bin/cli.mjs
```

**tsx not found**: Ensure `tsx` is in `dependencies`, not `devDependencies`

**Import errors**: Check all imports use correct file extensions for ES modules

**Permission denied on npm**: Verify NPM_TOKEN has publish permissions for the @saleor scope

**Package name conflicts**: Ensure `@saleor/configurator` is available or you have permissions

**Changeset issues**: Ensure `.changeset/config.json` exists and is properly configured

## Package Structure

```
bin/                    # CLI executables
└── cli.mjs

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
- **No build step**: Ships TypeScript source, uses `tsx` for execution
- **Automated releases**: Powered by Changesets and GitHub Actions
- **TypeScript**: Full TypeScript development experience
- **ES Modules**: Modern module system
- **Scoped package**: Published under `@saleor/` namespace
- **Git tagging**: Automatic release tagging and GitHub releases

## How It Works

This package uses a **built distribution approach**:

1. **`bin/cli.mjs`**: An ES module wrapper script that:
   - Imports and executes the built `dist/main.js` file
   - Passes all command-line arguments through
   - Uses the compiled JavaScript for better performance

2. **Build process**: TypeScript source is compiled to `dist/` using `tsup`
   - Triggered automatically by `prepublishOnly` hook
   - Creates optimized ES modules with code splitting

3. **Distribution**: Built files in `dist/` are included in the npm package

This approach provides:
- ✅ **Better performance**: Pre-compiled JavaScript
- ✅ **Smaller package size**: Code splitting and optimization
- ✅ **Faster startup**: No runtime compilation
- ✅ **Type safety**: Full TypeScript development experience

## Dependencies

The package requires:
- All runtime dependencies properly declared in `dependencies`
- Build tools (`tsup`, `typescript`) in `devDependencies`
- Built distribution files in `dist/` directory
- CLI wrapper script in `bin/` directory