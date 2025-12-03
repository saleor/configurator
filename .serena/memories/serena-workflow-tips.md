# Saleor Dashboard - Serena Workflow Tips

## Core Philosophy

**NEVER read entire files unless absolutely necessary!**

Serena's symbolic tools are designed for efficient, targeted code exploration. Use them to:
- Read only the code you need
- Understand structure before diving into details
- Find specific symbols quickly
- Avoid token waste on irrelevant code

## Efficient Code Exploration

### Step 1: Start with Directory Structure

Before exploring code, understand the layout:

```
mcp__serena__list_dir
- relative_path: "."
- recursive: false  # Start non-recursive
```

**When to use:**
- New to a feature area
- Looking for where to add new code
- Understanding project organization

### Step 2: Use Symbol Overview

Get a high-level view of a file WITHOUT reading the entire content:

```
mcp__serena__get_symbols_overview
- relative_path: "src/products/views/ProductDetails.tsx"
```

**Returns:**
- Top-level symbols (classes, functions, components)
- Symbol types (function, class, const, etc.)
- NO implementation details

**When to use:**
- First time looking at a file
- Finding what components/functions exist
- Understanding file structure
- Deciding if this is the right file

### Step 3: Find Specific Symbols

Locate exact symbols you need:

```
mcp__serena__find_symbol
- name_path: "ProductDetails"  # Component name
- relative_path: "src/products/views"  # Restrict search
- depth: 0  # Just the component
- include_body: false  # Structure only
```

**Name path patterns:**
- `"ProductDetails"` - Find symbol with this name
- `"ProductDetails/handleSubmit"` - Find method in component
- `"/ProductDetails"` - Find top-level symbol only (absolute)
- `"*/handleSubmit"` - Find handleSubmit in any parent

**When to use:**
- Know the symbol name
- Need to locate specific function/component
- Want to understand symbol structure before reading code

### Step 4: Read Symbol Bodies (Targeted)

Only read the code you need:

```
mcp__serena__find_symbol
- name_path: "ProductDetails/handleSubmit"
- relative_path: "src/products/views/ProductDetails.tsx"
- include_body: true  # NOW read the code
```

**When to use:**
- After finding the right symbol
- Need to understand implementation
- Ready to modify specific code

### Step 5: Explore with Depth

Get nested symbols (methods, properties):

```
mcp__serena__find_symbol
- name_path: "ProductForm"
- relative_path: "src/products/components/ProductForm.tsx"
- depth: 1  # Get immediate children (methods, hooks)
- include_body: false  # Just structure
```

**Depth levels:**
- `depth: 0` - Just the symbol itself
- `depth: 1` - Symbol + immediate children (methods, properties)
- `depth: 2` - Symbol + children + grandchildren

**When to use:**
- Understanding class/component structure
- Finding available methods
- Exploring hooks and state in a component

## Pattern Search (When Symbol Search Isn't Enough)

### Use Case: Don't Know Exact Name

```
mcp__serena__search_for_pattern
- substring_pattern: "useProduct.*Form"  # Regex pattern
- relative_path: "src/products"  # Restrict search area
- restrict_search_to_code_files: true  # Only code files
```

**When to use:**
- Finding hooks by pattern (use*, handle*, etc.)
- Locating imports
- Finding similar implementations
- Don't know exact name

### Use Case: Finding Usage Examples

```
mcp__serena__search_for_pattern
- substring_pattern: "useNotifier"  # Find all usages
- paths_include_glob: "src/products/**/*.tsx"  # Only products
- context_lines_before: 2
- context_lines_after: 2
```

**When to use:**
- Learning how to use a utility
- Finding example implementations
- Understanding patterns across codebase

### Use Case: Finding Related Code

```
mcp__serena__search_for_pattern
- substring_pattern: "ProductUpdateMutation"
- restrict_search_to_code_files: true
```

**When to use:**
- Finding where mutations are used
- Locating query definitions
- Finding related code across features

## Finding References

