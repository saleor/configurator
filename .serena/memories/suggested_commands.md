# Suggested Development Commands

## Development Commands
- `pnpm dev` - Run CLI with tsx for development
- `pnpm dev introspect` - Run introspect command in development
- `pnpm dev diff` - Run diff command in development  
- `pnpm dev deploy` - Run deploy command in development
- `pnpm dev start` - Run interactive start command

## Build and Release
- `pnpm build` - TypeScript compilation with tsup
- `pnpm prepublishOnly` - Runs build automatically before publishing

## Code Quality (Always run before commits)
- `pnpm check` - Combined linting and formatting check
- `pnpm check:fix` - Auto-fix linting and formatting issues
- `pnpm lint` - Biome linting only
- `pnpm lint:fix` - Auto-fix linting issues  
- `pnpm format` - Biome formatting only
- `pnpm format:fix` - Auto-fix formatting issues
- `pnpm check:ci` - CI-level checks with error diagnostics

## Testing
- `pnpm test` - Run test suite with Vitest
- `pnpm test:ci` - Run tests in CI mode (silent)

## Schema Management
- `pnpm fetch-schema` - Download latest Saleor GraphQL schema
- `pnpm generate-json-schema` - Generate JSON schema from Zod schemas
- `pnpm generate-schema-docs` - Generate schema documentation

## Release Management
- `pnpm changeset` - Create changeset for version management
- `pnpm version` - Apply changesets and bump versions

## System Commands (Darwin)
- `git status` - Check git status
- `ls -la` - List files with details
- `find . -name "*.ts" -type f` - Find TypeScript files
- `grep -r "pattern" src/` - Search for patterns in source