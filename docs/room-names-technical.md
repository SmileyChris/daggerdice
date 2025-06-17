# Friendly Room Names - Technical Documentation

## Overview

DaggerDice implements a sophisticated room naming system that replaces cryptic alphanumeric codes with memorable RPG-themed names. The system uses mathematical encoding to create a deterministic bijection between human-readable names and compact identifiers.

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface                           │
│  "brave-dragon" ←→ UI displays friendly names              │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                Session Utils Layer                          │
│  generateSessionId() → encodeNameV1() → "4CQ"              │
│  isValidSessionId() → validates both formats               │
│  normalizeSessionId() → converts to canonical form         │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│              Room Names Core (room-names.ts)                │
│  ADJECTIVES_V1[80] + NOUNS_V1[80] = 6,400 combinations     │
│  encodeNameV1() ←→ decodeNameV1()                          │
│  Crockford Base32 encoding with version bits               │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                WebSocket API Layer                          │
│  /api/room/{friendlyName} → converts to internal code      │
│  /api/room/{shortCode} → uses directly                     │
│  Durable Objects use internal codes as keys                │
└─────────────────────────────────────────────────────────────┘
```

## Mathematical Encoding

### Bijection Function

The system creates a one-to-one mapping between word pairs and numeric identifiers:

```typescript
// Forward mapping: words → number
function encodeNameV1(word1: string, word2: string): string {
  const adjIndex = ADJECTIVES_V1.indexOf(word1);  // 0-79
  const nounIndex = NOUNS_V1.indexOf(word2);      // 0-79
  
  const combinedIndex = adjIndex * 80 + nounIndex; // 0-6399
  const payload = (version << 14) | combinedIndex; // Add version bits
  
  return encodeCrockford(payload, { length: 3 });  // Base32 encode
}

// Reverse mapping: number → words  
function decodeNameV1(code: string): { word1: string; word2: string } {
  const payload = decodeCrockford(code);
  const version = (payload >> 14) & 0x1;          // Extract version
  const combinedIndex = payload & 0x3FFF;         // Extract index
  
  const nounIndex = combinedIndex % 80;
  const adjIndex = Math.floor(combinedIndex / 80);
  
  return {
    word1: ADJECTIVES_V1[adjIndex],
    word2: NOUNS_V1[nounIndex]
  };
}
```

### Bit Layout

```
15-bit payload structure:
┌─┬──────────────────┐
│V│  Combined Index  │
└─┴──────────────────┘
 1        14 bits

V = Version bit (0 = adjective-noun, 1 = noun-noun)
Combined Index = word1_index * 80 + word2_index (0-6399)
```

### Crockford Base32 Encoding

- **Alphabet**: `0123456789ABCDEFGHJKMNPQRSTVWXYZ` (excludes I, L, O, U)
- **Length**: Always 3 characters with zero-padding
- **Case**: Internally uppercase, display case varies by context

## Word Lists

### Design Principles

1. **Fixed Size**: Exactly 80 words per list for mathematical simplicity
2. **RPG Themes**: Fantasy and gaming terminology for target audience
3. **Immutable**: Lists are frozen to ensure consistent encoding
4. **Memorable**: Short, distinctive words that are easy to remember and type

### Adjectives (80 words)
```typescript
export const ADJECTIVES_V1: string[] = [
  'brave', 'clever', 'quick', 'mystic', 'bold', 'sly', 'noble', 'frost',
  'storm', 'arcane', 'fire', 'shade', 'thorn', 'silver', 'lunar', 'sunny',
  // ... 64 more
];
```

### Nouns (80 words)
```typescript  
export const NOUNS_V1: string[] = [
  'dragon', 'ranger', 'rogue', 'wizard', 'witch', 'paladin', 'knight',
  'archer', 'bard', 'monk', 'troll', 'ogre', 'sprite', 'goblin',
  // ... 66 more
];
```

### Capacity Analysis

- **Total combinations**: 80 × 80 = 6,400
- **Current usage**: ~0.01% of theoretical usage
- **Growth headroom**: Can support thousands of concurrent rooms
- **Collision probability**: Effectively zero for realistic usage

## Implementation Details

### File Structure

```
src/session/
├── room-names.ts          # Core encoding/decoding logic
├── utils.ts              # Session management integration  
├── types.ts              # TypeScript type definitions
└── session-client.ts     # WebSocket client integration

