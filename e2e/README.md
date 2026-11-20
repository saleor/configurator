# E2E

Runs the built CLI (`bin/cli.mjs`) against a throwaway Saleor in Docker and checks every result by reading Saleor directly.

```bash
pnpm build && pnpm test:e2e
```

Needs Docker. Global setup starts `compose.yml` (Saleor `3.23`, port `18700`), migrates, creates an admin, and gives the CLI an app token with every permission. The stack is removed with its volumes at the end; Saleor's logs go to `e2e/results/saleor.log`.

| Variable | Effect |
| --- | --- |
| `E2E_KEEP_STACK=1` | Leave the stack running after the run. |
| `E2E_SALEOR_URL`, `E2E_SALEOR_TOKEN` | Reuse a running stack from `compose.yml` instead of starting one. Only localhost URLs are accepted: the suite writes to the store. |
| `E2E_SALEOR_PORT` | Host port for the API. |
| `SALEOR_VERSION` | Saleor image tag. |
| `E2E_RELEASE_VERSION` | npm version for the upgrade check (default `latest`). |

| File | Checks |
| --- | --- |
| `deploy-lifecycle.e2e.ts` | Introspect, add a store slice, deploy, read it back from Saleor; redeploy; introspect then diff. |
| `config-changes.e2e.ts` | Category renames and unsupported keys reach Saleor. |
| `upgrade.e2e.ts` | A file and store written by the npm release validate, diff and deploy cleanly with the checkout. |
| `recipes.e2e.ts` | `recipe list` and `recipe show` from the packed package. |

Tests marked `it.fails` cover known bugs. When a fix lands, Vitest reports the test as unexpectedly passing; change it to `it`.
