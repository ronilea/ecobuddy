import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { createSession, fetchTopics, getSession, SUPPORT_ERROR, type Session } from "../api/client";
import { BuddyAvatar } from "../components/BuddyAvatar";
import { CoinBadge } from "../components/CoinBadge";
import { ProgressBar } from "../components/ProgressBar";
import { ArrowRightIcon, CartIcon, PlusIcon, RestartIcon } from "../components/icons";
import { saveSessionId } from "../hooks/playerSession";
import { useWallet } from "../hooks/useWallet";
import { useStoredSession } from "../hooks/useStoredSession";
import { buildBuddyPauseSummary } from "../utils/pauseSummary";

function PauseBuddySummary({ session, topics }: { session: Session; topics: string[] }) {
  const summary = buildBuddyPauseSummary(session, topics);

  return (
    <div className="speech-bubble home-buddy-bubble home-buddy-bubble--compact home-buddy-bubble--pause">
      <p>{summary.intro}</p>
      {summary.concepts && (
        <p>
          <strong>We&apos;ve looked at:</strong> {summary.concepts.join(", ")}.
        </p>
      )}
      {summary.remaining && <p>{summary.remaining}</p>}
      {summary.otherTopics && (
        <p>
          <strong>Topics we haven&apos;t touched yet:</strong> {summary.otherTopics.join(", ")}.
        </p>
      )}
    </div>
  );
}

function TopicSidebar({
  topics,
  currentTopic,
  loading,
  onStartQuiz,
  onNewTopic,
}: {
  topics: string[];
  currentTopic?: string;
  loading: boolean;
  onStartQuiz: (topic: string) => void;
  onNewTopic: () => void;
}) {
  const topicList = (
    <div className="home-topic-list">
      {topics.map((t) => (
        <button
          key={t}
          type="button"
          className="home-topic-btn"
          disabled={loading}
          onClick={() => onStartQuiz(t)}
        >
          {t}
        </button>
      ))}
      <button type="button" className="home-new-topic-btn" disabled={loading} onClick={onNewTopic}>
        <PlusIcon />
        New topic
      </button>
    </div>
  );

  return currentTopic ? (
    <>
      <div className="home-topic-current-wrap">
        <div className="home-topic-current" aria-current="true">
          {currentTopic}
        </div>
      </div>
      {topicList}
    </>
  ) : (
    topicList
  );
}

