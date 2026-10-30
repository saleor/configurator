#!/bin/bash
# Saleor Configurator GitHub Action Script
# This script is executed by the composite action to run configurator commands

set -e
# Without pipefail, `configurator ... | tee` reports tee's status and a failed
# command would be treated as a success.
set -o pipefail

# Returns success when `configurator <command> --help` lists the given flag as a
# boolean switch (i.e. not followed by a `<value>` placeholder).
supports_boolean_flag() {
  configurator "$1" --help 2>&1 | grep -Eq -- "^[[:space:]]*--$2([[:space:]]+[^<[:space:]]|[[:space:]]*\$)"
}

# Prints "total creates updates deletes" (tab-separated) from a CLI JSON
# envelope ({command, version, exitCode, result, logs, errors}). Handles diff
# results (result.summary.totalChanges/creates/updates/deletes), deploy plan
# results (result.summary.creates/updates/deletes) and deploy "no-changes".
# Prints nothing when the envelope carries no counts.
counts_from_envelope() {
  jq -r '
    if (.result.summary | type) == "object" then
      .result.summary
      | [(.totalChanges // ((.creates // 0) + (.updates // 0) + (.deletes // 0))),
         (.creates // 0), (.updates // 0), (.deletes // 0)]
    elif .result.status == "no-changes" then [0, 0, 0, 0]
    else empty end
    | @tsv' "$1" 2>/dev/null || true
}

# Prints "total creates updates deletes" from a deployment report file.
counts_from_report() {
  jq -r '.summary.changes // empty | [.total, .created, .updated, .deleted] | @tsv' "$1" 2>/dev/null || true
}

# Writes the count outputs and has-changes from "total creates updates deletes".
write_count_outputs() {
  local total creates updates deletes
  read -r total creates updates deletes <<< "$1"
  [[ "$total" =~ ^[0-9]+$ ]] || return 0
  {
    echo "changes-count=$total"
    echo "creates-count=$creates"
    echo "updates-count=$updates"
    echo "deletes-count=$deletes"
    if (( total > 0 )); then
      echo "has-changes=true"
    else
      echo "has-changes=false"
    fi
  } >> "$GITHUB_OUTPUT"
}

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
  # Note: CI_MODE is deprecated and intentionally unused - the CLI detects
  # non-interactive (non-TTY) environments automatically and skips prompts.

  if [[ "$PLAN_ONLY" == "true" ]]; then
    ARGS+=("--plan")
  fi

  if [[ -n "$REPORT_PATH" ]]; then
    ARGS+=("--reportPath" "$REPORT_PATH")
  fi

  if [[ "$JSON_OUTPUT" == "true" ]]; then
    ARGS+=("--json")
  fi

  if [[ "$FAIL_ON_DELETE" == "true" ]]; then
    ARGS+=("--failOnDelete")
  fi
fi

if [[ "$COMMAND" == "diff" ]]; then
  # Diff-specific flags
  if [[ "$JSON_OUTPUT" == "true" ]]; then
    ARGS+=("--json")
  elif [[ "$POST_PR_COMMENT" == "true" ]]; then
    ARGS+=("--githubComment")
  fi

  if [[ "$FAIL_ON_DELETE" == "true" ]]; then
    ARGS+=("--failOnDelete")
  fi

  if [[ "$FAIL_ON_BREAKING" == "true" ]]; then
    ARGS+=("--failOnBreaking")
  fi
fi

if [[ "$VERBOSE" == "true" ]]; then
  # Verbose logging works for every command via LOG_LEVEL. The --verbose flag is
  # only passed where the installed CLI accepts it as a boolean switch (it is
  # missing on diff and expects a value on deploy in some CLI versions).
  export LOG_LEVEL="${LOG_LEVEL:-debug}"
  if supports_boolean_flag "$COMMAND" verbose; then
    ARGS+=("--verbose")
  fi
fi

# The CLI switches to JSON output automatically when stdout is not a TTY (as on
# GitHub runners). Unless JSON was requested, force human-readable output so the
# log and the PR comment markdown are not replaced by a JSON envelope.
if [[ "$JSON_OUTPUT" != "true" ]] && supports_boolean_flag "$COMMAND" text; then
  ARGS+=("--text")
fi

# Create temp file for output capture
OUTPUT_FILE=$(mktemp)
JSON_OUTPUT_FILE=$(mktemp)
RUN_MARKER=$(mktemp)
DEFAULT_REPORTS_DIR=".configurator/reports"
COUNTS=""

# Execute configurator and capture output
echo "Running: configurator ${ARGS[*]}"
echo "---"

EXIT_CODE=0

# For diff with github-comment format, capture output for PR comment
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
elif [[ "$JSON_OUTPUT" == "true" ]]; then
  # JSON output mode - capture stdout only; stderr carries logs that would
  # corrupt the JSON envelope.
  configurator "${ARGS[@]}" > "$JSON_OUTPUT_FILE" || EXIT_CODE=$?
  cat "$JSON_OUTPUT_FILE"
  COUNTS=$(counts_from_envelope "$JSON_OUTPUT_FILE")
else
  # Standard output mode
  configurator "${ARGS[@]}" 2>&1 | tee "$OUTPUT_FILE" || EXIT_CODE=$?
fi

echo "---"
echo "Exit code: $EXIT_CODE"

# Set exit code output
echo "exit-code=$EXIT_CODE" >> "$GITHUB_OUTPUT"

# Locate the deployment report: the requested path, or the newest report the
# CLI wrote to its default directory during this run.
DEPLOY_REPORT=""
if [[ -n "$REPORT_PATH" && -f "$REPORT_PATH" ]]; then
  DEPLOY_REPORT="$REPORT_PATH"
elif [[ "$COMMAND" == "deploy" && -d "$DEFAULT_REPORTS_DIR" ]]; then
  DEPLOY_REPORT=$(find "$DEFAULT_REPORTS_DIR" -type f -name '*.json' -newer "$RUN_MARKER" | sort | tail -n 1)
fi

if [[ -n "$DEPLOY_REPORT" ]]; then
  echo "report-path=$DEPLOY_REPORT" >> "$GITHUB_OUTPUT"
  # An executed deployment prints no JSON summary; take the counts from the report.
  if [[ -z "$COUNTS" ]]; then
    COUNTS=$(counts_from_report "$DEPLOY_REPORT")
  fi
fi

# diff and deploy --plan report pending changes. diff exits 0 whether or not
# changes exist and deploy --plan exits 1 when changes exist, so neither exit
# code says whether there are changes - the JSON summary does.
REPORTS_CHANGES=false
if [[ "$COMMAND" == "diff" || ( "$COMMAND" == "deploy" && "$PLAN_ONLY" == "true" ) ]]; then
  REPORTS_CHANGES=true
fi

# In human-readable modes nothing parseable was printed; run the same command
# again with --json to collect the change summary.
if [[ -z "$COUNTS" && "$REPORTS_CHANGES" == "true" ]] && (( EXIT_CODE <= 1 )); then
  META_ARGS=("$COMMAND" "--url" "$SALEOR_URL" "--token" "$SALEOR_TOKEN" "--config" "$CONFIG_PATH" "--json")
  if [[ "$COMMAND" == "deploy" ]]; then
    META_ARGS+=("--plan")
  fi
  echo "Collecting change summary (configurator $COMMAND --json)..."
  configurator "${META_ARGS[@]}" > "$JSON_OUTPUT_FILE" 2>/dev/null || true
  COUNTS=$(counts_from_envelope "$JSON_OUTPUT_FILE")
  if [[ -z "$COUNTS" ]]; then
    echo "::warning::Could not determine change counts from configurator $COMMAND --json"
  fi
fi

write_count_outputs "$COUNTS"

TOTAL_CHANGES=""
read -r TOTAL_CHANGES _ <<< "$COUNTS"

# Changes reported by diff (exit 0) or deploy --plan (exit 1) are informational.
CHANGES_DETECTED=false
if [[ "$REPORTS_CHANGES" == "true" && "$TOTAL_CHANGES" =~ ^[0-9]+$ ]] && (( TOTAL_CHANGES > 0 )); then
  if [[ "$EXIT_CODE" -eq 0 || ( "$COMMAND" == "deploy" && "$EXIT_CODE" -eq 1 ) ]]; then
    CHANGES_DETECTED=true
  fi
fi

# Generate summary based on exit code
if [[ "$CHANGES_DETECTED" == "true" ]]; then
  echo "summary=Changes detected ($TOTAL_CHANGES)" >> "$GITHUB_OUTPUT"
else
  case $EXIT_CODE in
    0)
      if [[ "$REPORTS_CHANGES" == "true" && "$TOTAL_CHANGES" == "0" ]]; then
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

# Cleanup temp files
rm -f "$OUTPUT_FILE" "$JSON_OUTPUT_FILE" "$RUN_MARKER"

if [[ "$CHANGES_DETECTED" == "true" ]]; then
  if [[ "$FAIL_ON_DIFF" == "true" ]]; then
    echo "Failing because changes were detected and fail-on-diff is enabled"
    exit 1
  fi
  # Pending changes are informational unless fail-on-diff is set
  exit 0
fi

exit "$EXIT_CODE"
