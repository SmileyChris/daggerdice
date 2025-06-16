# Getting Started with DaggerDice

DaggerDice is a web-based 3D dice rolling application designed specifically for the Daggerheart RPG system, with a focus on Hope/Fear mechanics and real-time multiplayer collaboration.

## Quick Start (Users)

### 1. Access DaggerDice
🎲 **[Launch DaggerDice](https://daggerdice.smileychris.workers.dev)** 🎲

No downloads or installations required - DaggerDice runs directly in your web browser.

### 2. Choose Your Mode

#### Solo Play
- Start rolling dice immediately after opening the application
- Perfect for personal gaming or offline preparation
- All features available except multiplayer

#### Multiplayer Sessions
- Click "🎲 Play with Friends" to access multiplayer features
- Create a new room or join an existing one
- Roll dice together in real-time with friends

### 3. Basic Usage

#### Rolling Dice
1. **Select Roll Type**: Choose Check, Damage, or GM rolls
2. **Set Parameters**: Adjust modifiers, advantage/disadvantage, and other settings
3. **Roll**: Click the "Roll" button or press Space
4. **View Results**: See your results with full breakdown and history

#### Keyboard Shortcuts
- **Space**: Roll dice
- **C**: Switch to Check rolls (Hope & Fear)
- **D**: Switch to Damage rolls
- **G**: Switch to GM rolls
- **H**: Toggle roll history
- **M**: Open multiplayer menu
- **?**: Show help dialog

## Multiplayer Guide

### Creating a Session
1. Click "🎲 Play with Friends"
2. Enter your player name (up to 20 characters)
3. Click "Create New Room"
4. Share the room code or URL with your friends
5. Start rolling dice together!

### Joining a Session
1. Get a room code or URL from your friend
2. Click "🎲 Play with Friends"
3. Enter your player name
4. Enter the 6-character room code or paste the URL
5. Click "Join Room"

### Session Features
- **Live Roll Sharing**: Everyone sees each other's rolls in real-time
- **Shared History**: Combined roll history for all players
- **Player List**: See who's currently connected
- **Toast Notifications**: Get notified when others roll
- **Easy Exit**: Return to solo mode anytime

## Roll Types Explained

!!! hope "Check Rolls (Hope & Fear)"
    - **Hope Die**: <span class="dice-result hope">Green D12</span> for positive outcomes in Daggerheart
    - **Fear Die**: <span class="dice-result fear">Red D12</span> for negative outcomes and complications
    - **Total**: Hope + Fear + Advantage/Disadvantage + Modifier
    - **Critical Success**: When Hope and Fear show the same value (With Hope!)

!!! note "Damage Rolls"
    - **Base Dice**: Choose number and type following Daggerheart's damage system (D4, D6, D8, D10, D12)
    - **Bonus Die**: Optional extra damage die
    - **Critical**: Double dice on critical hits
    - **Resistance**: Halve damage when applicable

!!! abstract "GM Rolls"
    - **D20 System**: Standard D20 mechanics for traditional RPG elements
    - **Advantage/Disadvantage**: Roll two D20s, take higher/lower
    - **Privacy**: Option to keep rolls hidden from players
    - **Modifiers**: Add bonuses or penalties

## Tips for New Users

### Browser Requirements
- **Modern Browser**: Chrome, Firefox, Safari, or Edge
- **WebGL Support**: Required for 3D dice (most browsers support this)
- **JavaScript Enabled**: Required for all functionality
- **HTTPS**: Required for multiplayer in production

### Performance Tips
- **3D Rendering**: If dice animation is slow, try the fallback mode
- **Mobile Use**: Works great on phones and tablets
- **Connection**: Stable internet connection recommended for multiplayer

### Privacy Features
- **Streamer Mode**: Hide room codes when streaming/recording
- **Private GM Rolls**: Keep GM rolls from being shared with players
- **No Account Required**: No personal information stored on servers

## Common Use Cases

### Game Night with Friends
1. One player creates a room and shares the code
2. Everyone joins the same session
3. Game Master can use private GM rolls
4. Players roll openly with shared history

### Solo Gaming
1. Open DaggerDice in your browser
2. Use any roll type without multiplayer
3. Review roll history for your session
4. Perfect for character creation or planning

### Content Creation
1. Enable Streamer Mode to hide room codes
2. Create engaging dice rolling content
3. Share results with your audience
4. No accidental room code reveals

## Troubleshooting

### Common Issues

#### 3D Dice Not Appearing
- Check WebGL support in your browser
- DaggerDice automatically falls back to number generation
- Try refreshing the page or restarting your browser

#### Multiplayer Connection Problems
- Ensure stable internet connection
- Try refreshing the page
- Check if HTTPS is being used (required for production)
- Connection automatically retries with exponential backoff

#### Mobile Issues
- Use landscape orientation for best experience
- Tap targets are optimized for touch
- Bottom drawer provides mobile-friendly navigation

### Getting Help
- **GitHub Issues**: [Report bugs or request features](https://github.com/smileychris/daggerdice/issues)
- **Documentation**: Browse the full documentation in this docs folder
- **Source Code**: Review the open-source code for technical details

## For Developers

If you're interested in contributing to DaggerDice or running it locally:

### Quick Setup
```bash
git clone https://github.com/smileychris/daggerdice.git
cd daggerdice
npm install
npm start
```

### Full Development Guide
See the [Development Guide](development.md) for comprehensive setup instructions, architecture details, and contribution guidelines.

### Technical Documentation
- **[Multiplayer Technical](multiplayer-technical.md)**: WebSocket architecture
- **[Feature Documentation](features.md)**: Complete feature breakdown
- **[Development Guide](development.md)**: Contributing and development setup

---

Ready to roll? **[Start using DaggerDice now!](https://daggerdice.smileychris.workers.dev)** 🎲