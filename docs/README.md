# DaggerDice Documentation

This directory contains comprehensive documentation for the DaggerDice application.

## Documentation Index

### Room Names System

- **[Technical Documentation](./room-names-technical.md)** - Complete technical overview of the friendly room names system
  - Architecture and design principles
  - Mathematical encoding details
  - Implementation specifics
  - Performance characteristics
  - Security considerations
  - Testing strategies
  - Troubleshooting guide

- **[API Reference](./room-names-api.md)** - Complete function and API reference
  - Core encoding/decoding functions
  - Session utility functions
  - Word lists and constants
  - Error handling
  - Usage examples
  - TypeScript types

- **[Migration Guide](./room-names-migration.md)** - Migration from old 6-character codes to friendly names
  - What changed and why
  - Compatibility matrix
  - Developer impact
  - Rollback strategy
  - Troubleshooting common issues

## Quick Reference

### Core Concepts

- **Friendly Names**: RPG-themed room names like `brave-dragon`, `mystic-knight`
- **Short Codes**: 3-character encoded identifiers like `4CQ`, `ABC`
- **Bijection**: Mathematical one-to-one mapping between names and codes
- **Dual Support**: System accepts both formats seamlessly

### Key Files

```
src/session/
├── room-names.ts          # Core encoding/decoding logic
└── utils.ts              # Session management integration

docs/
├── room-names-technical.md  # Technical deep dive
└── room-names-api.md       # API reference
```

### Example Usage

```typescript
// Generate a room
const sessionId = generateSessionId();              // "4CQ"
const friendlyName = sessionIdToFriendlyName(sessionId);  // "brave-dragon"

// Validate user input
isValidSessionId('brave-dragon');                   // true
isValidSessionId('4CQ');                           // true
isValidSessionId('invalid');                       // false

// Convert between formats
friendlyNameToSessionId('brave-dragon');           // "4CQ"
sessionIdToFriendlyName('4CQ');                   // "brave-dragon"
```

### Testing

```bash
# Run room names tests
npm test -- room-names

# Run all session-related tests
npm test -- session

# Check test coverage
npm run test:coverage
```

## Contributing to Documentation

When updating the room names system:

1. **Update Technical Docs**: Modify `room-names-technical.md` for architecture changes
2. **Update API Docs**: Modify `room-names-api.md` for function signature changes
3. **Update Examples**: Ensure all code examples remain functional
4. **Test Documentation**: Verify all code snippets work as documented

### Documentation Standards

- **Code Examples**: All examples should be executable TypeScript
- **Error Scenarios**: Document all possible error conditions
- **Performance Notes**: Include performance implications for significant changes
- **Migration Guides**: Document any breaking changes with migration steps

## Additional Resources

### External Documentation

- [Crockford Base32 Specification](https://www.crockford.com/base32.html)
- [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

### Related Code

- Main application: `/src/dice-roller-main.ts`
- Session client: `/src/session/session-client.ts`
- Worker API: `/src/worker.ts`
- Test suites: `/src/test/room-names.test.ts`, `/src/test/session-utils.test.ts`