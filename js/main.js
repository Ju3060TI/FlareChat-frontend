// frontend/js/main.js
// FlareChat - Einstiegspunkt mit WebSocket-Unterstützung

import { CONFIG } from './config.js';
import { apiFetch } from './api/client.js';
import { initTarnung } from './ui/tarnung.js';
import { initTabs } from './ui/tabs.js';
import { startPolling, stopPolling } from './chat/polling.js';
import { connectWebSocket, closeWebSocket } from './chat/wsClient.js';

// ============================================================
// STATE (Zustand, den wir im ganzen Frontend brauchen)
// ============================================================
const state = {
  username: localStorage.getItem('username') || null,
  avatarUrl: localStorage.getItem('avatar_url') || null,
  currentTab: 'friends',
  intervalId: null,
  clickCount: 0,
  wsConnected: false,
};

// ============================================================
// GLOBALE HELFER (für inline onclick in HTML und WebSocket)
// ============================================================
window.addMessageToChat = addMessageToChat;
window.stopPolling = () => {
  stopPolling(state);
  console.log('🛑 Polling gestoppt (WebSocket aktiv)');
};
window.startPolling = () => {
  startPolling(state, apiFetch, loadFriends, loadGroups, fetchNewMessages);
  console.log('▶️ Polling gestartet (WebSocket getrennt)');
};

// ============================================================
// LOGIN (D1-Login – bleibt vorerst erhalten)
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
    statusMsg.innerText = '✅ Erfolgreich eingeloggt!';
    showChat();
  } else {
    statusMsg.innerText = '❌ ' + (result?.message || 'Login fehlgeschlagen');
  }
}

// ============================================================
// CHAT STARTEN
// ============================================================
function showChat() {
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('chat-section').style.display = 'flex';
  document.getElementById('display-user').innerText = state.username;

  loadFriends();
  loadGroups();

  // WebSocket starten (falls verfügbar)
  connectWebSocket(state.username, {
    onOpen: () => {
      state.wsConnected = true;
      stopPolling(state); // Polling ausschalten
    },
    onClose: () => {
      state.wsConnected = false;
      startPolling(state, apiFetch, loadFriends, loadGroups, fetchNewMessages); // Polling als Fallback
    },
    onMessage: (data) => {
      // Nachricht vom Server via WebSocket
      if (data.type === 'new_message' || data.type === 'new_group_message') {
        // Prüfen, ob wir gerade in dem Chat sind
        const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
        const friendSelect = document.getElementById('friend-select');
        const groupSelect = document.getElementById('group-select');

        if (data.type === 'new_message') {
          // Nur anzeigen, wenn wir mit dem Absender chatten
          if (activeTab === 'friends' && friendSelect.value === data.sender) {
            addMessageToChat(data.sender, data.text, null);
          }
        } else {
          // Gruppen-Nachricht
          if (activeTab === 'groups' && groupSelect.value === data.groupId) {
            addMessageToChat(data.sender, data.text, null);
          }
        }
      }
    }
  });

  // Fallback: Polling starten (falls WebSocket nicht lädt)
  startPolling(state, apiFetch, loadFriends, loadGroups, fetchNewMessages);
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
            <button onclick="acceptRequest('${req.username}')">✅</button>
            <button onclick="declineRequest('${req.username}')">❌</button>
          </div>
        `;
        requestsList.appendChild(div);
      });
    } else {
      requestsArea.style.display = 'none';
    }
  }
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
}

// ============================================================
// NACHRICHTEN LADEN (Wird vom Polling aufgerufen)
// ============================================================
export async function fetchNewMessages() {
  // Wenn WebSocket aktiv ist, machen wir kein Polling
  if (state.wsConnected) return;

  const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
  const friendSelect = document.getElementById('friend-select');
  const groupSelect = document.getElementById('group-select');
  const chatBox = document.getElementById('chat-box');

  if (!chatBox) return;

  let messages = [];
  if (activeTab === 'friends') {
    const friend = friendSelect.value;
    if (!friend) return;
    const data = await apiFetch('/messages', 'POST', { myUsername: state.username, otherUsername: friend });
    if (data) messages = data;
  } else {
    const groupId = groupSelect.value;
    if (!groupId) return;
    const data = await apiFetch('/group-messages', 'POST', { groupId });
    if (data) messages = data;
  }

  const currentCount = chatBox.children.length;
  if (messages.length > currentCount) {
    messages.slice(currentCount).forEach(m => {
      addMessageToChat(m.sender, m.text, m.avatar_url);
    });
  }
}

// ============================================================
// NACHRICHT ANZEIGEN (Bubbles)
// ============================================================
function addMessageToChat(sender, text, avatarUrl) {
  const chatBox = document.getElementById('chat-box');
  if (!chatBox) return;

  const div = document.createElement('div');
  const isMe = sender === state.username;
  div.className = `msg ${isMe ? 'me' : 'other'}`;

  if (!avatarUrl) {
    avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(sender)}&background=ff4500&color=000`;
  }

  div.innerHTML = `
    <div class="msg-sender">
      <img src="${avatarUrl}" class="msg-avatar" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(sender)}&background=ff4500&color=000'">
      <strong>${sender}</strong>
    </div>
    <div class="msg-text">${text}</div>
  `;

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// ============================================================
// INIT (Wird beim Laden ausgeführt)
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  console.log('🔥 FlareChat gestartet');

  // Tarnung
  initTarnung();

  // Login-Button
  const loginBtn = document.getElementById('login-btn');
  if (loginBtn) loginBtn.addEventListener('click', handleLogin);

  // Enter-Taste für Login
  document.getElementById('password')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loginBtn?.click();
  });

  // Tabs
  initTabs();

  // Freund/Gruppe geändert → Chat leeren
  document.getElementById('friend-select')?.addEventListener('change', () => {
    const chatBox = document.getElementById('chat-box');
    if (chatBox) { chatBox.innerHTML = ''; fetchNewMessages(); }
  });
  document.getElementById('group-select')?.addEventListener('change', () => {
    const chatBox = document.getElementById('chat-box');
    if (chatBox) { chatBox.innerHTML = ''; fetchNewMessages(); }
  });
});

// ============================================================
// GLOBALE HELFER (für inline onclick in HTML)
// ============================================================
window.acceptRequest = async (username) => {
  await apiFetch('/respond-friend', 'POST', { myUsername: state.username, requesterUsername: username, accept: true });
  loadFriends();
};
window.declineRequest = async (username) => {
  await apiFetch('/respond-friend', 'POST', { myUsername: state.username, requesterUsername: username, accept: false });
  loadFriends();
};
