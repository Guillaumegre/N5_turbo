"""Theme catalogue and the rule-based first proposal.

The rules only *propose*; tools/overrides/themes.csv (reviewed by hand) is the source of truth.
"""

from __future__ import annotations

import re

THEMES: list[tuple[str, str]] = [
    ("colors", "Colors"),
    ("animals", "Animals"),
    ("people", "Family & People"),
    ("body", "Body"),
    ("food", "Food & Drink"),
    ("numbers", "Numbers & Counters"),
    ("time", "Time & Calendar"),
    ("nature", "Weather & Nature"),
    ("places", "Places & Directions"),
    ("transport", "Transport"),
    ("school_work", "School & Work"),
    ("clothes", "Clothes"),
    ("home", "Home & Objects"),
    ("actions", "Daily Actions"),
    ("adjectives", "Feelings & Adjectives"),
    ("questions", "Question words & Particles"),
    ("leisure", "Hobbies & Leisure"),
    ("other", "Other"),
]
THEME_IDS = {t for t, _ in THEMES}

# English keywords (whole words, matched against the gloss) -> theme
KEYWORDS: dict[str, list[str]] = {
    "colors": ["red", "blue", "white", "black", "yellow", "green", "brown", "colour", "color"],
    "animals": ["dog", "cat", "bird", "fish", "animal", "cow", "horse", "pet"],
    "people": ["mother", "father", "brother", "sister", "family", "child", "children", "parent", "parents",
               "wife", "husband", "man", "woman", "person", "people", "friend", "aunt", "uncle", "grandmother",
               "grandfather", "adult", "boy", "girl", "foreigner", "everyone", "everybody", "i", "me", "you",
               "he", "she", "him", "her", "oneself", "doctor", "police", "policeman", "teacher", "student",
               "siblings", "grandchild", "mr", "mrs", "ms", "miss", "older", "younger"],
    "body": ["head", "eye", "eyes", "ear", "mouth", "nose", "hand", "foot", "leg", "face", "body", "tooth",
             "teeth", "stomach", "belly", "back", "voice", "arm", "hair", "cold", "medicine", "sick", "ill"],
    "food": ["food", "eat", "drink", "water", "tea", "coffee", "milk", "rice", "meal", "breakfast", "lunch",
             "dinner", "bread", "meat", "egg", "vegetable", "vegetables", "fruit", "sweets", "candy", "sugar",
             "salt", "alcohol", "sake", "cake", "delicious", "tasty", "sweet", "spicy", "hot", "cup",
             "chopsticks", "restaurant", "cafeteria", "dining", "cook", "cooking", "butter", "soy", "curry",
             "juice", "beer", "apple", "snack", "confections", "hungry"],
    "numbers": ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "hundred",
                "thousand", "zero", "number", "counter", "times", "half", "first", "second", "third",
                "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    "time": ["day", "days", "week", "month", "year", "years", "today", "tomorrow", "yesterday", "morning",
             "evening", "night", "noon", "afternoon", "hour", "minute", "time", "o'clock", "monday", "tuesday",
             "wednesday", "thursday", "friday", "saturday", "sunday", "spring", "summer", "autumn", "fall",
             "winter", "now", "every", "before", "after", "always", "often", "sometimes", "soon", "already",
             "still", "yet", "early", "late", "birthday", "holiday", "vacation", "season", "last", "next",
             "ago", "later", "while", "when", "tonight", "everyday", "date", "calendar", "weekday"],
    "nature": ["rain", "snow", "wind", "weather", "sky", "cloudy", "cloud", "mountain", "river", "sea",
               "tree", "flower", "hot", "cold", "warm", "cool", "sunny", "fine", "pond", "nature", "clear",
               "ocean"],
    "places": ["north", "south", "east", "west", "right", "left", "above", "below", "under", "up", "down",
               "front", "behind", "inside", "outside", "near", "far", "side", "between", "here", "there",
               "place", "country", "city", "town", "station", "hospital", "bank", "post", "shop", "store",
               "department", "library", "park", "toilet", "bathroom", "building", "road", "street", "corner",
               "intersection", "entrance", "exit", "embassy", "foreign", "abroad", "map", "village", "where",
               "neighbourhood", "neighborhood", "japan", "around", "middle", "centre", "center", "direction",
               "way", "bridge", "cinema", "theatre", "hotel", "office"],
    "transport": ["car", "train", "bus", "taxi", "airplane", "aeroplane", "plane", "bicycle", "subway",
                  "ship", "boat", "ride", "board", "get off", "vehicle", "automobile", "airport", "ticket"],
    "school_work": ["school", "university", "college", "class", "lesson", "study", "test", "exam",
                    "examination", "homework", "question", "answer", "teacher", "student", "company", "work",
                    "job", "pen", "pencil", "notebook", "dictionary", "book", "paper", "write", "read", "learn",
                    "kanji", "word", "sentence", "language", "english", "japanese", "letter", "practice",
                    "practise", "classroom", "blackboard", "katakana", "hiragana", "page", "problem", "teach",
                    "meaning", "business", "employee"],
    "clothes": ["clothes", "clothing", "shirt", "skirt", "trousers", "pants", "shoes", "socks", "hat", "cap",
                "coat", "sweater", "glasses", "spectacles", "necktie", "tie", "wear", "put on", "take off",
                "pocket", "suit", "jacket", "dress", "western-style", "slippers", "button"],
    "home": ["house", "home", "room", "door", "window", "desk", "chair", "bed", "table", "bath", "kitchen",
             "key", "box", "bag", "umbrella", "phone", "telephone", "television", "radio", "camera",
             "refrigerator", "stove", "light", "electricity", "clock", "watch", "newspaper", "magazine",
             "picture", "photograph", "photo", "record", "stamp", "envelope", "postcard", "knife", "spoon",
             "fork", "apartment", "garden", "wall", "stairs", "elevator", "money", "wallet", "thing", "things",
             "ashtray", "vase", "cupboard", "bookshelf", "glass", "tobacco", "cigarettes", "computer",
             "guitar", "film", "movie", "song", "music", "gift", "present", "ball", "pool", "shower", "sport",
             "sports", "game", "hobby"],
    "questions": ["who", "what", "where", "when", "why", "how", "which", "this", "that", "these", "those",
                  "particle", "question"],
}

PARENS_RE = re.compile(r"\([^)]*\)")
WORD_RE = re.compile(r"[a-z0-9']+(?:-[a-z]+)?")


def words_of(text: str) -> set[str]:
    text = PARENS_RE.sub(" ", text.lower())
    return set(WORD_RE.findall(text))


def propose(meaning: str, pos: str, gloss_extra: str = "") -> list[str]:
    ws = words_of(meaning) | words_of(gloss_extra)
    text = f" {meaning.lower()} {gloss_extra.lower()} "
    found: list[str] = []
    for theme, kws in KEYWORDS.items():
        if any((k in ws) if " " not in k else (f" {k} " in text) for k in kws):
            found.append(theme)
    if pos == "verb" and "actions" not in found:
        found.append("actions")
    if pos in ("i-adj", "na-adj") and "adjectives" not in found:
        found.append("adjectives")
    if pos in ("counter",) and "numbers" not in found:
        found.append("numbers")
    if pos == "particle" and "questions" not in found:
        found.append("questions")
    return found or ["other"]
