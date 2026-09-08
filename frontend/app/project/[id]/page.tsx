"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  getProject,
  summarizeProject,
  streamChat,
  getChatHistory,
  clearChatHistory,
  getFileBlobUrl,
  getFileDirectUrl,
} from "@/lib/api";
import { getToken } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

function parseInline(
  text: string,
  isUser = false,
  onPageClick?: (page: number) => void
) {
  const cleanedText = text
    .replace(/\{?\[?\(?Page\s+\d+\)?\]?\}?/gi, "")
    .trim();
  if (!cleanedText) return null;

  const parts = cleanedText.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, partIdx) => {
    if (
      part.startsWith("**") &&
      part.endsWith("**") &&
      part.length >= 4
    ) {
      const boldText = part.slice(2, -2);
      return (
        <strong
          key={partIdx}
          className={`font-semibold ${
            isUser ? "text-white" : "text-slate-900"
          }`}
        >
          {boldText}
        </strong>
      );
    }
    return <span key={partIdx}>{part}</span>;
  });
}

type Block =
  | { type: "line"; text: string }
  | { type: "table"; headers: string[]; rows: string[][] };

function groupLinesIntoBlocks(lines: string[]): Block[] {
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const tableLines: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim().startsWith("|") &&
        lines[i].trim().endsWith("|")
      ) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 1) {
        const parseRow = (str: string) =>
          str
            .slice(1, -1)
            .split("|")
            .map((c) => c.trim());

        const rawHeaders = parseRow(tableLines[0]);
        const validIndices = rawHeaders
          .map((h, idx) =>
            /(page\s*ref|page\s*reference|^page$)/i.test(h) ? -1 : idx
          )
          .filter((idx) => idx !== -1);

        const headers = validIndices.map((idx) => rawHeaders[idx]);

        let startRow = 1;
        if (
          tableLines.length > 1 &&
          /^\|[\s-:\-|]+\|$/.test(tableLines[1])
        ) {
          startRow = 2;
        }

        const rows = tableLines.slice(startRow).map((rowLine) => {
          const rowCells = parseRow(rowLine);
          return validIndices.map((idx) => rowCells[idx] || "");
        });

        blocks.push({ type: "table", headers, rows });
        continue;
      }
    }

    blocks.push({ type: "line", text: line });
    i++;
  }

  return blocks;
}

