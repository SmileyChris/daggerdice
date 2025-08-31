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

The application supports multiple dice rolling modes:

#### Hope/Fear System
- **Hope die**: Green-themed D12 representing positive outcomes
- **Fear die**: Red-themed D12 representing negative outcomes  
- **Advantage/Disadvantage**: Optional D6 that adds/subtracts from total
- **Modifiers**: Numeric bonuses/penalties (-20 to +20 range)
- **Critical Success**: When Hope and Fear dice show equal values

#### Damage Roll System
- **Base Dice**: 1-10 dice of types d4, d6, d8, d10, or d12
- **Bonus Die**: Optional additional die of any type
- **Damage Modifier**: Flat damage bonus/penalty (-20 to +20)
- **Critical Hits**: Manual toggle that calculates damage as: **max base dice damage + normal roll + modifier**
  - Example: 2d6 critical with +3 modifier = 12 (max) + rolled damage + 3
  - Bonus dice are NOT doubled, only added normally
- **Resistance**: Halves final damage (rounded down)
- **Display**: Critical hits show "(critical)" in roll results and red "Critical" indicator in roll breakdown

#### GM Roll System
- **D20 System**: Standard D20 rolls for Game Master use with traditional mechanics
- **Advantage/Disadvantage**: Roll two D20s, take higher/lower result as appropriate
- **Modifiers**: Numeric bonuses/penalties (-20 to +20 range)
- **Privacy Option**: GM rolls can be kept hidden from other players in multiplayer sessions
- **Display**: Purple-themed dice and UI elements to distinguish from player rolls

### 3D Dice Integration

Uses @3d-dice/dice-box for 3D physics simulation:
- Assets stored in `/public/assets/` including WASM files and themes
- Two themes available: "default" (standard dice) and "smooth" (smoother appearance)
- Physics configured for realistic dice rolling with gravity, friction, and collision
- **Robust Fallback System**: If 3D dice rendering fails (WebGL unavailable, network issues, etc.), the system automatically generates random numbers using `Math.floor(Math.random() * sides) + 1` to ensure gameplay continues uninterrupted
- Fallback logging: Console warnings are logged when 3D dice fail and random fallback is used
- All dice mechanics (Hope/Fear, damage with criticals, GM rolls with advantage/disadvantage) work identically whether using 3D dice or random fallback

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
- **Session Management**: Friendly room names with mathematical encoding, URL-based joining, persistent player names
- **Deployment**: Cloudflare Workers serve both static assets and WebSocket API

### Friendly Room Names System

DaggerDice uses a sophisticated room naming system that replaces cryptic codes with memorable RPG-themed names:

- **Room Names**: Players create and join rooms with memorable names like `brave-dragon`, `mystic-knight`, `storm-giant`
- **Mathematical Encoding**: Each friendly name maps to a unique 3-character code using Crockford Base32 encoding
- **Dual Format Support**: Both friendly names (`brave-dragon`) and short codes (`4CQ`) work interchangeably
- **Word Lists**: 80 RPG-themed adjectives and 80 nouns provide 6,400 unique combinations
- **URL Conversion**: When users enter a room via short code URL (e.g., `/room/4CQ`), the system automatically converts the URL to show the friendly name (`/room/fire-wizard`) for better user experience, except in streamer mode
- **Dual Display Strategy**: 
  - **URLs**: Show friendly names (`/room/fire-wizard`) for readability and text sharing
  - **Room Code Display**: Show compact codes (`4CQ`) in multiplayer dialogs for quick verbal sharing
- **Implementation**: 
  - Core logic in `/src/session/room-names.ts` with deterministic bijection functions
  - Session utilities in `/src/session/utils.ts` handle generation and validation
  - WebSocket API in `/src/worker.ts` accepts both formats and normalizes internally
  - URL conversion in `/src/dice-roller-main.ts` automatically upgrades short code URLs to friendly names
- **URL Sharing**: Users can share URLs like `daggerdice.com/room/fire-wizard` instead of `daggerdice.com/room/ABC123`
- **Compatibility**: Maintains full backward compatibility with existing room systems

**📚 Documentation**: See [`/docs/room-names-technical.md`](./docs/room-names-technical.md) for complete technical details and [`/docs/room-names-api.md`](./docs/room-names-api.md) for API reference.

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
- **Frontend Tests**: Dice logic, session utilities, UI components, streamer mode, room name encoding
- **Workers Tests**: WebSocket APIs, session validation, error handling, friendly name support
- **Coverage**: Session utilities at 93%, room name encoding at 100%

## Development Workflow

- Run `npm run lint` and `npm run test:all` before committing changes
- Use `npm run test:coverage` to check coverage before major changes
- Update docs when features change or are added
- Frontend and Workers tests run separately due to different environments

## CI/CD Pipeline

The project uses GitHub Actions for automated testing, with Cloudflare Workers handling deployment:

- **GitHub Actions**: Automated testing on all pushes and pull requests
  - **Frontend Tests**: Dice logic, session utilities, UI components, streamer mode, room name encoding
  - **Workers Tests**: WebSocket APIs, session validation, error handling, friendly name support
  - **Build Verification**: Ensures production builds succeed
  - **Security Audit**: Dependency vulnerability scanning
- **Cloudflare Workers**: Automatic deployment from GitHub integration
  - Deploys automatically when main branch is updated
  - No additional secrets required (handled by Cloudflare)

## Development Best Practices

- Keep docs current: when features change, update the relevant guides in `docs/` (user and developer).
- Update the changelog: whenever you make user‑facing improvements or fixes, add an entry to `CHANGES.md`.
  - The website’s “What’s New” page (`docs/whats-new.md`) includes `CHANGES.md` directly, so users see these notes.
- Run `npm run test:all` and `npm run lint` before opening a PR.
