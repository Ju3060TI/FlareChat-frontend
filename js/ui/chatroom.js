// src/chat-room.js
// Durable Object für einen einzelnen Chat-Raum (DM oder Gruppe)

/**
 * ChatRoom – Durable Object für einen Chat-Raum
 * 
 * Jede Instanz repräsentiert einen Raum (z.B. DM zwischen zwei Nutzern
 * oder eine Gruppe) und verwaltet:
 * - WebSocket-Verbindungen der Teilnehmer
 * - Nachrichtenverlauf (in SQLite)
 * - Broadcast von Nachrichten an alle Teilnehmer
 */
export class ChatRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map(); // username -> WebSocket
    this.roomId = state.id.toString();
  }

  /**
   * Haupt-Entry-Point für Anfragen an das DO
   */
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    // --- WebSocket-Handshake ---
    if (path === '/ws') {
      const username = url.searchParams.get('username');
      if (!username) {
        return new Response('Missing username', { status: 400 });
      }

      // WebSocket-Pair erstellen
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      // Server-WebSocket akzeptieren
      this.state.acceptWebSocket(server);
      this.sessions.set(username, server);

      console.log(`🟢 [Room ${this.roomId}] ${username} connected`);

      // Alle anderen im Raum informieren
      this.broadcast({
        type: 'user_joined',
        username: username,
        timestamp: Date.now()
      }, username);

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    // --- Nachrichtenverlauf abrufen ---
    if (path === '/messages' && request.method === 'GET') {
      const messages = await this.state.storage.get('messages') || [];
      return new Response(JSON.stringify(messages), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not found', { status: 404 });
  }

  /**
   * Wird aufgerufen, wenn eine WebSocket-Nachricht eintrifft
   */
  async webSocketMessage(ws, message) {
    try {
      const data = JSON.parse(message);
      
      // Nachricht speichern
      const messages = await this.state.storage.get('messages') || [];
      const newMessage = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        sender: data.sender || 'unknown',
        text: data.text,
        timestamp: Date.now(),
        type: data.type || 'text'
      };
      
      messages.push(newMessage);
      
      // Nur die letzten 1000 Nachrichten behalten
      if (messages.length > 1000) {
        messages.splice(0, messages.length - 1000);
      }
      await this.state.storage.put('messages', messages);

      // An alle im Raum broadcasten (außer Sender)
      this.broadcast({
        type: 'new_message',
        ...newMessage
      }, data.sender);

    } catch (error) {
      console.error('Fehler beim Verarbeiten der Nachricht:', error);
    }
  }

  /**
   * Broadcast an alle verbundenen Clients (außer optionalem Sender)
   */
  broadcast(data, excludeSender = null) {
    const message = JSON.stringify(data);
    for (const [username, ws] of this.sessions) {
      if (username === excludeSender) continue;
      try {
        ws.send(message);
      } catch (e) {
        console.error(`Broadcast an ${username} fehlgeschlagen:`, e);
      }
    }
  }

  /**
   * Wird aufgerufen, wenn eine Verbindung geschlossen wird
   */
  async webSocketClose(ws, code, reason, wasClean) {
    let disconnectedUser = null;
    for (const [username, session] of this.sessions) {
      if (session === ws) {
        disconnectedUser = username;
        break;
      }
    }
    
    if (disconnectedUser) {
      this.sessions.delete(disconnectedUser);
      console.log(`🔴 [Room ${this.roomId}] ${disconnectedUser} disconnected`);
      
      // Andere im Raum informieren
      this.broadcast({
        type: 'user_left',
        username: disconnectedUser,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Wird aufgerufen, wenn eine WebSocket-Verbindung einen Fehler hat
   */
  async webSocketError(ws, error) {
    console.error(`⚠️ [Room ${this.roomId}] WebSocket error:`, error);
    // Fehlerhafte Verbindung entfernen
    for (const [username, session] of this.sessions) {
      if (session === ws) {
        this.sessions.delete(username);
        break;
      }
    }
  }
}
