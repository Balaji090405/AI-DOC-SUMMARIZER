import Logo from "@/components/Logo";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Navigation Header */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo size="text-xl" />
          <div className="flex items-center gap-3">
            <a
              href="/login"
              className="text-sm font-semibold text-slate-600 hover:text-slate-900 px-4 py-2 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Sign In
            </a>
            <a
              href="/signup"
              className="text-sm font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-4 py-2 rounded-xl hover:from-indigo-500 hover:to-violet-500 shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all"
            >
              Get Started Free
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 overflow-hidden">
        {/* Background Mesh Glow */}
        <div className="relative pt-16 pb-20 px-6 max-w-6xl mx-auto flex flex-col items-center text-center">
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-500/15 via-violet-500/15 to-purple-500/10 rounded-full blur-3xl -z-10" />

          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-xs font-semibold text-indigo-700 mb-8 shadow-xs animate-fade-in">
            <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-pulse"></span>
            Powered by Gemini 2.0 &amp; RAG Vector Intelligence
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 max-w-4xl leading-[1.15]">
            Summarize &amp; Chat With Your{" "}
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
              Documents &amp; Images
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-slate-600 text-lg sm:text-xl max-w-2xl leading-relaxed">
            Upload PDFs, scans, or diagrams. Get executive AI summaries and engage in intelligent multi-turn Q&amp;A grounded strictly in your document's text.
          </p>

          {/* Action Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <a
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 text-white px-8 py-4 rounded-2xl font-semibold text-base hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/35 hover:-translate-y-0.5 transition-all"
            >
              Go to Dashboard
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
            <a
              href="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-slate-700 border border-slate-200 px-8 py-4 rounded-2xl font-semibold text-base hover:bg-slate-50 hover:border-slate-300 shadow-xs transition-all"
            >
              Create Free Account
            </a>
          </div>

          {/* Interactive UI Graphic Mockup */}
          <div className="mt-16 w-full max-w-4xl bg-slate-900 rounded-3xl p-3 sm:p-4 shadow-2xl border border-slate-800 text-left relative overflow-hidden animate-float">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="text-xs text-slate-400 font-mono ml-2">AI Doc Summarizer Workspace — Annual_Strategy_2026.pdf</span>
              </div>
              <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                ● RAG Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-950/60 rounded-2xl">
              {/* Document Preview Graphic */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                  <span className="font-semibold text-slate-200">Document Preview</span>
                  <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-2 py-0.5 rounded-md">Page 1 of 12</span>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-slate-800 rounded-full w-3/4" />
                  <div className="h-2.5 bg-slate-800/60 rounded-full w-full" />
                  <div className="h-2.5 bg-slate-800/60 rounded-full w-5/6" />
                </div>
                <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-xs text-indigo-200 space-y-1.5">
                  <div className="font-semibold text-indigo-300 flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
                    </svg>
                    AI Summary Generated
                  </div>
                  <p className="text-[11px] text-indigo-200/80 leading-relaxed">
                    Q3 revenue surged by 28% driven by enterprise AI adoption. Key operational priorities include cloud migration and security compliance.
                  </p>
                </div>
              </div>

              {/* RAG Chat Graphic */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
                <div className="text-xs font-semibold text-slate-200 border-b border-slate-800 pb-2 flex items-center justify-between">
                  <span>Ask Grounded Questions</span>
                  <span className="text-[10px] text-slate-400">Zero Hallucination Mode</span>
                </div>
                <div className="space-y-2.5 text-xs">
                  <div className="bg-indigo-600 text-white p-2.5 rounded-xl rounded-br-xs ml-auto max-w-[85%]">
                    What were the key revenue figures for Q3?
                  </div>
                  <div className="bg-slate-800 text-slate-200 p-2.5 rounded-xl rounded-bl-xs max-w-[90%] space-y-1">
                    <p>According to section 3.2, Q3 revenue reached $14.2M, reflecting a 28% YoY increase.</p>
                    <div className="inline-flex items-center gap-1 bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-[10px] text-indigo-300 font-mono">
                      📄 Cited: Page 4
                    </div>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-800 flex gap-2">
                  <div className="flex-1 bg-slate-800 text-slate-500 rounded-lg px-3 py-1.5 text-xs">Ask follow-up...</div>
                  <div className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold">Send</div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature Grid */}
          <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-7 shadow-xs hover:shadow-xl hover:-translate-y-1 hover:border-indigo-200/80 transition-all duration-200 group">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-200 shadow-xs">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-2">Instant Summarization</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Extract key insights, executive summaries, and action items from lengthy PDFs or images in seconds.
              </p>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-7 shadow-xs hover:shadow-xl hover:-translate-y-1 hover:border-violet-200/80 transition-all duration-200 group">
              <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-violet-600 group-hover:text-white transition-all duration-200 shadow-xs">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="11" r="1" />
                  <circle cx="8" cy="11" r="1" />
                  <circle cx="16" cy="11" r="1" />
                </svg>
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-2">Grounded RAG Q&amp;A</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Ask any follow-up question. Answers are retrieved directly from document vectors with exact page citations.
              </p>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-7 shadow-xs hover:shadow-xl hover:-translate-y-1 hover:border-emerald-200/80 transition-all duration-200 group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-200 shadow-xs">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-2">PDF &amp; Image OCR</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Full multimodal support for standard PDFs, scanned documents, PNGs, JPEGs, and WEBP image uploads.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} AI Doc Summarizer — Document &amp; Image Summarizer. All rights reserved.
      </footer>
    </div>
  );
}