# Development Guide

## Project Structure

```
src/
├── dice-roller-main.ts    # Main application entry
├── worker.ts              # Web Worker implementation
├── session/               # Multiplayer session logic
├── assets/                # Static assets
└── test/                  # Test files
```

## Getting Started

1. Fork and clone the repository
2. Install dependencies:
```bash
npm install
```
3. Start development server:
```bash
npm run dev
```

## Testing

### Frontend Tests
```bash
npm test          # Run in watch mode
npm run test:run # Run once
npm run test:ui  # Interactive UI
```

### Workers Tests
```bash
npm run test:workers       # Run in watch mode
npm run test:workers:run  # Run once
```

### All Tests
```bash
npm run test:all
```

Key test files:
- `dice-logic.test.ts` - Dice rolling logic (49 tests)
- `session-utils.test.ts` - Session utilities
- `worker.test.ts` - Worker functionality (20 tests)

## CI/CD Pipeline
- GitHub Actions runs on all pushes/PRs:
  - Frontend tests
  - Workers tests
  - Build verification
  - Security audits
- Cloudflare Workers auto-deploys from main branch

## Code Style

- TypeScript strict mode
- 2 space indentation
- Prettier for formatting
- ESLint for linting

## Architecture

### Main Components
- **Dice Physics**: Handles 3D dice simulation
- **Session Manager**: Manages multiplayer state
- **Theme System**: Handles dice appearance
- **Worker**: Offloads heavy computations

### Contribution Flow
1. Create a feature branch
2. Write tests for new functionality
3. Submit pull request
4. CI runs tests and linting
5. Code review
6. Merge to main