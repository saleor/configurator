---
"@saleor/configurator": minor
---

Improved error handling for deploy command with specific exit codes and actionable error messages. Deploy operations now provide clear feedback when errors occur, including network issues (exit code 3), authentication failures (exit code 2), and validation errors (exit code 4). Added --verbose flag for detailed error information useful for debugging.
