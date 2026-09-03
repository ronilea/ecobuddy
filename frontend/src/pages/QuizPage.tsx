import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { createSession, getSession, submitAnswer, SUPPORT_ERROR, type AnswerFeedback, type Session } from "../api/client";
import { CoinBadge } from "../components/CoinBadge";
import { FeedbackPanel } from "../components/FeedbackPanel";
import { ProgressBar } from "../components/ProgressBar";
import { QuestionCard } from "../components/QuestionCard";
import { QuizBuddyColumn } from "../components/QuizBuddyColumn";
import { SessionSummaryView } from "../components/SessionSummary";
import { CartIcon, HomeIcon } from "../components/icons";
import { clearSessionId, saveSessionId, useBuddyProfile } from "../hooks/useBuddyProfile";
import {
  clearPendingFeedback,
  loadPendingFeedback,
  savePendingFeedback,
} from "../utils/pendingFeedback";
import { cacheActiveSession, clearActiveSessionCache } from "../utils/sessionCache";
import { getActiveQuestion } from "../utils/sessionResume";

export function QuizPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, refreshWallet, loading: walletLoading, error: walletError } = useBuddyProfile();
  const resumeOnLoad = useRef(location.state?.resume === true);

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restarting, setRestarting] = useState(false);
  const [answeredQuestionId, setAnsweredQuestionId] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    saveSessionId(sessionId);
    setSelected(null);
    setLoading(true);

    const pending = loadPendingFeedback(sessionId);
    if (pending) {
      setFeedback(pending.feedback);
      setAnsweredQuestionId(pending.questionId);
    } else {
      setFeedback(null);
      setAnsweredQuestionId(null);
    }

    getSession(sessionId)
      .then((data) => {
        setSession(data);
        cacheActiveSession(data);
      })
      .catch((err) => {
        console.error("Failed to load quiz session", err);
        setError(SUPPORT_ERROR);
      })
      .finally(() => setLoading(false));
  }, [sessionId]);

  const currentQuestion = session ? getActiveQuestion(session) : undefined;
  const feedbackQuestion =
    feedback && answeredQuestionId && session
      ? session.questions.find((q) => q.id === answeredQuestionId)
      : undefined;
  const displayQuestion = feedback ? feedbackQuestion : currentQuestion;

  async function handleRetryLoad() {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const next = await getSession(sessionId);
      setSession(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : SUPPORT_ERROR);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!session || !currentQuestion || selected === null) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await submitAnswer(session.id, currentQuestion.id, selected);
      setAnsweredQuestionId(currentQuestion.id);
      setSession(result.session);
      cacheActiveSession(result.session);
      setFeedback(result.feedback);
      savePendingFeedback(session.id, {
        questionId: currentQuestion.id,
        feedback: result.feedback,
      });
      await refreshWallet();
    } catch (err) {
      console.error("submitAnswer failed", err);
      setError(SUPPORT_ERROR);
    } finally {
      setSubmitting(false);
    }
  }

  function handleContinue() {
    if (session) clearPendingFeedback(session.id);
    setFeedback(null);
    setSelected(null);
    setAnsweredQuestionId(null);
  }

  async function handlePracticeAgain() {
    if (!session) return;
    setRestarting(true);
    setError(null);
    try {
      clearPendingFeedback(session.id);
      const next = await createSession(session.topic);
      saveSessionId(next.id);
      navigate(`/quiz/${next.id}`);
    } catch {
      setError(SUPPORT_ERROR);
      setRestarting(false);
    }
  }

  function handleNewTopic() {
    if (session) clearPendingFeedback(session.id);
    clearSessionId();
    clearActiveSessionCache();
    navigate("/");
  }

  if (loading || walletLoading) return <div className="page page-fit center">Loading session…</div>;
  if ((error && !session) || walletError || !profile) {
    return <div className="page page-fit center error">{error ?? walletError ?? SUPPORT_ERROR}</div>;
  }
  if (!session) return null;

  const score = session.questions.filter((q) => q.answer?.is_correct).length;

  if (session.status === "completed" && session.summary && !feedback) {
    return (
      <div className="page page-fit quiz-page quiz-page--summary">
        <main className="quiz-main quiz-main--summary">
          <SessionSummaryView
            summary={session.summary}
            topic={session.topic}
            score={score}
            total={session.total_questions}
            outfitId={profile.equippedOutfitId}
            onCloset={() => navigate("/closet")}
            onPracticeAgain={() => void handlePracticeAgain()}
            onNewTopic={handleNewTopic}
          />
          {error && <p className="error">{error}</p>}
          {restarting && <p className="center">Starting new session…</p>}
        </main>
      </div>
    );
  }

  const buddyMouth = feedback ? (feedback.is_correct ? "smile" : "concerned") : "default";
  const buddyFeedbackMessage = feedback
    ? feedback.is_correct
      ? "Nice one!"
      : "Good try — ask me for a hint, or show the answer when you're ready."
    : null;

  return (
    <div className="page page-fit quiz-page">
      <header className="quiz-header">
        <button
          className="btn icon-btn"
          type="button"
          aria-label="Go to home"
          title="Home"
          onClick={() => navigate("/")}
        >
          <HomeIcon />
        </button>
        <span className="topic-label">{session.topic}</span>
        <CoinBadge coins={profile.coins} />
        <button
          className="btn icon-btn"
          type="button"
          aria-label="Open store"
          title="Store"
          onClick={() =>
            navigate("/closet", { state: { returnTo: `/quiz/${session.id}` } })
          }
        >
          <CartIcon />
        </button>
      </header>

      <main className="quiz-main">
        {displayQuestion ? (
          <div className="quiz-active-body">
            <div className="quiz-center">
              <div className={`card quiz-card${feedback ? " quiz-card--feedback" : ""}`}>
                <ProgressBar
                  value={session.answered_count}
                  max={session.total_questions}
                  label={`${session.answered_count} of ${session.total_questions} questions`}
                />
                {feedback ? (
                  <FeedbackPanel feedback={feedback} question={feedbackQuestion} />
                ) : (
                  <QuestionCard
                    sessionId={session.id}
                    question={displayQuestion}
                    selected={selected}
                    onSelect={setSelected}
                    submitting={submitting}
                    instantReveal={resumeOnLoad.current}
                  />
                )}
              </div>

              {feedback ? (
                <button type="button" className="btn primary quiz-action-btn" onClick={handleContinue}>
                  {feedback.quiz_complete ? "See summary" : "Next question"}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn primary quiz-action-btn"
                  disabled={selected === null || submitting}
                  onClick={() => void handleSubmit()}
                >
                  {submitting ? "Checking & generating next…" : "Submit answer"}
                </button>
              )}
            </div>

            <QuizBuddyColumn
              outfitId={profile.equippedOutfitId}
              mouth={buddyMouth}
              hint={displayQuestion.buddy_hint}
              feedbackMessage={buddyFeedbackMessage}
              showHintButton={!feedback || !feedback.is_correct}
            />
          </div>
        ) : (
          <div className="center stuck-state">
            <p>{SUPPORT_ERROR}</p>
            <button className="btn primary" type="button" onClick={() => void handleRetryLoad()}>
              Try again
            </button>
          </div>
        )}

        {error && <p className="error">{error}</p>}
      </main>
    </div>
  );
}
