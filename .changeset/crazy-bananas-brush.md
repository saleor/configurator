---
"@saleor/configurator": patch
---

Improved error handling with actionable recovery suggestions and consistent service wrapping. Added ErrorRecoveryGuide system that provides context-aware suggestions for common errors. Extended ServiceErrorWrapper to 80% of services for consistent error handling in async operations. Fixed page type reference attribute validation to properly require entityType field. All errors now include helpful recovery steps and relevant CLI commands to resolve issues.