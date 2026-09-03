import { useEffect, useState } from "react";
import type { Question } from "../api/client";
import { markQuestionRevealed, wasQuestionRevealed } from "../utils/questionReveal";

const REVEAL_DELAY_MS = 2500;

type Props = {
  sessionId: string;
  question: Question;
  selected: number | null;
  onSelect: (index: number) => void;
  submitting: boolean;
  instantReveal?: boolean;
};

export function QuestionCard({
  sessionId,
  question,
  selected,
  onSelect,
  submitting,
  instantReveal = false,
}: Props) {
  const [showOptions, setShowOptions] = useState(
    () => instantReveal || wasQuestionRevealed(sessionId, question.id),
  );

  useEffect(() => {
    if (instantReveal || wasQuestionRevealed(sessionId, question.id)) {
      if (instantReveal) markQuestionRevealed(sessionId, question.id);
      setShowOptions(true);
      return;
    }

    setShowOptions(false);
    const timer = window.setTimeout(() => {
      markQuestionRevealed(sessionId, question.id);
      setShowOptions(true);
    }, REVEAL_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [sessionId, question.id, instantReveal]);

  return (
    <div className="quiz-question">
      <h2 className="question-stem">{question.stem}</h2>

      {!showOptions ? (
        <div className="question-thinking" aria-live="polite" aria-label="Thinking">
          <span className="thinking-dot" />
          <span className="thinking-dot" />
          <span className="thinking-dot" />
        </div>
      ) : (
        <div className="options options-reveal">
          {question.options.map((opt) => (
            <label
              key={opt.option_index}
              className={`option ${selected === opt.option_index ? "selected" : ""}`}
            >
              <input
                type="radio"
                name="answer"
                checked={selected === opt.option_index}
                onChange={() => onSelect(opt.option_index)}
                disabled={submitting}
              />
              <span>{opt.text}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
