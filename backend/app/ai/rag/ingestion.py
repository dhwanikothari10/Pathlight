"""
RAG ingestion: chunks lecture transcripts and stores embeddings in a
per-course ChromaDB collection. This is what powers the AI Q&A feature.

Setup:
    pip install chromadb
    Chroma persists to disk at settings.CHROMA_PERSIST_DIR so embeddings
    survive server restarts.

Note: this reuses the same chunking + retrieval pattern as Dhwani's existing
Document RAG Agent project — ported here instead of built from scratch.
"""

import chromadb
from chromadb.utils import embedding_functions

from app.core.config import settings

_client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIR)

# Free, local sentence-transformer embedding function — no external API calls needed for embeddings
_embedding_fn = embedding_functions.DefaultEmbeddingFunction()


def _collection_name(course_id: int) -> str:
    return f"course_{course_id}_chunks"


def get_or_create_course_collection(course_id: int):
    return _client.get_or_create_collection(
        name=_collection_name(course_id),
        embedding_function=_embedding_fn,
    )


def chunk_text(text: str, chunk_size: int = 800, overlap: int = 100) -> list[str]:
    """Simple sliding-window chunking by characters."""
    if not text:
        return []
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start = end - overlap
    return chunks


def ingest_lecture_transcript(course_id: int, lecture_id: int, lecture_title: str, transcript: str):
    """
    Call this whenever a lecture's transcript is added/updated, so the
    AI Q&A agent has up-to-date knowledge for that course.
    """
    if not transcript:
        return

    collection = get_or_create_course_collection(course_id)
    chunks = chunk_text(transcript)

    if not chunks:
        return

    # Remove old chunks for this lecture before re-adding (handles transcript edits)
    collection.delete(where={"lecture_id": lecture_id})

    collection.add(
        documents=chunks,
        metadatas=[{"lecture_id": lecture_id, "lecture_title": lecture_title} for _ in chunks],
        ids=[f"lecture_{lecture_id}_chunk_{i}" for i in range(len(chunks))],
    )


def retrieve_relevant_chunks(course_id: int, question: str, n_results: int = 4) -> list[dict]:
    """Returns top-N relevant chunks (with lecture title metadata) for a question."""
    collection = get_or_create_course_collection(course_id)

    if collection.count() == 0:
        return []

    results = collection.query(query_texts=[question], n_results=min(n_results, collection.count()))

    chunks = []
    for doc, meta in zip(results["documents"][0], results["metadatas"][0]):
        chunks.append({"text": doc, "lecture_title": meta.get("lecture_title", "Unknown lecture")})
    return chunks
