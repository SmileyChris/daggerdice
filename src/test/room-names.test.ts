import { describe, it, expect } from 'vitest';
import { 
  encodeNameV1, 
  decodeNameV1, 
  generateFriendlyName, 
  sessionIdToFriendlyName, 
  friendlyNameToSessionId,
  ADJECTIVES_V1,
  NOUNS_V1
} from '../session/room-names';

describe('Room Name Encoding', () => {
  describe('encodeNameV1 and decodeNameV1', () => {
    it('should encode and decode adjective-noun pairs correctly', () => {
      const code = encodeNameV1('brave', 'dragon');
      expect(code).toHaveLength(3);
      expect(code).toMatch(/^[0-9A-Z]{3}$/);
      
      const decoded = decodeNameV1(code);
      expect(decoded.word1).toBe('brave');
      expect(decoded.word2).toBe('dragon');
    });

    it('should encode and decode noun-noun pairs correctly', () => {
      const code = encodeNameV1('dragon', 'wizard');
      expect(code).toHaveLength(3);
      expect(code).toMatch(/^[0-9A-Z]{3}$/);
      
      const decoded = decodeNameV1(code);
      expect(decoded.word1).toBe('dragon');
      expect(decoded.word2).toBe('wizard');
    });

    it('should throw error for unknown words', () => {
      expect(() => encodeNameV1('unknown', 'dragon')).toThrow('Unknown word: unknown');
      expect(() => encodeNameV1('brave', 'unknown')).toThrow('Unknown noun: unknown');
    });

    it('should throw error for duplicate noun pairs', () => {
      expect(() => encodeNameV1('dragon', 'dragon')).toThrow('Duplicate noun-noun pair not allowed');
    });

    it('should throw error for invalid codes', () => {
      expect(() => decodeNameV1('!@#')).toThrow();
      expect(() => decodeNameV1('ZZZ')).toThrow();
    });
  });

  describe('generateFriendlyName', () => {
    it('should generate valid friendly names', () => {
      for (let i = 0; i < 10; i++) {
        const name = generateFriendlyName();
        expect(name).toMatch(/^[a-z]+-[a-z]+$/);
        
        const parts = name.split('-');
        expect(parts).toHaveLength(2);
        expect(ADJECTIVES_V1).toContain(parts[0]);
        expect(NOUNS_V1).toContain(parts[1]);
      }
    });
  });

  describe('sessionIdToFriendlyName and friendlyNameToSessionId', () => {
    it('should convert between session ID and friendly name', () => {
      const friendlyName = 'brave-dragon';
      const sessionId = friendlyNameToSessionId(friendlyName);
      expect(sessionId).toHaveLength(3);
      expect(sessionId).toMatch(/^[0-9A-Z]{3}$/);
      
      const backToFriendly = sessionIdToFriendlyName(sessionId);
      expect(backToFriendly).toBe(friendlyName);
    });

    it('should handle invalid friendly names', () => {
      expect(() => friendlyNameToSessionId('invalid')).toThrow('Invalid friendly name format');
      expect(() => friendlyNameToSessionId('unknown-word')).toThrow();
    });

    it('should return original ID for invalid session IDs', () => {
      const invalidId = '!@#';
      expect(sessionIdToFriendlyName(invalidId)).toBe(invalidId);
    });
  });

  describe('Word Lists', () => {
    it('should have exactly 80 adjectives', () => {
      expect(ADJECTIVES_V1).toHaveLength(80);
      expect(new Set(ADJECTIVES_V1)).toEqual(new Set(ADJECTIVES_V1)); // no duplicates
    });

    it('should have exactly 80 nouns', () => {
      expect(NOUNS_V1).toHaveLength(80);
      expect(new Set(NOUNS_V1)).toEqual(new Set(NOUNS_V1)); // no duplicates
    });

    it('should have all lowercase words', () => {
      ADJECTIVES_V1.forEach(adj => {
        expect(adj).toBe(adj.toLowerCase());
      });
      NOUNS_V1.forEach(noun => {
        expect(noun).toBe(noun.toLowerCase());
      });
    });
  });
});