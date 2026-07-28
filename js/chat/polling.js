// frontend/js/chat/polling.js
// Intelligenter Polling-Manager mit Verbindungs-Wiederherstellung

let intervalId = null;
let isWebSocketActive = false;

/**
 * Setzt den WebSocket-Status (wird von wsClient.js aufgerufen)
 */
export function setWebSocketStatus(active) {
  isWebSocketActive = active;
  if (active) {
    stopPolling(); // WebSocket ist da -> Polling stoppen
  } else {
    startPolling(); // WebSocket weg -> Polling starten (falls nötig)
  }
}

/**
 * Startet den Polling-Timer (nur, wenn kein WebSocket aktiv ist)
 */
export function startPolling() {
  // Wenn WebSocket aktiv ist, machen wir kein Polling
  if (isWebSocketActive) {
    console.log('⏸️ Polling pausiert (WebSocket aktiv)');
    return;
  }

  // Falls bereits ein Timer läuft, stoppe ihn erst (um Doppelungen zu vermeiden)
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }

  console.log('▶️ Polling gestartet (350ms) - Fallback-Modus');

  intervalId = setInterval(() => {
    const chatBox = document.getElementById('chat-box');
    const isChatOpen = chatBox && chatBox.style.display !== 'none' && chatBox.children.length > 0;

    if (isChatOpen) {
      // Wird von main.js als globale Funktion bereitgestellt
      if (typeof window.fetchNewMessages === 'function') {
        window.fetchNewMessages();
      }
    } else {
      if (typeof window.loadFriends === 'function') {
        window.loadFriends();
      }
      if (typeof window.loadGroups === 'function') {
        window.loadGroups();
      }
    }
  }, 350);
}

/**
 * Stoppt den Polling-Timer komplett
 */
export function stopPolling() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('🛑 Polling gestoppt');
  }
}

/**
 * Prüft, ob Polling gerade läuft (für Debugging)
 */
export function isPollingActive() {
  return intervalId !== null;
}