function FormattedMarkdown({
  content,
  isUser = false,
  onPageClick,
}: {
  content: string;
  isUser?: boolean;
  onPageClick?: (page: number) => void;
}) {
  if (!content) return null;

  const lines = content.split("\n");
  const blocks = groupLinesIntoBlocks(lines);

  return (
    <div
      className={`space-y-1 text-xs sm:text-sm leading-relaxed ${
        isUser ? "text-white" : "text-slate-700"
      }`}
    >
      {blocks.map((block, blockIdx) => {
        if (block.type === "table") {
          return (
            <div
              key={blockIdx}
              className="overflow-x-auto my-3 rounded-2xl border border-indigo-200/80 shadow-xs bg-white"
            >
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-indigo-100/90 to-violet-100/80 text-indigo-950 font-bold border-b border-indigo-200/90">
                    {block.headers.map((h, hIdx) => (
                      <th
                        key={hIdx}
                        className="px-3.5 py-2.5 border-r last:border-r-0 border-indigo-200/60 font-semibold tracking-wide"
                      >
                        {parseInline(h, isUser, onPageClick)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-indigo-100/70">
                  {block.rows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className="even:bg-slate-50/60 hover:bg-indigo-50/30 transition-colors"
                    >
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className="px-3.5 py-2.5 border-r last:border-r-0 border-indigo-100/50 align-top text-slate-800"
                        >
                          {parseInline(cell, isUser, onPageClick)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        const trimmed = block.text.trim();
        if (!trimmed) return <div key={blockIdx} className="h-1" />;

        if (
          trimmed === "---" ||
          trimmed === "***" ||
          trimmed === "___"
        ) {
          return (
            <hr
              key={blockIdx}
              className={`my-2 ${
                isUser ? "border-indigo-400/30" : "border-slate-200"
              }`}
            />
          );
        }

        const headerMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
        const isHeader = Boolean(headerMatch);
        const headerLevel = headerMatch ? headerMatch[1].length : 0;

        let lineText = isHeader ? headerMatch![2] : trimmed;
        const isBullet =
          !isHeader &&
          (lineText.startsWith("- ") || lineText.startsWith("* "));

        if (isBullet) {
          lineText = lineText.slice(2);
        }

        const renderedLine = parseInline(
          lineText,
          isUser,
          onPageClick
        );

        if (isHeader) {
          const sizeClass =
            headerLevel <= 2
              ? "text-base sm:text-lg font-bold"
              : "text-sm sm:text-base font-semibold";

          return (
            <div
              key={blockIdx}
              className={`${sizeClass} pt-2 pb-0.5 ${
                isUser ? "text-white" : "text-slate-900"
              }`}
            >
              {renderedLine}
            </div>
          );
        }

        if (isBullet) {
          return (
            <div
              key={blockIdx}
              className="flex items-start gap-2 pl-1 my-0.5"
            >
              <span
                className={`font-bold shrink-0 mt-1 text-[10px] ${
                  isUser ? "text-indigo-200" : "text-indigo-500"
                }`}
              >
                ●
              </span>
              <div className="flex-1">{renderedLine}</div>
            </div>
          );
        }

        return <p key={blockIdx}>{renderedLine}</p>;
      })}
    </div>
  );
}

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();

  const [project, setProject] = useState<any>(null);
  const [summary, setSummary] = useState<string>("");
  const [summarizing, setSummarizing] = useState(false);
  const [isPreviewMinimized, setIsPreviewMinimized] = useState(false);
  const [activePage, setActivePage] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [lastSources, setLastSources] = useState<any[]>([]);

  // File Preview States
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(true);

  const bottomRef = useRef<HTMLDivElement>(null);

  function handlePageClick(pageNum: number) {
    setActivePage(pageNum);
    setIsPreviewMinimized(false);
  }

  // Load project metadata & chat history
  useEffect(() => {
    if (authLoading || !user || !id) return;
    const token = getToken();
    if (!token) return;

    getProject(id, token)
      .then((p) => {
        try {
          const map = JSON.parse(
            localStorage.getItem("renamed_documents") || "{}"
          );
          if (map[id]) p.filename = map[id];
        } catch {}
        setProject(p);
      })
      .catch((e) => setError(e.message));

    getChatHistory(id, token)
      .then(setMessages)
      .catch(() => {});
  }, [authLoading, user, id]);

  // Load protected document for preview
  useEffect(() => {
    if (authLoading || !user || !id) return;
    const token = getToken();
    if (!token) return;

    let createdBlobUrl: string | null = null;
    let isCancelled = false;

    setPreviewLoading(true);

    getFileBlobUrl(id, token)
      .then((blobUrl) => {
        if (isCancelled) {
          URL.revokeObjectURL(blobUrl);
          return;
        }
        createdBlobUrl = blobUrl;
        setFileUrl(blobUrl);
        setPreviewLoading(false);
      })
      .catch((err) => {
        if (isCancelled) return;
        console.warn("Blob preview failed, using direct stream URL fallback:", err);
        const directUrl = getFileDirectUrl(id, token);
        setFileUrl(directUrl);
        setPreviewLoading(false);
      });

    return () => {
      isCancelled = true;
      if (createdBlobUrl) {
        URL.revokeObjectURL(createdBlobUrl);
      }
    };
  }, [authLoading, user, id]);

  // Auto-scroll chat
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSummarize() {
    const token = getToken();
    if (!token) return;
    setSummarizing(true);
    setError("");
    try {
      const data = await summarizeProject(id, token);
      setSummary(data.summary);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSummarizing(false);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    const token = getToken();
    if (!token) return;

    const question = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setSending(true);
    setError("");

    let assistantText = "";
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      await streamChat(
        id,
        question,
        token,
        (token) => {
          assistantText += token;
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = {
              role: "assistant",
              content: assistantText,
            };
            return copy;
          });
        },
        (sources) => setLastSources(sources),
        () => setSending(false)
      );
    } catch (err: any) {
      setError(err.message);
      setSending(false);
    }
  }

  async function handleClearChat() {
    const token = getToken();
    if (!token) return;
    try {
      await clearChatHistory(id, token);
      setMessages([]);
      setLastSources([]);
    } catch (err: any) {
      setError(err.message);
    }
  }

  function handleNewChat() {
    setMessages([]);
    setLastSources([]);
  }

  if (authLoading || !project) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="border-b border-slate-200/80 bg-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-24 h-5 rounded skeleton-shimmer" />
            <div className="w-16 h-4 rounded-full skeleton-shimmer" />
          </div>
          <div className="w-28 h-5 rounded skeleton-shimmer" />
        </header>
        <main className="max-w-7xl mx-auto px-6 py-6 w-full grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4 h-[650px]">
            <div className="h-8 rounded-xl skeleton-shimmer" />
            <div className="h-[520px] rounded-xl skeleton-shimmer" />
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4 h-[650px]">
            <div className="h-8 rounded-xl skeleton-shimmer" />
            <div className="h-[480px] rounded-xl skeleton-shimmer" />
            <div className="h-10 rounded-xl skeleton-shimmer" />
          </div>
        </main>
      </div>
    );
  }

  const isImage = project.content_type?.startsWith("image/") ?? false;

  const previewUrl =
    fileUrl && !isImage && activePage
      ? `${fileUrl}#page=${activePage}`
      : fileUrl;

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-indigo-500 selection:text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-20 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <a
              href="/dashboard"
              className="text-slate-400 hover:text-slate-700 transition-colors shrink-0"
              title="Back to Dashboard"
            >
              ←
            </a>

            <div className="h-4 w-px bg-slate-200 shrink-0" />

            <div className="min-w-0 flex items-center gap-2.5">
              <span className="font-semibold text-slate-900 text-base truncate">
                {project.filename}
              </span>

              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200/80 shrink-0 capitalize">
                {project.status}
              </span>
            </div>
          </div>

          <a
            href="/dashboard"
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shrink-0"
          >
            ← Back to Dashboard
          </a>
        </div>
      </header>

      {error && (
        <div className="max-w-7xl mx-auto mt-4 px-6 w-full">
          <div className="flex items-center gap-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 animate-fade-in">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 w-full">
        {/* LEFT COLUMN: Preview & Summary */}
        <section className="bg-white rounded-3xl border-2 border-indigo-300/80 ring-2 ring-indigo-500/10 shadow-md hover:shadow-indigo-500/10 overflow-hidden flex flex-col h-[750px] transition-all">
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-indigo-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/80 via-slate-50 to-white">
            <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
              <span className="text-indigo-600">📄</span>
              <span>Document Preview</span>

              {activePage && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-indigo-600 text-white px-2 py-0.5 rounded-md shadow-2xs animate-fade-in">
                  Page {activePage}
                  <button
                    onClick={() => setActivePage(null)}
                    className="hover:text-indigo-200 ml-0.5 cursor-pointer font-bold"
                    title="Clear page jump"
                  >
                    ✕
                  </button>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setIsPreviewMinimized(!isPreviewMinimized)
                }
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl transition cursor-pointer"
              >
                {isPreviewMinimized ? "Expand Preview" : "Minimize Preview"}
              </button>

              <button
                onClick={handleSummarize}
                disabled={summarizing}
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-4 py-2 rounded-xl hover:from-indigo-500 hover:to-violet-500 active:scale-[0.98] disabled:opacity-50 transition shadow-xs cursor-pointer"
              >
                {summarizing ? "Summarizing..." : "Summarize Document"}
              </button>
            </div>
          </div>

          {isPreviewMinimized ? (
            <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-indigo-50/40 via-white to-violet-50/30">
              <div className="px-5 py-2.5 bg-indigo-50/60 border-b border-indigo-100/80 flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-700 flex items-center gap-1.5 truncate">
                  Preview Minimized ({project.filename})
                </span>

                <button
                  onClick={() => setIsPreviewMinimized(false)}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer shrink-0 ml-2"
                >
                  Expand File Preview
                </button>
              </div>

              {summary ? (
                <div className="flex-1 p-6 overflow-y-auto space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between pb-3 border-b border-indigo-100">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-xl bg-indigo-100 text-indigo-600">
                        ✨
                      </span>
                      <h3 className="text-sm font-bold tracking-wide text-indigo-950 uppercase">
                        AI Summary & Key Insights (Expanded View)
                      </h3>
                    </div>

                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      Full View Mode
                    </span>
                  </div>

                  <FormattedMarkdown
                    content={summary}
                    onPageClick={handlePageClick}
                  />
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center my-auto">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100/80 text-indigo-600 flex items-center justify-center mb-3 shadow-xs">
                    ✨
                  </div>

                  <h4 className="text-sm font-semibold text-slate-800 mb-1">
                    Document Preview Minimized
                  </h4>

                  <p className="text-xs text-slate-500 max-w-xs mb-4 leading-relaxed">
                    Click <strong>Summarize Document</strong> above to view AI insights here, or expand the preview to view the file.
                  </p>

                  <button
                    onClick={handleSummarize}
                    disabled={summarizing}
                    className="text-xs font-semibold bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-500 transition cursor-pointer shadow-xs"
                  >
                    {summarizing
                      ? "Summarizing..."
                      : "Summarize Document Now"}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* File Preview */}
              <div className="flex-1 bg-gradient-to-b from-indigo-50/30 via-slate-100/70 to-slate-200/40 p-4 flex items-center justify-center overflow-auto min-h-0">
                {!fileUrl && previewLoading ? (
                  <div className="flex flex-col items-center justify-center text-center text-slate-500">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3 animate-pulse">
                      📄
                    </div>

                    <p className="text-sm font-medium">
                      Loading document preview...
                    </p>
                  </div>
                ) : isImage ? (
                  <img
                    src={fileUrl || undefined}
                    alt={project.filename}
                    className="max-h-full max-w-full object-contain rounded-2xl border-2 border-indigo-400/70 shadow-lg ring-4 ring-indigo-500/10 hover:border-indigo-500 transition-all"
                  />
                ) : (
                  <iframe
                    key={previewUrl || "document-preview"}
                    src={previewUrl || undefined}
                    className="w-full h-full rounded-2xl border-2 border-indigo-400/70 shadow-lg ring-4 ring-indigo-500/10 bg-white hover:border-indigo-500 transition-all"
                    title="document preview"
                  />
                )}
              </div>

              {/* AI Summary */}
              {summary && (
                <div className="p-5 border-t border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-white to-violet-50/40 max-h-[250px] overflow-y-auto animate-fade-in">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="p-1 rounded-lg bg-indigo-100 text-indigo-600">
                      ✨
                    </span>

                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-950">
                      AI Summary & Key Insights
                    </h3>
                  </div>

                  <FormattedMarkdown
                    content={summary}
                    onPageClick={handlePageClick}
                  />
                </div>
              )}
            </>
          )}
        </section>

        {/* RIGHT COLUMN */}
        <section className="bg-gradient-to-b from-indigo-50/50 via-slate-50/80 to-violet-50/40 rounded-3xl border-2 border-violet-300/80 ring-2 ring-violet-500/10 shadow-md flex flex-col h-[750px] overflow-hidden">
          {/* Chat Header */}
          <div className="px-5 py-3 border-b border-indigo-100 flex items-center justify-between bg-gradient-to-r from-violet-100/70 via-indigo-50/50 to-white/80">
            <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm min-w-0">
              <span className="text-violet-600 text-lg">💬</span>

              <span className="truncate">Ask Grounded Questions</span>

              <span className="hidden sm:inline-flex text-[10px] font-semibold text-indigo-600 bg-indigo-50/90 px-2 py-0.5 rounded-full border border-indigo-200/80 shadow-2xs shrink-0">
                RAG Active
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleNewChat}
                className="inline-flex items-center gap-1 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 px-2.5 py-1.5 rounded-xl transition cursor-pointer shadow-2xs"
              >
                + New Chat
              </button>

              {messages.length > 0 && (
                <button
                  onClick={handleClearChat}
                  className="inline-flex items-center gap-1 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 px-2.5 py-1.5 rounded-xl transition cursor-pointer shadow-2xs"
                >
                  Clear Chat
                </button>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-gradient-to-b from-slate-50/60 via-indigo-50/20 to-violet-50/30">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 my-auto">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100/80 text-indigo-600 flex items-center justify-center mb-3 shadow-xs border border-indigo-200/60">
                  💬
                </div>

                <h4 className="text-sm font-semibold text-slate-800 mb-1">
                  Start chatting with this file
                </h4>

                <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                  Ask any question about key points, tables, or sections — answers trace directly back to your document.
                </p>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex gap-3 ${
                  m.role === "user" ? "justify-end" : "justify-start"
                } animate-fade-in`}
              >
                {m.role === "assistant" && (
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                    ✨
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-slate-200/60 text-slate-600 border border-slate-300/50 rounded-br-xs shadow-2xs font-normal"
                      : "bg-gradient-to-br from-white via-indigo-50/50 to-violet-50/40 text-slate-900 border-2 border-indigo-400/80 ring-2 ring-indigo-500/15 rounded-bl-xs shadow-md"
                  }`}
                >
                  {m.role === "assistant" && (
                    <div className="flex items-center gap-1.5 mb-1.5 text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
                      ✨ Answer
                    </div>
                  )}

                  <FormattedMarkdown
                    content={m.content}
                    isUser={false}
                    onPageClick={handlePageClick}
                  />
                </div>

                {m.role === "user" && (
                  <div className="w-7 h-7 rounded-xl bg-slate-200/80 text-slate-600 flex items-center justify-center shrink-0 mt-0.5 text-xs font-semibold">
                    {user?.email?.[0]?.toUpperCase() || "U"}
                  </div>
                )}
              </div>
            ))}

            {sending && (
              <div className="flex gap-3 justify-start items-center animate-fade-in">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  ✨
                </div>

                <div className="bg-white/95 border border-indigo-100/90 text-slate-600 text-xs rounded-2xl px-4 py-2.5 flex items-center gap-1.5 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse delay-150" />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse delay-300" />
                  <span className="ml-1 text-[11px] font-medium">
                    Generating grounded response...
                  </span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Citations Footer */}
          {lastSources.length > 0 && (
            <div className="px-5 py-2.5 border-t border-indigo-100/80 bg-white/80 backdrop-blur-xs flex items-center gap-2">
              <span className="text-[11px] font-bold text-indigo-900/60 uppercase tracking-wider shrink-0">
                Sources:
              </span>

              <div className="flex flex-wrap gap-1.5 overflow-x-auto">
                {lastSources.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handlePageClick(s.page_number)}
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold rounded-lg px-2.5 py-1 font-mono transition-all cursor-pointer shadow-2xs ${
                      activePage === s.page_number
                        ? "bg-indigo-600 text-white border border-indigo-600 ring-2 ring-indigo-500/20 scale-105"
                        : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 hover:scale-105"
                    }`}
                  >
                    📄 (Page {s.page_number})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Form */}
          <form
            onSubmit={handleSend}
            className="border-t border-indigo-100/80 p-3 bg-white/90 backdrop-blur-xs flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about this document..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
              disabled={sending}
            />

            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <span>Send</span>
              <span>Send</span>
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
