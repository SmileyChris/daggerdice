# Testing Guide for DaggerDice

This document provides comprehensive information about the testing setup and practices for the DaggerDice application.

## Overview

DaggerDice uses **Vitest** as the primary testing framework with two separate testing environments:

1. **Frontend Tests** - Testing client-side dice logic, session utilities, and UI components
2. **Workers Tests** - Testing Cloudflare Workers, Durable Objects, and WebSocket functionality

## Quick Start

```bash
# Run all tests
npm run test:all

# Run frontend tests only
npm run test:run

# Run Workers tests only  
npm run test:workers:run

# Watch mode for development
npm run test           # Frontend watch mode
npm run test:workers   # Workers watch mode
```

## Test Architecture

### Frontend Testing

**Framework**: Vitest with Happy DOM environment  
**Location**: `src/test/`  
**Configuration**: `vitest.config.ts`

#### What's Tested:
- **Dice Logic** (`dice-logic.test.ts`): Core game mechanics, calculations, and edge cases
- **Session Utils** (`session-utils.test.ts`): Multiplayer utilities, validation, and storage

#### Test Environment:
- Happy DOM for browser API simulation
- Mocked external dependencies (@3d-dice/dice-box, Alpine.js)
- Global test setup in `src/test/setup.ts`

### Workers Testing

**Framework**: Vitest with `@cloudflare/vitest-pool-workers`  
**Location**: `src/test/workers/`  
**Configuration**: `vitest.workers.config.ts`

#### What's Tested:
- **Worker Integration** (`worker.test.ts`): Main Worker fetch handler and routing
- **API Endpoints** (`simple-worker.test.ts`): WebSocket endpoints, session validation, security

#### Test Environment:
- Real Workers runtime (workerd) execution
- Isolated per-test storage
- Access to Durable Objects and WebSocket APIs
- Wrangler configuration integration

## Test Coverage

### Frontend Tests (49 tests)

#### Dice Logic Tests (21 tests)
```typescript
// Example: Testing Hope/Fear mechanics
describe('Check Roll Calculations', () => {
  it('should detect critical success when hope equals fear', () => {
    const result = DiceRollerLogic.calculateCheckResult(7, 7, 0, 0)
    expect(result.isCritical).toBe(true)
    expect(result.result).toBe('Critical Success!')
  })
})
```

**Coverage includes:**
- ✅ Basic check roll calculations
- ✅ Critical success detection (Hope = Fear)
- ✅ Advantage/disadvantage mechanics
- ✅ Modifier applications
- ✅ Damage roll calculations with resistance/critical
- ✅ GM roll calculations
- ✅ Edge cases and error handling

#### Session Utilities Tests (28 tests)
```typescript
// Example: Testing session ID validation
describe('Session ID Functions', () => {
  it('should validate correct session IDs', () => {
    expect(isValidSessionId('ABC123')).toBe(true)
    expect(isValidSessionId('abc123')).toBe(true)
  })
})
```

**Coverage includes:**
- ✅ Session ID generation and validation
- ✅ Player name sanitization
- ✅ URL parsing and session management
- ✅ Clipboard operations
- ✅ LocalStorage persistence
- ✅ Timestamp formatting
- ✅ Utility functions (debounce, delay)

### Workers Tests (20 tests)

#### Static Asset Serving (3 tests)
```typescript
// Example: Testing SPA routing
it('should handle SPA routing by serving index.html for unknown routes', async () => {
  const response = await SELF.fetch('https://example.com/room/ABC123')
  expect(response.status).toBe(200)
})
```

#### WebSocket API Endpoints (4 tests)
```typescript
// Example: Testing session ID validation
it('should validate session ID format', async () => {
  const invalidIds = ['ABC12', 'ABC1234', 'ABC-12', '123!@#']
  
  for (const invalidId of invalidIds) {
    const response = await SELF.fetch(`https://example.com/api/room/${invalidId}`)
    expect(response.status).toBe(400)
    expect(await response.text()).toBe('Invalid session ID format')
  }
})
```

**Coverage includes:**
- ✅ WebSocket connection validation
- ✅ Session ID format enforcement
- ✅ Malformed URL handling
- ✅ Security validation
- ✅ Error handling
- ✅ Case-insensitive session routing

## Running Tests

### Development Workflow

1. **Start with watch mode** during development:
   ```bash
   npm run test          # Frontend tests
   npm run test:workers  # Workers tests
   ```

2. **Run full test suite** before commits:
   ```bash
   npm run test:all
   ```

3. **Check specific test files**:
   ```bash
   # Frontend only
   npx vitest run src/test/dice-logic.test.ts
   
   # Workers only
   npx vitest run --config vitest.workers.config.ts src/test/workers/simple-worker.test.ts
   ```

### CI/CD Integration

The project uses GitHub Actions for automated testing and deployment. Tests run automatically on:

- **Push to main/develop**: Full test suite + deployment (main only)
- **Pull Requests**: Test coverage, quality checks, and security audit
- **Manual trigger**: Deploy workflow can be triggered manually

#### GitHub Actions Workflows

1. **`test.yml`** - Main testing workflow
   - Runs frontend and Workers tests in parallel
   - Verifies build succeeds
   - Uploads build artifacts

2. **`pr-checks.yml`** - Pull request validation
   - Comprehensive test coverage
   - Security audit
   - Dependency checks
   - Automated PR comments with results

3. **`deploy.yml`** - Production deployment
   - Tests → Build → Deploy → Verify
   - Automatic deployment to Cloudflare Workers
   - Deployment status tracking

#### Test Results
```bash
# Production test command
npm run test:all
```

Expected output:
- Frontend Tests: 49/49 passing
- Workers Tests: 20/20 passing
- **Total: 69 tests passing**

#### Required Repository Secrets
- `CLOUDFLARE_API_TOKEN`: Workers deployment permissions
- `CLOUDFLARE_ACCOUNT_ID`: Target Cloudflare account

## Test Configuration

### Frontend Configuration (`vitest.config.ts`)

```typescript
export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['**/workers/**', '**/node_modules/**'],
  },
})
```

### Workers Configuration (`vitest.workers.config.ts`)

```typescript
export default defineWorkersConfig({
  test: {
    include: ['**/workers/**/*.test.ts'],
    poolOptions: {
      workers: {
        wrangler: {
          configPath: './wrangler.toml',
        },
      },
    },
  },
})
```

## Writing Tests

### Frontend Test Example

```typescript
import { describe, it, expect } from 'vitest'
import { generateSessionId, isValidSessionId } from '../session/utils'

