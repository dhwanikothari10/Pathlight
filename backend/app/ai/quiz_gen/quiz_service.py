"""
Generates multiple-choice quiz questions from a lecture's transcript using the LLM.
"""

import json
import re
from app.ai.llm_client import ask_llm

SYSTEM_PROMPT = """You are an instructional designer. Given a lecture transcript, generate
multiple-choice quiz questions that test understanding of the key concepts.
Return ONLY a valid JSON array, no other text, where each item has this exact shape:
{
  "question_text": string,
  "option_a": string,
  "option_b": string,
  "option_c": string,
  "option_d": string,
  "correct_option": "A" | "B" | "C" | "D",
  "explanation": string
}"""


def _extract_json_array(raw: str) -> str:
    """
    Strips markdown code fences and, as a fallback, pulls out just the
    [...] array if the model wrapped it in any stray text -- some responses
    add a stray sentence before/after the array despite the "ONLY JSON"
    instruction.
    """
    cleaned = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()

    if cleaned.startswith("[") and cleaned.endswith("]"):
        return cleaned

    match = re.search(r"\[.*\]", cleaned, re.DOTALL)
    return match.group(0) if match else cleaned


def generate_quiz_questions(transcript: str, num_questions: int = 5) -> list[dict]:
    if not transcript:
        return []

    user_message = f"Generate {num_questions} multiple-choice questions from this lecture transcript:\n\n{transcript}"
    # 2000 tokens is too tight for a full 5-question JSON array (each with 4
    # options + an explanation) once thinking-model reasoning overhead is
    # factored in -- the response was getting cut off mid-JSON, which
    # json.loads then failed on silently. 4096 gives enough headroom.
    raw = ask_llm(SYSTEM_PROMPT, user_message, max_tokens=4096)

    cleaned = _extract_json_array(raw)

    try:
        questions = json.loads(cleaned)
    except json.JSONDecodeError as e:
        print(f"[generate_quiz_questions] failed to parse LLM response as JSON: {e}")
        print(f"[generate_quiz_questions] raw response (first 1000 chars): {raw[:1000]}")
        return []

    return questions