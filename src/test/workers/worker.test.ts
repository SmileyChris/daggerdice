import { describe, it, expect } from 'vitest';
import { SELF } from 'cloudflare:test';
import worker from '../../worker';

describe('Worker Integration Tests', () => {
  describe('Static Asset Serving', () => {
    it('should serve index.html for root path', async () => {
      const response = await SELF.fetch('https://example.com/');
      expect(response.status).toBe(200);
    });

    it('should handle SPA routing by serving index.html for unknown routes', async () => {
      const response = await SELF.fetch('https://example.com/room/ABC123');
      expect(response.status).toBe(200);
    });

    it('should handle 404 for actual files that do not exist', async () => {
      const response = await SELF.fetch('https://example.com/nonexistent.js');
      expect(response.status).toBe(404);
    });
  });

  describe('WebSocket API Endpoints', () => {
    it('should reject non-WebSocket requests to API endpoints', async () => {
      const response = await SELF.fetch('https://example.com/api/room/ABC123');
      expect(response.status).toBe(400);
      expect(await response.text()).toBe('Expected WebSocket');
    });

    it('should validate session ID format', async () => {
      // Test invalid session IDs
      const invalidIds = ['ABC12', 'ABC1234', 'ABC-12', '123!@#'];
      
      for (const invalidId of invalidIds) {
        const response = await SELF.fetch(`https://example.com/api/room/${invalidId}`);
        expect(response.status).toBe(400);
        expect(await response.text()).toBe('Invalid session ID format');
      }
    });

    it('should accept valid session ID format', async () => {
      // Valid session IDs should get through format validation
      // but will fail at WebSocket upgrade check
      const validIds = ['ABC123', 'abc123', '123456', 'ABCDEF'];
      
      for (const validId of validIds) {
        const response = await SELF.fetch(`https://example.com/api/room/${validId}`);
        expect(response.status).toBe(400); // Should fail at WebSocket check, not format
        expect(await response.text()).toBe('Expected WebSocket');
      }
    });

    it('should reject malformed API URLs', async () => {
      const response = await SELF.fetch('https://example.com/api/room/');
      expect(response.status).toBe(400);
      expect(await response.text()).toBe('Invalid session URL');
    });
  });

  describe('Worker Fetch Handler Unit Tests', () => {
    it('should handle errors gracefully when asset serving fails', async () => {
      // Create a request that might cause asset serving to fail
      const request = new Request('https://example.com/test');
      const env = {
        ASSETS: {
          fetch: () => {
            throw new Error('Asset serving failed');
          }
        },
        SESSION_ROOMS: {} as DurableObjectNamespace
      } as Env;
      
      const response = await worker.fetch(request, env, {} as ExecutionContext);
      expect(response.status).toBe(404);
      expect(await response.text()).toBe('File not found');
      expect(response.headers.get('Content-Type')).toBe('text/plain');
    });
  });
});