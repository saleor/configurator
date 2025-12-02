#!/bin/bash
# CI/CD Feature Test Script
#
# Usage:
#   export SALEOR_URL="https://your-shop.saleor.cloud/graphql/"
#   export SALEOR_TOKEN="your-token"
#   ./test-ci-cd.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check required environment variables
if [[ -z "$SALEOR_URL" || -z "$SALEOR_TOKEN" ]]; then
  echo -e "${RED}Error: SALEOR_URL and SALEOR_TOKEN must be set${NC}"
  echo ""
  echo "Usage:"
  echo '  export SALEOR_URL="https://your-shop.saleor.cloud/graphql/"'
  echo '  export SALEOR_TOKEN="your-token"'
  echo '  ./test-ci-cd.sh'
  exit 1
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Saleor Configurator CI/CD Test Suite ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Saleor URL: ${YELLOW}$SALEOR_URL${NC}"
echo ""

# Test function
run_test() {
  local test_name="$1"
  local expected_exit="$2"
  shift 2
  local cmd="$@"

  echo -e "${BLUE}─────────────────────────────────────────${NC}"
  echo -e "${YELLOW}TEST: $test_name${NC}"
  echo -e "Command: node dist/main.js $cmd"
  echo ""

  set +e
  output=$(node dist/main.js $cmd 2>&1)
  actual_exit=$?
  set -e

  echo "$output" | head -50
  echo ""

  if [[ "$expected_exit" == "*" || "$actual_exit" == "$expected_exit" ]]; then
    echo -e "${GREEN}✓ PASSED${NC} (exit code: $actual_exit)"
  else
    echo -e "${RED}✗ FAILED${NC} (expected exit $expected_exit, got $actual_exit)"
  fi
  echo ""
}

# ============================================
# TEST 1: Basic diff (should work)
# ============================================
run_test "Basic diff command" "*" \
  diff --url "$SALEOR_URL" --token "$SALEOR_TOKEN" --config config.yml

# ============================================
# TEST 2: Diff with --json flag
# ============================================
echo -e "${BLUE}─────────────────────────────────────────${NC}"
echo -e "${YELLOW}TEST: Diff with --json output${NC}"
echo "Command: node dist/main.js diff --json --url ... --config config.yml"
echo ""

set +e
json_output=$(node dist/main.js diff --json --url "$SALEOR_URL" --token "$SALEOR_TOKEN" --config config.yml 2>&1)
json_exit=$?
set -e

# Check if output is valid JSON
if echo "$json_output" | jq . > /dev/null 2>&1; then
  echo "$json_output" | jq '.summary'
  echo ""
  echo -e "${GREEN}✓ PASSED${NC} - Valid JSON output"
else
  echo "$json_output" | head -20
  echo -e "${RED}✗ FAILED${NC} - Not valid JSON"
fi
echo ""

# ============================================
# TEST 3: Diff with --github-comment flag
# ============================================
echo -e "${BLUE}─────────────────────────────────────────${NC}"
echo -e "${YELLOW}TEST: Diff with --github-comment output${NC}"
echo "Command: node dist/main.js diff --github-comment --url ... --config config.yml"
echo ""

set +e
gh_output=$(node dist/main.js diff --github-comment --url "$SALEOR_URL" --token "$SALEOR_TOKEN" --config config.yml 2>&1)
gh_exit=$?
set -e

# Check if output contains expected markdown
if echo "$gh_output" | grep -q "## Saleor Configuration Changes"; then
  echo "$gh_output" | head -30
  echo "..."
  echo ""
  echo -e "${GREEN}✓ PASSED${NC} - Contains GitHub markdown header"
else
  echo "$gh_output" | head -20
  echo -e "${RED}✗ FAILED${NC} - Missing expected markdown"
fi
echo ""

# ============================================
# TEST 4: Diff with --summary flag
# ============================================
run_test "Diff with --summary (counts only)" "*" \
  diff --summary --url "$SALEOR_URL" --token "$SALEOR_TOKEN" --config config.yml

# ============================================
# TEST 5: Diff with --output-file
# ============================================
echo -e "${BLUE}─────────────────────────────────────────${NC}"
echo -e "${YELLOW}TEST: Diff with --output-file${NC}"
echo "Command: node dist/main.js diff --json --output-file /tmp/diff-output.json --url ..."
echo ""