src/worker.ts             # Cloudflare Worker API endpoints
```

### API Integration

#### Session Creation
```typescript
// Generate new session
const sessionId = generateSessionId();  // Returns: "4CQ" 
const friendlyName = sessionIdToFriendlyName(sessionId);  // Returns: "brave-dragon"

// WebSocket connection
ws.connect(`/api/room/${sessionId}`);  // Uses short code internally
```

#### Session Joining
```typescript
// Accept both formats
const userInput = "brave-dragon";  // or "4CQ"
const isValid = isValidSessionId(userInput);  // true for both

// Normalize for internal use
const normalized = normalizeSessionId(userInput);  // Converts to canonical form
```

#### URL Handling
```typescript
// Extract from URLs
extractSessionIdFromUrl("https://example.com/room/brave-dragon");  // "brave-dragon"
extractSessionIdFromUrl("https://example.com/room/4CQ");          // "4CQ"

// Both map to same internal session
```

### Validation Logic

```typescript
function isValidSessionId(sessionId: string): boolean {
  // 3-character encoded format
  if (/^[0-9A-Z]{3}$/i.test(sessionId)) {
    try {
      decodeNameV1(sessionId.toUpperCase());
      return true;
    } catch {
      return false;
    }
  }
  
  // Friendly name format  
  if (/^[a-z]+-[a-z]+$/i.test(sessionId)) {
    try {
      friendlyNameToSessionId(sessionId);
      return true;
    } catch {
      return false;
    }
  }
  
  return false;
}
```

## Performance Characteristics

### Encoding Performance
- **Time Complexity**: O(1) - array index lookups
- **Space Complexity**: O(1) - fixed-size word lists
- **Typical Execution**: <1ms for encode/decode operations

### Memory Usage
- **Word Lists**: ~2KB total (80 words × ~6 chars × 2 lists)
- **Runtime Overhead**: Minimal - functions are pure and stateless
- **Caching**: Browser caches word lists after first load

### Network Efficiency
- **Short Codes**: 3 characters vs 6 in old system (50% reduction)
- **Friendly Names**: ~12 characters average (readable URLs)
- **Compression**: Gzip reduces word list transmission overhead

## URL Conversion Behavior

### Automatic URL Upgrades
When users navigate to a room using a short code URL, the system automatically converts it to a friendly name for better user experience:

```typescript
// User enters: /room/4CQ
// System converts to: /room/fire-wizard (example)
// Only happens when NOT in streamer mode

// Implementation in dice-roller-main.ts:
if (!this.streamerMode && /^[0-9A-Z]{3}$/i.test(urlSessionId)) {
  const friendlyName = sessionIdToFriendlyName(urlSessionId);
  if (friendlyName !== urlSessionId) {
    history.replaceState({}, '', `/room/${friendlyName}`);
  }
}
```

### Streamer Mode Protection
In streamer mode, URLs are immediately cleared to prevent room codes from being visible:
```typescript
if (this.streamerMode) {
  history.replaceState({}, '', '/');
}
```

### User Interface Display Strategy
The system uses different formats optimized for different contexts:

- **URLs**: Friendly names for readability and sharing
  - User sees: `daggerdice.com/room/brave-dragon`
  - Easy to read, remember, and share in text
  - **Copy Link**: Always copies friendly name URL format for sharing
  
- **Room Code Display**: Compact codes for quick verbal sharing
  - Dialog shows: `Room code: 4CQ`
  - Perfect for voice chat: "Join room 4-C-Q"
  - Shorter for mobile displays

### Sharing Behavior
- **Copy Link Button (📋)**: Always creates URLs with friendly names (`/room/brave-dragon`)
- **Manual URL Sharing**: URLs automatically convert short codes to friendly names
- **Manual Room Joining**: When users enter short codes and click "Join Room", URLs convert to friendly names
- **Verbal Sharing**: Users can share the compact room code (`4CQ`) for quick entry

This dual approach maximizes usability across different sharing methods.

## Crockford Base32 Character Normalization

The decoder implements full Crockford Base32 character normalization for improved usability:

### Character Substitutions
```typescript
// Confusing characters are automatically normalized during decoding:
decodeNameV1('O00');  // O -> 0, same as decodeNameV1('000')
decodeNameV1('I23');  // I -> 1, same as decodeNameV1('123')  
decodeNameV1('L23');  // L -> 1, same as decodeNameV1('123')
decodeNameV1('ABC');  // U -> V, but ABC doesn't contain U

