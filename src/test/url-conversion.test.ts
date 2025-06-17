// URL conversion functionality tests
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sessionIdToFriendlyName } from '../session/room-names.js';

// Mock history API
const mockReplaceState = vi.fn();
Object.defineProperty(window, 'history', {
  value: {
    replaceState: mockReplaceState,
  },
  writable: true,
});

describe('URL Conversion Functionality', () => {
  beforeEach(() => {
    mockReplaceState.mockClear();
  });

  describe('sessionIdToFriendlyName', () => {
    it('should convert valid short codes to friendly names', () => {
      // Test the minimum valid code (000 = brave-dragon)
      const result000 = sessionIdToFriendlyName('000');
      expect(result000).not.toBe('000'); // Should be converted to a friendly name
      expect(result000).toMatch(/^[a-z]+-[a-z]+$/); // Should match word-word pattern

      // Test code 001 (brave-ranger)  
      const result001 = sessionIdToFriendlyName('001');
      expect(result001).not.toBe('001');
      expect(result001).toMatch(/^[a-z]+-[a-z]+$/);
    });

    it('should return original input for invalid codes', () => {
      // Use codes with characters not in Crockford alphabet that won't normalize
      const invalidCodes = ['@@@', '!!!', 'AB-', '12#'];
      
      invalidCodes.forEach(code => {
        const result = sessionIdToFriendlyName(code);
        // For invalid codes, should return the original input
        expect(result).toBe(code);
      });
    });

    it('should return friendly names unchanged', () => {
      const friendlyNames = ['brave-dragon', 'clever-wizard', 'mystic-knight'];
      
      friendlyNames.forEach(name => {
        const result = sessionIdToFriendlyName(name);
        expect(result).toBe(name);
      });
    });
  });

  describe('URL Conversion Logic', () => {
    it('should identify short codes correctly', () => {
      const shortCodePattern = /^[0-9A-Z]{3}$/i;
      
      // Valid short codes
      expect('ABC').toMatch(shortCodePattern);
      expect('123').toMatch(shortCodePattern);
      expect('A1B').toMatch(shortCodePattern);
      expect('abc').toMatch(shortCodePattern);
      
      // Invalid patterns
      expect('ABCD').not.toMatch(shortCodePattern);
      expect('AB').not.toMatch(shortCodePattern);
      expect('brave-dragon').not.toMatch(shortCodePattern);
      expect('ABC-123').not.toMatch(shortCodePattern);
    });

    it('should handle URL conversion scenarios', () => {
      // Simulate the URL conversion logic from dice-roller-main.ts
      const testScenarios = [
        {
          name: 'Short code in non-streamer mode',
          urlSessionId: '000',
          streamerMode: false,
          shouldConvert: true,
        },
        {
          name: 'Short code in streamer mode',
          urlSessionId: 'ABC',
          streamerMode: true,
          shouldConvert: false, // Should not convert in streamer mode
        },
        {
          name: 'Friendly name in non-streamer mode',
          urlSessionId: 'brave-dragon',
          streamerMode: false,
          shouldConvert: false, // Already friendly, no conversion needed
        },
        {
          name: 'Invalid format',
          urlSessionId: 'INVALID_FORMAT',
          streamerMode: false,
          shouldConvert: false,
        },
      ];

      testScenarios.forEach(({ name, urlSessionId, streamerMode, shouldConvert }) => {
        // Simulate the conversion logic
        const isShortCode = /^[0-9A-Z]{3}$/i.test(urlSessionId);
        const shouldAttemptConversion = !streamerMode && isShortCode;
        
        if (shouldAttemptConversion) {
          const friendlyName = sessionIdToFriendlyName(urlSessionId);
          const actuallyConverted = friendlyName !== urlSessionId;
          
          if (shouldConvert) {
            expect(actuallyConverted, `${name}: Should have converted`).toBe(true);
          }
        }
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty or null inputs gracefully', () => {
      // Empty string decodes to 0, which maps to 'brave-dragon'
      const emptyResult = sessionIdToFriendlyName('');
      expect(emptyResult).toBe('brave-dragon');
      
      // Space string should fail validation and return original
      const spaceResult = sessionIdToFriendlyName('   ');
      expect(spaceResult).toBe('   ');
    });

    it('should preserve case sensitivity appropriately', () => {
      const mixedCaseCodes = ['abc', 'ABC', 'AbC'];
      
      mixedCaseCodes.forEach(code => {
        const result = sessionIdToFriendlyName(code);
        // Result should be lowercase friendly name format or original
        if (result !== code && result.includes('-')) {
          expect(result).toMatch(/^[a-z]+-[a-z]+$/);
        }
      });
    });
  });
});