import os
import numpy as np
from pymongo import MongoClient
from dotenv import load_dotenv

from embeddings import embed_text, embed_batch
from chunking import chunk_pages

load_dotenv()

client = MongoClient(os.getenv("MONGODB_URL"))
db = client["ai_doc_summarizer"]
chunks_collection = db["chunks"]


def process_and_store_chunks(project_id: str, pages: list[dict]):
    chunks_collection.delete_many({"project_id": project_id})

    pieces = chunk_pages(pages)
    if not pieces:
        return 0

    texts = [p["text"] for p in pieces]
    vectors = embed_batch(texts)

    docs = [
        {
            "project_id": project_id,
            "chunk_index": i,
            "text": p["text"],
            "page_number": p["page_number"],
            "embedding": vector,
        }
        for i, (p, vector) in enumerate(zip(pieces, vectors))
    ]
    chunks_collection.insert_many(docs)
    return len(docs)


def cosine_similarity(a, b) -> float:
    a_arr = np.array(a)
    b_arr = np.array(b)
    return float(np.dot(a_arr, b_arr) / (np.linalg.norm(a_arr) * np.linalg.norm(b_arr)))


def retrieve_top_chunks(project_id: str, query: str, top_k: int = 4) -> list[dict]:
    query_vector = embed_text(query)
    candidates = list(chunks_collection.find({"project_id": project_id}))
    if not candidates:
        return []

    scored = [
        {
            "text": c["text"],
            "page_number": c.get("page_number", 1),
            "chunk_index": c["chunk_index"],
            "score": cosine_similarity(query_vector, c["embedding"]),
        }
        for c in candidates
    ]
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:top_k]
