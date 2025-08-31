# Getting Started with DaggerDice

DaggerDice is a web-based 3D dice roller for the Daggerheart RPG system. It features Hope/Fear checks, damage rolls, optional GM D20 rolls, realistic 3D physics, and real-time multiplayer.

## Quick Start (Users)

### 1) Launch the app
🎲 Visit: https://daggerdice.smileychris.workers.dev

No install required. Works on desktop and mobile browsers.

### 2) Choose your mode

- Solo play: Start rolling immediately.
- Multiplayer: Click "🎲 Play with Friends" to create or join a room.

### 3) Roll the dice

1. Select a roll type: Check, Damage, or GM.
2. Set options: modifiers, advantage/disadvantage (where applicable), critical/resistance (Damage).
3. Press "Roll Dice" or hit Space. Results include a clear breakdown and are added to history.

## Desktop vs Mobile

- Desktop: Controls are shown in a side panel with quick-access tabs.
- Mobile: Use the bottom drawer tabs. Tap the result bar at the top to toggle roll history quickly.

## Keyboard Shortcuts (Desktop)

- Space: Roll dice
- C / D / G: Switch to Check / Damage / GM
- H: Toggle roll history
- M: Toggle multiplayer panel
- ?: Show keyboard help
- Esc: Close dialogs

On mobile, use touch controls. The shortcuts are disabled while typing into text fields.

## Roll Types

### Check (Hope & Fear)
- Rolls two D12s (Hope and Fear) with optional Advantage/Disadvantage (D6).
- Critical success is when Hope and Fear are equal (With Hope!).
- Add a flat modifier between -20 and +20.

### Damage
- Choose base dice (count and type: d4/d6/d8/d10/d12).
- Optional bonus die (d4–d12).
- Options: Critical (max base + normal roll + modifier), Resistance (half total).

### GM (D20)
- Standard D20 with Advantage/Disadvantage and modifier.
- In multiplayer, an optional "Private rolls" toggle hides results from others.

## Multiplayer Guide

### Create a room
1. Click "🎲 Play with Friends".
2. Enter your player name (stored locally).
3. Click "Create New Room".
4. Share the three-character code or the copied URL/QR with friends.

### Join a room
1. Click "🎲 Play with Friends".
2. Enter your player name.
3. Paste the room URL or enter the three-character room code.
4. Click "Join Room".

Notes:
- Returning users auto-rejoin the last room from the saved code.
- The app shows connection status; it will reconnect automatically after brief drops.

## Dark Mode

- Toggle using the moon/sun button on desktop (bottom-right) or from the mobile Actions panel.
- The preference is saved and follows your system setting when unset.

## Roll Sounds

- Dice rolls include a short sound effect when supported by the browser.
- Use your system/browser mute to silence if desired.

## "What’s New" (Changelog)

- Click the version label at the bottom-right to see all changes.
- Returning users automatically see new changes since their last visit.

## Browser Requirements

- Modern browser: Chrome, Firefox, Safari, or Edge.
- WebGL for 3D dice; the app falls back to secure randomness if 3D rendering isn’t available.
- WebSocket for multiplayer; HTTPS is required in production.

## Troubleshooting

- No 3D dice: Ensure WebGL is enabled; the app will still function with random rolls.
- Can’t connect to a room: Check your network and ensure HTTPS if testing outside localhost.
- Audio not playing: Some browsers block autoplay until you interact with the page.

