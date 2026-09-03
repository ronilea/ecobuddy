TOTAL_QUESTIONS = 8
QUESTIONS_PER_SET = 4
STREAK_LENGTH = 3
COIN_STREAK_BONUS = 1
COIN_SET_COMPLETE = 5

SUGGESTED_TOPICS = [
    "Climate change",
    "Biodiversity",
    "Renewable energy",
    "Water cycle",
    "Pollution",
]

# Keep in sync with frontend/src/config/outfits.ts costs
OUTFIT_COSTS: dict[str, int] = {
    "default": 0,
    "coolHat": 1,
    "ranger": 5,
    "labCoat": 10,
    "recycler": 15,
    "solarScout": 20,
}
DEFAULT_OUTFIT_ID = "default"
