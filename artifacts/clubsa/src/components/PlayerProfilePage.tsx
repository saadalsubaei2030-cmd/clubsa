import { useState } from "react";
import { ArrowRight, Camera, ChevronLeft, Shield, UserRound, Wallet } from "lucide-react";
import { POSITION_LABELS } from "@/data";
import { formatBalance } from "@/lib/formatters";
import type { AuthUser } from "@/types";

const STAT_LABELS: Record<string, string> = {
  PAC: "السرعة",
  SHO: "التسديد",
  PAS: "التمرير",
  DRI: "المراوغة",
  DEF: "الدفاع",
  PHY: "القوة البدنية",
};

export default function PlayerProfilePage({
  auth,
  onBack,
  onSaveAvatar,
  onOpenClub,
  onOpenCalculator,
}: {
  auth: AuthUser;
  onBack: () => void;
  onSaveAvatar: (avatar: string | null) => void;
  onOpenClub: (clubId: string) => void;
  onOpenCalculator: () => void;
}) {
  const [avatar, setAvatar] = useState(auth.avatar || "");
  const [saved, setSaved] = useState(false);
  const build = auth.playerBuild;
  const stats = build?.stats || {};

  const handleAvatar = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const nextAvatar = String(reader.result);
      setAvatar(nextAvatar);
      onSaveAvatar(nextAvatar);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={onBack} className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-colors">
        <ChevronLeft size={16} /> العودة
      </button>

      <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-blue-950/70 via-slate-900 to-slate-950 p-5 sm:p-8">
        <div className="absolute -left-20 -top-20 h-52 w-52 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative h-28 w-28 shrink-0 self-center overflow-hidden rounded-3xl border-2 border-cyan-400/50 bg-slate-800 sm:self-auto">
            {avatar ? (
              <img src={avatar} alt={auth.name} className="h-full w-full object-cover" />
            ) : (
              <UserRound size={42} className="absolute inset-0 m-auto text-slate-500" />
            )}
            <label className="absolute bottom-2 right-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-500">
              <Camera size={15} />
              <input type="file" accept="image/*" onChange={handleAvatar} className="hidden" />
            </label>
          </div>

          <div className="min-w-0 flex-1">
            <p className="mb-1 text-xs font-bold text-cyan-300">ملف اللاعب</p>
            <h1 className="truncate text-2xl font-extrabold text-white sm:text-3xl" style={{ fontFamily: "Cairo, sans-serif" }}>
              {auth.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-400">
              <span>{auth.position ? POSITION_LABELS[auth.position] || auth.position : "المركز غير محدد"}</span>
              <span className="text-slate-700">·</span>
              {auth.clubId ? (
                <button onClick={() => onOpenClub(auth.clubId!)} className="font-bold text-cyan-300 hover:text-cyan-200">
                  {auth.club}
                </button>
              ) : (
                <span>{auth.club}</span>
              )}
            </div>
            {saved && <p className="mt-2 text-xs font-bold text-emerald-300">تم تحديث الصورة</p>}
          </div>

          <div className="flex items-center gap-3 self-start rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3">
            <Wallet size={18} className="text-cyan-300" />
            <div>
              <p className="text-[11px] text-slate-400">المحفظة</p>
              <p className="text-lg font-extrabold text-cyan-300">{formatBalance(auth.balance || 0)}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_260px]">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-cyan-300">Build / Stats</p>
              <h2 className="text-lg font-extrabold text-white">بطاقة الطاقات</h2>
            </div>
            <div className="text-left">
              <p className="text-3xl font-extrabold text-cyan-300">{build?.overall || "—"}</p>
              <p className="text-[11px] text-slate-500">OVR</p>
            </div>
          </div>

          {build ? (
            <>
              <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {Object.entries(stats).map(([key, value]) => (
                  <div key={key} className="rounded-xl bg-slate-800/70 px-3 py-2">
                    <p className="text-[11px] text-slate-500">{STAT_LABELS[key] || key}</p>
                    <p className="text-lg font-extrabold text-slate-100">{value}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500">آخر مزامنة من حاسبة الطاقات: مستوى {build.level} · {build.height} سم · {build.weight} كجم</p>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-700 py-8 text-center">
              <p className="text-sm font-bold text-slate-300">لا توجد بيانات طاقات حالياً</p>
              <p className="mt-1 text-xs text-slate-500">استخدم الحاسبة لإنشاء بطاقة اللاعب ومزامنتها هنا.</p>
            </div>
          )}

          <button onClick={onOpenCalculator} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-500 transition-colors">
            فتح حاسبة الطاقات <ArrowRight size={15} />
          </button>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Shield size={17} className="text-blue-400" />
            <h2 className="text-lg font-extrabold text-white">بيانات الحساب</h2>
          </div>
          <div className="space-y-3 text-sm">
            <div><p className="text-[11px] text-slate-500">EA ID</p><p className="font-bold text-slate-200">{auth.name}</p></div>
            <div><p className="text-[11px] text-slate-500">المنطقة</p><p className="font-bold text-slate-200">{auth.region || "غير محددة"}</p></div>
            <div><p className="text-[11px] text-slate-500">الحالة</p><p className="font-bold text-emerald-300">{auth.joinStatus === "pending" ? "بانتظار الموافقة" : "نشط"}</p></div>
          </div>
        </section>
      </div>
    </div>
  );
}