---
"@saleor/configurator": patch
---

Fix introspect command ignoring include/exclude flags

The introspect command now properly respects `--include` and `--exclude` flags to selectively retrieve configuration sections. Previously, these flags were parsed but ignored, causing the entire configuration to be saved regardless of the specified filters. This fix enables focused configuration management workflows.
