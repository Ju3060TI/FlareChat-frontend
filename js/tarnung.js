// frontend/js/tarnung.js
// Pixel-Gesicht + 10 Klicks zum Öffnen des Chats

export function initTarnung() {
  const pixelFace = document.getElementById('pixelFace');
  const tarnung = document.getElementById('tarnung');
  const lavaBg = document.querySelector('.lava-bg');
  const appBox = document.getElementById('app-box');

  if (!pixelFace) return;

  let clickCount = 0;

  pixelFace.addEventListener('click', (e) => {
    e.stopPropagation();
    clickCount++;
    console.log(`👆 Pixel: ${clickCount}/10`);

    if (clickCount >= 10) {
      tarnung.style.display = 'none';
      if (lavaBg) lavaBg.style.display = 'block';
      appBox.classList.add('active');
      appBox.style.display = 'flex';
      pixelFace.style.display = 'none';

      // Prüfen, ob schon eingeloggt
      const username = localStorage.getItem('username');
      if (username) {
        // Event auslösen, damit main.js den Chat startet
        window.dispatchEvent(new CustomEvent('flarechat:ready'));
      } else {
        document.getElementById('login-section').style.display = 'flex';
      }
    }
  });
}
