"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { uploadFile, listProjects, deleteProject } from "@/lib/api";
import { getToken, clearToken } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";

function getRenamedMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem("renamed_documents") || "{}");
  } catch {
    return {};
  }
}

function saveRenamedMap(map: Record<string, string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem("renamed_documents", JSON.stringify(map));
}

function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot <= 0) return "";
  return filename.slice(lastDot);
}

function getBaseName(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot <= 0) return filename;
  return filename.slice(0, lastDot);
}

function ensureExtension(newName: string, originalFilename: string): string {
  const trimmed = newName.trim();
  if (!trimmed) return originalFilename;

  const ext = getFileExtension(originalFilename);
  if (!ext) return trimmed;

  if (trimmed.toLowerCase().endsWith(ext.toLowerCase())) {
    return trimmed;
  }

  const cleanBase = trimmed.replace(/\.+$/, "");
  return `${cleanBase}${ext}`;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; dot: string }> = {
    uploaded: {
      bg: "bg-amber-50 text-amber-700 border-amber-200/80",
      dot: "bg-amber-500",
    },
    processing: {
      bg: "bg-blue-50 text-blue-700 border-blue-200/80",
      dot: "bg-blue-500 animate-ping",
    },
    ready: {
      bg: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
      dot: "bg-emerald-500",
    },
    failed: {
      bg: "bg-red-50 text-red-700 border-red-200/80",
      dot: "bg-red-500",
    },
  };

  const style = styles[status] || {
    bg: "bg-slate-50 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border shadow-2xs ${style.bg}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className={`inline-flex rounded-full h-1.5 w-1.5 ${style.dot}`} />
      </span>
      <span className="capitalize">{status}</span>
    </span>
  );
}

