# Room Names API Reference

## Core Functions

### `encodeNameV1(word1: string, word2: string): string`

Encodes a pair of words into a 3-character Crockford Base32 code.

**Parameters:**
- `word1` - First word (adjective or noun from predefined lists)
- `word2` - Second word (must be a noun from NOUNS_V1 list)

**Returns:**
- `string` - 3-character uppercase code (e.g., "4CQ")

**Throws:**
- `Error` - If word1 is not found in either word list
- `Error` - If word2 is not found in NOUNS_V1 list  
- `Error` - If both words are the same noun (duplicate noun-noun pairs not allowed)

**Example:**
```typescript
import { encodeNameV1 } from './room-names.js';

const code = encodeNameV1('brave', 'dragon');  // Returns: "4CQ"
const code2 = encodeNameV1('dragon', 'wizard'); // Noun-noun combination
```

---

### `decodeNameV1(code: string): { word1: string; word2: string }`

Decodes a 3-character code back into the original word pair.

**Parameters:**
- `code` - 3-character Crockford Base32 encoded string

**Returns:**
- `object` - Object with `word1` and `word2` properties

**Throws:**
- `Error` - If code contains invalid characters
- `Error` - If decoded indices are out of bounds
- `Error` - If version bits indicate unsupported format

**Example:**
```typescript
import { decodeNameV1 } from './room-names.js';

const result = decodeNameV1('4CQ');
// Returns: { word1: 'brave', word2: 'dragon' }
```

---

### `generateFriendlyName(): string`

Generates a random friendly room name.

**Returns:**
- `string` - Hyphenated word pair (e.g., "brave-dragon")

**Example:**
```typescript
import { generateFriendlyName } from './room-names.js';

const name = generateFriendlyName();  // Returns: "mystic-knight"
```

---

### `sessionIdToFriendlyName(sessionId: string): string`

Converts a session ID (encoded code) to a friendly name for display.

**Parameters:**
- `sessionId` - 3-character encoded session ID

**Returns:**
- `string` - Friendly name or original sessionId if conversion fails

**Example:**
```typescript
import { sessionIdToFriendlyName } from './room-names.js';

const friendly = sessionIdToFriendlyName('4CQ');  // Returns: "brave-dragon"
const fallback = sessionIdToFriendlyName('XYZ');  // Returns: "XYZ" (invalid code)
```

---

### `friendlyNameToSessionId(friendlyName: string): string`

Converts a friendly name to an encoded session ID.

**Parameters:**
- `friendlyName` - Hyphenated word pair (e.g., "brave-dragon")

**Returns:**
- `string` - 3-character encoded session ID

**Throws:**
- `Error` - If friendlyName format is invalid (not word1-word2)
- `Error` - If either word is not found in word lists

**Example:**
```typescript
import { friendlyNameToSessionId } from './room-names.js';

const code = friendlyNameToSessionId('brave-dragon');  // Returns: "4CQ"
```

## Session Utility Functions

### `generateSessionId(): string`

Generates a new session ID using the friendly room names system.

**Returns:**
- `string` - 3-character encoded session ID

**Example:**
```typescript
import { generateSessionId } from './session/utils.js';

const sessionId = generateSessionId();  // Returns: "4CQ"
```

---

### `isValidSessionId(sessionId: string): boolean`

Validates whether a session ID is valid (supports both formats).

**Parameters:**
- `sessionId` - Session ID to validate (3-char code or friendly name)

**Returns:**
- `boolean` - True if valid, false otherwise

**Example:**
```typescript
import { isValidSessionId } from './session/utils.js';

isValidSessionId('4CQ');           // true (valid code)
isValidSessionId('brave-dragon');  // true (valid friendly name)
isValidSessionId('invalid');       // false (invalid format)
isValidSessionId('unknown-word');  // false (unknown words)
```

---

### `normalizeSessionId(sessionId: string): string | null`

Normalizes a session ID to its canonical form.

**Parameters:**
- `sessionId` - Session ID in any supported format

**Returns:**
- `string` - Normalized session ID (uppercase for codes, lowercase for names)
- `null` - If session ID is invalid

**Example:**
```typescript
import { normalizeSessionId } from './session/utils.js';

normalizeSessionId('4cq');           // Returns: "4CQ"
normalizeSessionId('BRAVE-DRAGON');  // Returns: "brave-dragon"
normalizeSessionId('invalid');       // Returns: null
```

---

### `extractSessionIdFromUrl(url: string): string | null`

Extracts a session ID from a URL string.

**Parameters:**
- `url` - URL containing a room path

**Returns:**
- `string` - Extracted and normalized session ID
- `null` - If no valid session ID found

**Example:**
```typescript
import { extractSessionIdFromUrl } from './session/utils.js';

extractSessionIdFromUrl('https://example.com/room/brave-dragon');  // "brave-dragon"
extractSessionIdFromUrl('https://example.com/room/4CQ');          // "4CQ"  
extractSessionIdFromUrl('/room/mystic-knight');                   // "mystic-knight"
extractSessionIdFromUrl('https://example.com/other');             // null
```

## Word Lists

### `ADJECTIVES_V1: string[]`

Array of 80 RPG-themed adjectives used for room name generation.

**Type:** `readonly string[]`

**Example entries:** `'brave'`, `'clever'`, `'mystic'`, `'arcane'`, `'swift'`

---

### `NOUNS_V1: string[]`

Array of 80 RPG-themed nouns used for room name generation.

**Type:** `readonly string[]`

**Example entries:** `'dragon'`, `'wizard'`, `'knight'`, `'rogue'`, `'paladin'`

