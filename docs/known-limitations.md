# Known Limitations

## Attribute Value Removal

Currently, the Saleor Configurator only **adds** new attribute values but does not remove old ones. This is a known limitation that will be addressed in a future release.

### Why This Happens

When you change attribute values in your configuration (e.g., "Cotton" → "CottonChanged"), the system:
- ✅ Successfully adds new values ("CottonChanged")
- ❌ Does not remove old values ("Cotton")

This results in both old and new values existing in your Saleor instance.

### Impact

You'll see the same "remove" operations in the diff every time you deploy:
```
attributes.Material.values: [-Cotton, -Elastane, +CottonChanged, +ElastaneChanged]
```

### Workarounds

Until this is fixed, you can:

1. **Include both old and new values in your config**:
   ```yaml
   values:
     - name: Cotton        # Keep the old value
     - name: CottonChanged # And the new value
   ```

2. **Manually remove old values** through the Saleor admin interface

3. **Accept the repeated diffs** - The deployment will still work correctly, you'll just see the same removal attempts each time

### Notes

- Attribute values cannot be removed if they're being used by products
- This limitation only affects attribute value updates, not other configuration changes
- The deployment process will warn you about this when it detects value removals