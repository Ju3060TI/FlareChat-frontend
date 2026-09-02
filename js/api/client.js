// js/api/client.js
// Zentraler API-Client für alle Backend-Anfragen

import { CONFIG } from '../config.js';

export async function apiFetch(endpoint, method = 'POST', bodyData = null) {
  // ============================================================
  // HEADER
  // ============================================================
  const headers = {
    'Content-Type': 'application/json',
  };

  // Token für Firebase (optional)
  const token = localStorage.getItem('idToken');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // ============================================================
  // OPTIONS
  // ============================================================
  const options = {
    method,
    headers,
  };

  if (bodyData) {
    options.body = JSON.stringify(bodyData);
  }

  // ============================================================
  // URL (mit Doppel-Slash-Schutz)
  // ============================================================
  const url = `${CONFIG.API_BASE}${endpoint}`.replace(/\/+/g, '/');

  try {
    console.log(`[API] 📤 ${method} ${url}`, bodyData || '');

    const response = await fetch(url, options);

    // ============================================================
    // FEHLERBEHANDLUNG
    // ============================================================
    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
      } catch (e) {
        errorText = 'Keine weitere Fehlerinformation';
      }
      console.error(`[API] ❌ HTTP ${response.status}:`, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    // ============================================================
    // ANTWORT VERARBEITEN (leer, Text, JSON)
    // ============================================================
    const text = await response.text();

    // Leere Antwort
    if (!text || text.trim() === '') {
      return null;
    }

    // Versuche JSON zu parsen
    try {
      const json = JSON.parse(text);
      console.log(`[API] 📥 ${method} ${endpoint} →`, json);
      return json;
    } catch (e) {
      // Fallback: Text-Antwort
      console.log(`[API] 📥 ${method} ${endpoint} → (Text)`, text);
      return text;
    }
  } catch (error) {
    console.error(`[API] 💥 Fehler bei ${method} ${endpoint}:`, error);
    return {
      error: true,
      message: error.message || 'Unbekannter Fehler',
    };
  }
}

// ============================================================
// HELPER: Einfache GET-Anfragen
// ============================================================
export async function apiGet(endpoint, params = {}) {
  const url = new URL(`${CONFIG.API_BASE}${endpoint}`);
  Object.keys(params).forEach((key) => {
    url.searchParams.append(key, params[key]);
  });
  return apiFetch(url.pathname + url.search, 'GET');
}

// ============================================================
// HELPER: Einfache POST-Anfragen
// ============================================================
export async function apiPost(endpoint, bodyData = {}) {
  return apiFetch(endpoint, 'POST', bodyData);
}
