# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

- `npm start` - Start development server (alias for `npm run dev`)
- `npm run dev` - Start frontend and worker development servers with hot reload
- `npm run build` - Build for production
- `npm run test` - Run frontend tests in watch mode
- `npm run test:run` - Run frontend tests once
- `npm run test:coverage` - Run frontend tests with coverage report
- `npm run test:ui` - Run frontend tests with interactive UI
- `npm run test:workers` - Run Cloudflare Workers tests in watch mode
- `npm run test:workers:run` - Run Workers tests once
- `npm run test:all` - Run all tests (frontend and Workers)
- `npm run lint` - Run ESLint on TypeScript and JavaScript files
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run deploy` - Build and deploy to Cloudflare Workers

## Project Architecture

DaggerDice is a 3D dice rolling web application built with Vite, TypeScript, Alpine.js, and the @3d-dice/dice-box library. The application implements a tabletop RPG dice system with Hope/Fear mechanics.

### Core Components

- **Main Entry**: `/src/dice-roller-main.ts` - Contains the Alpine.js component logic and DiceBox initialization
- **Styles**: `/src/dice-roller.css` - All application styling
- **HTML Template**: `/index.html` - Single-page application with Alpine.js directives

### Dice System Implementation

The application rolls two D12 dice (Hope and Fear) with the following mechanics:
- **Hope die**: Green-themed D12 representing positive outcomes
- **Fear die**: Red-themed D12 representing negative outcomes  
- **Advantage/Disadvantage**: Optional D6 that adds/subtracts from total
- **Modifiers**: Numeric bonuses/penalties (-20 to +20 range)
- **Critical Success**: When Hope and Fear dice show equal values

### 3D Dice Integration

Uses @3d-dice/dice-box for 3D physics simulation:
- Assets stored in `/public/assets/` including WASM files and themes
- Two themes available: "default" (standard dice) and "smooth" (smoother appearance)
- Physics configured for realistic dice rolling with gravity, friction, and collision
- Fallback to random number generation if 3D rendering fails

### UI State Management

Alpine.js manages all reactive state:
- `hopeValue`/`fearValue`: Current dice results
- `advantageType`: 'none', 'advantage', or 'disadvantage'
- `modifier`: Numeric modifier value
- `rollHistory`: Array of recent rolls (limited to 10)
- `isRolling`: Prevents multiple simultaneous rolls
- `showHistory`: Controls history panel visibility

### Multiplayer Architecture

Built on Cloudflare Durable Objects for real-time session management:
- **WebSocket Relay**: `SessionDurableObject` handles peer-to-peer message relay
- **Session Client**: `/src/session/session-client.ts` manages WebSocket connections with auto-reconnection
- **Message Types**: Join/leave announcements, roll sharing, player responses, and heartbeat
- **Session Management**: 6-character room codes, URL-based joining, persistent player names
- **Deployment**: Cloudflare Workers serve both static assets and WebSocket API

### Build Configuration

- **Vite**: Modern build tool with TypeScript support
- **TypeScript**: Strict typing with custom global declarations for DiceBox
- **Asset handling**: Static assets served from `/public/assets/`
- **Module imports**: ES modules with proper Alpine.js and DiceBox integration
- **ESLint**: Configured for TypeScript with import validation and style enforcement
- **Testing**: Separate configs for frontend (happy-dom) and Workers (Cloudflare pool)

## Testing & Coverage

The project has comprehensive test coverage across two testing layers:
- **Unit Tests**: Frontend utilities, dice logic, session management, Workers APIs
- **Coverage Target**: 80% threshold for branches, functions, lines, and statements

### Test Organization
- **Frontend Tests**: Dice logic, session utilities, UI components, streamer mode
- **Workers Tests**: WebSocket APIs, session validation, error handling
- **Coverage**: Session utilities at 93%

## Development Workflow

- Run `npm run lint` and `npm run test:all` before committing changes
- Use `npm run test:coverage` to check coverage before major changes
- Update docs when features change or are added
- Frontend and Workers tests run separately due to different environments

## CI/CD Pipeline

The project uses GitHub Actions for automated testing, with Cloudflare Workers handling deployment:

- **GitHub Actions**: Automated testing on all pushes and pull requests
  - **Frontend Tests**: Dice logic, session utilities, UI components, streamer mode
  - **Workers Tests**: WebSocket APIs, session validation, error handling
  - **Build Verification**: Ensures production builds succeed
  - **Security Audit**: Dependency vulnerability scanning
- **Cloudflare Workers**: Automatic deployment from GitHub integration
  - Deploys automatically when main branch is updated
  - No additional secrets required (handled by Cloudflare)