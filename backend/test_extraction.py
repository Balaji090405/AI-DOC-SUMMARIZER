import sys
from extraction import extract_text
from chunking import chunk_text


def main(path: str, content_type: str):
    with open(path, "rb") as f:
        file_bytes = f.read()

    text = extract_text(file_bytes, content_type)
    print(f"--- Extracted {len(text)} chars ---")
    print(text[:500])

    chunks = chunk_text(text)
    print(f"\n--- {len(chunks)} chunks ---")
    for i, c in enumerate(chunks[:3]):
        print(f"\nChunk {i}: {c[:200]}")


if __name__ == "__main__":
    path = sys.argv[1]
    content_type = sys.argv[2]
    main(path, content_type)
