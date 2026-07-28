// frontend/js/main.js
// FlareChat - Einstiegspunkt mit WebSocket & Polling

import { CONFIG } from './config.js';
import { apiFetch } from './api/client.js';
import { initTarnung } from './ui/tarnung.js';
import { initTabs } from './ui/tabs.js';

import { startPolling, stopPolling, setWebSocketStatus } from './chat/polling.js';
import { connectWebSocket, closeWebSocket } from './chat/wsClient.js';
import { sendMessage, addMessageToChat, fetchNewMessages, handleWebSocketMessage } from './chat/messages.js';

const state = {
  username: localStorage.getItem('username') || null,
  avatarUrl: localStorage.getItem('avatar_url') || null,
  currentTab: 'friends',
  intervalId: null,
  clickCount: 0,
  wsConnected: false,
};

window.addMessageToChat = (sender, text, avatarUrl) => addMessageToChat(sender, text, avatarUrl, state);
window.loadFriends = loadFriends;
window.loadGroups = loadGroups;
window.fetchNewMessages = () => fetchNewMessages(state);

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

function showChat() {
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('chat-section').style.display = 'flex';
  document.getElementById('display-user').innerText = state.username;

  window.loadFriends = loadFriends;
  window.loadGroups = loadGroups;
  window.fetchNewMessages = () => fetchNewMessages(state);

  loadFriends();
  loadGroups();

  connectWebSocket(state.username, {
    onOpen: () => console.log('✅ WebSocket aktiv - Polling pausiert'),
    onClose: () => console.log('⚠️ WebSocket getrennt - Polling übernimmt'),
    onMessage: (data) => handleWebSocketMessage(data, state)
  });

  startPolling(); 
}

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

document.addEventListener('DOMContentLoaded', () => {
  console.log('🔥 FlareChat gestartet');

  initTarnung();

  const loginBtn = document.getElementById('login-btn');
  if (loginBtn) loginBtn.addEventListener('click', handleLogin);

  document.getElementById('password')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loginBtn?.click();
  });

  initTabs();

  document.getElementById('friend-select')?.addEventListener('change', () => {
    const chatBox = document.getElementById('chat-box');
    if (chatBox) { chatBox.innerHTML = ''; fetchNewMessages(); }
  });
  document.getElementById('group-select')?.addEventListener('change', () => {
    const chatBox = document.getElementById('chat-box');
    if (chatBox) { chatBox.innerHTML = ''; fetchNewMessages(); }
  });

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
        if (!receiver) { alert('Bitte erst einen Freund auswählen!'); return; }
        await sendMessage(text, receiver, 'friend', state);
      } else {
        const groupId = groupSelect.value;
        if (!groupId) { alert('Bitte erst eine Gruppe auswählen!'); return; }
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
});

window.acceptRequest = async (username) => {
  await apiFetch('/respond-friend', 'POST', { myUsername: state.username, requesterUsername: username, accept: true });
  loadFriends();
};
window.declineRequest = async (username) => {
  await apiFetch('/respond-friend', 'POST', { myUsername: state.username, requesterUsername: username, accept: false });
  loadFriends();
};
