// frontend/js/chat/wsClient.js
// WebSocket-Client mit automatischem Fallback auf Polling

// ✅ Import aus demselben Ordner
import { setWebSocketStatus } from './polling.js';

let ws = null;
let reconnectTimer = null;
let username = null;
let callbacks = {};

/**
 * Baut eine WebSocket-Verbindung auf.
 * @param {string} user - Der eingeloggte Username
 * @param {object} cb - Callback-Funktionen (onMessage, onOpen, onClose)
 */
export function connectWebSocket(user, cb = {}) {
  username = user;
  callbacks = cb;

  // Falls bereits eine Verbindung offen ist, schließen
  if (ws) {
    ws.close();
    ws = null;
  }

  // WebSocket-URL aufbauen (wss:// für HTTPS)
  const wsUrl = `wss://flarechatbackend.ju-labs.workers.dev/ws?username=${encodeURIComponent(user)}`;
  
  try {
    ws = new WebSocket(wsUrl);

    // ============================================================
    // ON OPEN - Verbindung erfolgreich
    // ============================================================
    ws.onopen = () => {
      console.log('🟢 WebSocket verbunden!');
      setWebSocketStatus(true); // Polling stoppen
      if (callbacks.onOpen) callbacks.onOpen();
    };

    // ============================================================
    // ON MESSAGE - Neue Nachricht vom Server
    // ============================================================
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

    // ============================================================
    // ON ERROR - Verbindungsfehler
    // ============================================================
    ws.onerror = (error) => {
      console.error('🔴 WebSocket Fehler:', error);
      // Bei Fehler nicht sofort schließen, sondern abwarten
    };

    // ============================================================
    // ON CLOSE - Verbindung getrennt (startet Fallback)
    // ============================================================
    ws.onclose = (event) => {
      console.log(`🔴 WebSocket getrennt (Code: ${event.code}). Polling wird aktiviert.`);
      setWebSocketStatus(false); // Polling starten

      if (callbacks.onClose) callbacks.onClose();

      // Versuche nach 5 Sekunden erneut zu verbinden (falls nicht manuell geschlossen)
      if (event.code !== 1000) { // 1000 = normaler Close
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => {
          console.log('🔄 Versuche WebSocket-Neuverbindung...');
          connectWebSocket(username, callbacks);
        }, 5000); // 5 Sekunden warten
      }
    };

  } catch (error) {
    console.error('WebSocket Initialisierungsfehler:', error);
    setWebSocketStatus(false); // Fallback auf Polling
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
    ws.close(1000); // 1000 = Normaler, sauberer Close
    ws = null;
  }
  setWebSocketStatus(false);
}
