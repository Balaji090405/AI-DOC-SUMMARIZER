"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  getProject,
  summarizeProject,
  streamChat,
  getChatHistory,
  clearChatHistory,
} from "@/lib/api";
import { getToken } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

function parseInline(text: string, isUser = false, onPageClick?: (page: number) => void) {
  const cleanedText = text.replace(/\{?\[?\(?Page\s+\d+\)?\]?\}?/gi, "").trim();
  if (!cleanedText) return null;

  const parts = cleanedText.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, partIdx) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      const boldText = part.slice(2, -2);
      return (
        <strong key={partIdx} className={`font-semibold ${isUser ? "text-white" : "text-slate-900"}`}>
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
      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
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
        // Exclude "Page reference" / "Page ref" columns from answer tables
        const validIndices = rawHeaders
          .map((h, idx) => (/(page\s*ref|page\s*reference|^page$)/i.test(h) ? -1 : idx))
          .filter((idx) => idx !== -1);

        const headers = validIndices.map((idx) => rawHeaders[idx]);

        let startRow = 1;
        if (tableLines.length > 1 && /^\|[\s-:\-|]+\|$/.test(tableLines[1])) {
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
    <div className={`space-y-1 text-xs sm:text-sm leading-relaxed ${isUser ? "text-white" : "text-slate-700"}`}>
      {blocks.map((block, blockIdx) => {
        if (block.type === "table") {
          return (
            <div key={blockIdx} className="overflow-x-auto my-3 rounded-2xl border border-indigo-200/80 shadow-xs bg-white">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-indigo-100/90 to-violet-100/80 text-indigo-950 font-bold border-b border-indigo-200/90">
                    {block.headers.map((h, hIdx) => (
                      <th key={hIdx} className="px-3.5 py-2.5 border-r last:border-r-0 border-indigo-200/60 font-semibold tracking-wide">
                        {parseInline(h, isUser, onPageClick)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-indigo-100/70">
                  {block.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="even:bg-slate-50/60 hover:bg-indigo-50/30 transition-colors">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3.5 py-2.5 border-r last:border-r-0 border-indigo-100/50 align-top text-slate-800">
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

        if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
          return <hr key={blockIdx} className={`my-2 ${isUser ? "border-indigo-400/30" : "border-slate-200"}`} />;
        }

        const headerMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
        const isHeader = Boolean(headerMatch);
        const headerLevel = headerMatch ? headerMatch[1].length : 0;

        let lineText = isHeader ? headerMatch![2] : trimmed;
        const isBullet = !isHeader && (lineText.startsWith("- ") || lineText.startsWith("* "));
        if (isBullet) {
          lineText = lineText.slice(2);
        }

        const renderedLine = parseInline(lineText, isUser, onPageClick);

        if (isHeader) {
          const sizeClass = headerLevel <= 2 ? "text-base sm:text-lg font-bold" : "text-sm sm:text-base font-semibold";
          return (
            <div key={blockIdx} className={`${sizeClass} pt-2 pb-0.5 ${isUser ? "text-white" : "text-slate-900"}`}>
              {renderedLine}
            </div>
          );
        }

        if (isBullet) {
          return (
            <div key={blockIdx} className="flex items-start gap-2 pl-1 my-0.5">
              <span className={`font-bold shrink-0 mt-1 text-[10px] ${isUser ? "text-indigo-200" : "text-indigo-500"}`}>●</span>
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
  const bottomRef = useRef<HTMLDivElement>(null);

  function handlePageClick(pageNum: number) {
    setActivePage(pageNum);
    setIsPreviewMinimized(false);
  }

  useEffect(() => {
    if (authLoading || !user) return;
    const token = getToken();
    if (!token) return;

    getProject(id, token)
      .then((p) => {
        try {
          const map = JSON.parse(localStorage.getItem("renamed_documents") || "{}");
          if (map[id]) p.filename = map[id];
        } catch {}
        setProject(p);
      })
      .catch((e) => setError(e.message));
    getChatHistory(id, token).then(setMessages).catch(() => {});
  }, [authLoading, user, id]);

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
            copy[copy.length - 1] = { role: "assistant", content: assistantText };
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

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://ai-doc-summarizer-qpp0.onrender.com";

const token = getToken();

const fileResponse = await fetch(
  `${API_URL}/projects/${id}/file`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

if (!fileResponse.ok) {
  throw new Error(`Failed to load document: ${fileResponse.status}`);
}

const fileBlob = await fileResponse.blob();
const fileUrl = URL.createObjectURL(fileBlob);
const fileUrl = activePage ? `${fileBaseUrl}#page=${activePage}` : fileBaseUrl;
const isImage = project.content_type?.startsWith("image/");

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-indigo-500 selection:text-white flex flex-col">
      {/* Top Breadcrumb & Document Header */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-20 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <a
              href="/dashboard"
              className="text-slate-400 hover:text-slate-700 transition-colors shrink-0"
              title="Back to Dashboard"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Back to Dashboard
          </a>
        </div>
      </header>

      {error && (
        <div className="max-w-7xl mx-auto mt-4 px-6 w-full">
          <div className="flex items-center gap-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 animate-fade-in">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Main 2-Column Split Workspace */}
      <main className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 w-full">
        {/* Left Column: Preview & AI Summary */}
        <section className="bg-white rounded-3xl border-2 border-indigo-300/80 ring-2 ring-indigo-500/10 shadow-md hover:shadow-indigo-500/10 overflow-hidden flex flex-col h-[750px] transition-all">
          {/* Header Bar */}
          <div className="px-5 py-3.5 border-b border-indigo-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/80 via-slate-50 to-white">
            <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
              <svg width="18" height="18" className="text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
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
                onClick={() => setIsPreviewMinimized(!isPreviewMinimized)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl transition cursor-pointer"
                title={isPreviewMinimized ? "Expand Document Preview" : "Minimize Document Preview"}
              >
                {isPreviewMinimized ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="15 3 21 3 21 9" />
                      <polyline points="9 21 3 21 3 15" />
                      <line x1="21" y1="3" x2="14" y2="10" />
                      <line x1="3" y1="21" x2="10" y2="14" />
                    </svg>
                    <span>Expand Preview</span>
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="4 14 10 14 10 20" />
                      <polyline points="20 10 14 10 14 4" />
                      <line x1="14" y1="10" x2="21" y2="3" />
                      <line x1="10" y1="14" x2="3" y2="21" />
                    </svg>
                    <span>Minimize Preview</span>
                  </>
                )}
              </button>

              <button
                onClick={handleSummarize}
                disabled={summarizing}
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-4 py-2 rounded-xl hover:from-indigo-500 hover:to-violet-500 active:scale-[0.98] disabled:opacity-50 transition shadow-xs cursor-pointer"
              >
                {summarizing ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Summarizing...
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
                    </svg>
                    Summarize Document
                  </>
                )}
              </button>
            </div>
          </div>

          {isPreviewMinimized ? (
            <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-indigo-50/40 via-white to-violet-50/30">
              <div className="px-5 py-2.5 bg-indigo-50/60 border-b border-indigo-100/80 flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-700 flex items-center gap-1.5 truncate">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                    <polyline points="13 2 13 9 20 9" />
                  </svg>
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
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
                        </svg>
                      </span>
                      <h3 className="text-sm font-bold tracking-wide text-indigo-950 uppercase">
                        AI Summary &amp; Key Insights (Expanded View)
                      </h3>
                    </div>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      Full View Mode
                    </span>
                  </div>
                  <FormattedMarkdown content={summary} onPageClick={handlePageClick} />
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center my-auto">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100/80 text-indigo-600 flex items-center justify-center mb-3 shadow-xs">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
                    </svg>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-800 mb-1">Document Preview Minimized</h4>
                  <p className="text-xs text-slate-500 max-w-xs mb-4 leading-relaxed">
                    Click <strong>Summarize Document</strong> above to view full AI key insights here, or <strong>Expand Preview</strong> to view the file.
                  </p>
                  <button
                    onClick={handleSummarize}
                    disabled={summarizing}
                    className="text-xs font-semibold bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-500 transition cursor-pointer shadow-xs"
                  >
                    {summarizing ? "Summarizing..." : "Summarize Document Now"}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* File Display Container with Highlighted Edges */}
              <div className="flex-1 bg-gradient-to-b from-indigo-50/30 via-slate-100/70 to-slate-200/40 p-4 flex items-center justify-center overflow-auto min-h-0">
                {isImage ? (
                  <img
                    src={fileUrl}
                    alt={project.filename}
                    className="max-h-full max-w-full object-contain rounded-2xl border-2 border-indigo-400/70 shadow-lg ring-4 ring-indigo-500/10 hover:border-indigo-500 transition-all"
                  />
                ) : (
                  <iframe
                    key={fileUrl}
                    src={fileUrl}
                    className="w-full h-full rounded-2xl border-2 border-indigo-400/70 shadow-lg ring-4 ring-indigo-500/10 bg-white hover:border-indigo-500 transition-all"
                    title="document preview"
                  />
                )}
              </div>

              {/* AI Summary Box */}
              {summary && (
                <div className="p-5 border-t border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-white to-violet-50/40 max-h-[250px] overflow-y-auto animate-fade-in">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="p-1 rounded-lg bg-indigo-100 text-indigo-600">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
                      </svg>
                    </span>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-950">
                      AI Summary &amp; Key Insights
                    </h3>
                  </div>
                  <FormattedMarkdown content={summary} onPageClick={handlePageClick} />
                </div>
              )}
            </>
          )}
        </section>

        {/* Right Column: Grounded RAG Chat with Custom Background */}
        <section className="bg-gradient-to-b from-indigo-50/50 via-slate-50/80 to-violet-50/40 rounded-3xl border-2 border-violet-300/80 ring-2 ring-violet-500/10 shadow-md flex flex-col h-[750px] overflow-hidden">
          {/* Panel Header */}
          <div className="px-5 py-3 border-b border-indigo-100 flex items-center justify-between bg-gradient-to-r from-violet-100/70 via-indigo-50/50 to-white/80 backdrop-blur-xs">
            <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm min-w-0">
              <svg width="18" height="18" className="text-violet-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span className="truncate">Ask Grounded Questions</span>
              <span className="hidden sm:inline-flex text-[10px] font-semibold text-indigo-600 bg-indigo-50/90 px-2 py-0.5 rounded-full border border-indigo-200/80 shadow-2xs shrink-0">
                RAG Active
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Create New Chat Button */}
              <button
                onClick={handleNewChat}
                className="inline-flex items-center gap-1 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 px-2.5 py-1.5 rounded-xl transition cursor-pointer shadow-2xs"
                title="Start a new chat view"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>New Chat</span>
              </button>

              {/* Clear Chat History Button */}
              {messages.length > 0 && (
                <button
                  onClick={handleClearChat}
                  className="inline-flex items-center gap-1 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 px-2.5 py-1.5 rounded-xl transition cursor-pointer shadow-2xs"
                  title="Clear all chat history permanently"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  <span>Clear Chat</span>
                </button>
              )}
            </div>
          </div>

          {/* Messages Stream Area with Soft Styled Background */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-gradient-to-b from-slate-50/60 via-indigo-50/20 to-violet-50/30">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 my-auto">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100/80 text-indigo-600 flex items-center justify-center mb-3 shadow-xs border border-indigo-200/60">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <h4 className="text-sm font-semibold text-slate-800 mb-1">Start chatting with this file</h4>
                <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                  Ask any question about key points, tables, or sections — answers trace directly back to your document.
                </p>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
              >
                {m.role === "assistant" && (
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
                    </svg>
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
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
                      </svg>
                      Answer
                    </div>
                  )}
                  <FormattedMarkdown content={m.content} isUser={false} onPageClick={handlePageClick} />
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
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
                  </svg>
                </div>
                <div className="bg-white/95 border border-indigo-100/90 text-slate-600 text-xs rounded-2xl px-4 py-2.5 flex items-center gap-1.5 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse delay-150" />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse delay-300" />
                  <span className="ml-1 text-[11px] font-medium">Generating grounded response...</span>
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
                    title={`Click to view Page ${s.page_number} in document preview`}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    </svg>
                    {"(Page " + s.page_number + ")"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Form Bar */}
          <form onSubmit={handleSend} className="border-t border-indigo-100/80 p-3 bg-white/90 backdrop-blur-xs flex gap-2">
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}