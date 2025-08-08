---
"@saleor/configurator": patch
---

Fixed npx installation failures by removing problematic postinstall script that required devDependencies. The postinstall script was trying to run tsx commands that aren't available when installing via npx/pnpm dlx, causing installation to fail. Generated files are now created during the build process and included in the published package.