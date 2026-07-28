// frontend/js/client.js
// Zentraler API-Client für alle Backend-Anfragen

import { CONFIG } from '../config.js';

export async function apiFetch(endpoint, method = 'POST', bodyData = null) {
  const headers = { 'Content-Type': 'application/json' };
  
  const token = localStorage.getItem('idToken');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = { method, headers };
  if (bodyData) {
    options.body = JSON.stringify(bodyData);
  }

  try {
    const response = await fetch(`${CONFIG.API_BASE}${endpoint}`, options);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch (error) {
    console.error(`[API] Fehler bei ${endpoint}:`, error);
    return null;
  }
}