function HomeTopicPicker({
  topics,
  loading,
  customTopic,
  selectedTopic,
  error,
  outfitId,
  onCustomTopicChange,
  onSelectTopic,
  onStart,
}: {
  topics: string[];
  loading: boolean;
  customTopic: string;
  selectedTopic: string | null;
  error: string | null;
  outfitId: string;
  onCustomTopicChange: (value: string) => void;
  onSelectTopic: (topic: string) => void;
  onStart: () => void;
}) {
  const canStart = Boolean(customTopic.trim() || selectedTopic);

  return (
    <div className="home-layout home-layout--picker">
      <div className="home-picker">
        <div className="home-picker-hero">
          <BuddyAvatar outfitId={outfitId} mouth="smile" size={120} />
          <h1 className="home-picker-title">EcoBuddy</h1>
          <p className="home-picker-tagline">Your curious peer for environmental studies</p>
        </div>

        <div className="home-picker-form">
          <label className="home-picker-input-label" htmlFor="home-topic-input">
            Topic
          </label>
          <input
            id="home-topic-input"
            className="home-picker-input"
            value={customTopic}
            onChange={(e) => onCustomTopicChange(e.target.value)}
            placeholder="e.g. Ocean acidification"
            disabled={loading}
          />

          {topics.length > 0 && (
            <div className="home-picker-topics">
              {topics.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`home-picker-topic ${selectedTopic === t ? "selected" : ""}`}
                  disabled={loading}
                  onClick={() => onSelectTopic(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            className="btn primary home-picker-start"
            disabled={loading || !canStart}
            onClick={onStart}
          >
            {loading ? "Starting…" : "Start"}
          </button>

          {error && <p className="error home-error">{error}</p>}
        </div>
      </div>
    </div>
  );
}

export function HomePage() {
  const [customTopic, setCustomTopic] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, loading: walletLoading, error: walletError } = useWallet();
  const { session: storedSession, loading: sessionLoading, clearSession, refresh } =
    useStoredSession();

  const { data: topics = [] } = useQuery({
    queryKey: ["topics"],
    queryFn: fetchTopics,
  });

  useEffect(() => {
    void refresh();
  }, [location.key, refresh]);

  async function startQuiz(chosenTopic: string) {
    const t = chosenTopic.trim();
    if (!t) return;
    setLoading(true);
    setError(null);
    try {
      const session = await createSession(t);
      saveSessionId(session.id);
      navigate(`/quiz/${session.id}`);
    } catch {
      setError(SUPPORT_ERROR);
    } finally {
      setLoading(false);
    }
  }

  function handleStartFromPicker() {
    const topic = customTopic.trim() || selectedTopic;
    if (!topic) return;
    void startQuiz(topic);
  }

  function handleCustomTopicChange(value: string) {
    setCustomTopic(value);
    if (value.trim()) setSelectedTopic(null);
  }

  function handleSelectTopic(topic: string) {
    setSelectedTopic(topic);
    setCustomTopic(topic);
  }

  async function restartSameTopic() {
    if (!storedSession) return;
    setLoading(true);
    setError(null);
    try {
      const session = await createSession(storedSession.topic);
      saveSessionId(session.id);
      navigate(`/quiz/${session.id}`);
    } catch {
      setError(SUPPORT_ERROR);
    } finally {
      setLoading(false);
    }
  }

  async function resumeSession() {
    if (!storedSession) return;
    setLoading(true);
    setError(null);
    try {
      const fresh = await getSession(storedSession.id);
      saveSessionId(fresh.id);
      navigate(`/quiz/${fresh.id}`, { state: { resume: true } });
    } catch {
      setError(SUPPORT_ERROR);
    } finally {
      setLoading(false);
    }
  }

  function goToHomePicker() {
    clearSession();
    setCustomTopic("");
    setSelectedTopic(null);
    setError(null);
    navigate("/", { replace: true });
  }

  const isPaused = storedSession?.status === "active";
  const otherTopics = isPaused && storedSession
    ? topics.filter((t) => t.toLowerCase() !== storedSession.topic.toLowerCase())
    : topics;

  if (walletLoading || (sessionLoading && !isPaused)) {
    return <div className="page page-fit center">Loading…</div>;
  }
  if (walletError || !profile) {
    return <div className="page page-fit center error">{walletError ?? "Wallet unavailable."}</div>;
  }

  return (
    <div className={`page page-fit home-page ${isPaused ? "home-page--paused" : ""}`}>
      <header className="page-top-bar">
        <CoinBadge coins={profile.coins} variant="pill" />
        <button
          className="btn icon-btn"
          type="button"
          aria-label="Open store"
          title="Store"
          onClick={() => navigate("/closet")}
        >
          <CartIcon />
        </button>
      </header>

      {isPaused && storedSession ? (
        <div className="home-layout home-layout--paused">
          <div className="home-pause-panel">
            <p className="home-pause-panel-header">Topic</p>
            <div className="home-pause-panel-body">
              <aside className="home-pause-sidebar">
                <TopicSidebar
                  topics={otherTopics}
                  currentTopic={storedSession.topic}
                  loading={loading}
                  onStartQuiz={(t) => void startQuiz(t)}
                  onNewTopic={goToHomePicker}
                />
              </aside>

              <div className="home-pause-main">
                <div className="home-active-body">
                  <div className="home-center">
                    <div className="card pause-card">
                      <h2 className="pause-title">Paused</h2>
                      <ProgressBar
                        value={storedSession.answered_count}
                        max={storedSession.total_questions}
                        label={`${storedSession.answered_count} of ${storedSession.total_questions} questions`}
                      />
                    </div>
                    <div className="pause-actions">
                      <button
                        type="button"
                        className="btn pause-action-btn pause-action-btn--resume"
                        disabled={loading}
                        onClick={() => void resumeSession()}
                      >
                        <ArrowRightIcon size={20} />
                        Resume
                      </button>
                      <button
                        type="button"
                        className="btn pause-action-btn pause-action-btn--restart"
                        disabled={loading}
                        onClick={() => void restartSameTopic()}
                      >
                        <RestartIcon size={18} />
                        Restart
                      </button>
                    </div>
                    {error && <p className="error home-error">{error}</p>}
                  </div>

                  <aside className="home-buddy">
                    <BuddyAvatar outfitId={profile.equippedOutfitId} mouth="smile" size={120} />
                    <PauseBuddySummary session={storedSession} topics={topics} />
                  </aside>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <HomeTopicPicker
          topics={topics}
          loading={loading || sessionLoading}
          customTopic={customTopic}
          selectedTopic={selectedTopic}
          error={error}
          outfitId={profile.equippedOutfitId}
          onCustomTopicChange={handleCustomTopicChange}
          onSelectTopic={handleSelectTopic}
          onStart={handleStartFromPicker}
        />
      )}
    </div>
  );
}
