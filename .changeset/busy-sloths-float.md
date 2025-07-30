---
"@saleor/configurator": patch
---

Fix inconsistent diff results between commands

Resolved an issue where diff operations could produce inconsistent results when used across different commands. The DiffService is now properly shared through the service container as a singleton, ensuring consistent configuration comparison behavior throughout the application.
