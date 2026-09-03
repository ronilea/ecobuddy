export type AnswerOption = {
  option_index: number;
  text: string;
};

export type StudentAnswer = {
  selected_option_index: number;
  is_correct: boolean;
  answered_at: string;
};

export type Question = {
  id: string;
  sequence_number: number;
  stem: string;
  focus_concept: string;
  options: AnswerOption[];
  buddy_intro: string | null;
  buddy_hint: string | null;
  answer: StudentAnswer | null;
  explanation: string | null;
  correct_option_index: number | null;
};

export type SessionSummary = {
  strengths: string[];
  gaps: string[];
  recommended_next_steps: string[];
  buddy_summary: string;
};

export type Session = {
  id: string;
  topic: string;
  status: "active" | "completed";
  started_at: string;
  completed_at: string | null;
  questions: Question[];
  current_question_id: string | null;
  answered_count: number;
  total_questions: number;
  summary: SessionSummary | null;
};

export type CoinEvent = {
  streak_bonus: boolean;
  set_complete_bonus: boolean;
  coins_earned: number;
};

export type AnswerFeedback = {
  is_correct: boolean;
  correct_option_index: number;
  explanation: string;
  explanation_why?: string | null;
  coins: CoinEvent;
  quiz_complete: boolean;
};

export type Wallet = {
  player_id: string;
  coins: number;
  owned_outfits: string[];
  equipped_outfit_id: string;
};

const API = "/api";
const PLAYER_KEY = "ecobuddy_player_id";

export const SUPPORT_ERROR =
  "Something went wrong. Please try again later or contact our team at abendroni@gmail.com.";

async function apiError(res: Response): Promise<never> {
  let detail = "";
  try {
    detail = await res.text();
  } catch (err) {
    console.error("Failed reading error body", err);
  }
  console.error(`API ${res.status} ${res.url}`, detail || res.statusText);
  throw new Error(SUPPORT_ERROR);
}

export function getOrCreatePlayerId(): string {
  let id = localStorage.getItem(PLAYER_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(PLAYER_KEY, id);
  }
  return id;
}

function playerHeaders(json = true): HeadersInit {
  const headers: Record<string, string> = {
    "X-Player-Id": getOrCreatePlayerId(),
  };
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) await apiError(res);
  return res.json() as Promise<T>;
}

export async function fetchTopics(): Promise<string[]> {
  const res = await fetch(`${API}/topics`);
  const data = await parseJson<{ topics: string[] }>(res);
  return data.topics;
}

export async function createSession(topic: string): Promise<Session> {
  const res = await fetch(`${API}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic }),
  });
  return parseJson<Session>(res);
}

export async function getSession(sessionId: string): Promise<Session> {
  const res = await fetch(`${API}/sessions/${sessionId}`);
  return parseJson<Session>(res);
}

export async function submitAnswer(
  sessionId: string,
  questionId: string,
  selectedOptionIndex: number
): Promise<{ feedback: AnswerFeedback; session: Session }> {
  const res = await fetch(`${API}/sessions/${sessionId}/answers`, {
    method: "POST",
    headers: playerHeaders(),
    body: JSON.stringify({
      question_id: questionId,
      selected_option_index: selectedOptionIndex,
    }),
  });
  return parseJson(res);
}

export async function fetchWallet(): Promise<Wallet> {
  const res = await fetch(`${API}/wallet`, { headers: playerHeaders(false) });
  return parseJson<Wallet>(res);
}

export async function purchaseOutfit(outfitId: string): Promise<Wallet> {
  const res = await fetch(`${API}/wallet/purchase`, {
    method: "POST",
    headers: playerHeaders(),
    body: JSON.stringify({ outfit_id: outfitId }),
  });
  return parseJson<Wallet>(res);
}

export async function equipOutfitRequest(outfitId: string): Promise<Wallet> {
  const res = await fetch(`${API}/wallet/equip`, {
    method: "POST",
    headers: playerHeaders(),
    body: JSON.stringify({ outfit_id: outfitId }),
  });
  return parseJson<Wallet>(res);
}
