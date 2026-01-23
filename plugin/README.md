# Saleor Configurator Claude Plugin

AI-powered Saleor e-commerce configuration through natural language conversations.

## Overview

This Claude Code plugin enables developers to configure Saleor e-commerce stores using natural language instead of manually editing YAML files. It provides:

- **Guided setup wizards** for creating store configurations from scratch
- **Interactive editing** for modifying existing configurations
- **Validation and best practices** checking before deployment
- **Deployment safety** with deletion warnings and error diagnosis
- **Pre-built recipes** for common store types (fashion, electronics, subscriptions)

## Installation

### From Claude Marketplace (Recommended)

```bash
# In Claude Code
/plugin marketplace add saleor/configurator-claude-plugin
```

### Manual Installation

```bash
# Clone or download the plugin
git clone https://github.com/saleor/configurator-claude-plugin.git

# Run Claude Code with the plugin directory
claude --plugin-dir ./configurator-claude-plugin/plugin
```

## Prerequisites

- **Claude Code** installed (`npm install -g @anthropic-ai/claude-code`)
- **Node.js 20+** (for MCP servers)
- **Saleor instance** with API token (for deployment operations)

## Configuration

### Environment Variables

Set these in your shell or create a `.env` file:

```bash
# Required for deployment operations
export SALEOR_API_URL="https://your-store.saleor.cloud/graphql/"
export SALEOR_TOKEN="your-api-token"
```

### MCP Servers

The plugin bundles two MCP servers:

| Server | Purpose | Required |
|--------|---------|----------|
| **Context7** | Fetches up-to-date Saleor documentation | No (graceful fallback) |
| **Saleor MCP** | Queries live store data | No (optional) |

Both servers are optional - the plugin works fully without them using embedded knowledge.

## Commands

| Command | Description |
|---------|-------------|
| `/configurator-setup` | Interactive wizard for creating new store configurations |
| `/configurator-edit` | Menu-driven modification of existing configurations |
| `/configurator-validate` | Schema validation + best practices + common mistakes check |
| `/configurator-review` | Launch comprehensive configuration review agent |

## Skills

Skills provide embedded knowledge that Claude uses automatically:

| Skill | Triggers On |
|-------|-------------|
| **configurator-cli** | CLI commands, deploy, introspect, diff |
| **configurator-schema** | config.yml structure, entity schemas |
| **saleor-domain** | Saleor entities, relationships, GraphQL |
| **configurator-recipes** | Store templates, pre-built configs |

## Agents

| Agent | Purpose |
|-------|---------|
| **config-review** | Analyzes config.yml for issues and improvements |
| **troubleshoot** | Diagnoses deployment failures |
| **discover** | Analyzes existing stores to suggest configurations |

## Quick Start

### Create a New Store Configuration

```bash
# Start Claude Code with the plugin
claude --plugin-dir ./plugin

# In the Claude session:
/configurator-setup
```

Follow the wizard to create your `config.yml`.

### Modify Existing Configuration

```bash
# If you have an existing config.yml:
/configurator-edit

# Or use natural language:
"Add a new product type for gift cards with name, price, and message attributes"
```

### Validate Before Deployment

```bash
/configurator-validate

# Or:
"Validate my configuration and show any issues"
```

### Deploy Configuration

```bash
# Natural language:
"Deploy my configuration to Saleor"

# The CLI command:
npx configurator deploy --url=$SALEOR_API_URL --token=$SALEOR_TOKEN
```

## Hooks

The plugin includes safety hooks:

- **Session Start**: Detects project context and credentials
- **YAML Validation**: Validates syntax before saving config.yml
- **Deploy Safety**: Warns about deletions, requires approval
- **Post-Deploy**: Summarizes changes, offers troubleshooting on failure

## Documentation

- [Configurator CLI Documentation](https://docs.saleor.io/configurator)
- [Saleor Documentation](https://docs.saleor.io)
- [Claude Code Plugin Guide](https://docs.anthropic.com/claude-code/plugins)

## Support

- **Issues**: [GitHub Issues](https://github.com/saleor/configurator-claude-plugin/issues)
- **Discussions**: [GitHub Discussions](https://github.com/saleor/configurator-claude-plugin/discussions)
- **Saleor Community**: [Discord](https://discord.gg/saleor)

## License

MIT License - see [LICENSE](LICENSE) for details.
