// Global test setup
import { vi } from 'vitest';

// Mock window.addEventListener for beforeunload
global.addEventListener = vi.fn();
global.removeEventListener = vi.fn();

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock window.location
Object.defineProperty(window, 'location', {
  writable: true,
  value: {
    protocol: 'https:',
    host: 'localhost:3000',
    hostname: 'localhost',
    pathname: '/',
    href: 'https://localhost:3000/',
  },
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock setInterval/clearInterval for better control in tests
const originalSetInterval = global.setInterval;
const originalClearInterval = global.clearInterval;
const originalSetTimeout = global.setTimeout;
const originalClearTimeout = global.clearTimeout;

global.setInterval = vi.fn(originalSetInterval);
global.clearInterval = vi.fn(originalClearInterval);
global.setTimeout = vi.fn(originalSetTimeout);
global.clearTimeout = vi.fn(originalClearTimeout);