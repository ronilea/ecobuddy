import type { SessionSummary } from "../api/client";
import { BuddyAvatar } from "./BuddyAvatar";
import { CartIcon } from "./icons";

type Props = {
  summary: SessionSummary;
  topic: string;
  score: number;
  total: number;
  outfitId: string;
  onCloset: () => void;
  onPracticeAgain: () => void;
  onNewTopic: () => void;
};

export function SessionSummaryView({
  summary,
  topic,
  score,
  total,
  outfitId,
  onCloset,
  onPracticeAgain,
  onNewTopic,
}: Props) {
  return (
    <div className="summary-card">
      <div className="summary-card-body">
        <div className="buddy-row center">
          <BuddyAvatar outfitId={outfitId} mouth="smile" size={100} />
        </div>
        <h1>Session complete</h1>
        <p className="score">
          {topic} — {score}/{total} correct
        </p>
        <p className="buddy-summary">{summary.buddy_summary}</p>
        <section>
          <h3>Strengths</h3>
          <ul>{summary.strengths.map((s) => <li key={s}>{s}</li>)}</ul>
        </section>
        <section>
          <h3>Gaps</h3>
          <ul>{summary.gaps.map((g) => <li key={g}>{g}</li>)}</ul>
        </section>
        <section>
          <h3>Next steps</h3>
          <ul>{summary.recommended_next_steps.map((s) => <li key={s}>{s}</li>)}</ul>
        </section>
      </div>
      <div className="actions">
        <button className="btn secondary icon-btn" type="button" aria-label="Open store" onClick={onCloset}>
          <CartIcon size={18} />
        </button>
        <button className="btn secondary" type="button" onClick={onPracticeAgain}>
          Practice again
        </button>
        <button className="btn primary" type="button" onClick={onNewTopic}>
          New topic
        </button>
      </div>
    </div>
  );
}
