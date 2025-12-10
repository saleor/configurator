#!/bin/bash
# Pre-commit validation script
# Run all quality checks in sequence before committing

set -e

echo "🔍 Running pre-commit quality checks..."
echo ""

echo "Step 1/5: Auto-fixing lint issues..."
pnpm check:fix
echo "✅ Lint issues fixed"
echo ""

echo "Step 2/5: Building project..."
pnpm build
echo "✅ Build successful"
echo ""

echo "Step 3/5: Running tests..."
pnpm test
echo "✅ Tests passed"
echo ""

echo "Step 4/5: Type checking..."
npx tsc --noEmit
echo "✅ Type check passed"
echo ""

echo "Step 5/5: CI validation..."
pnpm check:ci
echo "✅ CI validation passed"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All checks passed! Ready to commit."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
