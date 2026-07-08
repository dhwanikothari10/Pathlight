"""
Natural language course search: converts a free-text query like
"I want to learn web scraping for beginners under $50" into structured
filters, then queries the courses table — same pattern as Dhwani's
existing NL-to-SQL agent, adapted to a fixed filter schema instead of
arbitrary SQL (safer: no risk of LLM-generated SQL injection).
"""

import json
from app.ai.llm_client import ask_llm

SYSTEM_PROMPT = """You convert a student's natural language course search into a JSON filter object.
Return ONLY valid JSON, no other text, matching this exact shape:
{
  "category": string or null,
  "level": "beginner" | "intermediate" | "advanced" or null,
  "min_price": number or null,
  "max_price": number or null,
  "keyword": string or null
}
Infer "level" from words like "beginner", "advanced", etc. Infer "keyword" from the core topic
(e.g. "web scraping"). Infer price bounds from phrases like "under $50". If something isn't
mentioned, use null for that field."""


def parse_nl_query_to_filters(query: str) -> dict:
    raw = ask_llm(SYSTEM_PROMPT, query, max_tokens=300)

    # Defensive parsing in case the LLM wraps JSON in markdown fences
    cleaned = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()

    try:
        filters = json.loads(cleaned)
    except json.JSONDecodeError:
        # Fall back to a pure keyword search using the raw query if parsing fails
        filters = {"category": None, "level": None, "min_price": None, "max_price": None, "keyword": query}

    return filters
