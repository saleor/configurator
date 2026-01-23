#!/bin/bash
# validate-plugin.sh - Validates the Saleor Configurator Claude plugin structure
#
# Usage: ./scripts/validate-plugin.sh [plugin-dir]
#
# Checks:
# - Required files and directories
# - JSON syntax in manifest files
# - Frontmatter in markdown files
# - Path references using ${CLAUDE_PLUGIN_ROOT}
# - Naming conventions

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track errors and warnings
ERRORS=0
WARNINGS=0

# Default to script's parent directory if no argument
PLUGIN_DIR="${1:-$(dirname "$0")/..}"
PLUGIN_DIR=$(cd "$PLUGIN_DIR" && pwd)

echo "═══════════════════════════════════════════════════"
echo "  Saleor Configurator Plugin Validator"
echo "═══════════════════════════════════════════════════"
echo ""
echo "Validating: $PLUGIN_DIR"
echo ""

# Helper functions
error() {
    echo -e "${RED}✗ ERROR:${NC} $1"
    ((ERRORS++))
}

warning() {
    echo -e "${YELLOW}⚠ WARNING:${NC} $1"
    ((WARNINGS++))
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

info() {
    echo -e "  $1"
}

# Check required structure
echo "--- Structure Validation ---"

# Check .claude-plugin directory
if [ -d "$PLUGIN_DIR/.claude-plugin" ]; then
    success ".claude-plugin/ directory exists"
else
    error ".claude-plugin/ directory missing"
fi

# Check plugin.json
if [ -f "$PLUGIN_DIR/.claude-plugin/plugin.json" ]; then
    success "plugin.json exists"

    # Validate JSON syntax
    if command -v python3 &> /dev/null; then
        if python3 -c "import json; json.load(open('$PLUGIN_DIR/.claude-plugin/plugin.json'))" 2>/dev/null; then
            success "plugin.json is valid JSON"

            # Check required fields
            NAME=$(python3 -c "import json; print(json.load(open('$PLUGIN_DIR/.claude-plugin/plugin.json')).get('name', ''))" 2>/dev/null)
            if [ -n "$NAME" ]; then
                success "plugin.json has 'name' field: $NAME"
            else
                error "plugin.json missing required 'name' field"
            fi

            VERSION=$(python3 -c "import json; print(json.load(open('$PLUGIN_DIR/.claude-plugin/plugin.json')).get('version', ''))" 2>/dev/null)
            if [ -n "$VERSION" ]; then
                success "plugin.json has 'version' field: $VERSION"
            else
                warning "plugin.json missing recommended 'version' field"
            fi
        else
            error "plugin.json has invalid JSON syntax"
        fi
    else
        warning "Python3 not available, skipping JSON validation"
    fi
else
    error "plugin.json missing at .claude-plugin/plugin.json"
fi

echo ""
echo "--- Component Validation ---"

# Check components are NOT inside .claude-plugin
for dir in commands agents skills hooks; do
    if [ -d "$PLUGIN_DIR/.claude-plugin/$dir" ]; then
        error "$dir/ should NOT be inside .claude-plugin/ - move to plugin root"
    fi
done

# Validate commands
if [ -d "$PLUGIN_DIR/commands" ]; then
    CMD_COUNT=$(find "$PLUGIN_DIR/commands" -name "*.md" | wc -l | tr -d ' ')
    success "commands/ directory exists with $CMD_COUNT command(s)"

    for cmd_file in "$PLUGIN_DIR/commands"/*.md; do
        [ -f "$cmd_file" ] || continue
        filename=$(basename "$cmd_file")

        # Check for name field in frontmatter
        if head -20 "$cmd_file" | grep -q "^name:"; then
            info "  ✓ $filename has 'name' field"
        else
            warning "$filename missing 'name' field in frontmatter"
        fi

        # Check for description
        if head -20 "$cmd_file" | grep -q "^description:"; then
            info "  ✓ $filename has 'description' field"
        else
            warning "$filename missing 'description' field"
        fi
    done
fi

# Validate agents
if [ -d "$PLUGIN_DIR/agents" ]; then
    AGENT_COUNT=$(find "$PLUGIN_DIR/agents" -name "*.md" | wc -l | tr -d ' ')
    success "agents/ directory exists with $AGENT_COUNT agent(s)"

    for agent_file in "$PLUGIN_DIR/agents"/*.md; do
        [ -f "$agent_file" ] || continue
        filename=$(basename "$agent_file")

        # Check for required agent fields
        if head -30 "$agent_file" | grep -q "^name:"; then
            info "  ✓ $filename has 'name' field"
        else
            warning "$filename missing 'name' field"
        fi

        if head -30 "$agent_file" | grep -q "^description:"; then
            info "  ✓ $filename has 'description' field"
        else
            warning "$filename missing 'description' field"
        fi

        # Check for example blocks (best practice)
        if grep -q "<example>" "$agent_file"; then
            info "  ✓ $filename has <example> blocks"
        else
            warning "$filename missing <example> blocks for better triggering"
        fi
    done
fi

# Validate skills
if [ -d "$PLUGIN_DIR/skills" ]; then
    SKILL_COUNT=$(find "$PLUGIN_DIR/skills" -name "SKILL.md" | wc -l | tr -d ' ')
    success "skills/ directory exists with $SKILL_COUNT skill(s)"

    for skill_dir in "$PLUGIN_DIR/skills"/*/; do
        [ -d "$skill_dir" ] || continue
        skill_name=$(basename "$skill_dir")

        if [ -f "$skill_dir/SKILL.md" ]; then
            info "  ✓ $skill_name/ has SKILL.md"

            # Check for version field
            if head -10 "$skill_dir/SKILL.md" | grep -q "^version:"; then
                info "    ✓ has 'version' field"
            else
                warning "$skill_name/SKILL.md missing recommended 'version' field"
            fi
        else
            error "$skill_name/ missing SKILL.md"
        fi
    done
fi

# Validate hooks
if [ -d "$PLUGIN_DIR/hooks" ]; then
    success "hooks/ directory exists"

    if [ -f "$PLUGIN_DIR/hooks/hooks.json" ]; then
        success "hooks.json exists"

        # Validate JSON syntax
        if command -v python3 &> /dev/null; then
            if python3 -c "import json; json.load(open('$PLUGIN_DIR/hooks/hooks.json'))" 2>/dev/null; then
                success "hooks.json is valid JSON"
            else
                error "hooks.json has invalid JSON syntax"
            fi
        fi

        # Check for ${CLAUDE_PLUGIN_ROOT} usage
        if grep -q "CLAUDE_PLUGIN_ROOT" "$PLUGIN_DIR/hooks/hooks.json"; then
            success "hooks.json uses \${CLAUDE_PLUGIN_ROOT} for paths"
        else
            warning "hooks.json should use \${CLAUDE_PLUGIN_ROOT} for portable paths"
        fi
    fi
fi

# Validate MCP config
if [ -f "$PLUGIN_DIR/.mcp.json" ]; then
    success ".mcp.json exists"

    if command -v python3 &> /dev/null; then
        if python3 -c "import json; json.load(open('$PLUGIN_DIR/.mcp.json'))" 2>/dev/null; then
            success ".mcp.json is valid JSON"
        else
            error ".mcp.json has invalid JSON syntax"
        fi
    fi
fi

# Check for schemas
if [ -d "$PLUGIN_DIR/schemas" ]; then
    success "schemas/ directory exists"

    if [ -f "$PLUGIN_DIR/schemas/config.schema.json" ]; then
        success "config.schema.json exists"

        if command -v python3 &> /dev/null; then
            if python3 -c "import json; json.load(open('$PLUGIN_DIR/schemas/config.schema.json'))" 2>/dev/null; then
                success "config.schema.json is valid JSON"
            else
                error "config.schema.json has invalid JSON syntax"
            fi
        fi
    fi
fi

echo ""
echo "--- README Validation ---"

if [ -f "$PLUGIN_DIR/README.md" ]; then
    success "README.md exists"

    # Check for key sections
    for section in "Installation" "Commands" "Skills"; do
        if grep -qi "## $section\|# $section" "$PLUGIN_DIR/README.md"; then
            info "  ✓ Has '$section' section"
        else
            warning "README.md missing '$section' section"
        fi
    done
else
    warning "README.md not found"
fi

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Validation Summary"
echo "═══════════════════════════════════════════════════"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS warning(s), 0 errors${NC}"
    echo "  Plugin is functional but could be improved."
    echo ""
    exit 0
else
    echo -e "${RED}✗ $ERRORS error(s), $WARNINGS warning(s)${NC}"
    echo "  Please fix errors before using the plugin."
    echo ""
    exit 1
fi
