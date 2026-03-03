---
"@saleor/configurator": patch
---

Fix npm publish in CI by removing conflicting NPM_TOKEN/NODE_AUTH_TOKEN env vars that override OIDC trusted publishing, and add --provenance flag for supply chain attestation
