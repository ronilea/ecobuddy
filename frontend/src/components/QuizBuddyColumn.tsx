import { useEffect, useState } from "react";
import { BuddyAvatar } from "./BuddyAvatar";

type Props = {
  outfitId: string;
  mouth?: "default" | "smile" | "concerned";
  hint?: string | null;
  feedbackMessage?: string | null;
  showHintButton?: boolean;
};

export function QuizBuddyColumn({
  outfitId,
  mouth = "default",
  hint,
  feedbackMessage,
  showHintButton = true,
}: Props) {
  const [hintVisible, setHintVisible] = useState(false);

  useEffect(() => {
    setHintVisible(false);
  }, [hint, feedbackMessage]);

  const hintText =
    hint ?? "Try breaking the question into parts — what idea is it really asking about?";

  return (
    <aside className="home-buddy quiz-buddy">
      <BuddyAvatar outfitId={outfitId} mouth={mouth} size={150} />
      {feedbackMessage && (
        <div className="speech-bubble home-buddy-bubble home-buddy-bubble--compact home-buddy-bubble--quiz">
          <p>{feedbackMessage}</p>
        </div>
      )}
      {showHintButton && (
        <>
          <button
            type="button"
            className="btn quiz-hint-btn"
            disabled={hintVisible}
            onClick={() => setHintVisible(true)}
          >
            Ask me for a hint
          </button>
          {hintVisible && (
            <div className="speech-bubble home-buddy-bubble home-buddy-bubble--compact home-buddy-bubble--quiz">
              <p>{hintText}</p>
            </div>
          )}
        </>
      )}
    </aside>
  );
}
