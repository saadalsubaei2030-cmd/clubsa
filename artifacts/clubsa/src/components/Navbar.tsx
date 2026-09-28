import { Bell, User, LogOut, Settings, Shield, Wallet } from "lucide-react";
import { ROLE_LABELS, TABS } from "@/data";
import type { TabId, AuthUser } from "@/types";
import { formatBalance } from "@/lib/formatters";

function formatAmount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "م";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "ك";
  return n.toString();
}

export default function Navbar({
  active, onChange, auth, onOpenLogin, onLogout, onOpenClubSettings, onOpenProfile, pendingInviteCount, onOpenInvites,
}: {
  active: TabId;
  onChange: (tab: TabId) => void;
  auth: AuthUser | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  onOpenClubSettings?: () => void;
  onOpenProfile?: () => void;
  pendingInviteCount?: number;
  onOpenInvites?: () => void;
}) {
  return (
    <div className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur border-b border-slate-800">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-8 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-slate-950 font-extrabold text-sm">S</div>
          <span className="font-extrabold text-white tracking-tight" style={{ fontFamily: "Cairo, sans-serif" }}>CLUBSA</span>
        </div>

        <div className="hidden sm:flex items-center gap-1">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => onChange(t.id)}
              className={`px-3.5 py-2 rounded-lg text-sm font-bold transition-colors ${
                active === t.id ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {auth ? (
          <div className="flex items-center gap-2">
            {onOpenInvites && (
              <button
                onClick={onOpenInvites}
                className="relative p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
                title="دعوات الأندية"
              >
                <Bell size={16} />
                {!!pendingInviteCount && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-extrabold text-white">
                    {pendingInviteCount > 9 ? "9+" : pendingInviteCount}
                  </span>
                )}
              </button>
            )}
            {auth.role === "president" && (
              <button
                onClick={onOpenClubSettings}
                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors"
                title="إعدادات النادي"
              >
                <Settings size={16} />
              </button>
            )}

            {auth.role === "president" && auth.budget !== undefined && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20" title="ميزانية النادي">
                <Wallet size={13} className="text-amber-400" />
                <span className="text-xs font-bold text-amber-300 tabular-nums">{formatAmount(auth.budget)}</span>
              </div>
            )}

            {auth.role === "player" && auth.balance !== undefined && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20" title="رصيد اللاعب">
                <Wallet size={13} className="text-cyan-400" />
                <span className="text-xs font-bold text-cyan-300 tabular-nums">{formatBalance(auth.balance)}</span>
              </div>
            )}

            <button onClick={onOpenProfile} className="hidden sm:flex flex-col items-end leading-tight hover:text-cyan-300 transition-colors">
              <span className="text-xs font-bold text-slate-100">{auth.name}</span>
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                {auth.role === "president" && <Shield size={9} className="text-blue-400" />}
                 {ROLE_LABELS[auth.role]} · {auth.club}
                {auth.joinStatus === "pending" && " · بانتظار الموافقة"}
              </span>
            </button>
            <button onClick={onOpenProfile} className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden shrink-0" style={auth.clubColors ? { backgroundColor: auth.clubColors.primary } : undefined} title="الملف الشخصي">
              {auth.clubLogo ? (
                <img src={auth.clubLogo} alt={auth.name} className="w-full h-full object-cover" />
              ) : auth.avatar ? (
                <img src={auth.avatar} alt={auth.name} className="w-full h-full object-cover" />
              ) : (
                <User size={15} className={auth.clubColors ? "" : "text-slate-300"} style={auth.clubColors ? { color: auth.clubColors.secondary } : undefined} />
              )}
            </button>
            <button onClick={onLogout} className="text-slate-500 hover:text-red-400" title="تسجيل الخروج">
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button onClick={onOpenLogin}
            className="px-3.5 py-2 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors">
            تسجيل الدخول / حساب جديد
          </button>
        )}
      </div>

      <div className="scrollbar-none sm:hidden flex overflow-x-auto gap-1 px-4 pb-2">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => onChange(t.id)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              active === t.id ? "bg-slate-800 text-white" : "text-slate-400"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {auth && (
        <div className="sm:hidden flex items-center justify-between px-4 pb-2">
           <button onClick={onOpenProfile} className="text-xs text-slate-500 hover:text-cyan-300 transition-colors">{auth.name} · {ROLE_LABELS[auth.role]} · {auth.club}</button>
          {auth.role === "president" && auth.budget !== undefined && (
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
              <Wallet size={11} /> {formatAmount(auth.budget)}
            </span>
          )}
          {auth.role === "player" && auth.balance !== undefined && (
            <button onClick={onOpenProfile} className="text-xs font-bold text-cyan-300 flex items-center gap-1">
              <Wallet size={11} /> {formatBalance(auth.balance)}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
