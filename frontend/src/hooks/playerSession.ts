export const SESSION_KEY = "ecobuddy_session_id";

export function saveSessionId(id: string) {
  localStorage.setItem(SESSION_KEY, id);
}

export function loadSessionId(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function clearSessionId() {
  localStorage.removeItem(SESSION_KEY);
}
