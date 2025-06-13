// Test setup file
import { vi } from 'vitest'

// Mock DiceBox since it requires WebGL and WASM
vi.mock('@3d-dice/dice-box', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      init: vi.fn().mockResolvedValue(undefined),
      roll: vi.fn().mockImplementation((dice) => {
        // Mock dice roll results based on dice configuration
        return Promise.resolve(
          dice.map(() => ({
            value: Math.floor(Math.random() * 12) + 1
          }))
        )
      })
    }))
  }
})

// Mock Alpine.js
global.Alpine = {
  start: vi.fn(),
} as any

// Mock crypto for session ID generation
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: vi.fn()
  },
  writable: true
})

// Mock localStorage
Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  },
  writable: true
})

// Mock window object with common properties including addEventListener
Object.defineProperty(global, 'window', {
  value: {
    location: {
      hostname: 'localhost',
      protocol: 'https:',
      host: 'example.com',
      pathname: '/'
    },
    isSecureContext: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    setInterval: vi.fn(),
    clearInterval: vi.fn(),
    setTimeout: vi.fn(),
    clearTimeout: vi.fn(),
    diceBox: {
      roll: vi.fn().mockImplementation((dice) => {
        return Promise.resolve(
          dice.map((die: any) => ({
            value: Math.floor(Math.random() * die.sides) + 1
          }))
        )
      })
    }
  },
  writable: true
})

// Mock navigator
Object.defineProperty(global, 'navigator', {
  value: {
    clipboard: {
      writeText: vi.fn()
    }
  },
  writable: true
})

// Mock document
Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn(),
    body: {
      appendChild: vi.fn(),
      removeChild: vi.fn()
    },
    execCommand: vi.fn()
  },
  writable: true
})

// Mock WebSocket
Object.defineProperty(global, 'WebSocket', {
  value: vi.fn(),
  writable: true
})