function FileIcon({ contentType }: { contentType: string }) {
  const isImage = contentType?.startsWith("image/");
  return (
    <div
      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-xs transition-transform duration-200 group-hover:scale-105 ${
        isImage
          ? "bg-gradient-to-br from-violet-100 to-purple-50 text-violet-600 border border-violet-200/60"
          : "bg-gradient-to-br from-indigo-100 to-blue-50 text-indigo-600 border border-indigo-200/60"
      }`}
    >
      {isImage ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      )}
    </div>
  );
}

function ProjectCard({
  project,
  onDelete,
  onRename,
}: {
  project: any;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onRename: (id: string, newName: string) => void;
}) {
  const isImage = project.content_type?.startsWith("image/");
  const [isEditing, setIsEditing] = useState(false);
  const ext = getFileExtension(project.filename);
  const [baseName, setBaseName] = useState(getBaseName(project.filename));

  useEffect(() => {
    setBaseName(getBaseName(project.filename));
  }, [project.filename]);

  function handleSave(e: React.MouseEvent | React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    const finalName = ensureExtension(baseName, project.filename);
    if (finalName.trim() && finalName !== project.filename) {
      onRename(project.id, finalName);
    }
    setIsEditing(false);
  }

  function handleCancel(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setBaseName(getBaseName(project.filename));
    setIsEditing(false);
  }

  function handleStartEdit(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setBaseName(getBaseName(project.filename));
    setIsEditing(true);
  }

  return (
    <a
      href={`/project/${project.id}`}
      className="group bg-white border border-slate-200/80 rounded-2xl p-5 hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-200/80 hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between animate-fade-in block"
    >
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <FileIcon contentType={project.content_type} />
          <StatusBadge status={project.status} />
        </div>

        {isEditing ? (
          <div
            className="flex items-center gap-1.5 mt-1"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <input
              type="text"
              value={baseName}
              onChange={(e) => setBaseName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave(e);
                if (e.key === "Escape") handleCancel(e as any);
              }}
              autoFocus
              className="w-full bg-slate-50 border border-indigo-500 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            {ext && (
              <span className="text-[11px] font-mono font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-1 rounded-lg shrink-0">
                {ext}
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition shrink-0 cursor-pointer"
              title="Save name"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition shrink-0 cursor-pointer"
              title="Cancel"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 group/title">
            <h3 className="font-semibold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors line-clamp-1">
              {project.filename}
            </h3>
            <button
              onClick={handleStartEdit}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition shrink-0 cursor-pointer"
              title="Rename document"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 mt-2">
          <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
            {isImage ? "IMAGE" : "PDF"}
          </span>
          <span className="text-[11px] text-slate-400">
            {new Date(project.created_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
        <span className="text-xs font-medium text-indigo-600 group-hover:underline flex items-center gap-1">
          Open Document
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleStartEdit}
            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
            title="Rename document"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </svg>
          </button>
          <button
            onClick={(e) => onDelete(project.id, e)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
            title="Delete document"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>
    </a>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="w-11 h-11 rounded-xl skeleton-shimmer" />
        <div className="w-16 h-5 rounded-full skeleton-shimmer" />
      </div>
      <div className="h-4 w-3/4 rounded skeleton-shimmer" />
      <div className="h-3 w-1/2 rounded skeleton-shimmer" />
      <div className="pt-3 border-t border-slate-100 flex justify-between">
        <div className="h-3 w-20 rounded skeleton-shimmer" />
        <div className="h-4 w-4 rounded skeleton-shimmer" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function refresh() {
    const token = getToken();
    if (!token) return;
    const data = await listProjects(token);
    const map = getRenamedMap();
    const merged = data.map((p: any) => ({
      ...p,
      filename: map[p.id] || p.filename,
    }));
    setProjects(merged);
  }

  useEffect(() => {
    if (!authLoading && user) refresh();
    const interval = setInterval(() => {
      if (!authLoading && user) refresh();
    }, 4000);
    return () => clearInterval(interval);
  }, [authLoading, user]);

  function handleRename(id: string, newName: string) {
    const map = getRenamedMap();
    map[id] = newName;
    saveRenamedMap(map);
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, filename: newName } : p))
    );
  }

  async function processFile(file: File) {
    const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
    if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Invalid file type. Please upload a PDF, PNG, JPG, or WEBP file.");
      return;
    }

    const token = getToken();
    if (!token) return;

    setUploading(true);
    setError("");
    try {
      await uploadFile(file, token);
      await refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
    e.target.value = "";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading) {
      setIsDragging(true);
    }
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await processFile(file);
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const token = getToken();
    if (!token) return;
    await deleteProject(id, token);
    await refresh();
  }

  function handleLogout() {
    clearToken();
    router.push("/login");
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Logo />
            <div className="h-8 w-24 rounded-lg skeleton-shimmer" />
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-6 py-10 w-full space-y-8 flex-1">
          <div className="h-32 rounded-2xl skeleton-shimmer" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-indigo-500 selection:text-white flex flex-col">
      {/* Navbar Header */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200/60 text-xs font-medium text-slate-600">
              <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                {user?.email?.[0]?.toUpperCase() || "U"}
              </div>
              <span>{user?.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-3.5 py-2 rounded-xl transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Content */}
      <main className="max-w-6xl mx-auto px-6 py-10 flex-1 w-full">
        {/* Header Section */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Document Workspace</h1>
            <p className="text-sm text-slate-500 mt-1">
              Upload documents or images to get automated AI summaries &amp; grounded RAG chat.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            {projects.length} {projects.length === 1 ? "document" : "documents"} loaded
          </div>
        </div>

        {/* Drag & Drop Upload Zone */}
        <label
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`group relative block border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center cursor-pointer transition-all duration-200 shadow-xs ${
            isDragging
              ? "border-indigo-600 bg-indigo-50/80 scale-[1.01] shadow-xl shadow-indigo-500/10"
              : "border-slate-300 hover:border-indigo-500 bg-white hover:bg-indigo-50/30 hover:shadow-md"
          }`}
        >
          <input
            type="file"
            accept=".pdf,image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
          <div className="flex flex-col items-center gap-3">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 shadow-xs ${
                isDragging
                  ? "bg-indigo-600 text-white scale-110"
                  : "bg-indigo-50 text-indigo-600 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white"
              }`}
            >
              {uploading ? (
                <svg className="animate-spin h-6 w-6 text-indigo-600 group-hover:text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              )}
            </div>
            <div>
              <p className="text-base font-semibold text-slate-800">
                {uploading
                  ? "Uploading and processing document..."
                  : isDragging
                  ? "Drop your file here to upload"
                  : "Click or drag a file to upload"}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Supports PDF, PNG, JPG, WEBP — up to 20MB per file
              </p>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/60">PDF</span>
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/60">PNG</span>
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/60">JPG</span>
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/60">WEBP</span>
            </div>
          </div>
        </label>

        {error && (
          <div className="flex items-center gap-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mt-6 animate-fade-in">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Documents Grid Section */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Recent Documents
            </h2>
          </div>

          {projects.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-slate-200/90 rounded-3xl bg-white p-8">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-500 mx-auto flex items-center justify-center mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <circle cx="12" cy="13" r="3" />
                  <path d="m14.5 15.5 2 2" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-slate-800 mb-1">No documents uploaded yet</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                Upload your first document or image above to view summaries and chat in real-time.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {projects.map((p) => (
                <ProjectCard key={p.id} project={p} onDelete={handleDelete} onRename={handleRename} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}