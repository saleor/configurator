#!/bin/bash
# session-context.sh - Detects project context for Saleor Configurator plugin
#
# This script runs at session start to detect:
# - Existing config.yml and its contents
# - Saleor credentials configuration
# - Storefront project detection
# - Environment readiness

echo "=== Saleor Configurator Context Detection ==="
echo ""

# Check for config.yml
if [ -f "config.yml" ]; then
    echo "✓ Found config.yml"
    echo "  CONFIG_EXISTS=true"

    # Count top-level entities
    if command -v grep &> /dev/null; then
        CHANNELS=$(grep -c "^channels:" config.yml 2>/dev/null || echo "0")
        if [ "$CHANNELS" -gt 0 ]; then
            CHANNEL_COUNT=$(grep -E "^  - (name|slug):" config.yml 2>/dev/null | head -20 | wc -l | tr -d ' ')
            echo "  Channels section detected"
        fi

        PRODUCTS=$(grep -c "^products:" config.yml 2>/dev/null || echo "0")
        if [ "$PRODUCTS" -gt 0 ]; then
            echo "  Products section detected"
        fi

        PRODUCT_TYPES=$(grep -c "^productTypes:" config.yml 2>/dev/null || echo "0")
        if [ "$PRODUCT_TYPES" -gt 0 ]; then
            echo "  ProductTypes section detected"
        fi

        CATEGORIES=$(grep -c "^categories:" config.yml 2>/dev/null || echo "0")
        if [ "$CATEGORIES" -gt 0 ]; then
            echo "  Categories section detected"
        fi
    fi
    echo ""
else
    echo "○ No config.yml found"
    echo "  CONFIG_EXISTS=false"
    echo "  → Run /configurator-setup to create a new configuration"
    echo ""
fi

# Check for Saleor credentials
echo "--- Credentials Status ---"
CREDS_FOUND=false

if [ -n "$SALEOR_API_URL" ]; then
    echo "✓ SALEOR_API_URL is set"
    echo "  URL: ${SALEOR_API_URL:0:50}..."
    CREDS_FOUND=true
else
    echo "○ SALEOR_API_URL not set"
fi

if [ -n "$SALEOR_TOKEN" ]; then
    echo "✓ SALEOR_TOKEN is set"
    echo "  Token: ${SALEOR_TOKEN:0:10}..."
    CREDS_FOUND=true
else
    echo "○ SALEOR_TOKEN not set"
fi

# Check for .env file
if [ -f ".env" ]; then
    echo "✓ .env file found"
    if grep -q "SALEOR_API_URL" .env 2>/dev/null; then
        echo "  Contains SALEOR_API_URL"
        CREDS_FOUND=true
    fi
    if grep -q "SALEOR_TOKEN" .env 2>/dev/null; then
        echo "  Contains SALEOR_TOKEN"
        CREDS_FOUND=true
    fi
fi

if [ "$CREDS_FOUND" = false ]; then
    echo ""
    echo "  → Set credentials for remote operations:"
    echo "    export SALEOR_API_URL=\"https://your-store.saleor.cloud/graphql/\""
    echo "    export SALEOR_TOKEN=\"your-api-token\""
    echo "  → Or create a .env file with these variables"
fi

echo ""

# Check for storefront markers
echo "--- Project Type Detection ---"

if [ -f "package.json" ]; then
    if grep -q "\"next\"" package.json 2>/dev/null; then
        echo "✓ Next.js project detected"
        echo "  STOREFRONT_TYPE=nextjs"

        if grep -q "saleor" package.json 2>/dev/null; then
            echo "  Saleor integration detected"
        fi
    elif grep -q "\"react\"" package.json 2>/dev/null; then
        echo "✓ React project detected"
        echo "  STOREFRONT_TYPE=react"
    elif grep -q "\"vue\"" package.json 2>/dev/null; then
        echo "✓ Vue project detected"
        echo "  STOREFRONT_TYPE=vue"
    else
        echo "○ Node.js project (type unknown)"
        echo "  STOREFRONT_TYPE=nodejs"
    fi
elif [ -f "requirements.txt" ] || [ -f "pyproject.toml" ]; then
    echo "○ Python project detected"
    echo "  STOREFRONT_TYPE=python"
elif [ -f "Cargo.toml" ]; then
    echo "○ Rust project detected"
    echo "  STOREFRONT_TYPE=rust"
else
    echo "○ No recognized project type"
    echo "  STOREFRONT_TYPE=unknown"
fi

echo ""

# Check if this is the Configurator repo itself
if [ -f "src/cli/index.ts" ] && grep -q "configurator" package.json 2>/dev/null; then
    echo "--- Development Mode ---"
    echo "✓ Configurator repository detected"
    echo "  Use 'pnpm dev' commands for development"
    echo "  Example: pnpm dev deploy --url=\$URL --token=\$TOKEN"
    echo ""
fi

echo "=== Context Detection Complete ==="
