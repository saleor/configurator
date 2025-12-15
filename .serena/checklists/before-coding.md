# Pre-Coding Checklist

Use this checklist before starting any development task to ensure efficient Serena navigation and optimal productivity.

## 📚 Knowledge Preparation

### Memories to Read (if relevant)

- [ ] **serena_navigation_guide** - If working with unfamiliar code
  ```
  read_memory("serena_navigation_guide")
  ```

- [ ] **serena_workflows** - If following a specific workflow
  ```
  read_memory("serena_workflows")
  ```

- [ ] **codebase_architecture_map** - If working in new area
  ```
  read_memory("codebase_architecture_map")
  ```

- [ ] **code_style_and_conventions** - For coding standards
  ```
  read_memory("code_style_and_conventions")
  ```

## 🎯 Task Understanding

- [ ] Task requirements are clear
- [ ] Target module/area identified
- [ ] Expected deliverables defined
- [ ] Edge cases considered

**If unclear:** Ask clarifying questions before starting

## 🗺️ Code Location

### Find Target Files

- [ ] Located target service
  ```bash
  find_symbol("{Module}Service", relative_path="src/modules/{module}")
  ```

- [ ] Identified repository location
  ```bash
  find_symbol("{Module}Repository", relative_path="src/modules/{module}")
  ```

- [ ] Found related comparators (if applicable)
  ```bash
  find_symbol("{Entity}Comparator", relative_path="src/core/diff/comparators")
  ```

### Check File Sizes

- [ ] Checked file sizes in `codebase_architecture_map`
- [ ] Identified large files (>500 lines) that need symbolic approach
- [ ] Noted which files can be read directly (<300 lines)

**Large Files Reference:**
- product/repository.ts: 1,284 lines ⚠️
- config/schema/schema.ts: 956 lines ⚠️
- config/config-service.ts: 915 lines ⚠️
- product/product-service.ts: 790 lines ⚠️

## 🔍 Code Exploration

### Understand Existing Code

- [ ] Got symbol overview of target files
  ```bash
  get_symbols_overview("src/path/file.ts")
  ```

- [ ] Reviewed method structure (depth=1)
  ```bash
  find_symbol("{Class}", depth=1, include_body=False, relative_path="src/path")
  ```

- [ ] Read relevant methods for context
  ```bash
  find_symbol("{Class}/{method}", include_body=True, relative_path="src/path")
  ```

- [ ] Identified similar implementations for patterns

## 🔗 Dependencies & Impact

### Check Dependencies

- [ ] Mapped repository methods needed
  ```bash
  get_symbols_overview("src/modules/{module}/repository.ts")
  ```

- [ ] Identified error classes available
  ```bash
  get_symbols_overview("src/modules/{module}/errors.ts")
  ```

- [ ] Checked for helper files/utilities
  ```bash
  list_dir("src/modules/{module}", recursive=False)
  ```

### Check Impact

- [ ] Found references to code you'll modify
  ```bash
  find_referencing_symbols("{Class}/{method}", "src/path/file.ts")
  ```

- [ ] Identified potential breaking changes
- [ ] Noted areas that need tests

## 🧪 Test Preparation

- [ ] Located existing tests
  ```bash
  find_symbol("{Class}", relative_path="src/path/file.test.ts")
  ```

- [ ] Reviewed test patterns
  ```bash
  get_symbols_overview("src/path/file.test.ts")
  ```

- [ ] Identified test helpers available
  ```bash
  list_dir("test-helpers", recursive=False)
  ```

## 📋 Planning

### Implementation Plan

- [ ] Decided on approach
- [ ] Identified methods to add/modify
- [ ] Planned error handling
- [ ] Outlined test cases

### Token Budget

- [ ] Estimated token usage for task
- [ ] Planned to use symbolic tools for large files
- [ ] Will read selectively, not entire files

**Target: < 2,000 tokens for most tasks**

## ⚙️ Environment Setup

- [ ] Branch created (if needed)
  ```bash
  git checkout -b feature/your-feature
  ```

- [ ] Dependencies installed
  ```bash
  pnpm install
  ```

- [ ] Build works
  ```bash
  pnpm build
  ```

- [ ] Tests pass
  ```bash
  CI=true pnpm test
  ```

## 🚀 Ready to Code?

### Final Checks

- [ ] Have complete understanding of task
- [ ] Know which files to modify
- [ ] Understand existing code patterns
- [ ] Mapped dependencies and impact
- [ ] Have clear implementation plan
- [ ] Environment is ready

**If all checked:** You're ready to start! 🎉

**If some unchecked:** Complete those steps first for better efficiency

## 🎓 Optimization Reminders

### DO ✅

- Start with symbol overview for large files
- Use relative_path in all searches
- Read selectively (depth=1, specific methods)
- Exclude test files when searching production code
- Check references before modifying
- Follow naming patterns (Service, Repository, Comparator)

### DON'T ❌

- Don't read large files completely
- Don't search globally without relative_path
- Don't read entire classes for one method
- Don't skip checking file sizes
- Don't modify without checking references
- Don't forget to plan before coding

## 📊 Efficiency Metrics

Track these to measure your progress:

- **Search Time:** < 30 seconds to find code
- **Token Usage:** < 2,000 tokens for context gathering
- **Files Read:** Only necessary files
- **Time to Start:** < 5 minutes from task to first line of code

## 🎯 Quick Start for Common Tasks

### Adding a Feature

```bash
# 1. Find service
find_symbol("{Module}Service", relative_path="src/modules/{module}")

# 2. See methods
find_symbol("{Module}Service", depth=1, include_body=False, relative_path="src/modules/{module}")

# 3. Read similar
find_symbol("{Module}Service/similar", include_body=True, relative_path="src/modules/{module}")

# Ready to code!
```

### Fixing a Bug

```bash
# 1. Find error
search_for_pattern("throw new {Error}", relative_path="src/modules/{module}")

# 2. Read method
find_symbol("{Class}/{method}", include_body=True, relative_path="src/path")

# 3. Find callers
find_referencing_symbols("{Class}/{method}", "src/path/file.ts")

# Ready to debug!
```

### Working with Schemas

```bash
# 1. Find schemas (ALWAYS use substring matching)
find_symbol("{entity}", substring_matching=True, relative_path="src/modules/config/schema")

# 2. Read specific
find_symbol("{entity}CreateSchema", relative_path="src/modules/config/schema/schema.ts")

# Ready to modify!
```

---

**Remember:** 5 minutes of preparation saves 30 minutes of searching! 🎯
