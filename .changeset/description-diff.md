---
"@saleor/configurator": patch
---

Product description changes in lists, tables, quotes and code blocks are now detected by `diff` and applied by `deploy`. Previously only paragraph and header text was compared, so these edits were silently skipped. When both sides are EditorJS JSON, changing a block's type (e.g. paragraph to header) is detected too.
