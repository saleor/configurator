# Configurator 1.0

## Commands

### `pull`

Pulls config from a target environment.

**Syntax:** `configurator pull <env>`

**Example:** `configurator pull production`

### `diff`

Shows the differences between the current config and the target environment.

**Syntax:** `configurator diff <env>`

**Example:** `configurator diff production`

### `push`

Shows the list of changes that will be pushed to the target environment. If accepted, pushes the changes and creates a configuration artifact.

**Syntax:** `configurator push <env> [--dry-run]`

**Example:** `configurator push production --dry-run`

The `--dry-run` flag will show what changes would be made without actually applying them.

**Example output:**

```bash
$ configurator push production
Analyzing changes...
The following changes will be applied:

📦 Product Types
  ➕ Create: "E-Book" with attributes:
    - Author (PLAIN_TEXT)
    - Format (DROPDOWN: PDF, EPUB, MOBI)
  🔄 Update: "Book"
    - Add attribute: "ISBN" (PLAIN_TEXT)
    - Update attribute: "Genre" (add value: "Mystery")

🌐 Channels
  ➕ Create: "Germany"
    - Currency: EUR
    - Country: DE
  🔄 Update: "Poland"
    - Update settings: allocationStrategy = PRIORITIZE_SORTING_ORDER

Do you want to proceed? [y/N] y

Applying changes...
✅ Changes applied successfully

Configuration artifact created:
ID: cfg_20240315_123456
Environment: production
Timestamp: 2024-03-15T12:34:56Z
Changes: 4
Status: success

View details: configurator artifacts show cfg_20240315_123456
```

### `rollback`

Rolls back the environment to a previous configuration state.

**Syntax:** `configurator rollback <env> --artifact <id>`

**Example:** `configurator rollback production --artifact cfg_20240315_123456`

**Example output:**

```bash
$ configurator rollback production --artifact cfg_20240315_123456
Analyzing rollback...
The following changes will be reverted:

📦 Product Types
  ➖ Delete: "E-Book"
  🔄 Update: "Book"
    - Remove attribute: "ISBN"
    - Update attribute: "Genre" (remove value: "Mystery")

🌐 Channels
  ➖ Delete: "Germany"
  🔄 Update: "Poland"
    - Revert settings: allocationStrategy = PRIORITIZE_HIGH_TO_LOW

Do you want to proceed? [y/N] y

Applying rollback...
✅ Rollback completed successfully

Rollback artifact created:
ID: rbk_20240315_124500
Environment: production
Timestamp: 2024-03-15T12:45:00Z
Original artifact: cfg_20240315_123456
Changes reverted: 4
Status: success

View details: configurator artifacts show rbk_20240315_124500
```

### `artifacts`

Manages configuration artifacts and their history.

#### `artifacts list`

Lists all configuration artifacts for an environment.

**Syntax:** `configurator artifacts list <env>`

**Example:** `configurator artifacts list production`

**Example output:**

```bash
$ configurator artifacts list production
Configuration artifacts for production:

ID                  Type      Timestamp           Status    Changes    User
cfg_20240315_123456 config    2024-03-15 12:34    success   4          john.doe
rbk_20240315_124500 rollback  2024-03-15 12:45    success   4          john.doe
cfg_20240315_111111 config    2024-03-15 11:11    success   2          jane.smith
```

#### `artifacts show`

Shows detailed information about a specific configuration artifact.

**Syntax:** `configurator artifacts show <id>`

**Example:** `configurator artifacts show cfg_20240315_123456`

**Example output:**

```bash
$ configurator artifacts show cfg_20240315_123456
Configuration Artifact: cfg_20240315_123456
Type: config
Environment: production
Timestamp: 2024-03-15T12:34:56Z
Status: success
User: john.doe
Git commit: abc1234

Changes:
1. Create product type "E-Book"
   - Added attributes:
     * Author (PLAIN_TEXT)
     * Format (DROPDOWN: PDF, EPUB, MOBI)

2. Update product type "Book"
   - Added attribute: ISBN (PLAIN_TEXT)
   - Updated attribute: Genre
     Added value: Mystery

3. Create channel "Germany"
   - Currency: EUR
   - Country: DE
   - Settings: default

4. Update channel "Poland"
   - Changed allocationStrategy to PRIORITIZE_SORTING_ORDER

Metadata:
- Config hash: abc123def456
- Duration: 2.3s
- API calls: 12
```

### `env`

The environment management system allows you to manage different Saleor instances (e.g., development, staging, production) and their configurations. Each environment can have its own configuration file and state.

#### `env list`

Lists all environments.

**Syntax:** `configurator env list`

**Example:** `configurator env list`

#### `env add`

Adds a new environment.

**Syntax:** `configurator env add <name>`

**Example:** `configurator env add staging`

#### `env remove`

Removes an environment.

**Syntax:** `configurator env remove <name>`

**Example:** `configurator env remove staging`
