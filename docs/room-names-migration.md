# Room Names Migration Guide

This guide explains the migration from the old 6-character room codes to the new friendly room names system.

## Overview

The DaggerDice room system has been upgraded from cryptic 6-character codes like `ABC123` to memorable RPG-themed names like `brave-dragon`. This migration maintains full backward compatibility while providing a much better user experience.

## What Changed

### Before (Old System)
```
Room Code: ABC123
URL: https://daggerdice.com/room/ABC123
User Experience: "Join room ABC123"
```

### After (New System)
```
Room Name: brave-dragon
Short Code: 4CQ (3 characters instead of 6)
URL: https://daggerdice.com/room/brave-dragon
User Experience: "Join room brave-dragon"
```

## Migration Timeline

### Phase 1: Core Infrastructure (Completed)
- ✅ Added word lists and encoding functions
- ✅ Updated session generation to use friendly names
- ✅ Added validation for both old and new formats
- ✅ Updated WebSocket API to accept both formats

### Phase 2: User Interface (Future)
- 🔄 Update UI to display friendly names instead of codes
- 🔄 Add copy-to-clipboard for friendly room links
- 🔄 Update help text and error messages

### Phase 3: Optional Enhancements (Future)
- 🔄 Custom room names with moderation
- 🔄 Themed word lists for different game systems
- 🔄 Room name favorites and history

## Compatibility Matrix

| Input Format | Old System | New System | Notes |
|-------------|------------|------------|-------|
| `ABC123` (6-char) | ✅ Supported | ❌ Not generated | Legacy support only |
| `4CQ` (3-char) | ❌ Not supported | ✅ Generated | New internal format |
| `brave-dragon` | ❌ Not supported | ✅ Generated | User-facing format |

## Developer Impact

### Breaking Changes
- **None** - All existing functionality continues to work

### New Features Available
```typescript
// Generate friendly names
const roomName = generateFriendlyName();  // "brave-dragon"

// Convert between formats
const code = friendlyNameToSessionId('brave-dragon');  // "4CQ"
const name = sessionIdToFriendlyName('4CQ');           // "brave-dragon"

// Validate both formats
isValidSessionId('ABC123');      // true (legacy support)
isValidSessionId('4CQ');         // true (new short code)
isValidSessionId('brave-dragon'); // true (new friendly name)
```

### Updated APIs
```typescript
// All existing functions work with new formats
const sessionId = generateSessionId();     // Now returns 3-char codes
const isValid = isValidSessionId(input);   // Now accepts 3 formats
const normalized = normalizeSessionId(id); // Handles all formats
```

## User Experience Changes

### For New Users
- Room creation shows friendly names like "brave-dragon"
- URLs are memorable and shareable
- No change in functionality, just better UX

### For Existing Users
- Old room links continue to work
- Can still join with 6-character codes if needed
- Gradually see friendly names in new sessions

## Testing Strategy

### Regression Testing
All existing tests continue to pass with updated expectations:

```bash
# Run full test suite
npm run test:all

# Check specific areas
npm test -- room-names     # New functionality
npm test -- session-utils  # Updated validation
npm test -- worker         # API compatibility
```

### Validation Testing
```typescript
// Test old format compatibility
expect(isValidSessionId('ABC123')).toBe(true);    // Legacy support

// Test new formats
expect(isValidSessionId('4CQ')).toBe(true);       // Short codes
expect(isValidSessionId('brave-dragon')).toBe(true); // Friendly names

// Test invalid formats
expect(isValidSessionId('invalid')).toBe(false);
```

## Rollback Strategy

### Emergency Rollback
If issues arise, the system can be rolled back by:

1. **Reverting session generation** to old 6-character format
2. **Keeping validation** to support existing new rooms
3. **Disabling friendly name display** in UI

```typescript
// Emergency rollback configuration
const USE_LEGACY_GENERATION = true;

function generateSessionId(): string {
  if (USE_LEGACY_GENERATION) {
    return generateLegacySessionId();  // Old 6-char system
  }
  return generateFriendlySessionId();  // New system
}
```

### Gradual Rollback
- Phase 1: Stop generating new friendly names
- Phase 2: Continue supporting existing friendly names
- Phase 3: Eventually deprecate friendly name support

## Performance Impact

### Improvements
- **Shorter codes**: 3 characters vs 6 (50% reduction in internal storage)
- **Better compression**: Friendly names compress well in URLs
- **Faster validation**: Mathematical encoding is more efficient

### Memory Usage
- **Word lists**: ~2KB additional memory for word arrays
- **Functions**: Minimal overhead for encoding/decoding
- **Caching**: Browser caches word lists after first load

## Monitoring and Metrics

### Key Metrics to Monitor
```typescript
// Track adoption of new format
const metrics = {
  friendlyNamesGenerated: 0,
  shortCodesGenerated: 0,
  legacyCodesUsed: 0,
  validationErrors: 0
};

// Example monitoring
function trackRoomCreation(sessionId: string) {
  if (sessionId.length === 3) {
    metrics.shortCodesGenerated++;
  } else if (sessionId.length === 6) {
    metrics.legacyCodesUsed++;
  }
}
```

### Error Monitoring
```typescript
// Track validation failures
function monitorValidation(input: string, result: boolean) {
  if (!result) {
    console.warn('Validation failed for input:', input);
    metrics.validationErrors++;
  }
}
```

## Troubleshooting

### Common Issues

#### Old URLs not working
- **Cause**: 6-character codes still work, but validation might be too strict
- **Solution**: Verify `isValidSessionId()` handles legacy format
- **Debug**: Check validation logic for 6-character patterns

#### Friendly names not displaying
- **Cause**: UI not updated to use new display functions
- **Solution**: Use `sessionIdToFriendlyName()` for display
- **Example**: 
  ```typescript
  // Instead of showing raw session ID
  const display = sessionId;
  
  // Show friendly name
  const display = sessionIdToFriendlyName(sessionId);
  ```

#### Encoding/decoding errors
- **Cause**: Word not found in predefined lists
- **Solution**: Verify word exists in `ADJECTIVES_V1` or `NOUNS_V1`
- **Debug**: Check word spelling and case sensitivity

### Support Contacts

For migration issues:
- Technical questions: Review `/docs/room-names-technical.md`
- API questions: Review `/docs/room-names-api.md`
- Code issues: Check test suites in `/src/test/`

## Future Considerations

### Extensibility
The new system is designed for future enhancements:
- **Multi-language support**: Different word lists for different languages
- **Themed lists**: Horror, sci-fi, medieval themed words
- **Custom names**: User-provided room names with moderation
- **Favorites**: Save and reuse popular room names

### Scaling
- **Performance**: Current system handles thousands of concurrent rooms
- **Storage**: No persistent storage required for basic functionality
- **Distribution**: Word lists can be cached and distributed via CDN

This migration provides immediate UX improvements while maintaining system stability and backwards compatibility.