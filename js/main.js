// js/main.js
// FlareChat - Hauptsteuerung mit WebSocket, Polling und Durable Object-Räumen

import { CONFIG } from './config.js';
import { apiFetch } from './api/client.js';
import { initTarnung } from './ui/tarnung.js';
import { initTabs } from './ui/tabs.js';
import { 
  displayMessage, 
  clearChatBox, 
  displaySystemMessage, 
  updateRoomTitle,
  renderMessageHistory,
  getCurrentRoomName
} from './ui/chatroom.js';

import { startPolling, stopPolling, setWebSocketStatus } from './chat/polling.js';
import { connectWebSocket, closeWebSocket, switchRoom } from './chat/wsClient.js';
import { sendMessage, addMessageToChat, fetchNewMessages, handleWebSocketMessage } from './chat/messages.js';

// ============================================================
// GLOBALER STATE
// ============================================================
const state = {
  username: localStorage.getItem('username') || null,
  avatarUrl: localStorage.getItem('avatar_url') || null,
  currentTab: 'friends',
  intervalId: null,
  clickCount: 0,
  wsConnected: false,
};

// Globale WebSocket-Referenz für messages.js
window.ws = null;

// Globale Funktionen für Polling und UI
window.displayMessage = (sender, text, avatarUrl) => displayMessage(sender, text, avatarUrl, state.username);
window.clearChatBox = clearChatBox;
window.displaySystemMessage = displaySystemMessage;
window.updateRoomTitle = updateRoomTitle;
window.renderMessageHistory = renderMessageHistory;
window.loadFriends = loadFriends;
window.loadGroups = loadGroups;
window.fetchNewMessages = () => fetchNewMessages(state);

// ============================================================
// WEBSOCKET-RAUM AKTUALISIEREN
// ============================================================
function updateWebSocketRoom() {
  const roomName = getCurrentRoomName(state);
  if (!roomName) {
    if (window.ws) {
      closeWebSocket();
      window.ws = null;
      state.wsConnected = false;
    }
    return;
  }

  // Raum-Titel aktualisieren (UI)
  const displayName = roomName.startsWith('dm_') 
    ? roomName.replace('dm_', '').replace('_', ' & ') 
    : roomName.replace('group_', 'Gruppe: ');
  updateRoomTitle(displayName);

  if (window.ws && window.ws.readyState === WebSocket.OPEN) {
    switchRoom(roomName);
  } else {
    connectWebSocket(state.username, roomName, {
      onOpen: () => {
        console.log('✅ WebSocket aktiv - Polling pausiert');
        state.wsConnected = true;
        window.ws = ws;
      },
      onClose: () => {
        console.log('⚠️ WebSocket getrennt - Polling übernimmt');
        state.wsConnected = false;
        window.ws = null;
      },
      onMessage: (data) => handleWebSocketMessage(data, state)
    });
  }
}

// ============================================================
// LOGIN
// ============================================================
async function handleLogin() {
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const statusMsg = document.getElementById('status-msg');

  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username || !password) {
    statusMsg.innerText = '❌ Bitte Username und Passwort eingeben!';
    return;
  }

  statusMsg.innerText = '⏳ Einloggen...';
  const result = await apiFetch('/login', 'POST', { username, password });

  if (result && result.success) {
    state.username = username;
    localStorage.setItem('username', username);
    if (result.avatar_url) {
      state.avatarUrl = result.avatar_url;
      localStorage.setItem('avatar_url', result.avatar_url);
    }
    statusMsg.innerText = '✅ Erfolgreich eingeloggt!';
    showChat();
  } else {
    statusMsg.innerText = '❌ ' + (result?.message || 'Login fehlgeschlagen');
  }
}

// ============================================================
// REGISTRIERUNG
// ============================================================
async function handleRegister() {
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const statusMsg = document.getElementById('status-msg');

  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username || !password) {
    statusMsg.innerText = '❌ Bitte Username und Passwort eingeben!';
    return;
  }
  if (username.length < 3 || username.length > 20) {
    statusMsg.innerText = '❌ Username muss 3-20 Zeichen lang sein!';
    return;
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
    statusMsg.innerText = '❌ Ungültige Zeichen im Username!';
    return;
  }

  statusMsg.innerText = '⏳ Registriere...';
  const result = await apiFetch('/register', 'POST', { username, password });

  if (result && result.success) {
    statusMsg.innerText = '✅ Registrierung erfolgreich! Jetzt einloggen.';
  } else {
    statusMsg.innerText = '❌ ' + (result?.message || 'Registrierung fehlgeschlagen');
  }
}

