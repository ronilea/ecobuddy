import type { Question, Session } from "../api/client";

/** First unanswered question — matches backend `current_question_id`. */
export function getActiveQuestion(session: Session): Question | undefined {
  if (!session.current_question_id) return undefined;
  const current = session.questions.find((q) => q.id === session.current_question_id);
  if (!current || current.answer) return undefined;
  return current;
}
