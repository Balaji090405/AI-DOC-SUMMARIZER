import os
import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv

from auth import get_current_user, UserResponse
from retrieval import retrieve_top_chunks
from groq_client import generate_summary, stream_answer
from limiter import limiter

load_dotenv()

client = MongoClient(os.getenv("MONGODB_URI"))
db = client["ai_doc_summarizer"]
projects_collection = db["projects"]
chat_history_collection = db["chat_history"]

router = APIRouter(prefix="/projects", tags=["ai"])


class SummaryResponse(BaseModel):
    summary: str


class ChatRequest(BaseModel):
    question: str


class ChatMessage(BaseModel):
    role: str
    content: str
    created_at: datetime


def get_owned_project(project_id: str, user_id: str):
    doc = projects_collection.find_one({"_id": ObjectId(project_id), "user_id": user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found")
    return doc


@router.post("/{project_id}/summarize", response_model=SummaryResponse)
def summarize_project(project_id: str, current_user: UserResponse = Depends(get_current_user)):
    doc = get_owned_project(project_id, current_user.id)
    if doc.get("summary"):
        return SummaryResponse(summary=doc["summary"])
    if doc["status"] != "ready" or not doc.get("extracted_text"):
        raise HTTPException(status_code=400, detail="Document is still processing")
    summary = generate_summary(doc["extracted_text"])
    projects_collection.update_one({"_id": doc["_id"]}, {"$set": {"summary": summary}})
    return SummaryResponse(summary=summary)


@router.post("/{project_id}/chat/stream")
@limiter.limit("20/minute")
def chat_stream(
    request: Request,
    project_id: str,
    payload: ChatRequest,
    current_user: UserResponse = Depends(get_current_user),
):
    doc = get_owned_project(project_id, current_user.id)
    if doc["status"] != "ready":
        raise HTTPException(status_code=400, detail="Document is still processing")

    top_chunks = retrieve_top_chunks(project_id, payload.question, top_k=4)

    def event_generator():
        full_answer = ""
        sources = [
            {"page_number": c["page_number"], "text": c["text"][:200]} for c in top_chunks
        ]
        yield f"data: {json.dumps({'type': 'sources', 'sources': sources})}\n\n"

        if not top_chunks:
            answer = "This is not found in the document."
            yield f"data: {json.dumps({'type': 'token', 'content': answer})}\n\n"
            full_answer = answer
        else:
            for token in stream_answer(payload.question, top_chunks):
                full_answer += token
                yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"

        now = datetime.now(timezone.utc)
        chat_history_collection.insert_one(
            {"project_id": project_id, "role": "user", "content": payload.question, "created_at": now}
        )
        chat_history_collection.insert_one(
            {"project_id": project_id, "role": "assistant", "content": full_answer, "created_at": now}
        )
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/{project_id}/chat/history", response_model=list[ChatMessage])
def get_chat_history(project_id: str, current_user: UserResponse = Depends(get_current_user)):
    get_owned_project(project_id, current_user.id)
    docs = chat_history_collection.find({"project_id": project_id}).sort("created_at", 1)
    return [ChatMessage(role=d["role"], content=d["content"], created_at=d["created_at"]) for d in docs]


@router.delete("/{project_id}/chat/history")
def clear_chat_history(project_id: str, current_user: UserResponse = Depends(get_current_user)):
    get_owned_project(project_id, current_user.id)
    chat_history_collection.delete_many({"project_id": project_id})
    return {"message": "Chat history cleared successfully"}