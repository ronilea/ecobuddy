import { useCallback, useEffect, useRef, useState } from "react";
import { getSession, SUPPORT_ERROR, type Session } from "../api/client";
import { clearSessionId, loadSessionId } from "./useBuddyProfile";
import {
  cacheActiveSession,
  clearActiveSessionCache,
  readActiveSessionCache,
} from "../utils/sessionCache";

export function useStoredSession() {
  const [session, setSession] = useState<Session | null>(() => readActiveSessionCache());
  const [loading, setLoading] = useState(() => Boolean(loadSessionId()) && !readActiveSessionCache());
  const [error, setError] = useState<string | null>(null);
  const refreshGeneration = useRef(0);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const refresh = useCallback(async () => {
    const generation = ++refreshGeneration.current;
    const id = loadSessionId();
    if (!id) {
      setSession(null);
      clearActiveSessionCache();
      setError(null);
      setLoading(false);
      return;
    }

    const current = sessionRef.current;
    if (!current || current.id !== id) {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await getSession(id);
      if (generation !== refreshGeneration.current) return;
      if (data.status === "completed") {
        clearSessionId();
        clearActiveSessionCache();
        setSession(null);
        return;
      }
      cacheActiveSession(data);
      setSession(data);
    } catch (err) {
      console.error("Failed to load stored session", err);
      if (generation !== refreshGeneration.current) return;
      clearSessionId();
      clearActiveSessionCache();
      setSession(null);
      setError(SUPPORT_ERROR);
    } finally {
      if (generation === refreshGeneration.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const clearSession = useCallback(() => {
    refreshGeneration.current += 1;
    clearSessionId();
    clearActiveSessionCache();
    setSession(null);
    setError(null);
    setLoading(false);
  }, []);

  return { session, loading, error, clearSession, refresh };
}
