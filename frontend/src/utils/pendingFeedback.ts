import type { AnswerFeedback } from "../api/client";

const KEY_PREFIX = "ecobuddy_pending_feedback:";

export type PendingFeedback = {
  questionId: string;
  feedback: AnswerFeedback;
};

function key(sessionId: string) {
  return `${KEY_PREFIX}${sessionId}`;
}

export function savePendingFeedback(sessionId: string, pending: PendingFeedback) {
  sessionStorage.setItem(key(sessionId), JSON.stringify(pending));
}

export function loadPendingFeedback(sessionId: string): PendingFeedback | null {
  const raw = sessionStorage.getItem(key(sessionId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingFeedback;
  } catch (err) {
    console.error("Corrupt pending feedback; clearing", err);
    sessionStorage.removeItem(key(sessionId));
    return null;
  }
}

export function clearPendingFeedback(sessionId: string) {
  sessionStorage.removeItem(key(sessionId));
}