// ============================================================
// CHAT ANSICHT ANZEIGEN
// ============================================================
function showChat() {
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('chat-section').style.display = 'flex';
  document.getElementById('display-user').innerText = state.username;

  window.loadFriends = loadFriends;
  window.loadGroups = loadGroups;
  window.fetchNewMessages = () => fetchNewMessages(state);

  loadFriends();
  loadGroups();

  const roomName = getCurrentRoomName(state);
  if (roomName) {
    connectWebSocket(state.username, roomName, {
      onOpen: () => {
        console.log('✅ WebSocket aktiv - Polling pausiert');
        state.wsConnected = true;
        window.ws = ws;
      },
      onClose: () => {
        console.log('⚠️ WebSocket getrennt - Polling übernimmt');
        state.wsConnected = false;
        window.ws = null;
      },
      onMessage: (data) => handleWebSocketMessage(data, state)
    });
  }

  startPolling();
}

// ============================================================
// FREUNDE LADEN
// ============================================================
async function loadFriends() {
  const username = state.username;
  if (!username) return;

  const data = await apiFetch('/friends', 'POST', { username });
  if (!data) return;

  const friendSelect = document.getElementById('friend-select');
  const currentSelection = friendSelect.value;
  friendSelect.innerHTML = '<option value="">Freund auswählen...</option>';

  data.friends?.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.username;
    opt.innerText = f.username;
    friendSelect.appendChild(opt);
  });

  if (currentSelection) {
    const exists = [...friendSelect.options].some(o => o.value === currentSelection);
    if (exists) friendSelect.value = currentSelection;
  }

  const requestsList = document.getElementById('requests-list');
  const requestsArea = document.getElementById('requests-area');
  if (requestsList && requestsArea) {
    requestsList.innerHTML = '';
    if (data.requests?.length > 0) {
      requestsArea.style.display = 'block';
      data.requests.forEach(req => {
        const div = document.createElement('div');
        div.innerHTML = `
          <span>${req.username}</span>
          <div>
            <button onclick="acceptRequest('${req.username}')" style="background:transparent;border:1px solid #00ff00;color:#00ff00;border-radius:25px;padding:2px 8px;cursor:pointer;">✅</button>
            <button onclick="declineRequest('${req.username}')" style="background:transparent;border:1px solid #ff0000;color:#ff0000;border-radius:25px;padding:2px 8px;cursor:pointer;">❌</button>
          </div>
        `;
        requestsList.appendChild(div);
      });
    } else {
      requestsArea.style.display = 'none';
    }
  }

  updateWebSocketRoom();
}

// ============================================================
// GRUPPEN LADEN
// ============================================================
async function loadGroups() {
  const username = state.username;
  if (!username) return;

  const data = await apiFetch('/my-groups', 'POST', { username });
  if (!data) return;

  const groupSelect = document.getElementById('group-select');
  const currentSelection = groupSelect.value;
  groupSelect.innerHTML = '<option value="">Gruppe auswählen...</option>';

  data.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g.id;
    opt.innerText = `${g.name} (${g.id})`;
    groupSelect.appendChild(opt);
  });

  if (currentSelection) {
    const exists = [...groupSelect.options].some(o => o.value === currentSelection);
    if (exists) groupSelect.value = currentSelection;
  }

  updateWebSocketRoom();
}

// ============================================================
// FREUND HINZUFÜGEN
// ============================================================
async function addFriend() {
  const input = document.getElementById('add-input');
  const friendUsername = input.value.trim();
  if (!friendUsername) {
    alert('Bitte einen Usernamen eingeben!');
    return;
  }

  const result = await apiFetch('/add-friend', 'POST', {
    myUsername: state.username,
    friendUsername: friendUsername
  });

  if (result === 'OK' || result?.success) {
    alert('✅ Freundschaftsanfrage gesendet!');
    input.value = '';
    loadFriends();
  } else {
    alert('❌ Fehler: ' + (result?.message || result || 'Unbekannter Fehler'));
  }
}

// ============================================================
// FRIEND REQUESTS
// ============================================================
window.acceptRequest = async (username) => {
  await apiFetch('/respond-friend', 'POST', {
    myUsername: state.username,
    requesterUsername: username,
    accept: true
  });
  loadFriends();
};

window.declineRequest = async (username) => {
  await apiFetch('/respond-friend', 'POST', {
    myUsername: state.username,
    requesterUsername: username,
    accept: false
  });
  loadFriends();
};

