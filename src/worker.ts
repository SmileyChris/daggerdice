// Cloudflare Worker for DaggerDice API and WebSocket relay using Durable Objects

import type { 
  ClientMessage, 
  ServerMessage
} from './session/types';

// Environment interface  
interface Env {
  ASSETS: Fetcher;
  SESSION_ROOMS: DurableObjectNamespace;
}

// Durable Object for managing WebSocket sessions
export class SessionDurableObject {
  private connections: Set<WebSocket> = new Set();
  private state: DurableObjectState;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    // Check if this is a WebSocket upgrade request
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 400 });
    }

    // Create WebSocket pair
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    server.accept();
    
    // Add this connection to the session
    this.connections.add(server);

    // Handle messages by relaying them to all other connections in the same session
    server.addEventListener('message', (event) => {
      try {
        const message: ClientMessage = JSON.parse(event.data as string);
        this.relayMessage(message, server);
      } catch (error) {
        console.error('Error handling message:', error);
      }
    });

    // Clean up on disconnect
    server.addEventListener('close', () => {
      this.connections.delete(server);
    });

    server.addEventListener('error', () => {
      this.connections.delete(server);
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  // Relay messages to all other connections in the same session
  private relayMessage(message: ClientMessage, senderWs: WebSocket): void {
    const messageStr = JSON.stringify(message);
    
    // Send to all connections in the session except the sender
    for (const ws of this.connections) {
      if (ws !== senderWs && ws.readyState === WebSocket.READY_STATE_OPEN) {
        try {
          ws.send(messageStr);
        } catch (error) {
          console.error('Error sending message to WebSocket:', error);
          // Remove broken connections
          this.connections.delete(ws);
        }
      }
    }
  }
}

// Main Worker fetch handler
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // Handle WebSocket connections for multiplayer sessions
    if (url.pathname.startsWith('/api/room/')) {
      const sessionIdMatch = url.pathname.match(/^\/api\/room\/([^\/]+)$/);
      
      if (!sessionIdMatch) {
        return new Response('Invalid session URL', { status: 400 });
      }
      
      const sessionId = sessionIdMatch[1];
      
      // Validate session ID format (6 alphanumeric characters)
      if (!/^[a-z0-9]{6}$/i.test(sessionId)) {
        return new Response('Invalid session ID format', { status: 400 });
      }
      
      // Get or create the Durable Object for this session
      const roomId = env.SESSION_ROOMS.idFromName(sessionId);
      const roomStub = env.SESSION_ROOMS.get(roomId);
      
      // Forward the request to the Durable Object
      return roomStub.fetch(request);
    }
    
    // For all other requests, serve static assets from the built application
    try {
      // Use the ASSETS binding to serve static files
      const response = await env.ASSETS.fetch(request);
      
      // If the response is a 404 and the request looks like a route (not a file),
      // serve the index.html for SPA routing
      if (response.status === 404 && !url.pathname.includes('.')) {
        const indexRequest = new Request(new URL('/', request.url), request);
        return await env.ASSETS.fetch(indexRequest);
      }
      
      return response;
    } catch (error) {
      console.error('Error serving assets:', error);
      // If asset serving fails completely, return a 404
      return new Response('File not found', { 
        status: 404,
        headers: {
          'Content-Type': 'text/plain'
        }
      });
    }
  }
};