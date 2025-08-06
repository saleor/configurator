---
"@saleor/configurator": patch
---

Fixed npx compatibility for ESM CLI package. Added ESM wrapper to resolve execution issues when using `npx @saleor/configurator start` command, while maintaining full compatibility with `pnpm dlx` and direct execution.