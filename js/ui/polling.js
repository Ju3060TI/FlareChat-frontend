// frontend/js/tabs.js
// Umschaltung zwischen "Freunde" und "Gruppen"

export function initTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  const friendSelect = document.getElementById('friend-select');
  const groupSelect = document.getElementById('group-select');

  if (!tabs.length) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', function () {
      // Alle Tabs deaktivieren
      tabs.forEach(t => t.classList.remove('active'));
      // Aktiven Tab markieren
      this.classList.add('active');

      // Dropdowns umschalten
      if (this.dataset.tab === 'friends') {
        friendSelect.style.display = 'block';
        groupSelect.style.display = 'none';
      } else {
        friendSelect.style.display = 'none';
        groupSelect.style.display = 'block';
      }

      // Chat leeren und Nachrichten neu laden
      const chatBox = document.getElementById('chat-box');
      if (chatBox) {
        chatBox.innerHTML = '';
        // Event auslösen, damit main.js die Nachrichten lädt
        window.dispatchEvent(new CustomEvent('flarechat:tabChanged'));
      }
    });
  });
}
