// frontend/js/chat/wsClient.js
// WebSocket-Client mit Raum-Unterstützung für Durable Objects

import { setWebSocketStatus } from './polling.js';

let ws = null;
let reconnectTimer = null;
let username = null;
let currentRoom = null;
let callbacks = {};

/**
 * Baut eine WebSocket-Verbindung zu einem bestimmten Raum auf.
 * @param {string} user - Der eingeloggte Username
 * @param {string} roomName - Der Chat-Raum (z.B. 'dm_user1_user2' oder 'group_123')
 * @param {object} cb - Callback-Funktionen (onMessage, onOpen, onClose)
 */
export function connectWebSocket(user, roomName, cb = {}) {
  username = user;
  currentRoom = roomName;
  callbacks = cb;

  if (!roomName) {
    console.warn('⚠️ Kein Raumname angegeben, WebSocket wird nicht verbunden.');
    return;
  }

  // Falls bereits eine Verbindung offen ist, schließen
  if (ws) {
    ws.close();
    ws = null;
  }

  // WebSocket-URL mit Raum und Nutzer
  const wsUrl = `wss://flarechatbackend.ju-labs.workers.dev/ws?room=${encodeURIComponent(roomName)}&username=${encodeURIComponent(user)}`;
  
  try {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log(`🟢 WebSocket verbunden (Raum: ${roomName})`);
      setWebSocketStatus(true);
      if (callbacks.onOpen) callbacks.onOpen();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📩 WebSocket Nachricht:', data);

        if (callbacks.onMessage) {
          callbacks.onMessage(data);
        }
      } catch (e) {
        console.error('WebSocket Parsing-Fehler:', e);
      }
    };

    ws.onerror = (error) => {
      console.error('🔴 WebSocket Fehler:', error);
    };

    ws.onclose = (event) => {
      console.log(`🔴 WebSocket getrennt (Code: ${event.code}). Polling wird aktiviert.`);
      setWebSocketStatus(false);

      if (callbacks.onClose) callbacks.onClose();

      if (event.code !== 1000) {
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => {
          console.log('🔄 Versuche WebSocket-Neuverbindung...');
          connectWebSocket(username, currentRoom, callbacks);
        }, 5000);
      }
    };

  } catch (error) {
    console.error('WebSocket Initialisierungsfehler:', error);
    setWebSocketStatus(false);
  }
}

/**
 * Raum wechseln (ohne manuelles Schließen)
 */
export function switchRoom(newRoomName) {
  if (currentRoom === newRoomName) return;
  currentRoom = newRoomName;
  if (ws) {
    connectWebSocket(username, newRoomName, callbacks);
  }
}

/**
 * Schließt die WebSocket-Verbindung manuell.
 */
export function closeWebSocket() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    ws.close(1000);
    ws = null;
  }
  setWebSocketStatus(false);
}
