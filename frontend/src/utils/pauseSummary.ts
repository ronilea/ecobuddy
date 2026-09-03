import type { Session } from "../api/client";

export type PauseBuddySummary = {
  intro: string;
  concepts?: string[];
  remaining?: string;
  otherTopics?: string[];
};

export function buildBuddyPauseSummary(
  session: Session,
  suggestedTopics: string[],
): PauseBuddySummary {
  const coveredConcepts = [
    ...new Set(
      session.questions
        .filter((q) => q.answer)
        .map((q) => (q.focus_concept ?? "").trim())
        .filter(Boolean),
    ),
  ];
  const otherTopics = suggestedTopics.filter(
    (t) => t.toLowerCase() !== session.topic.toLowerCase(),
  );

  const remainingCount = session.total_questions - session.answered_count;

  if (session.answered_count === 0) {
    return {
      intro: `We just started ${session.topic} — ${session.total_questions} questions ahead!`,
      otherTopics: otherTopics.length > 0 ? otherTopics : undefined,
    };
  }

  return {
    intro: `So far we've done ${session.answered_count} of ${session.total_questions} on ${session.topic}.`,
    concepts: coveredConcepts.length > 0 ? coveredConcepts : undefined,
    remaining:
      remainingCount > 0
        ? `${remainingCount} question${remainingCount === 1 ? "" : "s"} left in this session.`
        : undefined,
    otherTopics: otherTopics.length > 0 ? otherTopics : undefined,
  };
}
