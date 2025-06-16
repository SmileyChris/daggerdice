# DaggerDice

A 3D dice rolling web application for tabletop RPGs with Hope/Fear mechanics and optional multiplayer sessions.

## Features

### Core Dice System
- **Hope & Fear Dice**: Roll two D12 dice representing positive (Hope) and negative (Fear) outcomes
- **Advantage/Disadvantage**: Optional D6 modifier that adds or subtracts from the total
- **Modifiers**: Numeric bonuses/penalties ranging from -20 to +20
- **Critical Success**: Occurs when Hope and Fear dice show equal values
- **3D Physics**: Realistic dice rolling with gravity, collision, and physics simulation

### Multiplayer Sessions (Optional)
- **Real-time Collaboration**: Share rolls with friends in live sessions
- **Room-based System**: Create or join rooms using simple 6-character codes
- **Shared Roll History**: See everyone's rolls in a combined history
- **URL Sharing**: Invite players by sharing room links
- **Graceful Fallback**: Automatically falls back to solo mode if multiplayer unavailable

### User Interface
- **Responsive Design**: Works on desktop and mobile devices
- **Roll History**: Track recent rolls with detailed breakdown
- **Toast Notifications**: Live notifications for multiplayer roll updates
- **Theme Support**: Multiple dice themes including "default" and "smooth"

## Quick Start

### Development
```bash
# Install dependencies
npm install

# Start development server (frontend + worker)
npm start

# Build for production
npm run build
```

### Testing
```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

### Deployment
```bash
# Deploy to Cloudflare Workers
npm run deploy

# Verify deployment
npm run verify
```

## Technology Stack

- **Frontend**: Alpine.js, TypeScript, Vite
- **3D Graphics**: @3d-dice/dice-box library
- **Multiplayer**: Cloudflare Durable Objects with WebSocket connections
- **Storage**: SQLite (for session data)
- **Testing**: Vitest, jsdom, @vitest/coverage-v8
- **Deployment**: Cloudflare Workers & Pages

## Project Structure

```
src/
├── dice-roller-main.ts    # Main Alpine.js component and dice logic
├── dice-roller.css        # Application styles
├── session/               # Multiplayer session functionality
│   ├── session-client.ts  # WebSocket client for multiplayer
│   ├── types.ts          # Type definitions for session data
│   └── utils.ts          # Session utility functions
├── assets/               # Static assets (logos, icons)
└── worker.ts            # Cloudflare Worker entry point

public/
└── assets/              # 3D dice assets and themes
    ├── ammo/           # Physics engine WASM files
    └── themes/         # Dice visual themes
        ├── default/    # Standard dice appearance
        └── smooth/     # Smoother dice appearance

docs/                   # MkDocs documentation system
├── index.md           # Documentation homepage
├── getting-started.md # Setup and usage guide
├── features.md        # Feature documentation
└── development.md     # Developer documentation

index.html              # Single-page application template
mkdocs.yml             # Documentation site configuration
```

## Game Mechanics

### Dice Rolling
1. **Hope Die**: Green-themed D12 representing positive outcomes
2. **Fear Die**: Red-themed D12 representing negative outcomes
3. **Result Calculation**: Base total = Hope + Fear + Advantage/Disadvantage + Modifier

### Roll Types
- **Standard**: Roll Hope and Fear dice only
- **Advantage**: Add a D6 to the total (green theme)
- **Disadvantage**: Subtract a D6 from the total (red theme)

### Critical Success
When Hope and Fear dice show the same value, the roll is a "Critical Success" regardless of total.

## Multiplayer Sessions

### Creating a Session
1. Click "🎲 Play with Friends"
2. Enter your player name
3. Click "Create New Room"
4. Share the room URL or 6-character room code with friends

### Joining a Session
1. Visit a shared room URL, or
2. Click "🎲 Play with Friends"
3. Enter your name and the 6-character room code
4. Click "Join Room"

### Session Features
- **Live Roll Sharing**: All players see each other's rolls in real-time
- **Combined History**: Shared roll history showing all participants
- **Player List**: See who's currently in the room
- **Connection Status**: Visual indicators for connectivity
- **Easy Exit**: Return to solo mode anytime

## Configuration

### Dice Physics Settings
The 3D dice simulation can be configured in `src/dice-roller-main.ts`:

```typescript
diceBox = new DiceBox({
  container: "#dice-box",
  assetPath: "/assets/",
  theme: "default",
  scale: 10,
  gravity: 1.5,
  mass: 1,
  friction: 0.8,
  restitution: 0.5,
  // ... additional physics settings
});
```

### Session Configuration
Session behavior is managed through environment detection and falls back gracefully when multiplayer features are unavailable.

## Development Commands

```bash
npm start            # Start development server (alias for npm run dev)
npm run dev          # Start frontend and worker development servers with hot reload
npm run build        # Build for production
npm run preview      # Preview production build locally
npm run deploy       # Build and deploy to Cloudflare
npm run verify       # Check deployment status
npm test             # Run all tests
npm run test:ui      # Run tests with interactive UI
npm run test:coverage # Run tests with coverage report
```

## Browser Compatibility

- **Modern Browsers**: Chrome, Firefox, Safari, Edge (ES6+ support required)
- **WebGL**: Required for 3D dice rendering
- **WebSocket**: Required for multiplayer sessions
- **HTTPS**: Required for multiplayer functionality in production

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Commit your changes: `git commit -am 'Add feature'`
5. Push to the branch: `git push origin feature-name`
6. Submit a pull request

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Credits

- **3D Dice Engine**: [@3d-dice/dice-box](https://www.npmjs.com/package/@3d-dice/dice-box)
- **Frontend Framework**: [Alpine.js](https://alpinejs.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Deployment**: [Cloudflare Workers](https://workers.cloudflare.com/)

## Support

For issues, feature requests, or questions:
1. Check the [GitHub Issues](../../issues) page
2. Create a new issue with detailed information
3. Include browser version and steps to reproduce any problems