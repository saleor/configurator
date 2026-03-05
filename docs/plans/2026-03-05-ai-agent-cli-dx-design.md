# AI-Agent CLI DX Design

**Date:** 2026-03-05  
**Status:** Approved  
**Reference:** [Rewrite Your CLI for AI Agents](https://justin.poehnelt.com/posts/rewrite-your-cli-for-ai-agents.md), `docs/AGENTIC_WORKFLOW_IMPROVEMENTS.md`

## Problem

The configurator CLI was designed for humans. AI agents (Claude Code, GitHub Actions, CI pipelines) hit friction at every layer:

- Must remember `--ci` on every deploy/introspect call or prompts block execution
- Credentials passed as flags every invocation — no env var support
- Validation errors are Zod paths without expected formats or examples
- No way to validate config before a network round-trip
- No way to discover the config schema at runtime
- `--plan` output is human-formatted — agents can't parse it

## Approach: Layered Defaults with Explicit Overrides

Two tiers of improvement, aligned with the article's principle: _"layer safety and structure beneath existing human-friendly interfaces"_:

1. **Always-on** — behaviours that activate unconditionally, improving agent and human DX equally
2. **Opt-in structured output** — explicit flags/commands for machine-readable output

Human UX is unchanged. Agents get what they need without magic flags.

---

## Section 1: Always-On Behaviours

### 1.1 Env Vars as First-Class Credentials

Read `SALEOR_URL`, `SALEOR_TOKEN`, and `SALEOR_CONFIG` before CLI flag parsing. Flags override env vars if both present.

**Priority:**
```
--url flag > SALEOR_URL env var > validation error
--token flag > SALEOR_TOKEN env var > validation error  
--config flag > SALEOR_CONFIG env var > default "config.yml"
```

Agents set env vars once per session. No credentials in every command.

### 1.2 Auto-TTY Detection

`requiresInteractive: true` commands (deploy, introspect) currently block without `--ci`. Change the activation logic:

```
stdin is not a TTY  →  skip confirmations automatically
CI=true in env      →  skip confirmations automatically
--ci flag           →  skip confirmations (backward compat)
```

Agents in Claude Code, GitHub Actions, or any non-terminal context never need `--ci`.

### 1.3 Richer Inline Validation Errors

When config fails Zod validation, errors include what was received, what was expected, and a minimal valid example:

```
Error: productTypes[0].productAttributes[0] — invalid format
  Received: { name: "Brand" }
  Expected one of:
    Inline:    { name: "Brand", inputType: "DROPDOWN", values: ["A", "B"] }
    Reference: { attribute: "Brand" }
```

Applies everywhere config is loaded — deploy, diff, validate, plan.

---

## Section 2: Opt-In Structured Output

### 2.1 `--json` Extended to All Commands

Already exists on `deploy` and `diff`. Extend to `introspect` and `start`.

**Output contract:**
- `stdout`: valid JSON only (agents can pipe/parse)
- `stderr`: human-readable logs (agents ignore)
- Exit codes are consistent across all commands:
  - `0` — success
  - `1` — runtime error
  - `2` — validation failure
  - `3` — diff has changes (already on `diff`, extend to `plan`)

### 2.2 `configurator validate` Command

Validates config against the Zod schema without network calls. Fast, safe, agent-friendly.

```bash
configurator validate                        # human output
configurator validate --json                 # machine output
configurator validate --config custom.yml    # explicit config path
```

**JSON output:**
```json
{
  "valid": false,
  "errors": [
    {
      "path": "productTypes[0].productAttributes[0]",
      "received": { "name": "Brand" },
      "expected": "inline attribute or reference object",
      "example": { "attribute": "Brand" }
    }
  ]
}
```

**Exit codes:** `0` = valid, `2` = validation errors.

Agents run `validate` before `deploy` to catch config issues without network round-trips.

### 2.3 `configurator schema` Command

Outputs the full JSON Schema for `config.yml`, derived from Zod schemas at runtime.

```bash
configurator schema                          # pretty-printed to stdout
configurator schema --output schema.json     # save to file
```

Always outputs JSON — no `--json` flag needed (it's inherently machine output).

**Use cases:**
- Agents discover the config format without reading source code
- VS Code YAML autocompletion via `yaml.schemas` in workspace settings
- Validate config in CI before any Saleor API calls

---

## Section 3: Structured `--plan` Output

### 3.1 Machine-Readable Plan

`deploy --plan --json` produces a structured dry-run report:

```json
{
  "summary": {
    "creates": 12,
    "updates": 3,
    "deletes": 0,
    "noChange": 45
  },
  "operations": [
    {
      "entity": "productType",
      "name": "Tire",
      "action": "create",
      "fields": ["name", "productAttributes"]
    },
    {
      "entity": "channel",
      "name": "default-channel",
      "action": "update",
      "fields": ["currencyCode"]
    }
  ],
  "validationErrors": [],
  "willDeleteEntities": false
}
```

### 3.2 Plan as a Gate

Agents use `--plan --json` to inspect before committing:

```bash
plan=$(configurator deploy --plan --json)
deletes=$(echo $plan | jq '.summary.deletes')
if [ "$deletes" -gt 0 ]; then
  # ask user / abort / log warning
fi
configurator deploy
```

### 3.3 Validation in Plan

Config errors surface in `--plan` before any network call, in the same `validationErrors` array. One command validates + previews — no wasted API round-trips.

---

## Impact on Existing Interfaces

| Change | Backward Compatible? | Notes |
|--------|----------------------|-------|
| Env var support | Yes | Flags still work, take precedence |
| Auto-TTY detection | Yes | `--ci` still works |
| Richer error messages | Yes | Same exit codes, more text |
| `--json` on introspect/start | Yes | New flag, no change to default output |
| `validate` command | Yes | New command |
| `schema` command | Yes | New command |
| Structured `--plan --json` | Yes | `--plan` human output unchanged |

## Out of Scope

- MCP server (separate design, deferred)
- Credential profile files / `.configurator/config.yml` (env vars cover the agent case)
- Resume/checkpoint on partial failures (rate limiting resilience — separate plan exists)
- `--format=ndjson` streaming (defer until there's a concrete need)

## Files Expected to Change

- `src/cli/command.ts` — env var reading in base schema, TTY detection
- `src/cli/main.ts` — register new commands
- `src/commands/validate.ts` — new file
- `src/commands/schema.ts` — new file  
- `src/commands/deploy.ts` — structured plan JSON output
- `src/commands/introspect.ts` — `--json` support
- `src/lib/schema/` — Zod-to-JSON-Schema conversion utility
- `src/cli/errors.ts` — richer Zod error formatting
