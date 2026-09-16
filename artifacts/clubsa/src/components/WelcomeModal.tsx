import { LogIn, UserPlus, Eye, X } from "lucide-react";

type WelcomeAction = "login" | "register" | "guest";

export default function WelcomeModal({ onClose, onSelect }: { onClose: () => void; onSelect: (action: WelcomeAction) => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 relative">
        <button onClick={onClose} className="absolute top-4 left-4 text-slate-500 hover:text-slate-200 transition-colors">
          <X size={18} />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 mb-4">
            <span className="text-slate-950 font-extrabold text-xl">S</span>
          </div>
          <h2 className="text-xl font-extrabold text-white mb-1" style={{ fontFamily: "Cairo, sans-serif" }}>
            مرحباً بك في CLUBSA
          </h2>
          <p className="text-xs text-slate-400">اختر طريقة الدخول للبدء</p>
        </div>

        <div className="space-y-2.5">
          <button
            onClick={() => onSelect("login")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-800 bg-slate-800/60 hover:border-blue-500/50 hover:bg-slate-800 transition-colors text-right"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-500/15 flex items-center justify-center">
              <LogIn size={16} className="text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-100">تسجيل الدخول</p>
              <p className="text-[11px] text-slate-500">لديك حساب بالفعل</p>
            </div>
          </button>

          <button
            onClick={() => onSelect("register")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-800 bg-slate-800/60 hover:border-cyan-500/50 hover:bg-slate-800 transition-colors text-right"
          >
            <div className="w-9 h-9 rounded-lg bg-cyan-500/15 flex items-center justify-center">
              <UserPlus size={16} className="text-cyan-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-100">إنشاء حساب جديد</p>
              <p className="text-[11px] text-slate-500">انضم كمشرف نادي أو لاعب</p>
            </div>
          </button>

          <button
            onClick={() => onSelect("guest")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-800 bg-slate-800/60 hover:border-slate-600 hover:bg-slate-800 transition-colors text-right"
          >
            <div className="w-9 h-9 rounded-lg bg-slate-700/60 flex items-center justify-center">
              <Eye size={16} className="text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-100">الدخول كزائر</p>
              <p className="text-[11px] text-slate-500">تصفح فقط — بدون تفاعل</p>
            </div>
          </button>
        </div>

        <p className="text-center text-[11px] text-slate-600 mt-5">
          يمكنك التبديل بين الأوضاع في أي وقت من شريط الملاحة
        </p>
      </div>
    </div>
  );
}

export type { WelcomeAction };
