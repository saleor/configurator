#!/bin/bash
# Saleor Configurator GitHub Action Script
# This script is executed by the composite action to run configurator commands

set -e

# Build command arguments
ARGS=()

# Required arguments
ARGS+=("$COMMAND")
ARGS+=("--url" "$SALEOR_URL")
ARGS+=("--token" "$SALEOR_TOKEN")
ARGS+=("--config" "$CONFIG_PATH")

# Optional arguments based on command type
if [[ "$COMMAND" == "deploy" ]]; then
  # Deploy-specific flags
  if [[ "$CI_MODE" == "true" ]]; then
    ARGS+=("--ci")
  fi

  if [[ "$PLAN_ONLY" == "true" ]]; then
    ARGS+=("--plan")
  fi

  if [[ -n "$REPORT_PATH" ]]; then
    ARGS+=("--report-path" "$REPORT_PATH")
  fi

  if [[ "$JSON_OUTPUT" == "true" ]]; then
    ARGS+=("--json")
  fi

  if [[ "$FAIL_ON_DELETE" == "true" ]]; then
    ARGS+=("--fail-on-delete")
  fi
fi

if [[ "$COMMAND" == "diff" ]]; then
  # Diff-specific flags
  if [[ "$JSON_OUTPUT" == "true" ]]; then
    ARGS+=("--json")
  elif [[ "$POST_PR_COMMENT" == "true" ]]; then
    ARGS+=("--github-comment")
  fi

  if [[ "$FAIL_ON_DELETE" == "true" ]]; then
    ARGS+=("--fail-on-delete")
  fi

  if [[ "$FAIL_ON_BREAKING" == "true" ]]; then
    ARGS+=("--fail-on-breaking")
  fi
fi

if [[ "$VERBOSE" == "true" ]]; then
  ARGS+=("--verbose")
fi

# Create temp file for output capture
OUTPUT_FILE=$(mktemp)
JSON_OUTPUT_FILE=$(mktemp)

# Execute configurator and capture output
echo "Running: configurator ${ARGS[*]}"
echo "---"

EXIT_CODE=0

# For diff with github-comment format, capture output for PR comment
if [[ "$COMMAND" == "diff" && "$POST_PR_COMMENT" == "true" ]]; then
  configurator "${ARGS[@]}" > "$OUTPUT_FILE" 2>&1 || EXIT_CODE=$?
  cat "$OUTPUT_FILE"

  # Set output for PR comment (escape newlines for GitHub Actions)
  DIFF_OUTPUT=$(cat "$OUTPUT_FILE" | jq -Rs .)
  echo "diff-output<<EOF" >> "$GITHUB_OUTPUT"
  cat "$OUTPUT_FILE" >> "$GITHUB_OUTPUT"
  echo "EOF" >> "$GITHUB_OUTPUT"
elif [[ "$JSON_OUTPUT" == "true" ]]; then
  # JSON output mode - capture JSON for parsing
  configurator "${ARGS[@]}" > "$JSON_OUTPUT_FILE" 2>&1 || EXIT_CODE=$?
  cat "$JSON_OUTPUT_FILE"

  # Parse JSON output for GitHub outputs
  if [[ -s "$JSON_OUTPUT_FILE" ]]; then
    CHANGES_COUNT=$(jq -r '.summary.totalChanges // 0' "$JSON_OUTPUT_FILE" 2>/dev/null || echo "0")
    CREATES_COUNT=$(jq -r '.summary.creates // 0' "$JSON_OUTPUT_FILE" 2>/dev/null || echo "0")
    UPDATES_COUNT=$(jq -r '.summary.updates // 0' "$JSON_OUTPUT_FILE" 2>/dev/null || echo "0")
    DELETES_COUNT=$(jq -r '.summary.deletes // 0' "$JSON_OUTPUT_FILE" 2>/dev/null || echo "0")

    echo "changes-count=$CHANGES_COUNT" >> "$GITHUB_OUTPUT"
    echo "creates-count=$CREATES_COUNT" >> "$GITHUB_OUTPUT"
    echo "updates-count=$UPDATES_COUNT" >> "$GITHUB_OUTPUT"
    echo "deletes-count=$DELETES_COUNT" >> "$GITHUB_OUTPUT"

    if [[ "$CHANGES_COUNT" -gt 0 ]]; then
      echo "has-changes=true" >> "$GITHUB_OUTPUT"
    else
      echo "has-changes=false" >> "$GITHUB_OUTPUT"
    fi
  fi
else
  # Standard output mode
  configurator "${ARGS[@]}" 2>&1 | tee "$OUTPUT_FILE" || EXIT_CODE=$?
fi

echo "---"
echo "Exit code: $EXIT_CODE"

# Set exit code output
echo "exit-code=$EXIT_CODE" >> "$GITHUB_OUTPUT"

# Set report path if specified
if [[ -n "$REPORT_PATH" && -f "$REPORT_PATH" ]]; then
  echo "report-path=$REPORT_PATH" >> "$GITHUB_OUTPUT"
fi

# Generate summary based on exit code
case $EXIT_CODE in
  0)
    if [[ "$COMMAND" == "diff" ]]; then
      echo "summary=No changes detected - configurations are in sync" >> "$GITHUB_OUTPUT"
    else
      echo "summary=Operation completed successfully" >> "$GITHUB_OUTPUT"
    fi
    ;;
  1)
    echo "summary=Changes detected" >> "$GITHUB_OUTPUT"
    ;;
  2)
    echo "summary=Authentication error" >> "$GITHUB_OUTPUT"
    ;;
  3)
    echo "summary=Network error" >> "$GITHUB_OUTPUT"
    ;;
  4)
    echo "summary=Validation error" >> "$GITHUB_OUTPUT"
    ;;
  5)
    echo "summary=Partial failure - some operations succeeded" >> "$GITHUB_OUTPUT"
    ;;
  6)
    echo "summary=Blocked - deletions detected (--fail-on-delete)" >> "$GITHUB_OUTPUT"
    ;;
  7)
    echo "summary=Blocked - breaking changes detected (--fail-on-breaking)" >> "$GITHUB_OUTPUT"
    ;;
  *)
    echo "summary=Unexpected error occurred" >> "$GITHUB_OUTPUT"
    ;;
esac

# Cleanup temp files
rm -f "$OUTPUT_FILE" "$JSON_OUTPUT_FILE"

# Handle exit code based on fail-on-diff flag
if [[ "$COMMAND" == "diff" && "$FAIL_ON_DIFF" == "true" && "$EXIT_CODE" -eq 1 ]]; then
  echo "Failing because changes were detected and fail-on-diff is enabled"
  exit 1
fi

# Exit with the original exit code (except for expected diff exit code 1 when not using fail-on-diff)
if [[ "$COMMAND" == "diff" && "$EXIT_CODE" -eq 1 && "$FAIL_ON_DIFF" != "true" ]]; then
  # Diff found changes but fail-on-diff is not set - this is informational, not an error
  exit 0
fi

exit $EXIT_CODE