## URL Patterns

### Room URL Format

```
https://daggerdice.com/room/{sessionId}
```

Where `{sessionId}` can be:
- **Friendly name**: `brave-dragon`, `mystic-knight`, `storm-giant`
- **Short code**: `4CQ`, `ABC`, `123`

### WebSocket API Format

```
wss://daggerdice.com/api/room/{sessionId}
```

The WebSocket API accepts both formats and normalizes them internally.

## Error Codes

### Encoding Errors

| Error Message | Cause | Solution |
|---------------|-------|----------|
| `Unknown word: {word}` | Word not found in adjective lists | Use word from ADJECTIVES_V1 |
| `Unknown noun: {word}` | Word not found in noun list | Use word from NOUNS_V1 |
| `Duplicate noun-noun pair not allowed: {word1}-{word2}` | Both words are same noun | Use different nouns |
| `Cannot encode negative numbers` | Internal error in encoding | Check input validation |

### Decoding Errors

| Error Message | Cause | Solution |
|---------------|-------|----------|
| `Invalid character in encoded string: {char}` | Non-Crockford character | Use valid Base32 characters |
| `Invalid adjective index: {index}` | Decoded index out of bounds | Verify code is properly encoded |
| `Invalid noun index: {index}` | Decoded index out of bounds | Verify code is properly encoded |
| `Unsupported version: {version}` | Unknown version bits | Use supported encoding version |

### Validation Errors

| Scenario | isValidSessionId() Result | normalizeSessionId() Result |
|----------|---------------------------|----------------------------|
| Valid 3-char code | `true` | Uppercase code |
| Valid friendly name | `true` | Lowercase name |
| Invalid format | `false` | `null` |
| Unknown words | `false` | `null` |
| Empty string | `false` | `null` |

## TypeScript Types

### Core Types

```typescript
// Word pair result from decoding
interface WordPair {
  word1: string;
  word2: string;
}

// Encoding options
interface EncodingOptions {
  length?: number;
}
```

### Import Statements

```typescript
// Room names core functions
import { 
  encodeNameV1, 
  decodeNameV1, 
  generateFriendlyName,
  sessionIdToFriendlyName,
  friendlyNameToSessionId,
  ADJECTIVES_V1,
  NOUNS_V1
} from './session/room-names.js';

// Session utility functions
import {
  generateSessionId,
  isValidSessionId,
  normalizeSessionId,
  extractSessionIdFromUrl
} from './session/utils.js';
```

## Usage Examples

### Creating a New Room

```typescript
// Generate a new session
const sessionId = generateSessionId();              // "4CQ"
const friendlyName = sessionIdToFriendlyName(sessionId);  // "brave-dragon"

// Display to user
console.log(`Room created: ${friendlyName}`);      // "Room created: brave-dragon"

// Use in WebSocket connection
const ws = new WebSocket(`/api/room/${sessionId}`); // Uses short code internally
```

### Joining an Existing Room

```typescript
// User input (could be either format)
const userInput = "brave-dragon";  // or "4CQ"

// Validate input
if (isValidSessionId(userInput)) {
  // Normalize for consistent handling
  const normalized = normalizeSessionId(userInput);  // "brave-dragon"
  
  // Connect to room
  const ws = new WebSocket(`/api/room/${normalized}`);
  
  // Display friendly name
  const display = userInput.includes('-') ? userInput : sessionIdToFriendlyName(userInput);
  console.log(`Joining room: ${display}`);
} else {
  console.error('Invalid room code or name');
}
```

### URL Sharing

```typescript
// Extract from shared URL
const url = "https://daggerdice.com/room/storm-giant";
const sessionId = extractSessionIdFromUrl(url);     // "storm-giant"

if (sessionId) {
  // Auto-join room
  joinRoom(sessionId);
} else {
  // Show error
  showError('Invalid room URL');
}
```

### Testing Helpers

```typescript
// Test all possible combinations
function testAllCombinations() {
  let successCount = 0;
  let errorCount = 0;
  
  for (const adj of ADJECTIVES_V1) {
    for (const noun of NOUNS_V1) {
      try {
        const encoded = encodeNameV1(adj, noun);
        const decoded = decodeNameV1(encoded);
        
        if (decoded.word1 === adj && decoded.word2 === noun) {
          successCount++;
        } else {
          console.error(`Mismatch: ${adj}-${noun} → ${encoded} → ${decoded.word1}-${decoded.word2}`);
          errorCount++;
        }
      } catch (error) {
        console.error(`Error with ${adj}-${noun}:`, error.message);
        errorCount++;
      }
    }
  }
  
  console.log(`Test results: ${successCount} success, ${errorCount} errors`);
  return errorCount === 0;
}
```

## Performance Considerations

### Optimization Tips

1. **Cache Results**: Encoding/decoding results can be cached for frequently used combinations
2. **Batch Operations**: Process multiple room names together when possible
3. **Lazy Loading**: Load word lists only when room features are needed
4. **Precomputation**: Consider precomputing popular combinations

### Benchmarking

```typescript
// Measure encoding performance
function benchmarkEncoding(iterations = 1000) {
  const start = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    const adj = ADJECTIVES_V1[i % ADJECTIVES_V1.length];
    const noun = NOUNS_V1[i % NOUNS_V1.length];
    encodeNameV1(adj, noun);
  }
  
  const end = performance.now();
  const avgTime = (end - start) / iterations;
  
  console.log(`Average encoding time: ${avgTime.toFixed(4)}ms`);
  return avgTime;
}
```