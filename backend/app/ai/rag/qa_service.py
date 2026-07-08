"""
Generates an answer to a student's question using retrieved lecture chunks
as context (the "generation" half of RAG).
"""

from app.ai.rag.ingestion import retrieve_relevant_chunks
from app.ai.llm_client import ask_llm

SYSTEM_PROMPT = """You are a helpful teaching assistant for an online course.
Answer the student's question using ONLY the provided lecture excerpts as context.
If the excerpts don't contain enough information to answer, say so honestly
rather than guessing. Keep answers concise and clear."""


def answer_question(course_id: int, question: str) -> dict:
    chunks = retrieve_relevant_chunks(course_id, question)

    if not chunks:
        return {
            "answer": "I don't have enough course content indexed yet to answer that. "
                      "Try asking after the instructor has added lecture transcripts/notes.",
            "source_lectures": [],
        }

    context = "\n\n".join(f"[From: {c['lecture_title']}]\n{c['text']}" for c in chunks)
    user_message = f"Course lecture excerpts:\n\n{context}\n\nStudent question: {question}"

    answer = ask_llm(SYSTEM_PROMPT, user_message)
    source_lectures = list({c["lecture_title"] for c in chunks})

    return {"answer": answer, "source_lectures": source_lectures}
