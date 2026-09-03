function storageKey(sessionId: string) {
  return `ecobuddy_revealed_${sessionId}`;
}

function loadRevealed(sessionId: string): Set<string> {
  try {
    const raw = sessionStorage.getItem(storageKey(sessionId));
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {
    /* ignore */
  }
  return new Set();
}

function saveRevealed(sessionId: string, revealed: Set<string>) {
  sessionStorage.setItem(storageKey(sessionId), JSON.stringify([...revealed]));
}

export function wasQuestionRevealed(sessionId: string, questionId: string): boolean {
  return loadRevealed(sessionId).has(questionId);
}

export function markQuestionRevealed(sessionId: string, questionId: string) {
  const revealed = loadRevealed(sessionId);
  if (revealed.has(questionId)) return;
  revealed.add(questionId);
  saveRevealed(sessionId, revealed);
}
