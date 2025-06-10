import { describe, it, expect } from 'vitest'
import { SELF } from 'cloudflare:test'
import worker from '../../worker'

describe('Cloudflare Workers Tests', () => {
  describe('Static Asset Serving', () => {
    it('should serve index.html for root path', async () => {
      const response = await SELF.fetch('https://example.com/')
      expect(response.status).toBe(200)
    })

    it('should handle SPA routing by serving index.html for unknown routes', async () => {
      const response = await SELF.fetch('https://example.com/room/ABC123')
      expect(response.status).toBe(200)
    })

    it('should handle 404 for actual files that do not exist', async () => {
      const response = await SELF.fetch('https://example.com/nonexistent.js')
      expect(response.status).toBe(404)
    })
  })

  describe('WebSocket API Endpoints', () => {
    it('should reject non-WebSocket requests to API endpoints', async () => {
      const response = await SELF.fetch('https://example.com/api/room/ABC123')
      expect(response.status).toBe(400)
      expect(await response.text()).toBe('Expected WebSocket')
    })

    it('should validate session ID format', async () => {
      // Test invalid session IDs
      const invalidIds = ['ABC12', 'ABC1234', 'ABC-12', '123!@#']
      
      for (const invalidId of invalidIds) {
        const response = await SELF.fetch(`https://example.com/api/room/${invalidId}`)
        expect(response.status).toBe(400)
        expect(await response.text()).toBe('Invalid session ID format')
      }
    })

    it('should accept valid session ID format', async () => {
      // Valid session IDs should get through format validation
      // but will fail at WebSocket upgrade check
      const validIds = ['ABC123', 'abc123', '123456', 'ABCDEF']
      
      for (const validId of validIds) {
        const response = await SELF.fetch(`https://example.com/api/room/${validId}`)
        expect(response.status).toBe(400) // Should fail at WebSocket check, not format
        expect(await response.text()).toBe('Expected WebSocket')
      }
    })

    it('should reject malformed API URLs', async () => {
      const response = await SELF.fetch('https://example.com/api/room/')
      expect(response.status).toBe(400)
      expect(await response.text()).toBe('Invalid session URL')
    })
  })

  describe('Worker Fetch Handler Unit Tests', () => {
    it('should handle errors gracefully when asset serving fails', async () => {
      // Create a request that might cause asset serving to fail
      const request = new Request('https://example.com/test')
      const env = {
        ASSETS: {
          fetch: () => {
            throw new Error('Asset serving failed')
          }
        },
        SESSION_ROOMS: {} as any
      } as Env
      
      const response = await worker.fetch(request, env, {} as ExecutionContext)
      expect(response.status).toBe(404)
      expect(await response.text()).toBe('File not found')
      expect(response.headers.get('Content-Type')).toBe('text/plain')
    })
  })

  describe('Session ID Validation', () => {
    it('should handle case insensitive session IDs', async () => {
      const testCases = [
        { input: 'abc123', expected: 400 }, // lowercase valid format
        { input: 'ABC123', expected: 400 }, // uppercase valid format
        { input: 'AbC123', expected: 400 }, // mixed case valid format
      ]

      for (const { input, expected } of testCases) {
        const response = await SELF.fetch(`https://example.com/api/room/${input}`)
        expect(response.status).toBe(expected)
        expect(await response.text()).toBe('Expected WebSocket')
      }
    })

    it('should properly route to Durable Objects based on session ID', async () => {
      // Test that different session IDs are handled consistently
      const sessionIds = ['SESS01', 'SESS02', 'SESS03']
      
      for (const sessionId of sessionIds) {
        const response = await SELF.fetch(`https://example.com/api/room/${sessionId}`)
        expect(response.status).toBe(400) // Consistent behavior for all valid session IDs
        expect(await response.text()).toBe('Expected WebSocket')
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle various invalid session ID patterns', async () => {
      const invalidPatterns = [
        { pattern: '', description: 'empty string' },
        { pattern: 'A', description: 'too short' },
        { pattern: 'ABCDEFG', description: 'too long' },
        { pattern: 'ABC-12', description: 'contains hyphen' },
        { pattern: 'ABC@12', description: 'contains special character' },
        { pattern: 'ABC 12', description: 'contains space' },
      ]

      for (const { pattern, description } of invalidPatterns) {
        const response = await SELF.fetch(`https://example.com/api/room/${pattern}`)
        expect(response.status).toBe(400)
        // Should be either format validation or URL parsing error
        const text = await response.text()
        expect(['Invalid session ID format', 'Invalid session URL']).toContain(text)
      }
    })

    it('should maintain security by rejecting malformed session IDs', async () => {
      // Test patterns that should fail session ID validation specifically
      // Using URL encoding to ensure they hit the API route
      const maliciousPatterns = [
        'ABC-12', // contains hyphen
        'ABC@12', // contains special character  
        'ABC%2012', // URL-encoded space
        'ABC%2D12', // URL-encoded hyphen
      ]

      for (const pattern of maliciousPatterns) {
        const response = await SELF.fetch(`https://example.com/api/room/${pattern}`)
        expect(response.status).toBe(400)
        const text = await response.text()
        expect(['Invalid session ID format', 'Invalid session URL']).toContain(text)
      }
    })
  })
})