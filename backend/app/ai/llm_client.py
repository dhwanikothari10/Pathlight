"""
Thin wrapper around the LLM provider so all AI features (Q&A, NL search,
quiz generation) call a single ask_llm() function regardless of provider.

Switch providers via LLM_PROVIDER in .env ("anthropic" or "gemini") --
no other file in the codebase needs to change.
"""

from app.core.config import settings


def _ask_anthropic(system_prompt: str, user_message: str, max_tokens: int) -> str:
    from anthropic import Anthropic

    client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    response = client.messages.create(
        model=settings.LLM_MODEL,
        max_tokens=max_tokens,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )
    return "".join(block.text for block in response.content if block.type == "text")


def _ask_gemini(system_prompt: str, user_message: str, max_tokens: int) -> str:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    response = client.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=user_message,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            max_output_tokens=max_tokens,
        ),
    )
    return response.text or ""


def ask_llm(system_prompt: str, user_message: str, max_tokens: int = 1024) -> str:
    if settings.LLM_PROVIDER == "gemini":
        return _ask_gemini(system_prompt, user_message, max_tokens)
    return _ask_anthropic(system_prompt, user_message, max_tokens)
