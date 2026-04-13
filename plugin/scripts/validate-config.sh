#!/bin/bash
# validate-config.sh - Validates config.yml using the CLI schema validator first,
# then falls back to JSON Schema validation using canonical schema locations.
#
# Usage: ./scripts/validate-config.sh [config-file] [--verbose]
#
# Requirements (one of):
#   - configurator CLI in PATH (recommended)
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

resolve_schema_path() {
    local repo_schema="$PLUGIN_ROOT/../schema.json"
    if [ -f "$repo_schema" ]; then
        echo "$repo_schema"
        return 0
    fi

    if command -v node &> /dev/null; then
        local package_schema
        package_schema=$(node -e "try { console.log(require.resolve('@saleor/configurator/schema.json')); } catch { process.exit(1); }" 2>/dev/null || true)
        if [ -n "$package_schema" ] && [ -f "$package_schema" ]; then
            echo "$package_schema"
            return 0
        fi
    fi

    return 1
}

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

SCHEMA_PATH=$(resolve_schema_path || true)

echo "═══════════════════════════════════════════════════"
echo "  Saleor Config.yml Validator"
echo "═══════════════════════════════════════════════════"
echo ""
echo "Config file: $CONFIG_FILE"
echo "Schema: ${SCHEMA_PATH:-<not found>}"
echo ""

# Function to validate with the configurator CLI (authoritative schema)
validate_with_cli() {
    if ! command -v "$1" &> /dev/null; then
        return 2
    fi

    if ! command -v python3 &> /dev/null; then
        return 2
    fi

    CLI_OUTPUT=$(mktemp)
    "$@" validate --config "$CONFIG_FILE" --json > "$CLI_OUTPUT" 2>/dev/null || true

    if [ ! -s "$CLI_OUTPUT" ]; then
        rm -f "$CLI_OUTPUT"
        return 2
    fi

    python3 - "$CLI_OUTPUT" "$VERBOSE" <<'PY'
import json
import sys

output_path = sys.argv[1]
verbose = sys.argv[2].lower() == "true"

try:
    with open(output_path, "r", encoding="utf-8") as f:
        envelope = json.load(f)
except Exception:
    sys.exit(2)

if not isinstance(envelope, dict):
    sys.exit(2)

result = envelope.get("result")
if not isinstance(result, dict):
    sys.exit(2)

valid = result.get("valid")
errors = result.get("errors", [])
if not isinstance(errors, list):
    errors = []

if valid is True and envelope.get("exitCode") == 0:
    print("✓ Config is valid!")
    sys.exit(0)

print(f"VALIDATION FAILED - {len(errors)} error(s) found")
print("")
print("─" * 50)

for i, error in enumerate(errors[:10], 1):
    if isinstance(error, dict):
        path = error.get("path") or "(root)"
        message = error.get("message") or "Unknown validation error"
    else:
        path = "(root)"
        message = str(error)

    print(f"{i}. Path: {path}")
    print(f"   Error: {message}")
    print("")

if len(errors) > 10:
    print(f"... and {len(errors) - 10} more errors")

if verbose:
    envelope_errors = envelope.get("errors")
    if isinstance(envelope_errors, list) and envelope_errors:
        print("Envelope errors:")
        for entry in envelope_errors:
            print(f"  - {entry}")
        print("")

print("─" * 50)
sys.exit(1)
PY

    RESULT=$?
    rm -f "$CLI_OUTPUT"
    return $RESULT
}

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

# First try CLI validation (authoritative runtime schema)
if command -v configurator &> /dev/null; then
    echo "Using configurator CLI validator..."
    if validate_with_cli configurator; then
        exit 0
    else
        RESULT=$?
        if [ $RESULT -ne 2 ]; then
            exit $RESULT
        fi
    fi
fi

if command -v npx &> /dev/null; then
    echo "Using local npx configurator validator..."
    if validate_with_cli npx --no-install configurator; then
        exit 0
    else
        RESULT=$?
        if [ $RESULT -ne 2 ]; then
            exit $RESULT
        fi
    fi
fi

# Fall back to JSON schema validators if a schema path is available
if [ -n "$SCHEMA_PATH" ] && command -v python3 &> /dev/null; then
    # Check for required packages
    if python3 -c "import yaml, jsonschema" 2>/dev/null; then
        validate_with_python
        exit $?
    fi
fi

# Try Node.js with ajv
if [ -n "$SCHEMA_PATH" ] && command -v node &> /dev/null; then
    if validate_with_node; then
        exit 0
    else
        RESULT=$?
        if [ $RESULT -ne 2 ]; then
            exit $RESULT
        fi
    fi
fi

# No validator available
echo -e "${YELLOW}Warning: No CLI validator or schema source found${NC}"
echo ""
echo "Install one of the following:"
echo ""
echo "  CLI (recommended):"
echo "    npm i -g @saleor/configurator"
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