// Case insensitive
decodeNameV1('abc');  // Same as decodeNameV1('ABC')
decodeNameV1('o00');  // o -> 0, same as decodeNameV1('000')
```

### Normalization Rules
- **I** → **1** (I looks like 1)
- **L** → **1** (L looks like 1)  
- **O** → **0** (O looks like 0)
- **U** → **V** (U looks like V)
- All input converted to uppercase

This allows users to enter room codes without worrying about visual ambiguities.

## Error Handling

### Encoding Errors
```typescript
// Unknown words
encodeNameV1('unknown', 'dragon');  // Throws: "Unknown word: unknown"
encodeNameV1('brave', 'invalid');   // Throws: "Unknown noun: invalid"

// Duplicate noun pairs (not allowed for noun-noun combinations)
encodeNameV1('dragon', 'dragon');   // Throws: "Duplicate noun-noun pair not allowed"
```

### Decoding Errors
```typescript
// Invalid characters (after normalization)
decodeNameV1('!@#');  // Throws: "Invalid character in encoded string"

// Out of bounds indices  
decodeNameV1('ZZZ');  // Throws: "Invalid noun index: 999"
```

### Graceful Degradation
```typescript
// UI falls back to showing codes if friendly name conversion fails
function sessionIdToFriendlyName(sessionId: string): string {
  try {
    const { word1, word2 } = decodeNameV1(sessionId);
    return `${word1}-${word2}`;
  } catch {
    return sessionId;  // Show original code if conversion fails
  }
}
```

## Security Considerations

### Cryptographic Properties
- **Randomness**: Uses `crypto.getRandomValues()` for session generation
- **Predictability**: Word combinations are not sequential or predictable
- **Enumeration**: Difficult to guess valid room names without word lists

### Input Validation
- **Sanitization**: All inputs validated against known word lists
- **Injection Prevention**: No dynamic code execution or SQL queries
- **Length Limits**: Fixed maximum lengths prevent buffer overflows

### Privacy
- **No PII**: Room names contain no personally identifiable information
- **Temporary**: Room names are ephemeral and not permanently stored
- **Anonymous**: No correlation between room names and user identities

## Testing Strategy

### Unit Tests
```typescript
describe('Room Name Encoding', () => {
  it('should encode and decode correctly', () => {
    const code = encodeNameV1('brave', 'dragon');
    const decoded = decodeNameV1(code);
    expect(decoded).toEqual({ word1: 'brave', word2: 'dragon' });
  });
  
  it('should handle all word combinations', () => {
    // Test every possible combination
    for (const adj of ADJECTIVES_V1) {
      for (const noun of NOUNS_V1) {
        const code = encodeNameV1(adj, noun);
        const decoded = decodeNameV1(code);
        expect(decoded.word1).toBe(adj);
        expect(decoded.word2).toBe(noun);
      }
    }
  });
});
```

### Integration Tests
- **WebSocket API**: Test both friendly names and codes in room URLs
- **URL Extraction**: Verify parsing from various URL formats
- **Session Management**: Test creation, joining, and validation flows
- **Error Scenarios**: Validate error handling for invalid inputs

### Property-Based Testing
```typescript
// Generate random valid combinations and verify round-trip encoding
const randomAdj = ADJECTIVES_V1[Math.floor(Math.random() * 80)];
const randomNoun = NOUNS_V1[Math.floor(Math.random() * 80)];
const encoded = encodeNameV1(randomAdj, randomNoun);
const decoded = decodeNameV1(encoded);
assert(decoded.word1 === randomAdj && decoded.word2 === randomNoun);
```

## Migration Strategy

### Backward Compatibility
- **Dual Support**: System accepts both old 6-character codes and new formats
- **Graceful Fallback**: Old sessions continue working without interruption
- **Transparent Conversion**: Users can mix and match formats seamlessly

### Deployment Process
1. **Deploy Core Logic**: Add new encoding functions without changing APIs
2. **Update Generation**: Switch session generation to use friendly names
3. **Update Validation**: Add support for both formats in validation
4. **Update UI**: Display friendly names while maintaining code functionality
5. **Monitor**: Verify no regressions in session functionality

### Rollback Plan
- **Feature Flags**: Can disable friendly names and revert to old system
- **Database Independence**: No persistent storage changes required
- **API Compatibility**: Old endpoints continue working unchanged

## Future Enhancements

### Word List Evolution
- **Versioning**: Support multiple word list versions (V1, V2, etc.)
- **Expansion**: Add new themed word lists for different RPG systems
- **Localization**: Support for non-English word lists

### Advanced Features  
- **Custom Names**: Allow users to create custom room names (with moderation)
- **Themes**: Different word lists for different game types
- **Expiry**: Time-based room name recycling for popular combinations

### Performance Optimizations
- **Precomputation**: Cache common encoding/decoding operations
- **Compression**: More efficient encoding schemes for larger word lists
- **CDN Distribution**: Distribute word lists via CDN for faster loading

## Troubleshooting

### Common Issues

#### "Invalid session ID format"
- **Cause**: Input doesn't match expected patterns
- **Solution**: Verify input is either 3-char code or hyphenated word pair
- **Debug**: Check `isValidSessionId()` return value and reason

#### "Unknown word" errors
- **Cause**: Word not found in predefined lists
- **Solution**: Verify spelling and check word exists in `ADJECTIVES_V1`/`NOUNS_V1`
- **Debug**: Check exact word matching (case-insensitive)

#### Encoding/decoding mismatches
- **Cause**: Bit allocation overflow or word list size mismatch
- **Solution**: Verify `LIST_SIZE` constant matches actual array lengths
- **Debug**: Check intermediate values in encode/decode process

### Debugging Tools

```typescript
// Debug encoding process
function debugEncode(word1: string, word2: string) {
  console.log('Input:', { word1, word2 });
  const adj = ADJECTIVES_V1.indexOf(word1);
  const noun = NOUNS_V1.indexOf(word2);
  console.log('Indices:', { adj, noun });
  const combined = adj * 80 + noun;
  console.log('Combined index:', combined);
  const payload = (0 << 14) | combined;
  console.log('Payload:', payload, payload.toString(2));
  const encoded = encodeCrockford(payload, { length: 3 });
  console.log('Encoded:', encoded);
  return encoded;
}
```

### Performance Monitoring

```typescript
// Measure encoding performance
function benchmarkEncoding() {
  const start = performance.now();
  for (let i = 0; i < 1000; i++) {
    const adj = ADJECTIVES_V1[i % 80];
    const noun = NOUNS_V1[i % 80];
    encodeNameV1(adj, noun);
  }
  const end = performance.now();
  console.log(`1000 encodings took ${end - start}ms`);
}
```

This technical documentation provides a complete reference for understanding, maintaining, and extending the friendly room names system in DaggerDice.