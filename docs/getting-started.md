# Getting Started with DaggerDice

## For Users

1. Open [DaggerDice website](https://daggerdice.smileychris.workers.dev) in your browser
2. No installation required - works directly in modern browsers
3. Create or join a multiplayer session using the session ID
4. Designed for use with the Daggerheart RPG system

## For Developers

### Prerequisites
- Node.js 18+
- npm or yarn
- Git

### Installation
```bash
git clone https://github.com/smileychris/daggerdice.git
cd daggerdice
npm install
```

### Development Commands
```bash
npm run dev        # Start frontend dev server
npm run dev:worker # Start worker in dev mode
```

### Building & Previewing
```bash
npm run build   # Production build
npm run preview # Preview production build
```

### Deployment
```bash
npm run deploy # Build and deploy to Cloudflare
npm run verify # Check deployment status