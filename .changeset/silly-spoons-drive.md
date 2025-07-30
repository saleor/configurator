---
"@saleor/configurator": patch
---

Fix deployment failures caused by duplicate entities in Saleor

Deployments no longer fail when Saleor contains duplicate entities (e.g., multiple page types or product types with the same name). The system now deduplicates remote entities automatically while warning about duplicates found. Additionally, improved exact-match logic prevents creating new duplicates during deployment.
