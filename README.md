# DaggerDice

A 3D dice rolling web application designed for tabletop RPGs, featuring the Hope/Fear mechanics and real-time multiplayer sessions.

🎲 **[Play DaggerDice](https://daggerdice.smileychris.workers.dev)** 🎲

## Features

### Core Dice System
- **Hope & Fear Dice**: Roll two D12 dice representing positive (Hope) and negative (Fear) outcomes
- **Advantage/Disadvantage**: Optional D6 modifier that adds or subtracts from the total
- **Modifiers**: Numeric bonuses/penalties ranging from -20 to +20
- **Critical Success**: Occurs when Hope and Fear dice show equal values
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

## Getting Started

### For Players

1. **Visit**: [daggerdice.smileychris.workers.dev](https://daggerdice.smileychris.workers.dev)
2. **Solo Play**: Start rolling dice immediately - no signup required
3. **Multiplayer**: Click "🎲 Play with Friends" to create or join a session

### For Developers

**Quick Setup:**
```bash
git clone https://github.com/smileychris/daggerdice.git
cd daggerdice
npm install
npm start
```

For detailed development instructions, see [Development Guide](docs/development.md).

## Browser Requirements

- **Modern Browser**: Chrome, Firefox, Safari, or Edge (ES6+ support)
- **WebGL**: Required for 3D dice rendering
- **WebSocket**: Required for multiplayer sessions
- **HTTPS**: Required for multiplayer in production

## How to Use

### Solo Play
1. Open DaggerDice in your browser
2. Choose your roll type (Check, Damage, or GM)
3. Set any modifiers or advantage/disadvantage
4. Click "Roll" or press Space
5. View your results and history

### Multiplayer Sessions
1. Click "🎲 Play with Friends"
2. Enter your player name
3. **Create Room**: Click "Create New Room" and share the URL/code
4. **Join Room**: Enter a 6-character room code and click "Join"
5. Roll dice together - everyone sees each other's results in real-time

### Keyboard Shortcuts
- **Space**: Roll dice
- **C**: Switch to Check rolls
- **D**: Switch to Damage rolls  
- **G**: Switch to GM rolls
- **H**: Toggle roll history
- **M**: Open multiplayer menu
- **?**: Show help
- **Arrow Keys**: Adjust modifiers and settings
- **Esc**: Close dialogs

## Game Mechanics

### Roll Types

#### Check Rolls (Hope & Fear)
- **Hope Die**: Green D12 representing positive outcomes
- **Fear Die**: Red D12 representing negative outcomes  
- **Total**: Hope + Fear + Advantage/Disadvantage + Modifier
- **Critical Success**: When Hope and Fear show the same value

#### Damage Rolls
- **Base Dice**: Multiple dice of various types (D4, D6, D8, D10, D12)
- **Bonus Die**: Optional additional die for extra damage
- **Critical**: Double dice on critical hits
- **Resistance**: Halve damage when applicable

#### GM Rolls
- **D20 System**: Standard D20 rolls for Game Masters
- **Advantage/Disadvantage**: Roll two D20s, take higher/lower
- **Modifiers**: Add bonuses or penalties
- **Privacy**: Option to keep rolls hidden from players

### Special Features
- **Advantage**: Add a D6 to your total (green theme)
- **Disadvantage**: Subtract a D6 from your total (red theme)
- **Modifiers**: Numeric bonuses/penalties from -20 to +20
- **Streamer Mode**: Hide room codes and sensitive information

## Documentation

📖 **[Complete Documentation](https://smileychris.github.io/daggerdice)** 📖

### For Users
- **[Getting Started Guide](https://smileychris.github.io/daggerdice/getting-started/)**: Complete user guide
- **[Features Overview](https://smileychris.github.io/daggerdice/features/)**: Comprehensive feature documentation

### For Developers
- **[Development Guide](https://smileychris.github.io/daggerdice/development/)**: Setup, testing, and contribution guidelines
- **[Multiplayer Technical](https://smileychris.github.io/daggerdice/multiplayer-technical/)**: WebSocket architecture and connection handling

## Technology Stack

- **Frontend**: Alpine.js, TypeScript, Vite
- **3D Graphics**: @3d-dice/dice-box library  
- **Multiplayer**: Cloudflare Durable Objects with WebSocket connections
- **Deployment**: Cloudflare Workers & Pages

## Contributing

Contributions are welcome! Please see the [Development Guide](docs/development.md) for setup instructions and contribution guidelines.

## Support

- **Issues**: [GitHub Issues](../../issues)
- **Questions**: Create a new issue with the "question" label
- **Bug Reports**: Include browser version and reproduction steps

## License

MIT License - see LICENSE file for details.

## Credits

- **3D Dice Engine**: [@3d-dice/dice-box](https://www.npmjs.com/package/@3d-dice/dice-box)
- **Frontend**: [Alpine.js](https://alpinejs.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Hosting**: [Cloudflare Workers](https://workers.cloudflare.com/)