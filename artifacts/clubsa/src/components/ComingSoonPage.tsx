import { Trophy } from "lucide-react";

export default function ComingSoonPage({ title, text }: { title: string; text: string }) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center py-16 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900">
        <Trophy size={28} className="text-cyan-400" aria-hidden />
      </div>
      <h1 className="text-2xl font-extrabold text-white sm:text-3xl" style={{ fontFamily: "Cairo, sans-serif" }}>
        {title}
      </h1>
      <span className="mt-3 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1 text-sm font-bold text-amber-300">
        قريبًا
      </span>
      <p className="mt-4 text-sm leading-relaxed text-slate-400">{text}</p>
    </div>
  );
}
