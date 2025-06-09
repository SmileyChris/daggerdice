# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run build` after making changes

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

### Build Configuration

- **Vite**: Modern build tool with TypeScript support
- **TypeScript**: Strict typing with custom global declarations for DiceBox
- **Asset handling**: Static assets served from `/public/assets/`
- **Module imports**: ES modules with proper Alpine.js and DiceBox integration