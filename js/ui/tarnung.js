// js/ui/tarnung.js
// Tarnungs-Feature – zeigt eine Fake-Fehlerseite an

export function initTarnung() {
  const tarnung = document.getElementById('tarnung');
  const appBox = document.getElementById('app-box');
  const reloadBtn = document.getElementById('reloadBtn');
  const detailsBtn = document.getElementById('detailsBtn');

  // ============================================================
  // Tarnung ANZEIGEN (wird von main.js aufgerufen)
  // ============================================================
  window.showTarnung = function() {
    console.log('🕵️ Tarnung aktiviert – zeige Fehlerseite');
    
    // Tarnung einblenden
    if (tarnung) {
      tarnung.style.display = 'flex';
      tarnung.style.zIndex = '9999';
    }
    
    // App-Box ausblenden
    if (appBox) {
      appBox.style.display = 'none';
      appBox.classList.remove('active');
    }
  };

  // ============================================================
  // Tarnung AUSBLENDEN (wenn auf "Neu laden" geklickt wird)
  // ============================================================
  window.hideTarnung = function() {
    console.log('🔄 Tarnung deaktiviert – zeige App');
    
    // Tarnung ausblenden
    if (tarnung) {
      tarnung.style.display = 'none';
    }
    
    // App-Box einblenden
    if (appBox) {
      appBox.style.display = 'flex';
      appBox.classList.add('active');
    }
  };

  // ============================================================
  // EVENT-LISTENER für Tarnungs-Buttons
  // ============================================================
  
  // "Neu laden" → Tarnung beenden
  if (reloadBtn) {
    reloadBtn.addEventListener('click', () => {
      window.hideTarnung();
      // Optional: Seite neu laden, um alle States zurückzusetzen
      // window.location.reload();
    });
  }

  // "Details" → Infobox anzeigen
  if (detailsBtn) {
    detailsBtn.addEventListener('click', () => {
      alert(
        '🔍 FlareChat Tarnung\n\n' +
        'Diese Seite sieht aus wie ein DNS-Fehler,\n' +
        'aber in Wirklichkeit ist es der Chat-Modus.\n\n' +
        '🔐 So funktioniert es:\n' +
        '• "Tarnung" aktiviert die Fehlerseite\n' +
        '• "Neu laden" bringt dich zurück\n' +
        '• Deine Chats bleiben erhalten\n\n' +
        '🌋 FlareChat – Echtzeit-Chat mit Stil!'
      );
    });
  }

  // ============================================================
  // KEYBOARD SHORTCUT: ESC → Tarnung beenden
  // ============================================================
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const tarnungVisible = tarnung && tarnung.style.display === 'flex';
      if (tarnungVisible) {
        window.hideTarnung();
      }
    }
  });

  console.log('✅ Tarnung initialisiert');
}