describe('Session Utils', () => {
  it('should generate valid session IDs', () => {
    const sessionId = generateSessionId()
    expect(sessionId).toHaveLength(6)
    expect(isValidSessionId(sessionId)).toBe(true)
  })
})
```

### Workers Test Example

```typescript
import { describe, it, expect } from 'vitest'
import { SELF } from 'cloudflare:test'

describe('Worker Tests', () => {
  it('should handle API requests', async () => {
    const response = await SELF.fetch('https://example.com/api/room/ABC123')
    expect(response.status).toBe(400)
    expect(await response.text()).toBe('Expected WebSocket')
  })
})
```

## Mocking Strategy

### Frontend Mocks

Located in `src/test/setup.ts`:

```typescript
// Mock DiceBox (requires WebGL/WASM)
vi.mock('@3d-dice/dice-box', () => ({
  default: vi.fn().mockImplementation(() => ({
    init: vi.fn().mockResolvedValue(undefined),
    roll: vi.fn().mockImplementation((dice) => 
      Promise.resolve(dice.map(() => ({
        value: Math.floor(Math.random() * 12) + 1
      })))
    )
  }))
}))

// Mock browser APIs
Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn()
  }
})
```

### Workers Mocks

Workers tests run in real Workers runtime, so minimal mocking is needed. The framework provides:

- `SELF` fetcher for integration testing
- `env` binding for accessing Durable Objects
- Isolated storage per test

## Debugging Tests

### Frontend Tests

```bash
# Run with debug output
DEBUG=* npm run test:run

# Run specific test with verbose output
npx vitest run --reporter=verbose src/test/dice-logic.test.ts
```

### Workers Tests

```bash
# Run with Workers-specific debugging
npm run test:workers:run

# The framework provides detailed logging for:
# - Runtime startup/shutdown
# - Storage isolation
# - Request/response cycles
```

## Common Issues & Solutions

### 1. Vitest Version Compatibility

**Issue**: `@cloudflare/vitest-pool-workers` officially supports Vitest 2.0.x - 3.1.x  
**Current**: Using Vitest 3.2.3 with `--legacy-peer-deps`  
**Solution**: Tests work but expect compatibility warnings

### 2. Storage Isolation Errors

**Issue**: Durable Object storage isolation failures  
**Solution**: Focus on integration tests rather than complex Durable Object state testing

### 3. WebSocket Testing Limitations

**Issue**: Complex WebSocket message flows are difficult to test  
**Solution**: Test WebSocket connection establishment and basic message validation

### 4. Asset Serving in Tests

**Issue**: Static assets not available in test environment  
**Solution**: Mock asset responses or test error handling paths

## Best Practices

### Test Organization

1. **Group by functionality**: Keep related tests in the same describe block
2. **Use descriptive names**: Test names should clearly state what is being tested
3. **Follow AAA pattern**: Arrange, Act, Assert
4. **Test edge cases**: Include boundary conditions and error scenarios

### Frontend Testing

1. **Mock external dependencies**: Always mock 3D dice library, browser APIs
2. **Test pure functions**: Focus on logic rather than DOM manipulation
3. **Use setup files**: Centralize common mocks and configurations
4. **Test error handling**: Ensure graceful degradation

### Workers Testing

1. **Test realistic scenarios**: Use actual HTTP requests and responses
2. **Validate security**: Test session ID validation and malicious input handling
3. **Test error paths**: Ensure proper error responses and status codes
4. **Keep tests isolated**: Avoid dependencies between test cases

## Performance

### Test Execution Times

- **Frontend tests**: ~1.5 seconds (49 tests)
- **Workers tests**: ~3.5 seconds (20 tests)
- **Total**: ~5 seconds for full test suite

### Optimization Tips

1. **Use watch mode** during development for faster feedback
2. **Run specific test files** when working on focused areas
3. **Parallelize CI/CD** by running frontend and Workers tests separately
4. **Cache dependencies** in CI environments

## Future Improvements

### Potential Enhancements

1. **Visual Regression Testing**: Add screenshot testing for 3D dice rendering
2. **End-to-End Testing**: Implement full user journey testing with Playwright
3. **Performance Testing**: Add load testing for WebSocket connections
4. **Code Coverage**: Implement coverage reporting with c8
5. **Mutation Testing**: Add mutation testing for logic validation

### Test Coverage Expansion

1. **Durable Object State**: More comprehensive storage testing when framework improves
2. **WebSocket Message Flows**: Complex multiplayer scenarios
3. **3D Dice Integration**: Test actual dice physics when possible
4. **Mobile Testing**: Touch interaction and responsive design validation

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Cloudflare Workers Testing](https://developers.cloudflare.com/workers/testing/)
- [Vitest Pool Workers](https://developers.cloudflare.com/workers/testing/vitest-integration/)
- [Testing Best Practices](https://kentcdodds.com/blog/write-tests)

For questions or issues with the testing setup, refer to the project's GitHub issues or the development team.