### Use Case: Understanding Dependencies

```
mcp__serena__find_referencing_symbols
- name_path: "useProductForm"
- relative_path: "src/products/hooks/useProductForm.ts"
```

**Returns:**
- All symbols that reference this one
- Code snippets showing usage
- File locations

**When to use:**
- Understanding impact of changes
- Finding usage examples
- Checking if code is used before deleting
- Understanding data flow

## Common Workflows

### Workflow: Implementing a New Feature

1. **Explore similar feature:**
   ```
   mcp__serena__list_dir
   - relative_path: "src/orders"  # Similar feature
   ```

2. **Get structure overview:**
   ```
   mcp__serena__get_symbols_overview
   - relative_path: "src/orders/views/OrderDetails.tsx"
   ```

3. **Find key patterns:**
   ```
   mcp__serena__find_symbol
   - name_path: "OrderDetails"
   - relative_path: "src/orders/views/OrderDetails.tsx"
   - depth: 1
   ```

4. **Read specific implementations:**
   ```
   mcp__serena__find_symbol
   - name_path: "OrderDetails/handleSubmit"
   - include_body: true
   ```

5. **Create new feature following pattern**

### Workflow: Fixing a Bug

1. **Locate the file:**
   ```
   mcp__serena__find_file
   - file_mask: "ProductDetails.tsx"
   - relative_path: "src"
   ```

2. **Get overview:**
   ```
   mcp__serena__get_symbols_overview
   - relative_path: "src/products/views/ProductDetails.tsx"
   ```

3. **Find problematic function:**
   ```
   mcp__serena__find_symbol
   - name_path: "calculatePrice"
   - include_body: true
   ```

4. **Find references to understand usage:**
   ```
   mcp__serena__find_referencing_symbols
   - name_path: "calculatePrice"
   ```

5. **Fix and test**

### Workflow: Understanding Existing Code

1. **Start with overview:**
   ```
   mcp__serena__get_symbols_overview
   - relative_path: "src/products/views/ProductList.tsx"
   ```

2. **Identify key components:**
   ```
   mcp__serena__find_symbol
   - name_path: "ProductList"
   - depth: 1
   - include_body: false
   ```

3. **Read specific parts:**
   ```
   mcp__serena__find_symbol
   - name_path: "ProductList/handleFilter"
   - include_body: true
   ```

4. **Understand data flow:**
   ```
   mcp__serena__find_referencing_symbols
   - name_path: "useProductListQuery"
   ```

### Workflow: Refactoring

1. **Find all usages:**
   ```
   mcp__serena__find_referencing_symbols
   - name_path: "oldFunction"
   - relative_path: "src/utils/oldFunction.ts"
   ```

2. **Understand each usage context:**
   - Read snippets from references
   - Identify patterns

3. **Read full implementations if needed:**
   ```
   mcp__serena__find_symbol
   - name_path: "ComponentUsingOldFunction"
   - include_body: true
   ```

4. **Refactor and update all references**

## Editing Code Efficiently

### Use Case: Replace Entire Symbol

When replacing a complete function/method:

```
mcp__serena__replace_symbol_body
- name_path: "calculatePrice"
- relative_path: "src/products/utils/pricing.ts"
- body: "export function calculatePrice(product: Product): number {\n  return product.basePrice * (1 + product.taxRate);\n}"
```

**When to use:**
- Rewriting entire function
- Changing function signature
- Complete implementation replacement

### Use Case: Insert After Symbol

Add new code after existing symbol:

```
mcp__serena__insert_after_symbol
- name_path: "calculatePrice"
- relative_path: "src/products/utils/pricing.ts"
- body: "\nexport function calculateDiscount(product: Product): number {\n  return product.price * 0.1;\n}"
```

**When to use:**
- Adding new function to file
- Adding new method to class
- Inserting related code

### Use Case: Insert Before Symbol

Add imports or code before symbol:

