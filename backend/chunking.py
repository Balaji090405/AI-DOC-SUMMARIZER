def chunk_text(text: str, chunk_size: int = 800, overlap: int = 150) -> list[str]:
    words = text.split()
    if not words:
        return []
    chunks = []
    start = 0
    while start < len(words):
        end = start + chunk_size
        chunks.append(" ".join(words[start:end]))
        if end >= len(words):
            break
        start = end - overlap
    return chunks


def chunk_pages(pages: list[dict], chunk_size: int = 800, overlap: int = 150) -> list[dict]:
    chunks = []
    for page in pages:
        page_chunks = chunk_text(page["text"], chunk_size, overlap)
        for c in page_chunks:
            chunks.append({"text": c, "page_number": page["page_number"]})
    return chunks