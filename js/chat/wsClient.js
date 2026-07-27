// frontend/js/chat/wsClient.js
// WebSocket-Client für FlareChat

let ws = null;

export function connectWebSocket(username) {
  if (!username) return;

  // Alte Verbindung schließen
  if (ws) {
    ws.close();
    ws = null;
  }

  // Neue Verbindung aufbauen (HTTP → WS Protokoll)
  const wsUrl = `wss://flarechatbackend.ju-labs.workers.dev/ws?username=${encodeURIComponent(username)}`;
  
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('🟢 WebSocket verbunden!');
    // Optional: Polling stoppen
    if (window.stopPolling) window.stopPolling();
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('📩 WebSocket Nachricht:', data);

      if (data.type === 'new_message') {
        // Nachricht im Chat anzeigen (rufe deine Funktion auf)
        if (window.addMessageToChat) {
          window.addMessageToChat(data.sender, data.text, null);
        }
      }
      if (data.type === 'new_group_message') {
        // Gruppen-Nachricht anzeigen
        if (window.addMessageToChat) {
          window.addMessageToChat(data.sender, data.text, null);
        }
      }
    } catch (e) {
      console.error('WebSocket Nachricht Fehler:', e);
    }
  };

  ws.onerror = (error) => {
    console.error('🔴 WebSocket Fehler:', error);
  };

  ws.onclose = () => {
    console.log('🔴 WebSocket getrennt. Polling wird fortgesetzt.');
    if (window.startPolling) window.startPolling();
    ws = null;
  };
}

export function closeWebSocket() {
  if (ws) {
    ws.close();
    ws = null;
  }
}
