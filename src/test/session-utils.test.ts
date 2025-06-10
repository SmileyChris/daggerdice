import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  generateSessionId,
  generatePlayerId,
  isValidSessionId,
  sanitizePlayerName,
  formatTimestamp,
  getSessionIdFromUrl,
  normalizeSessionId,
  isSessionEnvironmentSupported,
  createSessionUrl,
  copyToClipboard,
  debounce,
  delay,
  savePlayerName,
  getSavedPlayerName,
  saveLastSessionId,
  getLastSessionId,
  clearLastSessionId,
  clearSavedSessionData
} from '../session/utils'

beforeEach(() => {
  vi.clearAllMocks()
  
  // Reset mocks to default state
  vi.mocked(crypto.getRandomValues).mockImplementation((array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = 123
    }
    return array
  })
  
  vi.mocked(localStorage.getItem).mockReturnValue(null)
  vi.mocked(localStorage.setItem).mockImplementation(() => {})
  vi.mocked(localStorage.removeItem).mockImplementation(() => {})
  
  window.location.pathname = '/'
  window.location.hostname = 'localhost'
  window.location.protocol = 'https:'
  window.location.host = 'example.com'
  
  vi.mocked(document.createElement).mockReturnValue({
    textContent: '',
    innerHTML: 'test',
    value: '',
    style: {},
    focus: vi.fn(),
    select: vi.fn()
  } as any)
})

describe('Session ID Functions', () => {
  describe('generateSessionId', () => {
    it('should generate a 6-character uppercase session ID', () => {
      const sessionId = generateSessionId()
      expect(sessionId).toHaveLength(6)
      expect(sessionId).toMatch(/^[A-Z0-9]{6}$/)
    })
  })

  describe('generatePlayerId', () => {
    it('should generate an 8-character player ID', () => {
      const playerId = generatePlayerId()
      expect(playerId).toHaveLength(8)
    })
  })

  describe('isValidSessionId', () => {
    it('should validate correct session IDs', () => {
      expect(isValidSessionId('ABC123')).toBe(true)
      expect(isValidSessionId('abc123')).toBe(true)
      expect(isValidSessionId('123456')).toBe(true)
      expect(isValidSessionId('ABCDEF')).toBe(true)
    })

    it('should reject invalid session IDs', () => {
      expect(isValidSessionId('')).toBe(false)
      expect(isValidSessionId('ABC12')).toBe(false) // too short
      expect(isValidSessionId('ABC1234')).toBe(false) // too long
      expect(isValidSessionId('ABC-12')).toBe(false) // special characters
      expect(isValidSessionId(null as any)).toBe(false)
      expect(isValidSessionId(undefined as any)).toBe(false)
    })
  })

  describe('normalizeSessionId', () => {
    it('should normalize valid session IDs to uppercase', () => {
      expect(normalizeSessionId('abc123')).toBe('ABC123')
      expect(normalizeSessionId(' ABC123 ')).toBe('ABC123')
    })

    it('should return null for invalid session IDs', () => {
      expect(normalizeSessionId('ABC12')).toBeNull()
      expect(normalizeSessionId('ABC-12')).toBeNull()
      expect(normalizeSessionId('')).toBeNull()
      expect(normalizeSessionId(null as any)).toBeNull()
    })
  })
})

describe('Player Name Functions', () => {
  describe('sanitizePlayerName', () => {
    it('should sanitize normal player names', () => {
      vi.mocked(document.createElement).mockReturnValue({
        textContent: '',
        innerHTML: 'John Doe'
      } as any)
      
      const result = sanitizePlayerName('John Doe')
      expect(result).toBe('John Doe')
    })

    it('should trim whitespace and limit length', () => {
      const longName = 'A'.repeat(25)
      vi.mocked(document.createElement).mockReturnValue({
        textContent: '',
        innerHTML: 'A'.repeat(20)
      } as any)
      
      const result = sanitizePlayerName(` ${longName} `)
      expect(result).toBe('A'.repeat(20))
    })

    it('should return Anonymous for invalid names', () => {
      expect(sanitizePlayerName('')).toBe('Anonymous')
      expect(sanitizePlayerName(null as any)).toBe('Anonymous')
      expect(sanitizePlayerName(undefined as any)).toBe('Anonymous')
    })
  })
})

describe('Timestamp Functions', () => {
  describe('formatTimestamp', () => {
    it('should format recent timestamps correctly', () => {
      const now = Date.now()
      
      expect(formatTimestamp(now)).toBe('just now')
      expect(formatTimestamp(now - 30000)).toBe('just now') // 30 seconds ago
      expect(formatTimestamp(now - 120000)).toBe('2m ago') // 2 minutes ago
      expect(formatTimestamp(now - 3600000)).toBe('1h ago') // 1 hour ago
    })

    it('should format old timestamps as dates', () => {
      const twoDaysAgo = Date.now() - (2 * 24 * 60 * 60 * 1000)
      const result = formatTimestamp(twoDaysAgo)
      expect(result).toMatch(/^\d{1,2}\/\d{1,2}\/\d{4}$/)
    })
  })
})

