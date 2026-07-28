// frontend/js/chat/messages.js
// Zentrale Nachrichten-Logik: Senden, Empfangen, Anzeigen, WebSocket & Polling

import { apiFetch } from '../api/client.js';

// ============================================================
// 1. NACHRICHT SENDEN (über API)
// ============================================================

/**
 * Sendet eine Nachricht an einen Freund oder eine Gruppe.
 * @param {string} text - Der Nachrichtentext
 * @param {string} target - Der Empfänger (Username bei 1on1, GroupId bei Gruppe)
 * @param {string} type - 'friend' oder 'group'
 * @param {object} state - Der globale State (für Username & Avatar)
 */
export async function sendMessage(text, target, type, state) {
  if (!text.trim()) return;

  // 1. Nachricht sofort lokal anzeigen (optimistisches UI)
  addMessageToChat(state.username, text, state.avatarUrl, state);

  // 2. An den Server senden
  if (type === 'friend') {
    await apiFetch('/send', 'POST', {
      senderUsername: state.username,
      receiverUsername: target,
      text: text.trim(),
    });
  } else {
    await apiFetch('/group-send', 'POST', {
      groupId: target,
      senderUsername: state.username,
      text: text.trim(),
    });
  }
}

// ============================================================
// 2. NACHRICHT ANZEIGEN (Chat-Bubble)
// ============================================================

/**
 * Erstellt eine Nachrichten-Bubble und fügt sie in den Chat ein.
 * @param {string} sender - Der Absender-Name
 * @param {string} text - Der Nachrichtentext
 * @param {string} avatarUrl - Die Avatar-URL
 * @param {object} state - Der globale State (um zu prüfen, ob ich es bin)
 */
