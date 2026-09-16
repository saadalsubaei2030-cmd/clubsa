import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import type { LegalPage } from "@/components/LegalModal";

const STORAGE_KEY = "clubsa_consent";

export default function ConsentBanner({
  onOpenLegal,
}: {
  onOpenLegal: (page: LegalPage) => void;
}) {
  const [visible, setVisible] = useState(() => {
    try {
      return !localStorage.getItem(STORAGE_KEY);
    } catch {
      return true;
    }
  });

  const handleAccept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "accepted");
    } catch {
      // ignore storage errors
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 px-4 pb-4 animate-[slideUp_0.3s_ease-out]">
      <div className="max-w-4xl mx-auto rounded-2xl border border-slate-700 bg-slate-900/95 backdrop-blur shadow-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4">
        <div className="shrink-0 w-10 h-10 rounded-full bg-blue-500/15 flex items-center justify-center">
          <ShieldCheck size={20} className="text-blue-400" />
        </div>
        <p className="flex-1 text-sm text-slate-300 text-center sm:text-right leading-relaxed">
          باستخدامك لموقع CLUBSA، فإنك توافق على{" "}
          <button onClick={() => onOpenLegal("privacy")} className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 font-bold">
            سياسة الخصوصية
          </button>{" "}
          و{" "}
          <button onClick={() => onOpenLegal("terms")} className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 font-bold">
            الشروط والأحكام
          </button>
          .
        </p>
        <button
          onClick={handleAccept}
          className="shrink-0 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-extrabold transition-colors"
        >
          موافق وأتح
        </button>
      </div>
    </div>
  );
}
