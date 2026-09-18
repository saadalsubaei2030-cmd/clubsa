import { useState } from "react";
import { ArrowRight, Camera, ChevronLeft, Pencil, Save, Shield, UserRound, Wallet } from "lucide-react";
import { POSITION_LABELS } from "@/data";
import { formatBalance } from "@/lib/formatters";
import type { AuthUser, PlayerBuild } from "@/types";

const STAT_KEYS = ["PAC", "SHO", "PAS", "DRI", "DEF", "PHY"] as const;
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
  onSaveBuild,
  onOpenClub,
  onOpenCalculator,
}: {
  auth: AuthUser;
  onBack: () => void;
  onSaveAvatar: (avatar: string | null) => void;
  onSaveBuild: (build: PlayerBuild) => void;
  onOpenClub: (clubId: string) => void;
  onOpenCalculator: () => void;
}) {
  const [avatar, setAvatar] = useState(auth.avatar || "");
  const [saved, setSaved] = useState(false);
  const build = auth.playerBuild;
  const stats = build?.stats || {};
  const [editingStats, setEditingStats] = useState(!build);
  const [manualOverall, setManualOverall] = useState(build?.overall ?? auth.overall ?? 0);
  const [manualStats, setManualStats] = useState<Record<string, number>>(() =>
    Object.fromEntries(STAT_KEYS.map((key) => [key, build?.stats[key] ?? 0])),
  );
  const [buildSaved, setBuildSaved] = useState(false);

  const clampRating = (value: number) => Math.max(0, Math.min(99, Number.isFinite(value) ? value : 0));

  const handleManualStatChange = (key: string, value: string) => {
    setManualStats((current) => ({ ...current, [key]: clampRating(Number(value) || 0) }));
  };

  const handleSaveBuild = () => {
    const nextBuild: PlayerBuild = {
      position: build?.position || auth.position || "ST",
      overall: clampRating(manualOverall),
      stats: Object.fromEntries(
        STAT_KEYS.map((key) => [key, clampRating(manualStats[key] ?? 0)]),
      ),
      level: build?.level ?? 50,
      height: build?.height ?? 178,
      weight: build?.weight ?? 74,
      updated_at: new Date().toISOString(),
    };
    onSaveBuild(nextBuild);
    setManualOverall(nextBuild.overall);
    setManualStats(nextBuild.stats);
    setEditingStats(false);
    setBuildSaved(true);
    setTimeout(() => setBuildSaved(false), 1800);
  };

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
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-cyan-300">Build / Stats</p>
              <h2 className="text-lg font-extrabold text-white">بطاقة الطاقات</h2>
            </div>
            <div className="text-left">
              {editingStats ? (
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={manualOverall}
                  onChange={(event) => setManualOverall(clampRating(Number(event.target.value) || 0))}
                  aria-label="OVR"
                  className="w-20 rounded-lg border border-cyan-500/40 bg-slate-800 px-2 py-1 text-left text-3xl font-extrabold text-cyan-300 outline-none focus:border-cyan-300"
                />
              ) : (
                <p className="text-3xl font-extrabold text-cyan-300">{build?.overall || "—"}</p>
              )}
              <p className="text-[11px] text-slate-500">OVR</p>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {STAT_KEYS.map((key) => (
              <div key={key} className="rounded-xl bg-slate-800/70 px-3 py-2">
                <p className="text-[11px] text-slate-500">{STAT_LABELS[key]}</p>
                {editingStats ? (
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={manualStats[key] ?? 0}
                    onChange={(event) => handleManualStatChange(key, event.target.value)}
                    aria-label={key}
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-lg font-extrabold text-slate-100 outline-none focus:border-cyan-400"
                  />
                ) : (
                  <p className="text-lg font-extrabold text-slate-100">{stats[key] ?? "—"}</p>
                )}
              </div>
            ))}
          </div>

          {build ? (
            <p className="text-xs text-slate-500">آخر مزامنة من حاسبة الطاقات: مستوى {build.level} · {build.height} سم · {build.weight} كجم</p>
          ) : (
            <p className="text-xs text-slate-500">أدخل القيم يدوياً أو افتح الحاسبة لمزامنة بناء اللاعب.</p>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={() => setEditingStats((current) => !current)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-bold text-slate-200 hover:border-cyan-500/50 hover:text-white transition-colors"
            >
              <Pencil size={15} /> {editingStats ? "إلغاء التعديل" : "تعديل يدوي"}
            </button>
            <button
              onClick={handleSaveBuild}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-extrabold text-slate-950 hover:bg-cyan-400 transition-colors"
            >
              <Save size={15} /> حفظ / مزامنة البناء
            </button>
            <button onClick={onOpenCalculator} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-500 transition-colors">
              فتح حاسبة الطاقات <ArrowRight size={15} />
            </button>
          </div>
          {buildSaved && <p className="mt-2 text-xs font-bold text-emerald-300">تم حفظ بطاقة اللاعب</p>}
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