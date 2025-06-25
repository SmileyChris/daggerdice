# DaggerDice Features

## Daggerheart RPG Dice System

### Hope & Fear Mechanics
- **Hope Die**: Green-themed D12 representing positive outcomes and player agency in Daggerheart
- **Fear Die**: Red-themed D12 representing negative outcomes and complications
- **Critical Success**: When Hope and Fear dice show equal values, regardless of total (With Hope!)
- **Advantage/Disadvantage**: Optional D6 that adds to or subtracts from the total following Daggerheart mechanics
- **Modifiers**: Numeric bonuses/penalties ranging from -20 to +20

### Multiple Roll Types

#### Check Rolls (Hope & Fear)
- Primary roll type for skill checks and saving throws in Daggerheart
- Two D12 dice rolled simultaneously following Daggerheart mechanics
- Total calculated as: Hope + Fear + Advantage/Disadvantage + Modifier
- Critical success when both dice show the same number (With Hope!)

#### Damage Rolls
- **Base Dice**: Choose dice count and type following Daggerheart's damage system (D4, D6, D8, D10, D12)
- **Bonus Die**: Optional additional die for extra damage
- **Critical Hits**: Manual toggle that calculates damage as max base dice + normal roll + modifier
- **Resistance**: Option to halve damage for resistant targets
- Supports complex damage calculations for Daggerheart weapons and spells

#### GM Rolls
- **D20 System**: Standard D20 rolls for Game Master use with traditional mechanics
- **Advantage/Disadvantage**: Roll two D20s, take higher or lower result
- **Modifiers**: Add bonuses or penalties to rolls
- **Privacy Option**: Keep GM rolls hidden from other players
- Flexible system for non-Daggerheart mechanics and traditional RPG elements

### 3D Physics Simulation
- **Physics Engine**: Powered by @3d-dice/dice-box with WASM-based physics
- **Realistic Rolling**: Gravity, friction, collision detection, and bounce effects
- **Visual Themes**: Multiple dice appearances (default and smooth themes)
- **Robust Fallback System**: Automatic random number generation if 3D rendering fails (WebGL unavailable, network issues, device limitations, etc.)
- **Seamless Gameplay**: All game mechanics work identically whether using 3D dice or random fallback
- **Error Handling**: Transparent fallback with console logging for debugging
- **Performance Optimization**: Optimized for various device capabilities

## Multiplayer Features

### Real-time Session Management
- **Room Creation**: Generate 6-character room codes for easy sharing
- **URL Sharing**: Direct links to join specific rooms
- **QR Code Generation**: Automatic QR codes for mobile device joining
- **Player Management**: See who's currently connected and their activity status
- **Automatic Reconnection**: Handles connection drops with exponential backoff

### Live Roll Sharing
- **Real-time Broadcasting**: All players see each other's rolls instantly
- **Roll History Synchronization**: Shared history across all connected players
- **Toast Notifications**: Pop-up notifications when other players roll
- **History Keeping**: Intelligent system prevents duplicate history sharing
- **Private GM Rolls**: Option to exclude GM rolls from shared history

### Connection Reliability
- **WebSocket Protocol**: Persistent connections for low-latency communication
- **Health Monitoring**: Heartbeat system with ping/pong for connection health
- **Automatic Recovery**: Reconnects on window focus and visibility changes
- **Graceful Degradation**: Falls back to solo mode if multiplayer unavailable

## User Interface Features

### Responsive Design
- **Desktop Interface**: Full-featured layout with sidebar controls
- **Mobile Optimization**: Bottom drawer interface for touch devices
- **Adaptive Layout**: Automatically adjusts to screen size and orientation
- **Touch-Friendly**: Large tap targets and gesture-friendly interactions

### Keyboard Shortcuts
- **Roll Types**: `C` (Check), `D` (Damage), `G` (GM)
- **Actions**: `Space` (Roll), `H` (History), `M` (Multiplayer), `?` (Help)
- **Navigation**: `Esc` (Close dialogs), Arrow keys (Adjust values)
- **Context-Aware**: Different behaviors based on current screen/mode
- **Input Protection**: Disabled when typing in text fields

### Roll History & Analytics
- **Detailed History**: View last 10-20 rolls with complete breakdown
- **Player Attribution**: See who rolled what in multiplayer sessions
- **Time Stamps**: Precise timing for each roll
- **Result Analysis**: Critical successes highlighted
- **Export Ready**: Structured data for external analysis

## Privacy & Streaming Features

### Streamer Mode
- **Room Code Hiding**: Automatically hide room codes and QR codes
- **URL Protection**: Clear URLs containing room information
- **Click-to-Reveal**: Temporary override to show hidden information
- **Persistent Setting**: Saved preference across browser sessions
- **Content Creator Friendly**: Prevents accidental room code reveals

### Privacy Controls
- **Private GM Rolls**: Option to keep Game Master rolls from being shared
- **Player Name Sanitization**: Automatic cleanup of display names
- **Local Storage Only**: No server-side storage of personal information
- **Session Cleanup**: Automatic cleanup when leaving sessions

## Advanced Features

### Mobile-Specific Enhancements
- **Bottom Drawer Navigation**: Mobile-specific dialog system
- **Gesture Support**: Swipe and touch optimizations
- **Portrait/Landscape**: Adaptive layouts for both orientations
- **iOS/Android**: Cross-platform mobile browser support

### Accessibility Features
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Reader Support**: Proper ARIA labels and structure
- **High Contrast**: Clear visual distinctions for different elements
- **Focus Management**: Logical tab order and focus indicators

### Performance Features
- **Edge Deployment**: Cloudflare's global network for low latency
- **Asset Optimization**: Optimized 3D assets and textures
- **Code Splitting**: Minimal initial bundle size
- **Caching Strategy**: Aggressive caching for repeat visits

## Configuration & Customization

### Dice Themes
- **Default Theme**: Standard dice with traditional appearance
- **Smooth Theme**: Modern, smoother dice aesthetic
- **Custom Assets**: Different textures, normals, and materials
- **Theme Switching**: Easy selection between available themes

### Physics Configuration
- **Gravity Control**: Adjustable physics simulation parameters
- **Collision Settings**: Configurable surface interaction
- **Animation Speed**: Customizable roll duration
- **Visual Effects**: Particle systems and lighting effects

### Session Settings
- **Auto-join**: Automatically join sessions from URLs with saved names
- **Connection Preferences**: Retry settings and timeout configuration
- **History Limits**: Configurable roll history length
- **Notification Settings**: Control toast notification behavior

## Integration Features

### URL Handling
- **Smart Parsing**: Extracts room codes from various URL formats
- **Direct Links**: Shareable URLs for immediate room joining
- **Navigation Handling**: Single-page application routing
- **Bookmark Support**: Bookmarkable states and preferences

### Local Storage
- **Player Preferences**: Saved player names and settings
- **Session History**: Recent room codes and connection info
- **Theme Selection**: Persistent visual preferences
- **Accessibility Settings**: Saved accessibility configurations

### Cross-Platform Compatibility
- **Modern Browsers**: Chrome, Firefox, Safari, Edge support
- **WebGL Requirements**: Automatic detection and fallback
- **WebSocket Support**: Graceful degradation for older browsers
- **HTTPS Security**: Secure connections for production use

This comprehensive feature set makes DaggerDice a robust, accessible, and user-friendly dice rolling application designed specifically for Daggerheart RPG sessions, while also supporting traditional RPG mechanics for Game Masters.
