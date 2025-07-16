---
"saleor-configurator": minor
---

## New Deploy Command

### Breaking Change
- Renamed `push` to `deploy` for better clarity
- Simplified flags: removed `--skip-diff` and `--force`, added `--ci` for automation

### What's New

**🚀 Real-time Progress Tracking**  
See exactly what's happening during deployment with visual progress indicators and stage-based execution.

**📊 Enhanced Diff Preview**  
Always see what will change before deployment with improved formatting and grouped changes by entity type.

**🛡️ Safety First**  
- Mandatory diff preview prevents surprises
- Two-tier confirmation (extra warning for deletions)
- CI mode (`--ci`) for automated deployments

**📈 Deployment Reports**  
Automatic JSON reports with timing, changes applied, and summary statistics. Use `--report-path` to customize location.

**🎯 Better Error Messages**  
Context-aware guidance for common issues like network, authentication, or configuration errors.

### Usage

```bash
# Interactive deployment
pnpm deploy --url="https://store.saleor.cloud/graphql/" --token="<token>"

# CI/CD deployment
pnpm deploy --url="https://store.saleor.cloud/graphql/" --token="<token>" --ci

# Custom report location
pnpm deploy --url="https://store.saleor.cloud/graphql/" --token="<token>" --report-path="./deploy-report.json"
```

### Migration
- Change `push` → `deploy`
- Remove `--skip-diff` (diff always shown)
- Replace `--force` with `--ci`
