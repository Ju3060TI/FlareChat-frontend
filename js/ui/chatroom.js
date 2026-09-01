// js/ui/chatroom.js
// UI-Komponente für die Chat-Raum-Anzeige

/**
 * Zeigt eine Nachricht im Chat-Bereich an
 * @param {string} sender - Absender der Nachricht
 * @param {string} text - Nachrichtentext
 * @param {string} avatarUrl - Avatar-URL des Absenders
 * @param {string} currentUser - Aktuell eingeloggter Nutzer
 */
export function displayMessage(sender, text, avatarUrl, currentUser) {
  const chatBox = document.getElementById('chat-box');
  if (!chatBox) return;

  const div = document.createElement('div');
  const isMe = sender === currentUser;
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

/**
 * Leert den Chat-Bereich
 */
export function clearChatBox() {
  const chatBox = document.getElementById('chat-box');
  if (chatBox) {
    chatBox.innerHTML = '';
  }
}

/**
 * Zeigt eine Systemnachricht im Chat an
 */
export function displaySystemMessage(text) {
  const chatBox = document.getElementById('chat-box');
  if (!chatBox) return;

  const div = document.createElement('div');
  div.className = 'msg system';
  div.style.cssText = 'text-align:center;color:#888;font-style:italic;padding:4px 0;font-size:0.8rem;';
  div.textContent = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

/**
 * Aktualisiert den Titel des Chat-Raums
 */
export function updateRoomTitle(roomName) {
  const titleElement = document.getElementById('room-title');
  if (titleElement) {
    titleElement.textContent = roomName;
  }
}

/**
 * Rendert eine Liste von Nachrichten (für initialen Verlauf)
 */
export function renderMessageHistory(messages, currentUser) {
  clearChatBox();
  messages.forEach(msg => {
    displayMessage(msg.sender, msg.text, msg.avatar_url, currentUser);
  });
}

/**
 * Generiert einen konsistenten Raum-Namen für 1:1-Chats
 */
export function getDirectRoomName(user1, user2) {
  const sorted = [user1, user2].sort();
  return `dm_${sorted[0]}_${sorted[1]}`;
}

/**
 * Generiert einen Raum-Namen für Gruppen-Chats
 */
export function getGroupRoomName(groupId) {
  return `group_${groupId}`;
}

/**
 * Ermittelt den aktuellen Raum-Namen basierend auf UI-Auswahl
 */
export function getCurrentRoomName(state) {
  const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
  const friendSelect = document.getElementById('friend-select');
  const groupSelect = document.getElementById('group-select');

  if (activeTab === 'friends') {
    const friend = friendSelect?.value;
    if (!friend || friend === '') return null;
    return getDirectRoomName(state.username, friend);
  } else if (activeTab === 'groups') {
    const groupId = groupSelect?.value;
    if (!groupId || groupId === '') return null;
    return getGroupRoomName(groupId);
  }
  return null;
}
