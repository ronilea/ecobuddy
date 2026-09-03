import { useEffect, useState } from "react";
import type { AnswerFeedback, Question } from "../api/client";
import { CoinBurst } from "./CoinBurst";

type Props = {
  feedback: AnswerFeedback;
  question?: Question;
};

export function FeedbackPanel({ feedback, question }: Props) {
  const coinsEarned = feedback.coins.coins_earned;
  const [answerRevealed, setAnswerRevealed] = useState(feedback.is_correct);

  useEffect(() => {
    setAnswerRevealed(feedback.is_correct);
  }, [feedback]);

  const chosenOption =
    question?.answer != null
      ? question.options.find((o) => o.option_index === question.answer!.selected_option_index)
      : null;

  const showAnswer = feedback.is_correct || answerRevealed;

  return (
    <div className="feedback-view">
      {!feedback.is_correct && question && (
        <div className="feedback-recap">
          <h2 className="question-stem feedback-recap-stem">{question.stem}</h2>
          {chosenOption && (
            <p className="feedback-chosen-answer">
              Your answer: <strong>{chosenOption.text}</strong>
            </p>
          )}
          {!showAnswer && (
            <p className="feedback-think-prompt">
              Not quite — you can rethink it, ask your buddy for a hint, or reveal the answer when
              you&apos;re ready.
            </p>
          )}
        </div>
      )}

      {!showAnswer ? (
        <button
          type="button"
          className="btn feedback-reveal-btn"
          onClick={() => setAnswerRevealed(true)}
        >
          Show the right answer
        </button>
      ) : (
        <div className={`feedback-panel ${feedback.is_correct ? "correct" : "wrong"}`}>
          {coinsEarned > 0 && <CoinBurst amount={coinsEarned} />}
          <p className="feedback-section-label">The answer</p>
          <p className="feedback-explanation">{feedback.explanation}</p>
          {feedback.explanation_why && (
            <>
              <p className="feedback-section-label">Why it works</p>
              <p className="feedback-why">{feedback.explanation_why}</p>
            </>
          )}
          {coinsEarned > 0 && (
            <p className="coin-toast">
              +{coinsEarned} coins
              {feedback.coins.streak_bonus && " (3-in-a-row streak!)"}
              {feedback.coins.set_complete_bonus && " (set complete!)"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