// ============================================================
// LOGOUT / TARNUNG
// ============================================================
function handleLogout() {
  console.log('🕵️ Logout / Tarnung wird aktiviert...');
  
  // WebSocket schließen
  closeWebSocket();
  stopPolling();
  state.wsConnected = false;
  window.ws = null;

  // Tarnung anzeigen (ruft showTarnung auf)
  if (typeof window.showTarnung === 'function') {
    window.showTarnung();
  } else {
    // Fallback: direkt die Elemente ansprechen
    const tarnung = document.getElementById('tarnung');
    const appBox = document.getElementById('app-box');
    if (tarnung) {
      tarnung.style.display = 'flex';
      tarnung.style.zIndex = '9999';
    }
    if (appBox) {
      appBox.style.display = 'none';
      appBox.classList.remove('active');
    }
  }
}

// ============================================================
// SETTINGS
// ============================================================
function openSettings() {
  document.getElementById('settings-popup').style.display = 'block';
  document.getElementById('new-username').value = state.username || '';
  document.getElementById('new-avatar').value = state.avatarUrl || '';
}

function closeSettings() {
  document.getElementById('settings-popup').style.display = 'none';
}

async function saveSettings() {
  const newUsername = document.getElementById('new-username').value.trim();
  const newAvatar = document.getElementById('new-avatar').value.trim();
  const statusMsg = document.getElementById('settings-status');

  if (newUsername && newUsername !== state.username) {
    statusMsg.innerText = '⚠️ Username-Änderung noch nicht implementiert.';
    return;
  }

  if (newAvatar) {
    state.avatarUrl = newAvatar;
    localStorage.setItem('avatar_url', newAvatar);
    statusMsg.innerText = '✅ Avatar aktualisiert!';
  }

  closeSettings();
}

// ============================================================
// EVENT-LISTENER
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  console.log('🔥 FlareChat gestartet');

  // Tarnung initialisieren
  initTarnung();

  // Login-Button
  const loginBtn = document.getElementById('login-btn');
  if (loginBtn) loginBtn.addEventListener('click', handleLogin);

  // Register-Button
  const registerBtn = document.getElementById('register-btn');
  if (registerBtn) registerBtn.addEventListener('click', handleRegister);

  // Enter-Taste für Login
  document.getElementById('password')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loginBtn?.click();
  });
  document.getElementById('username')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loginBtn?.click();
  });

  // Tabs initialisieren
  initTabs();

  // Freundeswechsel → Raum wechseln
  document.getElementById('friend-select')?.addEventListener('change', () => {
    clearChatBox();
    fetchNewMessages(state);
    updateWebSocketRoom();
  });

  // Gruppenwechsel → Raum wechseln
  document.getElementById('group-select')?.addEventListener('change', () => {
    clearChatBox();
    fetchNewMessages(state);
    updateWebSocketRoom();
  });

  // Freund hinzufügen
  document.getElementById('action-btn')?.addEventListener('click', addFriend);

  // Senden-Button
  const sendBtn = document.getElementById('send-btn');
  const msgInput = document.getElementById('msg-input');

  if (sendBtn && msgInput) {
    sendBtn.addEventListener('click', async function () {
      const text = msgInput.value.trim();
      if (!text) return;

      const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
      const friendSelect = document.getElementById('friend-select');
      const groupSelect = document.getElementById('group-select');

      if (activeTab === 'friends') {
        const receiver = friendSelect.value;
        if (!receiver || receiver === '') {
          alert('Bitte erst einen Freund auswählen!');
          return;
        }
        await sendMessage(text, receiver, 'friend', state);
      } else {
        const groupId = groupSelect.value;
        if (!groupId || groupId === '') {
          alert('Bitte erst eine Gruppe auswählen!');
          return;
        }
        await sendMessage(text, groupId, 'group', state);
      }

      msgInput.value = '';
    });

    msgInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendBtn.click();
      }
    });
  }

  // Logout / Tarnung
  document.getElementById('logout-btn')?.addEventListener('click', handleLogout);

  // Settings
  document.getElementById('settings-btn')?.addEventListener('click', openSettings);
  document.getElementById('close-settings')?.addEventListener('click', closeSettings);
  document.getElementById('save-settings')?.addEventListener('click', saveSettings);

  // Emoji-Buttons
  document.querySelectorAll('.emoji-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById('msg-input');
      if (input) {
        input.value += btn.textContent;
        input.focus();
      }
    });
  });

  // Bild-Button
  document.getElementById('image-btn')?.addEventListener('click', () => {
    document.getElementById('file-input')?.click();
  });

  // Prüfen, ob bereits eingeloggt
  if (state.username) {
    showChat();
  }
});

// ============================================================
// EXPORTS (für Tests / Debugging)
// ============================================================
export { state, updateWebSocketRoom };
