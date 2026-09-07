import os
from pymongo import MongoClient
from gridfs import GridFS
from bson import ObjectId
from dotenv import load_dotenv

from extraction import extract_text
from retrieval import process_and_store_chunks

load_dotenv()

client = MongoClient(os.getenv("MONGODB_URI"))
db = client["ai_doc_summarizer"]
fs = GridFS(db)
projects_collection = db["projects"]


def process_project(project_id: str):
    doc = projects_collection.find_one({"_id": ObjectId(project_id)})
    if not doc:
        raise ValueError("Project not found")

    projects_collection.update_one({"_id": doc["_id"]}, {"$set": {"status": "processing"}})

    try:
        file_bytes = fs.get(doc["grid_file_id"]).read()
        full_text, pages = extract_text(file_bytes, doc["content_type"])

        projects_collection.update_one(
            {"_id": doc["_id"]}, {"$set": {"extracted_text": full_text}}
        )

        chunk_count = process_and_store_chunks(project_id, pages)

        projects_collection.update_one(
            {"_id": doc["_id"]},
            {"$set": {"status": "ready", "chunk_count": chunk_count, "page_count": len(pages)}},
        )
    except Exception as e:
        projects_collection.update_one(
            {"_id": doc["_id"]}, {"$set": {"status": "failed", "error": str(e)}}
        )
        raise