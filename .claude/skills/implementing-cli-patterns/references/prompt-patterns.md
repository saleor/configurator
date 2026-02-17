# Interactive Prompt Patterns

Detailed examples of interactive prompts using `@inquirer/prompts`.

## Confirmation Prompt

```typescript
import { confirm } from '@inquirer/prompts';

const shouldProceed = await confirm({
  message: 'This will overwrite existing configuration. Continue?',
  default: false,
});

if (!shouldProceed) {
  console.info('Operation cancelled');
  process.exit(0);
}
```

## Select Prompt

```typescript
import { select } from '@inquirer/prompts';

const action = await select({
  message: 'Select deployment mode:',
  choices: [
    { name: 'Full deployment', value: 'full' },
    { name: 'Incremental (only changes)', value: 'incremental' },
    { name: 'Dry run (preview only)', value: 'dry-run' },
  ],
});
```

## Multi-Select Prompt

```typescript
import { checkbox } from '@inquirer/prompts';

const entities = await checkbox({
  message: 'Select entities to deploy:',
  choices: [
    { name: 'Product Types', value: 'productTypes', checked: true },
    { name: 'Categories', value: 'categories', checked: true },
    { name: 'Products', value: 'products', checked: false },
    { name: 'Menus', value: 'menus', checked: false },
  ],
});
```

## Input Prompt with Validation

```typescript
import { input } from '@inquirer/prompts';

const apiUrl = await input({
  message: 'Enter Saleor API URL:',
  default: 'https://your-store.saleor.cloud/graphql/',
  validate: (value) => {
    if (!value.startsWith('https://')) {
      return 'URL must start with https://';
    }
    return true;
  },
});
```

## Password Prompt

```typescript
import { password } from '@inquirer/prompts';

const token = await password({
  message: 'Enter API token:',
  mask: '*',
});
```
