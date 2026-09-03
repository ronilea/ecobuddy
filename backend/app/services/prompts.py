BUDDY_SYSTEM = """You are EcoBuddy, a curious peer study buddy for environmental science.
Tone: warm, exploratory, collaborative. Use "we" and "let's". Never condescending.
Generate factual, age-appropriate multiple-choice questions about the student's topic.
Exactly 4 distinct options with one clearly correct answer. No trick questions.
Never ask substantively the same question twice in one session - different wording still counts
as a duplicate if it tests the same fact (e.g. two questions about deforestation driving climate change).
Return only the requested JSON object with no markdown fences, no preface, and no extra keys."""

QUESTION_USER_TEMPLATE = """Topic: {topic}

Previous session history:
{history}

Concepts already covered this session (do NOT repeat or lightly rephrase):
{covered_concepts}

Adaptation instruction: {adaptation}

Return exactly one JSON object with these fields and no others:
stem, options (array of 4 strings), correct_index (0-3),
explanation (1 sentence - states the correct answer, buddy-voiced),
explanation_why (1-2 sentences - why/how the correct answer works, curious peer tone),
difficulty (easy|medium|hard), focus_concept (short label), buddy_intro (curious peer line before the question),
buddy_hint (supportive thinking nudge - guides without revealing the answer, one short sentence).

Rules:
- Return raw JSON only. No markdown fences or extra commentary.
- Return exactly one JSON object with those fields and no others.
- options must contain exactly 4 distinct, non-empty strings.
- Include exactly 1 correct answer and 3 plausible but incorrect distractors.
- Do not use "all of the above" or "none of the above".
- Keep focus_concept concrete and short (1-4 words), not a sentence.
- All string fields must be non-empty.
- Keep the question factual, clear, and age-appropriate."""

INSIGHTS_USER_TEMPLATE = """Topic: {topic}

Student answer history:
{history}

Write session insights grounded ONLY in the data above.
Return JSON with: strengths (2-4 bullets), gaps (2-4 bullets),
recommended_next_steps (2-3 bullets), buddy_summary (2-3 curious-peer sentences).

Rules:
- Return raw JSON only. No markdown fences or extra commentary.
- Do not invent evidence that is not present in the history.
- Mention concrete concepts from the history when possible.
- If the evidence is sparse, stay modest and specific rather than generalizing."""


def format_history(entries: list[dict]) -> str:
    if not entries:
        return "(none - this is the first question)"
    lines = []
    for entry in entries:
        mark = "correct" if entry["is_correct"] else "wrong"
        lines.append(
            f"- Q{entry['sequence_number']}: [{entry['focus_concept']}] {entry['stem'][:80]}... "
            f"-> {mark}. Concept: {entry['focus_concept']}"
        )
    return "\n".join(lines)


def covered_concepts_summary(entries: list[dict]) -> str:
    if not entries:
        return "(none yet)"
    return ", ".join(entry["focus_concept"] for entry in entries)


def adaptation_instruction(last_entry: dict | None, history: list[dict]) -> str:
    if last_entry is None:
        return "First question: medium difficulty, introduce the topic warmly."
    if last_entry["is_correct"]:
        used = covered_concepts_summary(history)
        return (
            "Student answered correctly. Choose a clearly different "
            f"sub-topic within the session topic. Do NOT reuse or synonym-swap these concepts: {used}. "
            "Pick a fresh focus_concept, not the previous one, and avoid repeating the same fact in new words."
        )
    return (
        "Student answered incorrectly. Reinforce the same learning goal with an easier, more concrete question "
        f"and different framing. focus_concept must stay '{last_entry['focus_concept']}'. "
        f"The stem must test the same idea differently - do NOT repeat: \"{last_entry['stem'][:120]}\""
    )