set +e
node dist/main.js diff --json --output-file /tmp/diff-output.json --url "$SALEOR_URL" --token "$SALEOR_TOKEN" --config config.yml 2>&1
file_exit=$?
set -e

if [[ -f /tmp/diff-output.json ]]; then
  echo "File created: /tmp/diff-output.json"
  echo "Content preview:"
  cat /tmp/diff-output.json | jq '.summary' 2>/dev/null || cat /tmp/diff-output.json | head -10
  echo ""
  echo -e "${GREEN}✓ PASSED${NC} - Output file created"
  rm /tmp/diff-output.json
else
  echo -e "${RED}✗ FAILED${NC} - Output file not created"
fi
echo ""

# ============================================
# TEST 6: Deploy with --plan (dry-run)
# ============================================
echo -e "${BLUE}─────────────────────────────────────────${NC}"
echo -e "${YELLOW}TEST: Deploy with --plan (dry-run mode)${NC}"
echo "Command: node dist/main.js deploy --plan --ci --url ... --config config.yml"
echo ""

set +e
plan_output=$(node dist/main.js deploy --plan --ci --url "$SALEOR_URL" --token "$SALEOR_TOKEN" --config config.yml 2>&1)
plan_exit=$?
set -e

echo "$plan_output" | head -40
echo ""

if echo "$plan_output" | grep -q "Plan mode"; then
  echo -e "${GREEN}✓ PASSED${NC} - Plan mode message shown"
elif echo "$plan_output" | grep -q "No changes detected"; then
  echo -e "${GREEN}✓ PASSED${NC} - No changes to plan"
else
  echo -e "${YELLOW}⚠ CHECK${NC} - Verify plan mode behavior"
fi
echo ""

# ============================================
# TEST 7: Deploy with --json
# ============================================
echo -e "${BLUE}─────────────────────────────────────────${NC}"
echo -e "${YELLOW}TEST: Deploy with --json and --plan${NC}"
echo "Command: node dist/main.js deploy --json --plan --ci --url ... --config config.yml"
echo ""

set +e
deploy_json=$(node dist/main.js deploy --json --plan --ci --url "$SALEOR_URL" --token "$SALEOR_TOKEN" --config config.yml 2>&1)
deploy_json_exit=$?
set -e

if echo "$deploy_json" | jq . > /dev/null 2>&1; then
  echo "$deploy_json" | jq '.' | head -20
  echo ""
  echo -e "${GREEN}✓ PASSED${NC} - Valid JSON output from deploy"
else
  # For "no changes" scenario, it might just exit with code 0
  echo "$deploy_json" | head -10
  echo -e "${YELLOW}⚠ CHECK${NC} - May not have JSON if no changes"
fi
echo ""

# ============================================
# TEST 8: Test --fail-on-delete behavior
# ============================================
echo -e "${BLUE}─────────────────────────────────────────${NC}"
echo -e "${YELLOW}TEST: --fail-on-delete flag (info only)${NC}"
echo ""
echo "Note: To test --fail-on-delete, you need a config that would delete something."
echo "The expected behavior:"
echo "  - If deletions detected → exit code 6"
echo "  - If no deletions → normal exit"
echo ""

set +e
delete_test=$(node dist/main.js diff --fail-on-delete --url "$SALEOR_URL" --token "$SALEOR_TOKEN" --config config.yml 2>&1)
delete_exit=$?
set -e

echo "Exit code: $delete_exit"
if [[ "$delete_exit" == "6" ]]; then
  echo -e "${YELLOW}Deletions detected - exit code 6 as expected${NC}"
elif [[ "$delete_exit" == "0" ]]; then
  echo -e "${GREEN}No deletions - exit code 0${NC}"
else
  echo "Other exit code: $delete_exit"
fi
echo ""

# ============================================
# Summary
# ============================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Test Summary ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Tests completed. Review the output above for any failures."
echo ""
echo "Additional manual tests you can run:"
echo ""
echo "1. Test --fail-on-breaking flag:"
echo "   node dist/main.js diff --fail-on-breaking --url \$SALEOR_URL --token \$SALEOR_TOKEN"
echo ""
echo "2. Test actual deployment (not dry-run):"
echo "   node dist/main.js deploy --ci --url \$SALEOR_URL --token \$SALEOR_TOKEN"
echo ""
echo "3. Test with verbose output:"
echo "   node dist/main.js deploy --verbose --plan --ci --url \$SALEOR_URL --token \$SALEOR_TOKEN"
echo ""
