import type { Session } from "../api/client";
import { loadSessionId } from "../hooks/useBuddyProfile";

const CACHE_KEY = "ecobuddy_active_session_cache";

export function cacheActiveSession(session: Session) {
  if (session.status !== "active") {
    sessionStorage.removeItem(CACHE_KEY);
    return;
  }
  sessionStorage.setItem(CACHE_KEY, JSON.stringify(session));
}

export function clearActiveSessionCache() {
  sessionStorage.removeItem(CACHE_KEY);
}

/** Synchronous snapshot for instant home resume UI (same tab). */
export function readActiveSessionCache(): Session | null {
  const id = loadSessionId();
  if (!id) return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (parsed.id === id && parsed.status === "active") return parsed;
  } catch (err) {
    console.error("Corrupt active session cache; clearing", err);
    sessionStorage.removeItem(CACHE_KEY);
  }
  return null;
}
