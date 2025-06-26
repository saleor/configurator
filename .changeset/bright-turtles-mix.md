---
"saleor-configurator": minor
---

## Refactor Pull into Introspect with Enhanced Interactive CLI

### 🔄 Command Rename & Functionality
- **Renamed** `pull` command to `introspect` for better semantic clarity
- **Updated** package.json script from `pull` to `introspect` 
- **Enhanced** introspect command with intelligent diff-based workflow

### 🎯 Smart Introspection Features
- **Automatic diff analysis** - Shows changes before overwriting local files
- **Interactive confirmation prompts** - Asks for user consent when overwriting existing configurations
- **Intelligent handling of invalid local configs** - Detects and offers to replace malformed configuration files
- **Backup creation** - Automatically creates timestamped backups before overwriting
- **Dry-run mode** (`--dry-run`) - Preview changes without making modifications
- **Force mode** (`--force`) - Skip all confirmations for automated workflows

### 🎮 Interactive CLI Experience
- **New interactive utilities** (`src/lib/utils/interactive.ts`):
  - `confirmPrompt()` - Interactive y/n confirmation with customizable defaults
  - `selectPrompt()` - Multiple choice selection interface
  - `displayDiffSummary()` - Formatted diff summary with change statistics
- **Enhanced command help system** with detailed examples and environment variable documentation
- **Improved error handling** with contextual suggestions and troubleshooting tips

### 🛠 CLI & Command Improvements
- **Enhanced argument parsing** with better validation and error messages
- **Comprehensive help text** showing required/optional arguments with descriptions
- **Environment variable support** with clear documentation (SALEOR_URL, SALEOR_TOKEN, etc.)
- **Improved URL validation** with automatic GraphQL endpoint correction
- **Better error categorization** (network, auth, config, etc.) with specific guidance