export function addMessageToChat(sender, text, avatarUrl, state) {
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
// 3. NACHRICHTEN LADEN (via Polling / API)
// ============================================================

/**
 * Lädt die neuesten Nachrichten aus der Datenbank (wird vom Polling genutzt).
 * @param {object} state - Der globale State
 */
export async function fetchNewMessages(state) {
  // Wenn WebSocket aktiv ist, machen wir kein Polling
  if (state.wsConnected) return;

  const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
  const friendSelect = document.getElementById('friend-select');
  const groupSelect = document.getElementById('group-select');
  const chatBox = document.getElementById('chat-box');

  if (!chatBox) return;

  let messages = [];
  
  // 1. Freundes-Chat
  if (activeTab === 'friends') {
    const friend = friendSelect.value;
    if (!friend) return;
    const data = await apiFetch('/messages', 'POST', { 
      myUsername: state.username, 
      otherUsername: friend 
    });
    if (data) messages = data;
  } 
  // 2. Gruppen-Chat
  else {
    const groupId = groupSelect.value;
    if (!groupId) return;
    const data = await apiFetch('/group-messages', 'POST', { groupId });
    if (data) messages = data;
  }

  // Nur neue Nachrichten anzeigen (die, die noch nicht im Chat sind)
  const currentCount = chatBox.children.length;
  if (messages.length > currentCount) {
    messages.slice(currentCount).forEach(m => {
      addMessageToChat(m.sender, m.text, m.avatar_url, state);
    });
  }
}

// ============================================================
// 4. WEBSOCKET-NACHRICHTEN VERARBEITEN
// ============================================================

/**
 * Verarbeitet eingehende WebSocket-Nachrichten und zeigt sie an.
 * @param {object} data - Das vom Server gesendete JSON-Objekt
 * @param {object} state - Der globale State
 */
export function handleWebSocketMessage(data, state) {
  // Nur neue Nachrichten verarbeiten
  if (data.type !== 'new_message' && data.type !== 'new_group_message') return;

  const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
  const friendSelect = document.getElementById('friend-select');
  const groupSelect = document.getElementById('group-select');

  // 1. Friend Message
  if (data.type === 'new_message') {
    // Nur anzeigen, wenn wir gerade mit dem Absender chatten
    if (activeTab === 'friends' && friendSelect.value === data.sender) {
      addMessageToChat(data.sender, data.text, null, state);
    }
  } 
  // 2. Group Message
  else {
    // Nur anzeigen, wenn wir in der richtigen Gruppe sind
    if (activeTab === 'groups' && groupSelect.value === data.groupId) {
      addMessageToChat(data.sender, data.text, null, state);
    }
  }
}// frontend/js/chat/messages.js
// Zentrale Nachrichten-Logik: Senden, Empfangen, Anzeigen, WebSocket & Polling

import { apiFetch } from '../api/client.js';

// ============================================================
// 1. NACHRICHT SENDEN (über API)
// ============================================================

/**
 * Sendet eine Nachricht an einen Freund oder eine Gruppe.
 * @param {string} text - Der Nachrichtentext
 * @param {string} target - Der Empfänger (Username bei 1on1, GroupId bei Gruppe)
 * @param {string} type - 'friend' oder 'group'
 * @param {object} state - Der globale State (für Username & Avatar)
 */
export async function sendMessage(text, target, type, state) {
  if (!text.trim()) return;

  // 1. Nachricht sofort lokal anzeigen (optimistisches UI)
  addMessageToChat(state.username, text, state.avatarUrl, state);

  // 2. An den Server senden
  if (type === 'friend') {
    await apiFetch('/send', 'POST', {
      senderUsername: state.username,
      receiverUsername: target,
      text: text.trim(),
    });
  } else {
    await apiFetch('/group-send', 'POST', {
      groupId: target,
      senderUsername: state.username,
      text: text.trim(),
    });
  }
}

// ============================================================
// 2. NACHRICHT ANZEIGEN (Chat-Bubble)
// ============================================================

/**
 * Erstellt eine Nachrichten-Bubble und fügt sie in den Chat ein.
 * @param {string} sender - Der Absender-Name
 * @param {string} text - Der Nachrichtentext
 * @param {string} avatarUrl - Die Avatar-URL
 * @param {object} state - Der globale State (um zu prüfen, ob ich es bin)
 */
export function addMessageToChat(sender, text, avatarUrl, state) {
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
// 3. NACHRICHTEN LADEN (via Polling / API)
// ============================================================

/**
 * Lädt die neuesten Nachrichten aus der Datenbank (wird vom Polling genutzt).
 * @param {object} state - Der globale State
 */
export async function fetchNewMessages(state) {
  // Wenn WebSocket aktiv ist, machen wir kein Polling
  if (state.wsConnected) return;

  const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
  const friendSelect = document.getElementById('friend-select');
  const groupSelect = document.getElementById('group-select');
  const chatBox = document.getElementById('chat-box');

  if (!chatBox) return;

  let messages = [];
  
  // 1. Freundes-Chat
  if (activeTab === 'friends') {
    const friend = friendSelect.value;
    if (!friend) return;
    const data = await apiFetch('/messages', 'POST', { 
      myUsername: state.username, 
      otherUsername: friend 
    });
    if (data) messages = data;
  } 
  // 2. Gruppen-Chat
  else {
    const groupId = groupSelect.value;
    if (!groupId) return;
    const data = await apiFetch('/group-messages', 'POST', { groupId });
    if (data) messages = data;
  }

  // Nur neue Nachrichten anzeigen (die, die noch nicht im Chat sind)
  const currentCount = chatBox.children.length;
  if (messages.length > currentCount) {
    messages.slice(currentCount).forEach(m => {
      addMessageToChat(m.sender, m.text, m.avatar_url, state);
    });
  }
}

// ============================================================
// 4. WEBSOCKET-NACHRICHTEN VERARBEITEN
// ============================================================

/**
 * Verarbeitet eingehende WebSocket-Nachrichten und zeigt sie an.
 * @param {object} data - Das vom Server gesendete JSON-Objekt
 * @param {object} state - Der globale State
 */
export function handleWebSocketMessage(data, state) {
  // Nur neue Nachrichten verarbeiten
  if (data.type !== 'new_message' && data.type !== 'new_group_message') return;

  const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
  const friendSelect = document.getElementById('friend-select');
  const groupSelect = document.getElementById('group-select');

  // 1. Friend Message
  if (data.type === 'new_message') {
    // Nur anzeigen, wenn wir gerade mit dem Absender chatten
    if (activeTab === 'friends' && friendSelect.value === data.sender) {
      addMessageToChat(data.sender, data.text, null, state);
    }
  } 
  // 2. Group Message
  else {
    // Nur anzeigen, wenn wir in der richtigen Gruppe sind
    if (activeTab === 'groups' && groupSelect.value === data.groupId) {
      addMessageToChat(data.sender, data.text, null, state);
    }
  }
}
