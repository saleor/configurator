#!/bin/bash
# Saleor Configurator GitHub Action Script
# This script is executed by the composite action to run configurator commands

set -e
# Without pipefail, a failing command in a pipeline would be treated as a success.
set -o pipefail

# GitHub masks the token in logs only when it comes from a secret.
if [[ -n "$SALEOR_TOKEN" ]]; then
  echo "::add-mask::$SALEOR_TOKEN"
fi

# The CLI reads SALEOR_URL and SALEOR_TOKEN from the environment, so the
# token never appears in the process arguments.
export SALEOR_URL SALEOR_TOKEN

# The CLI writes its JSON result here whatever it prints, so the action runs
# each command once and reads its outputs from this file.
RESULT_FILE=$(mktemp)
OUTPUT_FILE=$(mktemp)
trap 'rm -f "$RESULT_FILE" "$OUTPUT_FILE"' EXIT

# Build command arguments
ARGS=()

# Required arguments
ARGS+=("$COMMAND")
ARGS+=("--config" "$CONFIG_PATH")
ARGS+=("--json-file" "$RESULT_FILE")

# Optional arguments based on command type
if [[ "$COMMAND" == "deploy" ]]; then
  # Note: CI_MODE is deprecated and intentionally unused - the CLI detects
  # non-interactive (non-TTY) environments automatically and skips prompts.

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
  export LOG_LEVEL="${LOG_LEVEL:-debug}"
  # Only deploy has a --verbose flag (detailed error messages).
  if [[ "$COMMAND" == "deploy" ]]; then
    ARGS+=("--verbose")
  fi
fi

# The CLI prints JSON when stdout is not a TTY, as on GitHub runners. Unless
# JSON was requested, keep the log and the PR comment human-readable.
if [[ "$JSON_OUTPUT" != "true" ]]; then
  ARGS+=("--text")
fi

echo "Running: configurator ${ARGS[*]}"
echo "---"

EXIT_CODE=0

if [[ "$COMMAND" == "diff" && "$POST_PR_COMMENT" == "true" ]]; then
  # Capture stdout only so stderr logs do not end up in the PR comment
  configurator "${ARGS[@]}" > "$OUTPUT_FILE" || EXIT_CODE=$?
  cat "$OUTPUT_FILE"

  # Multiline output; a random delimiter cannot collide with the diff content
  DELIMITER="EOF_$(od -An -N16 -tx1 /dev/urandom | tr -d ' \n')"
  {
    echo "diff-output<<$DELIMITER"
    cat "$OUTPUT_FILE"
    echo ""
    echo "$DELIMITER"
  } >> "$GITHUB_OUTPUT"
else
  configurator "${ARGS[@]}" || EXIT_CODE=$?
fi

echo "---"
echo "Exit code: $EXIT_CODE"
echo "exit-code=$EXIT_CODE" >> "$GITHUB_OUTPUT"

# Counts come from result.summary (diff, deploy --plan, executed deploy); a
# deploy with nothing to do reports status "no-changes" and no summary. Error
# results have neither, so no counts are written.
TOTAL_CHANGES=""
if [[ -s "$RESULT_FILE" ]]; then
  jq -r '
    .result as $r
    | ($r.summary // (if $r.status == "no-changes" then {totalChanges: 0} else null end)) as $s
    | (if $s then
        "changes-count=\($s.totalChanges // 0)",
        "creates-count=\($s.creates // 0)",
        "updates-count=\($s.updates // 0)",
        "deletes-count=\($s.deletes // 0)",
        "has-changes=\(($s.totalChanges // 0) > 0)"
      else empty end),
      ($r.reportPath // empty | "report-path=\(.)")
  ' "$RESULT_FILE" >> "$GITHUB_OUTPUT"
  TOTAL_CHANGES=$(jq -r '
    .result.summary.totalChanges // (if .result.status == "no-changes" then 0 else empty end)
  ' "$RESULT_FILE")
else
  echo "::warning::configurator $COMMAND wrote no result file"
fi

# diff and deploy --plan report pending changes: diff exits 0 and deploy --plan
# exits 1 when there are changes. Those changes are informational unless
# fail-on-diff is set.
CHANGES_DETECTED=false
if [[ -n "$TOTAL_CHANGES" && "$TOTAL_CHANGES" != "0" ]]; then
  if [[ "$COMMAND" == "diff" && "$EXIT_CODE" -eq 0 ]] ||
    [[ "$COMMAND" == "deploy" && "$PLAN_ONLY" == "true" && "$EXIT_CODE" -eq 1 ]]; then
    CHANGES_DETECTED=true
  fi
fi

# Generate summary based on exit code
if [[ "$CHANGES_DETECTED" == "true" ]]; then
  echo "summary=Changes detected ($TOTAL_CHANGES)" >> "$GITHUB_OUTPUT"
else
  case $EXIT_CODE in
    0)
      if [[ "$TOTAL_CHANGES" == "0" ]]; then
        echo "summary=No changes detected - configurations are in sync" >> "$GITHUB_OUTPUT"
      else
        echo "summary=Operation completed successfully" >> "$GITHUB_OUTPUT"
      fi
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
fi

if [[ "$CHANGES_DETECTED" == "true" ]]; then
  if [[ "$FAIL_ON_DIFF" == "true" ]]; then
    echo "Failing because changes were detected and fail-on-diff is enabled"
    exit 1
  fi
  exit 0
fi

exit "$EXIT_CODE"
