---
"@saleor/configurator": minor
---

Categories, warehouses, shipping zones and shipping methods now support public `metadata` as a key → value map. Only keys listed in config are managed: `deploy` adds or overwrites them and leaves other keys on Saleor untouched, and `diff` reports only those keys. `introspect` brings every public key into the config file, including keys written by apps; once in the file, `deploy` writes the file's value back. Use the new `--metadata-include` / `--metadata-exclude` flags to keep integration-owned keys out of the file.
