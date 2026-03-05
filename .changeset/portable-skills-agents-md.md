---
"@saleor/configurator": minor
---

### Cross-Tool AI Agent Skills & AGENTS.md Open Standard

- **Portable skills directory**: New top-level `skills/` directory with 9 tool-agnostic skills usable by any AI coding tool (Codex, Cursor, Copilot, Gemini CLI, etc.). Install with `npx skills add saleor/configurator`.
- **Two new skills from agents**: `configurator-workflow` (end-to-end validate-diff-plan-deploy sequence) and `configurator-troubleshoot` (error diagnosis framework and exit code decision tree) extracted from Claude Code agents into portable format.
- **AGENTS.md open standard alignment**: Restructured to follow the [agents.md](https://agents.md/) convention (Build/Test/Development first, Project Structure second). Added Skills and Claude Code Plugin sections for cross-tool discoverability.
- **No Claude Code regression**: Plugin directory (`plugin/`) remains fully functional with all agents, commands, hooks, and MCP integrations intact.
