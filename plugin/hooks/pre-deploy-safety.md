---
name: pre-deploy-safety
description: Safety hook that warns when running configurator deploy without first running diff or validate in the current session.
hooks:
  - type: PreToolUse
    tool_name: Bash
---

# Pre-Deploy Safety Hook

This hook detects when a `configurator deploy` command is about to run and checks whether `diff` or `validate` was run first in the session.

## Detection

Match Bash commands containing:
- `configurator deploy` (without `--plan`)
- `pnpm dev deploy` (without `--plan`)

## Warning

If no prior `validate` or `diff` command was detected in the conversation:

```
WARNING: You are about to deploy without first running validate or diff.

Recommended workflow:
1. validate --json    (check config syntax)
2. diff --json        (compare with remote)
3. deploy --plan (preview changes)
4. deploy        (execute)

Consider running validate and diff first to avoid surprises.
```

## Skip Conditions

Do not warn if:
- The command includes `--plan` (it's just a preview)
- The user explicitly said to skip validation
- `validate` or `diff` was already run in this conversation

## Implementation Note

This is a **convention hook** — it documents the expected pre-deploy safety workflow but is not implemented as an executable PreToolUse hook. In practice, the `configurator-expert` agent enforces this workflow sequence programmatically by always running validate → diff → plan → deploy in order.

To make this an executable hook, it would need a `matcher` shell script that inspects the Bash command and returns a warning. For now, this file serves as documentation of the safety convention that agents and skills should follow.
