#!/bin/bash
# validate-config.sh - Validates config.yml against the JSON schema
#
# Usage: ./scripts/validate-config.sh [config-file] [--verbose]
#
# Requirements (one of):
#   - Python 3 with pyyaml and jsonschema packages
#   - Node.js with ajv-cli package
#
# If no config file specified, looks for config.yml in current directory.

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get script directory (plugin root)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_ROOT="$(dirname "$SCRIPT_DIR")"
SCHEMA_PATH="$PLUGIN_ROOT/schemas/config.schema.json"

# Parse arguments
CONFIG_FILE="${1:-config.yml}"
VERBOSE=false

for arg in "$@"; do
    case $arg in
        --verbose|-v)
            VERBOSE=true
            ;;
    esac
done

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}Error: Config file not found: $CONFIG_FILE${NC}"
    echo ""
    echo "Usage: $0 [config-file] [--verbose]"
    echo ""
    echo "Examples:"
    echo "  $0                  # Validate config.yml in current directory"
    echo "  $0 myconfig.yml     # Validate specific file"
    echo "  $0 config.yml -v    # Validate with verbose output"
    exit 1
fi

# Check if schema exists
if [ ! -f "$SCHEMA_PATH" ]; then
    echo -e "${RED}Error: Schema not found at $SCHEMA_PATH${NC}"
    echo "Please ensure the plugin is correctly installed."
    exit 1
fi

echo "═══════════════════════════════════════════════════"
echo "  Saleor Config.yml Validator"
echo "═══════════════════════════════════════════════════"
echo ""
echo "Config file: $CONFIG_FILE"
echo "Schema: $SCHEMA_PATH"
echo ""

# Function to validate with Python
validate_with_python() {
    python3 << EOF
import sys
import json
import yaml

try:
    from jsonschema import validate, ValidationError, Draft202012Validator
    from jsonschema.exceptions import best_match
except ImportError:
    print("ERROR: jsonschema package not installed")
    print("Install with: pip install jsonschema pyyaml")
    sys.exit(2)

# Load schema
try:
    with open("$SCHEMA_PATH", 'r') as f:
        schema = json.load(f)
except Exception as e:
    print(f"ERROR: Failed to load schema: {e}")
    sys.exit(1)

# Load config
try:
    with open("$CONFIG_FILE", 'r') as f:
        config = yaml.safe_load(f)
except yaml.YAMLError as e:
    print(f"ERROR: Invalid YAML syntax")
    print(f"  {e}")
    sys.exit(1)
except Exception as e:
    print(f"ERROR: Failed to load config: {e}")
    sys.exit(1)

# Validate
validator = Draft202012Validator(schema)
errors = list(validator.iter_errors(config))

if errors:
    print(f"VALIDATION FAILED - {len(errors)} error(s) found")
    print("")
    print("─" * 50)

    for i, error in enumerate(errors[:10], 1):  # Show max 10 errors
        path = " → ".join(str(p) for p in error.absolute_path) if error.absolute_path else "(root)"
        print(f"{i}. Path: {path}")
        print(f"   Error: {error.message}")
        if $VERBOSE:
            if error.schema_path:
                schema_path = " → ".join(str(p) for p in error.schema_path)
                print(f"   Schema: {schema_path}")
        print("")

    if len(errors) > 10:
        print(f"... and {len(errors) - 10} more errors")

    print("─" * 50)
    sys.exit(1)
else:
    print("✓ Config is valid!")
    sys.exit(0)
EOF
}

# Function to validate with Node.js / ajv
validate_with_node() {
    # Check if ajv-cli is available
    if command -v ajv &> /dev/null; then
        # Convert YAML to JSON first
        CONFIG_JSON=$(mktemp)
        python3 -c "import yaml, json, sys; print(json.dumps(yaml.safe_load(open('$CONFIG_FILE'))))" > "$CONFIG_JSON" 2>/dev/null

        if [ $? -ne 0 ]; then
            echo -e "${RED}Error: Failed to parse YAML${NC}"
            rm -f "$CONFIG_JSON"
            return 1
        fi

        # Run ajv validation
        if $VERBOSE; then
            ajv validate -s "$SCHEMA_PATH" -d "$CONFIG_JSON" --verbose
        else
            ajv validate -s "$SCHEMA_PATH" -d "$CONFIG_JSON"
        fi

        RESULT=$?
        rm -f "$CONFIG_JSON"
        return $RESULT
    else
        return 2  # ajv not found
    fi
}

# Try validation methods in order
echo "--- Validation ---"
echo ""

# First try Python (most common)
if command -v python3 &> /dev/null; then
    # Check for required packages
    if python3 -c "import yaml, jsonschema" 2>/dev/null; then
        validate_with_python
        exit $?
    fi
fi

# Try Node.js with ajv
if command -v node &> /dev/null; then
    validate_with_node
    RESULT=$?
    if [ $RESULT -ne 2 ]; then
        exit $RESULT
    fi
fi

# No validator available
echo -e "${YELLOW}Warning: No JSON Schema validator found${NC}"
echo ""
echo "Install one of the following:"
echo ""
echo "  Python (recommended):"
echo "    pip install pyyaml jsonschema"
echo ""
echo "  Node.js:"
echo "    npm install -g ajv-cli"
echo ""
echo "Falling back to basic YAML syntax check..."
echo ""

# Basic YAML syntax check
if command -v python3 &> /dev/null; then
    python3 -c "import yaml; yaml.safe_load(open('$CONFIG_FILE'))" 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ YAML syntax is valid${NC}"
        echo -e "${YELLOW}⚠ Schema validation skipped (no validator installed)${NC}"
        exit 0
    else
        echo -e "${RED}✗ YAML syntax error${NC}"
        exit 1
    fi
else
    echo -e "${RED}Error: Python3 not found${NC}"
    exit 1
fi
