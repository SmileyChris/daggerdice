# Development Guide

## Project Architecture

DaggerDice is a modern web application built with TypeScript, Alpine.js, and Cloudflare Workers, designed for real-time multiplayer dice rolling with 3D physics simulation.

### Technology Stack
- **Frontend**: Alpine.js, TypeScript, Vite
- **3D Graphics**: @3d-dice/dice-box library with WebGL/WASM physics
- **Multiplayer**: Cloudflare Durable Objects with WebSocket connections
- **Testing**: Vitest, jsdom, @vitest/coverage-v8
- **Deployment**: Cloudflare Workers & Pages
- **Build System**: Vite with TypeScript compilation

### Project Structure

```
src/
├── dice-roller-main.ts    # Main Alpine.js component and dice logic
├── dice-roller.css        # Application styles and responsive design
├── session/               # Multiplayer session functionality
│   ├── session-client.ts  # WebSocket client for real-time communication
│   ├── types.ts          # TypeScript definitions for session data
│   └── utils.ts          # Session utility functions
├── worker.ts             # Cloudflare Worker entry point and Durable Objects
├── assets/               # Static assets (logos, icons)
└── test/                 # Test suites and test utilities
    ├── dice-logic.test.ts    # Dice rolling mechanics (49 tests)
    ├── session-utils.test.ts # Session management utilities
    ├── streamer-mode.test.ts # Privacy features testing
    └── workers/
        ├── worker.test.ts    # Cloudflare Worker functionality (20 tests)
        └── simple-worker.test.ts

public/
└── assets/              # 3D dice assets and physics engine
    ├── ammo/           # Physics engine WASM files
    └── themes/         # Dice visual themes
        ├── default/    # Standard dice appearance
        └── smooth/     # Smoother dice appearance

docs/                   # Documentation system
├── index.md           # Documentation homepage
├── getting-started.md # User setup guide
├── features.md        # Feature documentation
├── development.md     # This file
└── multiplayer-technical.md # WebSocket architecture details

Configuration Files:
├── index.html              # Single-page application template
├── vite.config.ts         # Vite build configuration
├── vitest.config.ts       # Frontend test configuration
├── vitest.workers.config.ts # Workers test configuration
├── wrangler.toml          # Cloudflare Workers deployment config
├── eslint.config.js       # Code linting rules
├── tsconfig.json          # TypeScript compiler options
└── package.json           # Dependencies and scripts
```

## Getting Started

### Prerequisites
- **Node.js**: Version 18 or higher
- **npm**: Latest version (comes with Node.js)
- **Git**: For version control
- **Cloudflare Account**: For deployment (optional for local development)

### Installation

1. **Clone the repository**:
```bash
git clone https://github.com/smileychris/daggerdice.git
cd daggerdice
```

2. **Install dependencies**:
```bash
npm install
```

3. **Start development servers**:
```bash
npm start  # Alias for npm run dev
# or
npm run dev  # Start both frontend and worker in development mode
```

This will start:
- **Frontend server**: `http://localhost:5173` (Vite dev server)
- **Worker server**: `http://localhost:8787` (Wrangler dev server)
- **WebSocket endpoint**: `ws://localhost:8787/api/room/{sessionId}`

### Development Commands

```bash
# Development
npm start                 # Start development server (alias for npm run dev)
npm run dev              # Start frontend and worker development servers
npm run dev:worker       # Start only the Cloudflare Worker in dev mode

# Building
npm run build            # Build for production
npm run preview          # Preview production build locally

# Testing
npm test                 # Run frontend tests in watch mode
npm run test:run         # Run frontend tests once
npm run test:ui          # Run frontend tests with interactive UI
npm run test:workers     # Run Cloudflare Workers tests in watch mode
npm run test:workers:run # Run Workers tests once
npm run test:all         # Run both frontend and Workers tests

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Auto-fix linting issues
npm run lint:strict      # Run ESLint with zero warnings allowed

# Deployment
npm run deploy           # Build and deploy to Cloudflare Workers
npm run verify           # Check deployment status
```

## Testing Strategy

### Test Coverage
- **Frontend Tests**: 49+ tests covering dice logic, UI interactions, and session management
- **Worker Tests**: 20+ tests covering WebSocket handling, message relay, and Durable Object functionality
- **Integration Tests**: End-to-end multiplayer session scenarios

### Test Categories

#### 1. Dice Logic Tests (`dice-logic.test.ts`)
- Roll mechanics for Check, Damage, and GM roll types
- Advantage/disadvantage calculations
- Critical success detection
- Modifier application
- Roll history management

#### 2. Session Utilities Tests (`session-utils.test.ts`)
- Player name sanitization
- Session ID generation and validation
- Local storage management
- URL parsing and room code extraction

#### 3. Streamer Mode Tests (`streamer-mode.test.ts`)
- Room code hiding functionality
- QR code visibility controls
- URL cleanup on navigation

#### 4. Worker Tests (`worker.test.ts`)
- WebSocket connection handling
- Message relay between clients
- Durable Object state management
- Error handling and cleanup

### Running Tests

```bash
# Watch mode for active development
npm test

# Single run for CI/CD
npm run test:run && npm run test:workers:run

# Interactive UI for debugging
npm run test:ui

# Generate coverage reports
npm run test:coverage
```

## Architecture Deep Dive

### Frontend Architecture

#### Alpine.js Integration
The application uses Alpine.js for reactive state management:

```typescript
// Main component initialization
Alpine.data('diceRoller', () => ({
  // Reactive state
  hopeValue: 0,
  fearValue: 0,
  rollHistory: [],
  isRolling: false,
  
  // Methods
  rollDice() { /* ... */ },
  toggleHistory() { /* ... */ }
}));
```

#### 3D Dice Integration
Uses @3d-dice/dice-box for physics simulation:

```typescript
const diceBox = new DiceBox({
  container: "#dice-box",
  assetPath: "/assets/",
  theme: "default",
  scale: 10,
  gravity: 1.5,
  // Physics settings...
});
```

#### State Management
- **Local State**: Alpine.js reactive data
- **Session State**: WebSocket connections and shared history
- **Persistent State**: localStorage for player preferences

### Backend Architecture

#### Cloudflare Workers
- **Entry Point**: `src/worker.ts`
- **Request Routing**: Static assets + WebSocket upgrades
- **Durable Objects**: Session management with automatic scaling

#### WebSocket Communication
- **Protocol**: JSON message passing
- **Message Types**: JOIN, LEAVE, ROLL, HISTORY_SHARE, PING/PONG
- **Reliability**: Automatic reconnection with exponential backoff

For detailed multiplayer architecture, see [Multiplayer Technical Documentation](multiplayer-technical.md).

## Code Style and Standards

### TypeScript Configuration
- **Strict Mode**: Enabled for maximum type safety
- **Target**: ES2022 for modern browser features
- **Module System**: ESModules throughout

### Linting Rules
- **ESLint**: Configured with TypeScript and import plugins
- **Rules**: Strict linting with zero warnings policy in CI
- **Auto-fixing**: Available via `npm run lint:fix`

### Code Formatting
- **Indentation**: 2 spaces
- **Line Length**: 120 characters maximum
- **Semicolons**: Required
- **Quotes**: Single quotes preferred

### File Organization
- **Modules**: One class/component per file
- **Imports**: Grouped by external/internal with blank lines
- **Exports**: Named exports preferred over default
- **Types**: Separate `.ts` files for type definitions

## CI/CD Pipeline

### GitHub Actions Workflow
Automated testing runs on all pushes and pull requests:

1. **Install Dependencies**: `npm ci` for consistent builds
2. **Lint Check**: `npm run lint:strict` with zero warnings
3. **Frontend Tests**: `npm run test:run` with coverage reporting
4. **Worker Tests**: `npm run test:workers:run` for backend logic
5. **Build Verification**: `npm run build` to ensure production builds succeed
6. **Security Audit**: `npm audit` for dependency vulnerabilities

### Deployment Process
- **Automatic Deployment**: Cloudflare Workers deploys automatically from main branch
- **Environment Detection**: Different configs for development vs production
- **Asset Deployment**: Static assets served via Cloudflare Pages integration
- **Rollback**: Git-based rollback through Cloudflare dashboard

### Quality Gates
- All tests must pass
- Code coverage must not decrease
- No linting errors or warnings
- Successful production build
- No high-severity security vulnerabilities

## Contributing Guidelines

### Contribution Workflow

1. **Fork the Repository**
   ```bash
   git clone https://github.com/yourusername/daggerdice.git
   ```

2. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Write Tests First**
   - Add tests for new functionality before implementing
   - Ensure existing tests still pass
   - Maintain or improve code coverage

4. **Implement Changes**
   - Follow existing code style and patterns
   - Add TypeScript types for all new code
   - Update documentation if needed

5. **Test Thoroughly**
   ```bash
   npm run test:all
   npm run build
   ```

6. **Submit Pull Request**
   - Clear description of changes
   - Reference any related issues
   - Include screenshots for UI changes

### Code Review Process
- **Automated Checks**: CI must pass before review
- **Manual Review**: At least one maintainer approval required
- **Testing**: Verify functionality in development environment
- **Documentation**: Ensure changes are properly documented

### Release Process
- **Semantic Versioning**: Major.Minor.Patch format
- **Release Notes**: Automated generation from commit messages
- **Deployment**: Automatic via Cloudflare Workers integration

## Development Tips

### Local Development
- **Hot Reload**: Both frontend and worker support hot reload
- **Debug Mode**: Use browser dev tools with source maps
- **WebSocket Testing**: Use browser console to monitor connections
- **3D Debugging**: Check WebGL context and WASM loading

### Performance Optimization
- **Bundle Analysis**: Use `npm run build` and analyze output
- **Asset Optimization**: Images and 3D assets are pre-optimized
- **Code Splitting**: Vite handles automatic code splitting
- **Caching**: Cloudflare provides automatic edge caching

### Troubleshooting
- **Build Issues**: Clear `node_modules` and reinstall
- **Test Failures**: Run tests individually to isolate issues
- **WebSocket Problems**: Check browser console for connection errors
- **3D Rendering**: Verify WebGL support and GPU drivers

## Advanced Topics

### Custom Dice Themes
Add new themes in `public/assets/themes/`:
- Create theme directory with required assets
- Add `theme.config.json` configuration
- Update theme selection logic in main component

### Message Protocol Extension
To add new WebSocket message types:
1. Update `types.ts` with new message definitions
2. Add handling in `session-client.ts`
3. Update worker relay logic in `worker.ts`
4. Add comprehensive tests

### Performance Monitoring
- **Cloudflare Analytics**: Built-in performance metrics
- **Real User Monitoring**: Available through Cloudflare dashboard
- **Custom Metrics**: Add performance.mark() calls for critical paths

This development guide provides the foundation for contributing to DaggerDice. For specific technical details about the multiplayer system, refer to the [Multiplayer Technical Documentation](multiplayer-technical.md).