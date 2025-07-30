---
"@saleor/configurator": patch
---

Fix duplicate attribute error when redeploying configurations

Previously, pushing a configuration that contained attributes already present in Saleor (from previous deployments) would fail with a duplicate attribute error. The system now correctly reuses existing attributes instead of attempting to recreate them, making redeployments more reliable.
