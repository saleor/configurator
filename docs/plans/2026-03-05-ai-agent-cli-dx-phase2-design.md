# CLI DX for AI Agents — Phase 2 Design

Date: 2026-03-05
Status: Approved
Branch: feat/ai-agent-cli-dx

## Context

Phase 1 added env var credentials, auto-TTY detection, validate/schema commands, and `--plan --json` on deploy. Phase 2 focuses on making the CLI output fully machine-consumable and hardening inputs against agent hallucination.

Research sources:
- justin.poehnelt.com/posts/rewrite-your-cli-for-ai-agents
- Claude Code CLI docs (code.claude.com)
- Current codebase analysis

## Decisions

### 1. Unified JSON Envelope

Every data command (deploy, diff, introspect, validate) outputs a consistent envelope when running in non-TTY mode or with explicit `--json`:

```json
{
  "command": "deploy",
  "version": "1.3.0",
  "exitCode": 0,
  "result": { /* command-specific */ },
  "logs": [
    { "level": "info", "ts": "2026-03-05T09:30:00Z", "message": "Starting diff comparison" }
  ],
  "errors": []
}
```

- Auto-JSON when `!process.stdout.isTTY || !process.stdin.isTTY`
- `--json` forces JSON in TTY; `--text` forces human output in non-TTY
- Human-readable output (progress, banners, spinners) goes to stderr in JSON mode
- Logs collected during execution via a JsonLogCollector hooked into the logger

Per-command result shapes:

| Command | result contains |
|---------|----------------|
| deploy | status, summary, operations, duration, resilience, reportPath |
| diff | summary, operations, hasDestructiveOperations |
| introspect | summary, operations, configPath |
| validate | valid, errors (path + message array) |

### 2. Report Naming & Structure

Directory layout:
```
.configurator/reports/
  deploy/
    store-rzalldyg_2026-03-05_09h30m00s.json
  diff/
    store-rzalldyg_2026-03-05_09h28m15s.json
  introspect/
    store-rzalldyg_2026-03-05_09h25m00s.json
```

- Store identifier extracted from URL hostname
- Time format: HHhMMmSSs (readable, filesystem-safe)
- Report content IS the JSON envelope, persisted
- `--report-path` override still works
- Pruning per subdirectory
- Reports expand from deploy-only to all 4 data commands

### 3. Input Validation Hardening via Zod

Reusable primitives in `src/lib/validation/safe-primitives.ts`:

- `safePath()` — normalize, reject traversal, bound to CWD
- `saleorUrl()` — validate URL, enforce HTTPS, require /graphql/ suffix
- `safeString()` — strip control characters below ASCII 0x20
- `safeIdentifier()` — reject ?, #, % in resource IDs
- `safeToken()` — non-empty, no whitespace, strip control chars

Integration: `baseCommandArgsSchema` uses these for url, token, config. Entity slugs/names use `safeIdentifier()`.

### 4. Entity-Scoped Queries

New flags on diff command:
- `--entity-type "Categories"` — filter results to one entity type
- `--entity "Categories/electronics"` — filter to one specific entity

Filtering applied after diff computation on DiffSummary.results. Summary counts adjust to filtered view. Works with all output formats.

Agent drill-down workflow:
1. deploy → exitCode 5, errors point to specific entities
2. diff --entity "Product Types/T-Shirt" --json → field-level detail
3. Agent diagnoses and fixes config

### 5. Agent Documentation — Two Paths

**Generic: AGENTS.md**
Ships at package root. Covers: commands, exit codes, safety rules, JSON envelope format, optimal workflows, credential setup.

**Claude Code Plugin overhaul:**
- Fix wrong exit codes, env var names, flag names in existing skills
- Update troubleshoot agent to use JSON envelope and validate command
- Add pre-deploy-safety hook (warns if no diff before deploy)
- Add configurator-expert agent (autonomous workflow)
- Add agent-output-parsing skill (envelope decision tree)
- Update all command files to reference new features

## Not In Scope

- MCP surface (JSON-RPC tools) — separate initiative
- NDJSON streaming — commands finish in 3-30s, envelope sufficient
- `--fields` filtering — entity-scoped queries solve the real workflow
