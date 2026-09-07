import io
import pymupdf
import pytesseract
from PIL import Image


def extract_pages_from_pdf(file_bytes: bytes) -> list[dict]:
    pages = []
    doc = pymupdf.open(stream=file_bytes, filetype="pdf")
    for i, page in enumerate(doc):
        text = page.get_text().strip()
        if text:
            pages.append({"page_number": i + 1, "text": text})
    doc.close()
    return pages


def extract_text_from_image(file_bytes: bytes) -> str:
    image = Image.open(io.BytesIO(file_bytes))
    text = pytesseract.image_to_string(image)
    return text.strip()


def extract_text(file_bytes: bytes, content_type: str):
    if content_type == "application/pdf":
        pages = extract_pages_from_pdf(file_bytes)
        full_text = "\n\n".join(p["text"] for p in pages)
        return full_text, pages
    elif content_type in ("image/png", "image/jpeg", "image/jpg", "image/webp"):
        text = extract_text_from_image(file_bytes)
        return text, [{"page_number": 1, "text": text}] if text else []
    else:
        raise ValueError(f"Unsupported content type: {content_type}")