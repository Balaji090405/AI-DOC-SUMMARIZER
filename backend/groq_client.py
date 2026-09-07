import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL = "openai/gpt-oss-20b"


def generate_summary(text: str) -> str:
    truncated = text[:15000]
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an expert AI summarization assistant. Synthesize, rephrase, and explain the key concepts, core sections, and major takeaways of the document in your own original words. "
                    "Do NOT copy-paste raw verbatim text. Present the summary in a clean, well-structured format using clear bullet points and bold headings."
                ),
            },
            {"role": "user", "content": f"Summarize this document:\n\n{truncated}"},
        ],
        temperature=0.4,
        max_tokens=1000,
    )
    return response.choices[0].message.content


def stream_answer(question: str, context_chunks: list[dict]):
    context = "\n\n---\n\n".join(
        f"[Page {c['page_number']}]\n{c['text']}" for c in context_chunks
    )
    stream = client.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an expert AI document assistant. Answer the user's question clearly in your own words based on the information in the provided context. "
                    "Do NOT copy-paste raw text passages or output verbatim sentences from the document. Synthesize, rephrase, and explain the core concepts and answers in a structured, easy-to-read, and insightful format. "
                    "When presenting differentiations, comparisons, step-by-step processes, or structured multi-attribute information, ALWAYS format the data using clean Markdown tables (| Feature | Description |). "
                    "Do NOT include inline page citations, (Page X) brackets, or Page Reference columns in your answer text. "
                    "If the answer is not present or cannot be inferred from the provided context, respond strictly with: 'This is not found in the document.'"
                ),
            },
            {"role": "user", "content": f"Context:\n\n{context}\n\nQuestion: {question}"},
        ],
        temperature=0.5,
        max_tokens=700,
        stream=True,
    )
    for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta
