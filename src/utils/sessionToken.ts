// Session token persistence for embedded (iframe) contexts only.
//
// In the Google AI Studio preview the app runs in a cross-site iframe, where the SameSite=Lax
// auth cookie is not sent, so a page refresh would log the user out. When (and only when) the app
// is embedded, we keep the bearer token in sessionStorage: tab-scoped and cleared when the tab closes.
// Top-level visits rely on the HttpOnly cookie and never store the token in JavaScript-readable storage.

const KEY = 'coachtactics_session_token';

export function isEmbedded(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true; // cross-origin parent access throws: we are embedded
  }
}

export function loadSessionToken(): string | null {
  if (!isEmbedded()) return null;
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function saveSessionToken(token: string | null): void {
  if (!isEmbedded()) return;
  try {
    if (token) sessionStorage.setItem(KEY, token);
    else sessionStorage.removeItem(KEY);
  } catch {
    // storage unavailable (privacy mode): the session simply won't survive a refresh
  }
}
