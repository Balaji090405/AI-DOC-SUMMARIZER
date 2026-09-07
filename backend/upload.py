import os
from datetime import datetime, timezone
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from pymongo import MongoClient
from gridfs import GridFS
from bson import ObjectId
from dotenv import load_dotenv

from auth import get_current_user, UserResponse
from process import process_project

load_dotenv()

client = MongoClient(os.getenv("MONGODB_URI"))
db = client["ai_doc_summarizer"]
fs = GridFS(db)
projects_collection = db["projects"]

router = APIRouter(prefix="/projects", tags=["projects"])

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB
ALLOWED_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
}


class ProjectResponse(BaseModel):
    id: str
    filename: str
    content_type: str
    size: int
    status: str
    created_at: datetime


@router.post("/upload", response_model=ProjectResponse)
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: UserResponse = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 20MB)")

    grid_id = fs.put(contents, filename=file.filename, content_type=file.content_type)

    project_doc = {
        "user_id": current_user.id,
        "filename": file.filename,
        "content_type": file.content_type,
        "size": len(contents),
        "grid_file_id": grid_id,
        "status": "uploaded",
        "extracted_text": None,
        "summary": None,
        "created_at": datetime.now(timezone.utc),
    }
    result = projects_collection.insert_one(project_doc)

    background_tasks.add_task(process_project, str(result.inserted_id))

    return ProjectResponse(
        id=str(result.inserted_id),
        filename=file.filename,
        content_type=file.content_type,
        size=len(contents),
        status="uploaded",
        created_at=project_doc["created_at"],
    )


@router.get("", response_model=list[ProjectResponse])
def list_projects(current_user: UserResponse = Depends(get_current_user)):
    docs = projects_collection.find({"user_id": current_user.id}).sort("created_at", -1)
    return [
        ProjectResponse(
            id=str(d["_id"]),
            filename=d["filename"],
            content_type=d["content_type"],
            size=d["size"],
            status=d["status"],
            created_at=d["created_at"],
        )
        for d in docs
    ]


@router.get("/{project_id}/file")
def get_file(project_id: str, token: str):
    from auth import decode_access_token
    payload = decode_access_token(token)
    user_id = payload.get("sub")

    doc = projects_collection.find_one(
        {"_id": ObjectId(project_id), "user_id": user_id}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found")

    grid_file = fs.get(doc["grid_file_id"])
    return StreamingResponse(
        grid_file,
        media_type=doc["content_type"],
        headers={"Content-Disposition": f'inline; filename="{doc["filename"]}"'},
    )

@router.delete("/{project_id}")
def delete_project(project_id: str, current_user: UserResponse = Depends(get_current_user)):
    doc = projects_collection.find_one(
        {"_id": ObjectId(project_id), "user_id": current_user.id}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found")

    fs.delete(doc["grid_file_id"])
    projects_collection.delete_one({"_id": doc["_id"]})
    return {"deleted": True}