import { useState } from "react";
import { ArrowRight, Camera, Check, ChevronLeft, Copy, ExternalLink, Pencil, Save, Send, Shield, Sparkles, UserRound, Wallet } from "lucide-react";
import { PLAY_STYLE_OPTIONS, POSITIONS, POSITION_LABELS } from "@/data";
import { formatBalance } from "@/lib/formatters";
import { getProfilePath } from "@/lib/mockData";
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
  onSaveProfile,
  onOpenClub,
  onOpenCalculator,
  isPublic = false,
  viewer,
  inviteStatus,
  onInviteToClub,
}: {
  auth: AuthUser;
  onBack: () => void;
  onSaveAvatar: (avatar: string | null) => void;
  onSaveBuild: (build: PlayerBuild) => void;
  onSaveProfile?: (updates: { eaId: string; region: string }) => void;
  onOpenClub: (clubId: string) => void;
  onOpenCalculator: () => void;
  isPublic?: boolean;
  viewer?: AuthUser | null;
  inviteStatus?: "pending" | "accepted" | "declined" | null;
  onInviteToClub?: () => void;
}) {
  const [avatar, setAvatar] = useState(auth.avatar || "");
  const [saved, setSaved] = useState(false);
  const build = auth.playerBuild;
  const stats = build?.stats || {};
  const [editingStats, setEditingStats] = useState(!isPublic && !build);
  const [manualPosition, setManualPosition] = useState(build?.position || auth.position || "");
  const [manualOverall, setManualOverall] = useState(build?.overall ?? auth.overall ?? 0);
  const [manualStats, setManualStats] = useState<Record<string, number>>(() =>
    Object.fromEntries(STAT_KEYS.map((key) => [key, build?.stats[key] ?? 0])),
  );
  const [manualPlayStylePlus, setManualPlayStylePlus] = useState(build?.playStylePlus || "");
  const [manualPlayStyles, setManualPlayStyles] = useState<string[]>(build?.playStyles || []);
  const [buildSaved, setBuildSaved] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [profileEaId, setProfileEaId] = useState(auth.eaId || "");

  const clampRating = (value: number) => Math.max(0, Math.min(99, Number.isFinite(value) ? value : 0));

  const handleManualStatChange = (key: string, value: string) => {
    setManualStats((current) => ({ ...current, [key]: clampRating(Number(value) || 0) }));
  };

  const handlePlayStylePlusChange = (value: string) => {
    setManualPlayStylePlus(value);
    if (value) {
      setManualPlayStyles((current) => current.filter((style) => style !== value));
    }
  };

  const togglePlayStyle = (style: string) => {
    setManualPlayStyles((current) =>
      current.includes(style) ? current.filter((item) => item !== style) : [...current, style],
    );
  };

  const handleSaveBuild = () => {
    const nextBuild: PlayerBuild = {
      position: manualPosition || build?.position || auth.position || "ST",
      overall: clampRating(manualOverall),
      stats: Object.fromEntries(
        STAT_KEYS.map((key) => [key, clampRating(manualStats[key] ?? 0)]),
      ),
      playStylePlus: manualPlayStylePlus || null,
      playStyles: manualPlayStyles,
      level: build?.level ?? 50,
      height: build?.height ?? 178,
      weight: build?.weight ?? 74,
      updated_at: new Date().toISOString(),
    };
    onSaveBuild(nextBuild);
    setManualPosition(nextBuild.position);
    setManualOverall(nextBuild.overall);
    setManualStats(nextBuild.stats);
    setManualPlayStylePlus(nextBuild.playStylePlus || "");
    setManualPlayStyles(nextBuild.playStyles || []);
    setEditingStats(false);
    setBuildSaved(true);
    setTimeout(() => setBuildSaved(false), 1800);
  };

  const resetDraft = () => {
    setManualPosition(build?.position || auth.position || "");
    setManualOverall(build?.overall ?? auth.overall ?? 0);
    setManualStats(Object.fromEntries(STAT_KEYS.map((key) => [key, build?.stats[key] ?? 0])));
    setManualPlayStylePlus(build?.playStylePlus || "");
    setManualPlayStyles(build?.playStyles || []);
  };

  const handleToggleEditing = () => {
    if (editingStats) resetDraft();
    setEditingStats((current) => !current);
  };

  const displayedPosition = editingStats ? manualPosition : (auth.position || build?.position || "");
  const displayedPlayStylePlus = editingStats ? manualPlayStylePlus : (build?.playStylePlus || "");
  const displayedPlayStyles = editingStats ? manualPlayStyles : (build?.playStyles || []);
  const canInviteToClub = isPublic &&
    viewer?.role === "president" &&
    Boolean(viewer.clubId) &&
    auth.role === "player" &&
    viewer.id !== auth.id &&
    Boolean(onInviteToClub);
  const referralLink = auth.referralCode
    ? `${window.location.origin}${import.meta.env.BASE_URL}?ref=${encodeURIComponent(auth.referralCode)}`
    : "";

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
            {!isPublic && (
              <label className="absolute bottom-2 right-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-500">
                <Camera size={15} />
                <input type="file" accept="image/*" onChange={handleAvatar} className="hidden" />
              </label>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="mb-1 text-xs font-bold text-cyan-300">ملف اللاعب</p>
            <h1 className="truncate text-2xl font-extrabold text-white sm:text-3xl" style={{ fontFamily: "Cairo, sans-serif" }}>
              {auth.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-400">
              <span>{displayedPosition ? POSITION_LABELS[displayedPosition] || displayedPosition : "المركز غير محدد"}</span>
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
            {canInviteToClub && (
              <button
                onClick={onInviteToClub}
                disabled={inviteStatus === "pending" || inviteStatus === "accepted"}
                className={`mt-3 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-extrabold transition-colors ${
                  inviteStatus === "pending"
                    ? "cursor-not-allowed border border-amber-500/20 bg-amber-500/10 text-amber-300"
                    : inviteStatus === "accepted"
                      ? "cursor-not-allowed border border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                      : "bg-blue-600 text-white hover:bg-blue-500"
                }`}
              >
                <Send size={14} />
                {inviteStatus === "pending" ? "الدعوة معلّقة" : inviteStatus === "accepted" ? "تم الانضمام" : "دعوة للنادي"}
              </button>
            )}
            {!isPublic && (
              <a
                href={getProfilePath(auth.name)}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-cyan-300"
              >
                <ExternalLink size={13} /> فتح الرابط العام
              </a>
            )}
          </div>

          {!isPublic && (
            <div className="flex items-center gap-3 self-start rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3">
              <Wallet size={18} className="text-cyan-300" />
              <div>
                <p className="text-[11px] text-slate-400">المحفظة</p>
                <p className="text-lg font-extrabold text-cyan-300">{formatBalance(auth.balance || 0)}</p>
              </div>
            </div>
          )}
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

          {!isPublic && editingStats && (
            <div className="mb-4 grid gap-4 sm:grid-cols-2">
              <label className="rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-2">
                <span className="mb-1 block text-[11px] font-bold text-slate-400">المركز الأساسي</span>
                <select
                  value={manualPosition}
                  onChange={(event) => setManualPosition(event.target.value)}
                  className="w-full bg-transparent text-sm font-extrabold text-slate-100 outline-none"
                >
                  <option value="" className="bg-slate-900">اختر المركز</option>
                  {POSITIONS.map((position) => (
                    <option key={position.id} value={position.id} className="bg-slate-900">
                      {position.id} — {position.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-2">
                <span className="mb-1 block text-[11px] font-bold text-slate-400">PlayStyle+</span>
                <select
                  value={manualPlayStylePlus}
                  onChange={(event) => handlePlayStylePlusChange(event.target.value)}
                  className="w-full bg-transparent text-sm font-extrabold text-slate-100 outline-none"
                >
                  <option value="" className="bg-slate-900">اختر النمط الأساسي</option>
                  {PLAY_STYLE_OPTIONS.map((style) => (
                    <option key={style} value={style} className="bg-slate-900">{style}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {!isPublic && editingStats && (
            <div className="mb-4 rounded-xl border border-slate-700 bg-slate-800/40 p-3">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles size={15} className="text-amber-300" />
                <p className="text-xs font-bold text-slate-300">PlayStyles العادية</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {PLAY_STYLE_OPTIONS.map((style) => {
                  const selected = manualPlayStyles.includes(style);
                  const isPrimary = manualPlayStylePlus === style;
                  return (
                    <button
                      key={style}
                      type="button"
                      onClick={() => !isPrimary && togglePlayStyle(style)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                        isPrimary
                          ? "cursor-not-allowed border-amber-500/30 bg-amber-500/10 text-amber-300/50"
                          : selected
                            ? "border-cyan-400 bg-cyan-500/20 text-cyan-200"
                            : "border-slate-700 bg-slate-900 text-slate-400 hover:border-cyan-500/50 hover:text-slate-200"
                      }`}
                    >
                      {style}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {(displayedPlayStylePlus || displayedPlayStyles.length > 0) && (
            <div className="mb-4 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles size={15} className="text-amber-300" />
                <p className="text-xs font-bold text-slate-300">PlayStyles</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {displayedPlayStylePlus && (
                  <span className="rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-1 text-xs font-extrabold text-amber-200">
                    {displayedPlayStylePlus}+
                  </span>
                )}
                {displayedPlayStyles.map((style) => (
                  <span key={style} className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-bold text-slate-300">
                    {style}
                  </span>
                ))}
              </div>
            </div>
          )}

          {build ? (
            <p className="text-xs text-slate-500">آخر مزامنة من حاسبة الطاقات: مستوى {build.level} · {build.height} سم · {build.weight} كجم</p>
          ) : (
            <p className="text-xs text-slate-500">أدخل القيم يدوياً أو افتح الحاسبة لمزامنة بناء اللاعب.</p>
          )}

          {!isPublic && (
            <>
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  onClick={handleToggleEditing}
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
            </>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Shield size={17} className="text-blue-400" />
            <h2 className="text-lg font-extrabold text-white">بيانات الحساب</h2>
          </div>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-[11px] text-slate-500">EA ID</p>
              {!isPublic && onSaveProfile ? (
                <div className="mt-1 flex gap-2">
                  <input
                    value={profileEaId}
                    onChange={(event) => setProfileEaId(event.target.value)}
                    aria-label="EA ID"
                    className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-sm font-bold text-slate-100 outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (profileEaId.trim().length < 3) return;
                      onSaveProfile({ eaId: profileEaId.trim(), region: auth.region });
                      setProfileSaved(true);
                      setTimeout(() => setProfileSaved(false), 1800);
                    }}
                    className="rounded-lg bg-cyan-500 px-2.5 py-1.5 text-xs font-extrabold text-slate-950 hover:bg-cyan-400"
                  >
                    حفظ
                  </button>
                </div>
              ) : (
                <p className="font-bold text-cyan-300">{auth.eaId || "غير محدد"}</p>
              )}
              {profileSaved && <p className="mt-1 text-[11px] font-bold text-emerald-300">تم حفظ EA ID</p>}
            </div>
            <div><p className="text-[11px] text-slate-500">المنطقة</p><p className="font-bold text-slate-200">{auth.region || "غير محددة"}</p></div>
            <div><p className="text-[11px] text-slate-500">الحالة</p><p className="font-bold text-emerald-300">{auth.joinStatus === "pending" ? "بانتظار الموافقة" : "نشط"}</p></div>
          </div>
          {!isPublic && auth.referralCode && (
            <div className="mt-5 border-t border-slate-800 pt-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] text-slate-500">رابط دعوة صديق</p>
                  <p className="mt-1 text-xs font-bold text-amber-300">+10,000 رصيد عند التسجيل</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(referralLink);
                    setCopiedReferral(true);
                    setTimeout(() => setCopiedReferral(false), 1800);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs font-extrabold text-amber-200 hover:bg-amber-500/20"
                >
                  {copiedReferral ? <Check size={13} /> : <Copy size={13} />}
                  {copiedReferral ? "تم النسخ" : "نسخ الرابط"}
                </button>
              </div>
              <input readOnly value={referralLink} className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-2 text-[11px] text-slate-400 outline-none" />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}