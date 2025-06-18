# Saleor Configurator

A powerful TypeScript-based infrastructure-as-code tool for managing Saleor e-commerce configurations declaratively.

## 📚 Documentation

- **[Quick Start Guide](./QUICK_START.md)** - Get up and running in 5 minutes
- **[Complete Module Documentation](./MODULES_DOCUMENTATION.md)** - Detailed guide for all modules
- **[AI/LLM Reference](./AI_LLM_INDEX.md)** - Structured documentation for AI assistants and IDE integration
- **[Integration Guide](./INTEGRATION.md)** - How to integrate configurator with Saleor

## 🎯 Overview

The Saleor Configurator enables you to:
- Define your entire e-commerce setup in YAML
- Version control your store configuration
- Automate deployment across environments
- Ensure consistency and reproducibility

## ✨ Features

- **Declarative Configuration**: Define desired state, not imperative steps
- **Idempotent Operations**: Safe to run multiple times
- **Dependency Management**: Automatically handles entity relationships
- **Type Safety**: Full TypeScript support with runtime validation
- **Comprehensive Coverage**: Supports all major Saleor entities

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your Saleor credentials

# Create your configuration
cat > my-store.yml << 'EOF'
shop:
  defaultMailSenderName: "My Store"
  
channels:
  - name: "Main Store"
    slug: "main"
    currencyCode: "USD"
    defaultCountry: "US"
EOF

# Apply configuration
pnpm run push -- --config ./my-store.yml
```

See [Quick Start Guide](./QUICK_START.md) for detailed instructions.

## 📦 Supported Entities

### Core Commerce
- **Shop Settings** - Global configuration
- **Channels** - Multi-channel, multi-currency support
- **Products** - Complete catalog management
- **Categories** - Hierarchical organization
- **Collections** - Curated product groups
- **Attributes** - Custom fields for products/pages

### Operations
- **Warehouses** - Inventory locations
- **Shipping** - Zones and methods
- **Tax** - Classes and configurations
- **Vouchers** - Discounts and promotions
- **Gift Cards** - Individual and bulk creation

### Content
- **Pages** - CMS functionality
- **Menus** - Navigation structures
- **Translations** - Multi-language support

## 🏗️ Architecture

The configurator follows a clean architecture pattern:

```
Commands (push/pull)
    ↓
Configurator (orchestration)
    ↓
Services (business logic)
    ↓
Repositories (GraphQL operations)
    ↓
Saleor GraphQL API
```

## 🛠️ Development

```bash
# Run tests
pnpm test

# Run with debug logging
LOG_LEVEL=debug pnpm run push

# Type checking
pnpm tsc --noEmit
```

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please:
1. Follow the existing patterns
2. Add tests for new functionality
3. Update documentation
4. Ensure all tests pass

## 📞 Support

- Check the [documentation](./MODULES_DOCUMENTATION.md)
- Review [test files](./src/modules/) for examples
- Enable debug logging for troubleshooting
- Refer to [Saleor documentation](https://docs.saleor.io/)

---

Built with ❤️ for the Saleor community