describe('URL Functions', () => {
  describe('getSessionIdFromUrl', () => {
    it('should extract session ID from room URL', () => {
      window.location.pathname = '/room/ABC123'
      expect(getSessionIdFromUrl()).toBe('ABC123')
    })

    it('should return null for non-room URLs', () => {
      window.location.pathname = '/'
      expect(getSessionIdFromUrl()).toBeNull()
      
      window.location.pathname = '/other-page'
      expect(getSessionIdFromUrl()).toBeNull()
    })
  })

  describe('createSessionUrl', () => {
    it('should create correct session URLs', () => {
      window.location.protocol = 'https:'
      window.location.host = 'example.com'
      
      const url = createSessionUrl('ABC123')
      expect(url).toBe('https://example.com/room/ABC123')
    })
  })

  describe('isSessionEnvironmentSupported', () => {
    it('should return true for HTTPS', () => {
      window.location.protocol = 'https:'
      window.location.hostname = 'example.com'
      
      expect(isSessionEnvironmentSupported()).toBe(true)
    })

    it('should return true for localhost', () => {
      window.location.protocol = 'http:'
      window.location.hostname = 'localhost'
      
      expect(isSessionEnvironmentSupported()).toBe(true)
    })

    it('should return false without WebSocket', () => {
      window.location.protocol = 'https:'
      // @ts-ignore
      global.WebSocket = undefined
      
      expect(isSessionEnvironmentSupported()).toBe(false)
    })
  })
})

describe('Clipboard Functions', () => {
  describe('copyToClipboard', () => {
    it('should use navigator.clipboard when available', async () => {
      vi.mocked(navigator.clipboard.writeText).mockResolvedValue(undefined)
      
      const result = await copyToClipboard('test text')
      expect(result).toBe(true)
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test text')
    })

    it('should fallback to execCommand when clipboard API unavailable', async () => {
      // @ts-ignore
      global.navigator = {} // No clipboard API
      
      const mockTextArea = {
        value: '',
        style: {},
        focus: vi.fn(),
        select: vi.fn()
      }
      vi.mocked(document.createElement).mockReturnValue(mockTextArea as any)
      vi.mocked(document.execCommand).mockReturnValue(true)
      
      const result = await copyToClipboard('test text')
      expect(result).toBe(true)
      expect(mockTextArea.value).toBe('test text')
      expect(document.execCommand).toHaveBeenCalledWith('copy')
    })
  })
})

describe('Utility Functions', () => {
  describe('debounce', () => {
    it('should debounce function calls', async () => {
      const mockFn = vi.fn()
      const debouncedFn = debounce(mockFn, 100)
      
      debouncedFn('arg1')
      debouncedFn('arg2')
      debouncedFn('arg3')
      
      expect(mockFn).not.toHaveBeenCalled()
      
      await delay(150)
      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(mockFn).toHaveBeenCalledWith('arg3')
    })
  })

  describe('delay', () => {
    it('should resolve after specified time', async () => {
      const start = Date.now()
      await delay(100)
      const elapsed = Date.now() - start
      
      expect(elapsed).toBeGreaterThanOrEqual(90) // Allow some variance
    })
  })
})

describe('LocalStorage Functions', () => {
  describe('savePlayerName and getSavedPlayerName', () => {
    it('should save and retrieve player names', () => {
      vi.mocked(localStorage.getItem).mockReturnValue('John Doe')
      
      savePlayerName('John Doe')
      expect(localStorage.setItem).toHaveBeenCalledWith('daggerdice_player_name', 'John Doe')
      
      const result = getSavedPlayerName()
      expect(result).toBe('John Doe')
    })

    it('should handle localStorage errors gracefully', () => {
      vi.mocked(localStorage.setItem).mockImplementation(() => {
        throw new Error('Storage error')
      })
      vi.mocked(localStorage.getItem).mockImplementation(() => {
        throw new Error('Storage error')
      })
      
      expect(() => savePlayerName('John')).not.toThrow()
      expect(getSavedPlayerName()).toBe('')
    })
  })

  describe('saveLastSessionId and getLastSessionId', () => {
    it('should save and retrieve valid session IDs', () => {
      vi.mocked(localStorage.getItem).mockReturnValue('ABC123')
      
      saveLastSessionId('ABC123')
      expect(localStorage.setItem).toHaveBeenCalledWith('daggerdice_last_session_id', 'ABC123')
      
      const result = getLastSessionId()
      expect(result).toBe('ABC123')
    })

    it('should not save invalid session IDs', () => {
      saveLastSessionId('INVALID')
      expect(localStorage.setItem).not.toHaveBeenCalled()
    })

    it('should return empty string for invalid stored session IDs', () => {
      vi.mocked(localStorage.getItem).mockReturnValue('INVALID')
      
      const result = getLastSessionId()
      expect(result).toBe('')
    })
  })

  describe('clearLastSessionId and clearSavedSessionData', () => {
    it('should clear session ID', () => {
      clearLastSessionId()
      expect(localStorage.removeItem).toHaveBeenCalledWith('daggerdice_last_session_id')
    })

    it('should clear all session data', () => {
      clearSavedSessionData()
      expect(localStorage.removeItem).toHaveBeenCalledWith('daggerdice_player_name')
      expect(localStorage.removeItem).toHaveBeenCalledWith('daggerdice_last_session_id')
    })
  })
})