export default function Logo({
  size = "text-xl",
  dark = false,
}: {
  size?: string;
  dark?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 group select-none">
      <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/20 group-hover:shadow-indigo-500/30 group-hover:scale-105 transition-all duration-200">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
          <path d="m10 13 2 2 4-4" />
        </svg>
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-violet-500"></span>
        </span>
      </div>
      <div className="flex flex-col text-left">
        <div className="flex items-center gap-1.5">
          <span
            className={`font-bold tracking-tight bg-clip-text text-transparent ${
              dark
                ? "bg-gradient-to-r from-white via-indigo-100 to-slate-100"
                : "bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-800"
            } ${size}`}
          >
            AI Doc Summarizer
          </span>
          <span className="text-[10px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100">
            AI RAG
          </span>
        </div>
        <span
          className={`text-[11px] font-medium -mt-0.5 ${
            dark ? "text-slate-300" : "text-slate-400"
          }`}
        >
          Document &amp; Image Summarizer
        </span>
      </div>
    </div>
  );
}