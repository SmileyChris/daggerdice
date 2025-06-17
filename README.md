# DaggerDice

A 3D dice rolling web application designed for the Daggerheart RPG system, featuring Hope/Fear mechanics and real-time multiplayer sessions.

🎲 **[Launch DaggerDice](https://daggerdice.smileychris.workers.dev)** 🎲

## Getting Started

### For Players

1. **Visit**: [daggerdice.smileychris.workers.dev](https://daggerdice.smileychris.workers.dev)
2. **Solo Play**: Start rolling dice immediately - no signup required
3. **Multiplayer**: Click "🎲 Play with Friends" to create or join a session

### For Developers

```bash
git clone https://github.com/smileychris/daggerdice.git
cd daggerdice
npm install
npm start
```

See the [📋 Development Guide](https://smileychris.github.io/daggerdice/development/) for detailed setup, testing, and contribution guidelines.

## Browser Requirements

- **Modern Browser**: Chrome, Firefox, Safari, or Edge (ES6+ support)
- **WebGL**: Required for 3D dice rendering
- **WebSocket**: Required for multiplayer sessions
- **HTTPS**: Required for multiplayer in production

## Quick Guide

### Solo Play
Start rolling immediately - no signup required! Choose your roll type and click "Roll" or press Space.

### Multiplayer
Click "🎲 Play with Friends" to create or join a room with friends. Share the room code or URL to get everyone rolling together.

### Roll Types
- **Check Rolls**: Hope & Fear D12s for Daggerheart skill checks
- **Damage Rolls**: Configurable dice for combat damage
- **GM Rolls**: Private D20 rolls for Game Masters

For complete instructions, shortcuts, and mechanics, see the [📖 Full Documentation](https://smileychris.github.io/daggerdice).

## Features

### Daggerheart RPG Dice System
- **Hope & Fear Dice**: Roll two D12 dice representing positive (Hope) and negative (Fear) outcomes from Daggerheart
- **Advantage/Disadvantage**: Optional D6 modifier following Daggerheart's mechanics
- **Modifiers**: Numeric bonuses/penalties ranging from -20 to +20
- **Critical Success**: Occurs when Hope and Fear dice show equal values (With Hope!)
- **3D Physics**: Realistic dice rolling with gravity, collision, and physics simulation

### Multiplayer Sessions
- **Real-time Collaboration**: Share rolls with friends in live sessions
- **Easy Room Creation**: Create or join rooms using simple 6-character codes
- **Shared Roll History**: See everyone's rolls in a combined history
- **URL Sharing**: Invite players by sharing room links or QR codes
- **Private GM Rolls**: Optional privacy for Game Master rolls
- **Streamer Mode**: Hide room codes for content creators

### Advanced Features
- **Multiple Roll Types**: Check rolls (Hope/Fear), Damage rolls, and GM rolls
- **Keyboard Shortcuts**: Full keyboard navigation support
- **Mobile Optimized**: Touch-friendly interface with bottom drawer navigation
- **Toast Notifications**: Live notifications when other players roll
- **Roll History**: Track recent rolls with detailed breakdown
- **Theme Support**: Multiple dice themes including "default" and "smooth"

## Documentation

📖 **[Complete Documentation](https://smileychris.github.io/daggerdice)** 📖

### For Users
- **[Getting Started Guide](https://smileychris.github.io/daggerdice/getting-started/)**: Complete user guide
- **[Features Overview](https://smileychris.github.io/daggerdice/features/)**: Comprehensive feature documentation

### For Developers
- **[Development Guide](https://smileychris.github.io/daggerdice/development/)**: Setup, testing, and contribution guidelines
- **[Multiplayer Technical](https://smileychris.github.io/daggerdice/multiplayer-technical/)**: WebSocket architecture and connection handling

### Local Development
Documentation development:
```bash
# With pip
pip install mkdocs-material pymdown-extensions && mkdocs serve

# With uv (recommended)
uv tool install mkdocs --with mkdocs-material && mkdocs serve
```

## Contributing

Contributions welcome! See the [Development Guide](https://smileychris.github.io/daggerdice/development/) for guidelines.

## Technology Stack

- **Frontend**: Alpine.js, TypeScript, Vite
- **3D Graphics**: @3d-dice/dice-box library  
- **Multiplayer**: Cloudflare Durable Objects with WebSocket connections
- **Deployment**: Cloudflare Workers & Pages

## License

MIT License - Built with [@3d-dice/dice-box](https://www.npmjs.com/package/@3d-dice/dice-box), [Alpine.js](https://alpinejs.dev/), and [Cloudflare Workers](https://workers.cloudflare.com/).