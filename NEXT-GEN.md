# Configurator 1.0

## Commands

### `pull`

Pulls config from a target Saleor instance.

**Syntax:** `configurator pull url=<url> token=<token>`

**Example:** `configurator pull url=https://production.saleor.cloud token=1234567890`

TODO: how do you resolve conflicts? what happens if pulled config is different from the local one?

pulling is more permissive than pushing

when pulling, we rely on the GraphQL API to throw errors when there is something funky going on

### `diff`

Shows the differences between the current config and the target Saleor instance.

**Syntax:** `configurator diff url=<url> token=<token>`

**Example:** `configurator diff url=https://production.saleor.cloud token=1234567890`

### `push`

Compares two (local vs. target) states, shows the list of changes that will be pushed to the target Saleor instance. If accepted, pushes the changes and creates a configuration artifact.

**Syntax:** `configurator push url=<url> token=<token> [--dry-run]`

**Example:** `configurator push url=https://production.saleor.cloud token=1234567890 --dry-run`

The `--dry-run` flag will show what changes would be made without actually applying them.

**Example output:**

```bash
$ configurator push url=https://production.saleor.cloud token=1234567890
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
URL: https://production.saleor.cloud
Timestamp: 2024-03-15T12:34:56Z
Changes: 4
Status: success

View details: configurator artifacts show cfg_20240315_123456
```

TODO: show how artifact is uploaded to s3

We need a state manager. It will be responsible for:

- Saving the current state of the configuration to s3
- Restoring the configuration from an artifact
- Comparing the current state with the target state
- Generating a list of changes

artifacts are saved in s3

### `rollback`

Rolls back a Saleor instance to a previous configuration state.

**Syntax:** `configurator rollback url=<url> token=<token> --artifact <id>`

**Example:** `configurator rollback url=https://production.saleor.cloud token=1234567890 --artifact cfg_20240315_123456`

**Example output:**

```bash
$ configurator rollback url=https://production.saleor.cloud token=1234567890 --artifact cfg_20240315_123456
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
URL: https://production.saleor.cloud
Timestamp: 2024-03-15T12:45:00Z
Original artifact: cfg_20240315_123456
Changes reverted: 4
Status: success

View details: configurator artifacts show rbk_20240315_124500
```

### `artifacts`

Manages configuration artifacts and their history.

#### `artifacts list`

Lists all configuration artifacts for a Saleor instance.

**Syntax:** `configurator artifacts list url=<url> token=<token>`

**Example:** `configurator artifacts list url=https://production.saleor.cloud token=1234567890`

**Example output:**

```bash
$ configurator artifacts list url=https://production.saleor.cloud token=1234567890
Configuration artifacts:

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
URL: https://production.saleor.cloud
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

---

## Tasks

- Artifact Manager
  - uploading to s3
  - downloading from s3

- State Manager
  - comparing the current state with the target state
  - generating a list of changes