```
mcp__serena__insert_before_symbol
- name_path: "calculatePrice"  # First symbol in file
- relative_path: "src/products/utils/pricing.ts"
- body: "import { TaxRate } from './types';\n"
```

**When to use:**
- Adding imports
- Adding constants before functions
- Adding setup code

### Use Case: Rename Symbol

Rename across entire codebase:

```
mcp__serena__rename_symbol
- name_path: "calculatePrice"
- relative_path: "src/products/utils/pricing.ts"
- new_name: "computeProductPrice"
```

**When to use:**
- Renaming for clarity
- Refactoring naming conventions
- Making names consistent

## Anti-Patterns (What NOT to Do)

### ❌ Reading Entire Files Unnecessarily

```
# DON'T DO THIS unless you truly need the entire file
Read file_path: "src/products/views/ProductDetails.tsx"
```

**Instead:**
1. Get overview first
2. Find specific symbols
3. Read only what you need

### ❌ Using Pattern Search for Known Symbols

```
# DON'T: Using pattern search when you know the name
mcp__serena__search_for_pattern
- substring_pattern: "ProductDetails"
```

**Instead:**
```
# DO: Use symbol search for known names
mcp__serena__find_symbol
- name_path: "ProductDetails"
```

### ❌ Reading Code Before Understanding Structure

```
# DON'T: Jump straight to reading code
mcp__serena__find_symbol
- name_path: "ProductList"
- include_body: true
```

**Instead:**
```
# DO: Understand structure first
1. mcp__serena__get_symbols_overview
2. mcp__serena__find_symbol with include_body: false
3. mcp__serena__find_symbol with include_body: true (only what you need)
```

### ❌ Broad Searches Without Restriction

```
# DON'T: Search entire codebase unnecessarily
mcp__serena__search_for_pattern
- substring_pattern: "useState"
- relative_path: "src"  # Too broad!
```

**Instead:**
```
# DO: Restrict to relevant area
mcp__serena__search_for_pattern
- substring_pattern: "useState"
- relative_path: "src/products/views"  # Specific area
- paths_include_glob: "*.tsx"  # Only React files
```

## Best Practices

1. ✅ **Always start with overview** before reading code
2. ✅ **Use find_symbol for known names** instead of pattern search
3. ✅ **Restrict searches** to relevant directories
4. ✅ **Read symbol structure first** (include_body: false) before implementation
5. ✅ **Use depth parameter** to explore nested symbols efficiently
6. ✅ **Find references** to understand impact before changes
7. ✅ **Use pattern search** only when you don't know exact names
8. ✅ **Leverage context lines** in pattern search for understanding
9. ✅ **Edit at symbol level** when possible (replace_symbol_body)
10. ✅ **Think before reading** - do you really need the entire file?

## Tool Selection Guide

| Task | Tool |
|------|------|
| Understand file structure | `get_symbols_overview` |
| Find specific symbol | `find_symbol` |
| Find by pattern/partial name | `search_for_pattern` |
| Find usage of symbol | `find_referencing_symbols` |
| List files in directory | `list_dir` |
| Find files by name | `find_file` |
| Replace entire function | `replace_symbol_body` |
| Add new symbol | `insert_after_symbol` or `insert_before_symbol` |
| Rename everywhere | `rename_symbol` |
| Full file read | Read tool (last resort!) |

## Symbol Name Paths in This Codebase

Common patterns you'll encounter:

- **Components**: `ProductList`, `ProductDetails`, `ProductForm`
- **Hooks**: `useProductForm`, `useNavigator`, `useNotifier`
- **Utilities**: `mapEdgesToItems`, `getById`, `formatDate`
- **Methods in components**: `ProductDetails/handleSubmit`, `ProductForm/handleChange`
- **Query/Mutation exports**: `productDetailsQuery`, `productUpdateMutation`

## Remember

**The goal is efficiency**: Read the minimum amount of code necessary to accomplish your task. Serena's tools are designed to help you navigate precisely to what you need without wasting tokens on irrelevant code.
