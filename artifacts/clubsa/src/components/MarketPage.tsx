import { useState, useEffect, useCallback } from "react";
import { Repeat, Clock, TrendingUp, Search, Wallet, Lock, ArrowRightLeft, Shield, X } from "lucide-react";
import { getClubProfile, getClubPlayers, applyMarketState } from "@/lib/mockData";
import { buyListing, cancelMyListing, createListing, fetchRemoteListings, getMarketState, marketErrorText } from "@/lib/market";
import type { RemoteListing } from "@/lib/market";
import { POSITION_LABELS } from "@/data";
import type { AuthUser, ClubProfile, PlayerProfile } from "@/types";

const MERCATO_DAYS = [4, 5, 6];

function isMercatoOpen(): boolean {
  return MERCATO_DAYS.includes(new Date().getDay());
}

function getNextMercatoOpen(): Date {
  const now = new Date();
  const day = now.getDay();
  const openDate = new Date(now);
  if (day >= 4 && day <= 6) return openDate;
  const daysUntilThursday = (4 - day + 7) % 7 || 7;
  openDate.setDate(now.getDate() + daysUntilThursday);
  openDate.setHours(0, 0, 0, 0);
  return openDate;
}

function getNextMercatoClose(): Date {
  const now = new Date();
  const day = now.getDay();
  if (day >= 4 && day <= 6) {
    const closeDate = new Date(now);
    const daysUntilSunday = (7 - day) % 7 || 7;
    closeDate.setDate(now.getDate() + daysUntilSunday);
    closeDate.setHours(0, 0, 0, 0);
    return closeDate;
  }
  return getNextMercatoOpen();
}

type TimeLeft = { days: number; hours: number; minutes: number; seconds: number };

function calcTimeLeft(target: Date): TimeLeft {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function TimeBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border border-slate-800 bg-slate-900/80 flex items-center justify-center">
        <span className="text-2xl sm:text-3xl font-extrabold text-cyan-300 tabular-nums" style={{ fontFamily: "Cairo, sans-serif" }}>
          {String(value).padStart(2, "0")}
        </span>
      </div>
      <span className="text-[11px] text-slate-500 font-bold mt-2">{label}</span>
    </div>
  );
}

function ClubProfileModal({ club, onClose }: { club: ClubProfile; onClose: () => void }) {
  const [players] = useState<PlayerProfile[]>(() =>
    getClubPlayers(club.id).map((p) => ({
      id: p.id, name: p.name, role: p.role, region: p.region,
      is_free_agent: p.is_free_agent, join_status: p.join_status,
      club_id: p.club_id, position: p.position, overall: p.overall, avatar: p.avatar, balance: p.balance,
    }))
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 relative max-h-[85vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 left-4 text-slate-500 hover:text-slate-200 transition-colors">
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="h-11 w-11 rounded-xl border-2 border-slate-700 bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 sm:h-14 sm:w-14">
            {club.logo ? (
              <img src={club.logo} alt={club.name} className="w-full h-full object-cover" />
            ) : (
              <Shield size={24} className="text-slate-600" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-white" style={{ fontFamily: "Cairo, sans-serif" }}>{club.name}</h2>
            <p className="text-xs text-slate-500">{club.region}</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-5">
          <div className="rounded-lg bg-slate-800/60 px-2 py-1.5 text-center">
            <p className="text-[10px] text-slate-500">فوز</p>
            <p className="text-sm font-bold text-emerald-300 tabular-nums">{club.wins}</p>
          </div>
          <div className="rounded-lg bg-slate-800/60 px-2 py-1.5 text-center">
            <p className="text-[10px] text-slate-500">تعادل</p>
            <p className="text-sm font-bold text-slate-300 tabular-nums">{club.draws}</p>
          </div>
          <div className="rounded-lg bg-slate-800/60 px-2 py-1.5 text-center">
            <p className="text-[10px] text-slate-500">خسارة</p>
            <p className="text-sm font-bold text-red-300 tabular-nums">{club.losses}</p>
          </div>
          <div className="rounded-lg bg-slate-800/60 px-2 py-1.5 text-center">
            <p className="text-[10px] text-slate-500">بطولات</p>
            <p className="text-sm font-bold text-amber-300 tabular-nums">{club.trophies}</p>
          </div>
        </div>

        <h3 className="text-sm font-bold text-slate-300 mb-3">تشكيلة الفريق</h3>
        {players.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">لا يوجد لاعبون في هذا النادي بعد</p>
        ) : (
          <div className="space-y-2">
            {players.map((p) => (
                  <div key={p.id} className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2.5 sm:px-4">
                    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                      <div className="h-8 w-8 shrink-0 rounded-lg bg-slate-800 flex items-center justify-center text-cyan-300 font-extrabold text-xs sm:h-9 sm:w-9">
                    {p.overall || "—"}
                  </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-100">{p.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {p.position ? POSITION_LABELS[p.position] || p.position : "غير محدد"}
                      {p.join_status === "pending" && " · بانتظار الموافقة"}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                  p.role === "president"
                    ? "bg-blue-500/15 text-blue-300"
                    : p.role === "scout"
                      ? "bg-amber-500/15 text-amber-300"
                      : "bg-cyan-500/15 text-cyan-300"
                }`}>
                  {p.role === "president" ? "رئيس" : p.role === "scout" ? "كشاف" : "لاعب"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const PLAYER_PERCENT = 70;

function money(n: number): string {
  return n.toLocaleString("en-US");
}

export default function MarketPage({
  auth,
  onRequireLogin,
  onOpenClubProfile,
  onAuthRefresh,
}: {
  auth: AuthUser | null;
  onRequireLogin: () => void;
  onOpenClubProfile?: (clubId: string) => void;
  onAuthRefresh?: (userId: string) => void;
}) {
  const open = isMercatoOpen();
  const [target] = useState(() => (open ? getNextMercatoClose() : getNextMercatoOpen()));
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calcTimeLeft(target));
  const [query, setQuery] = useState("");
  const [listings, setListings] = useState<RemoteListing[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [buyTarget, setBuyTarget] = useState<RemoteListing | null>(null);
  const [buyError, setBuyError] = useState("");
  const [buyDone, setBuyDone] = useState("");
  const [busy, setBusy] = useState(false);
  const [myPrice, setMyPrice] = useState("");
  const [myError, setMyError] = useState("");
  const [clubProfile, setClubProfile] = useState<ClubProfile | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(calcTimeLeft(target)), 1000);
    return () => clearInterval(interval);
  }, [target]);

  const reload = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await fetchRemoteListings(signal);
      setListings(data.listings);
      setLoadError(false);
      setLoaded(true);
    } catch {
      if (!signal?.aborted) setLoadError(true);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void reload(controller.signal);
    const timer = setInterval(() => void reload(controller.signal), 5000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [reload]);

  const refreshWallet = async () => {
    if (!auth) return;
    try {
      const state = await getMarketState(auth.id);
      if (applyMarketState(auth.id, state)) onAuthRefresh?.(auth.id);
    } catch {
      // سيحدّثها المزامن الدوري لاحقًا
    }
  };

  const targetLabel = target.toLocaleDateString("ar-SA", { weekday: "long", day: "numeric", month: "long" });

  const filtered = listings.filter(
    (l) =>
      !query ||
      l.player.name.includes(query) ||
      (l.player.clubName ?? "").includes(query) ||
      (POSITION_LABELS[l.player.position ?? ""] || l.player.position || "").includes(query),
  );

  const myListing = auth ? listings.find((l) => l.player.id === auth.id) : undefined;

  const openClubProfile = (clubId: string) => {
    if (onOpenClubProfile) {
      onOpenClubProfile(clubId);
      return;
    }
    const profile = getClubProfile(clubId);
    if (profile) setClubProfile(profile);
  };

  const listMyself = async () => {
    if (!auth) { onRequireLogin(); return; }
    const price = Number(myPrice);
    if (!Number.isInteger(price) || price < 1) { setMyError("أدخل مبلغًا صحيحًا (رقم صحيح أكبر من صفر)."); return; }
    setBusy(true);
    setMyError("");
    try {
      await createListing(auth.id, price);
      setMyPrice("");
      await reload();
    } catch (e) {
      setMyError(marketErrorText(e));
    } finally {
      setBusy(false);
    }
  };

  const cancelMine = async () => {
    if (!auth) return;
    setBusy(true);
    setMyError("");
    try {
      await cancelMyListing(auth.id);
      await reload();
    } catch (e) {
      setMyError(marketErrorText(e));
    } finally {
      setBusy(false);
    }
  };

  const tryBuy = (listing: RemoteListing) => {
    if (!auth) { onRequireLogin(); return; }
    setBuyTarget(listing);
    setBuyError("");
    setBuyDone("");
  };

  const confirmBuy = async () => {
    if (!auth || !buyTarget) return;
    if (auth.role !== "president") { setBuyError("شراء اللاعبين متاح لرئيس النادي فقط."); return; }
    setBusy(true);
    setBuyError("");
    try {
      const result = await buyListing(auth.id, buyTarget.id);
      setBuyDone(`تم ضمّ ${buyTarget.player.name}. دُفع ${money(result.price)} — اللاعب ${money(result.playerShare)}${result.clubShare > 0 ? ` ونادييه السابق ${money(result.clubShare)}` : ""}.`);
      await Promise.all([reload(), refreshWallet()]);
      setTimeout(() => { setBuyTarget(null); setBuyDone(""); }, 3500);
    } catch (e) {
      setBuyError(marketErrorText(e));
    } finally {
      setBusy(false);
    }
  };

  const isPlayer = auth?.role === "player";

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl border mb-4 ${open ? "bg-emerald-500/10 border-emerald-500/30" : "bg-slate-900 border-slate-800"}`}>
          <Repeat size={28} className={open ? "text-emerald-400" : "text-slate-500"} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2" style={{ fontFamily: "Cairo, sans-serif" }}>
          {open ? "سوق الانتقالات مفتوح الآن" : "سوق الانتقالات مغلق"}
        </h1>
        <p className="text-slate-400 text-sm">
          {open ? "الميركاتو مفتوح من الخميس إلى السبت — يمكنك التداول والبحث الآن." : "يفتح الميركاتو من الخميس إلى السبت — تابع العداد التنازلي."}
        </p>
      </div>

      <div className={`rounded-2xl border bg-slate-900/60 p-6 sm:p-8 mb-6 ${open ? "border-emerald-500/30" : "border-slate-800"}`}>
        <div className="flex items-center justify-center gap-2 mb-6">
          <Clock size={16} className={open ? "text-emerald-400" : "text-cyan-400"} />
          <span className="text-sm font-bold text-slate-300">
            {open ? "الوقت المتبقي لإغلاق الميركاتو" : "الوقت المتبقي لفتح الميركاتو القادم"}
          </span>
        </div>

        <div className="flex items-center justify-center gap-3 sm:gap-5">
          <TimeBox value={timeLeft.days} label="أيام" />
          <span className="text-2xl text-slate-700 font-extrabold">:</span>
          <TimeBox value={timeLeft.hours} label="ساعات" />
          <span className="text-2xl text-slate-700 font-extrabold">:</span>
          <TimeBox value={timeLeft.minutes} label="دقائق" />
          <span className="text-2xl text-slate-700 font-extrabold">:</span>
          <TimeBox value={timeLeft.seconds} label="ثواني" />
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800/70 text-center">
          <p className="text-xs text-slate-500">{open ? "يغلق يوم" : "يفتح يوم"}</p>
          <p className="text-sm font-bold text-slate-200 mt-1">{targetLabel}</p>
        </div>
      </div>

      {open ? (
        <>
          {isPlayer && (
            <div className="rounded-2xl border border-cyan-500/30 bg-slate-900/60 p-4 mb-6">
              <h2 className="text-sm font-bold text-cyan-300 mb-1">اعرض نفسك للبيع</h2>
              <p className="text-[11px] text-slate-500 mb-3">
                عند ضمّك يستلم لاعب {PLAYER_PERCENT}% من المبلغ في محفظته، و{100 - PLAYER_PERCENT}% يذهب لناديك الحالي (إن كان لك نادٍ).
              </p>
              {myListing ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-slate-200">
                    أنت معروض في السوق بسعر <span className="font-bold text-amber-300">{money(myListing.price)}</span>
                  </p>
                  <button onClick={() => void cancelMine()} disabled={busy} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-red-300 hover:bg-slate-700 disabled:opacity-50">
                    إلغاء العرض
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={myPrice}
                    onChange={(e) => setMyPrice(e.target.value)}
                    placeholder="السعر الذي تطلبه"
                    className="flex-1 bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500"
                  />
                  <button onClick={() => void listMyself()} disabled={busy} className="px-4 py-2 rounded-lg text-sm font-bold bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50">
                    اعرض نفسي
                  </button>
                </div>
              )}
              {myError && <p role="alert" className="text-xs text-red-400 mt-2">{myError}</p>}
            </div>
          )}

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Search size={16} className="text-slate-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث عن لاعب أو نادي أو مركز..."
                className="flex-1 bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-2">
              {filtered.length === 0 ? (
                <div className="text-center py-8">
                  <Search size={24} className="mx-auto text-slate-600 mb-3" />
                  <p className="text-sm font-bold text-slate-300">
                    {!loaded && !loadError ? "جارٍ تحميل العروض..." : loadError ? "تعذّر الاتصال بالخادم. نعيد المحاولة تلقائيًا..." : "لا توجد لاعبون معروضون حالياً"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">عندما يعرض اللاعبون أنفسهم للبيع سيظهرون هنا</p>
                </div>
              ) : (
                filtered.map((l) => (
                  <div key={l.id} className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-3 hover:border-slate-700 transition-colors sm:px-4">
                    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                      <div className="h-9 w-9 shrink-0 rounded-lg bg-slate-800 flex items-center justify-center text-cyan-300 font-extrabold text-sm sm:h-10 sm:w-10">
                        {l.player.overall || "—"}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-100">{l.player.name}</p>
                        {l.player.clubId ? (
                          <button onClick={() => openClubProfile(l.player.clubId!)} className="text-xs text-slate-500 hover:text-cyan-300 transition-colors">
                            {l.player.clubName} · {POSITION_LABELS[l.player.position ?? ""] || l.player.position || "غير محدد"}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500">لاعب حر · {POSITION_LABELS[l.player.position ?? ""] || l.player.position || "غير محدد"}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                      <div className="flex items-center gap-1 text-amber-300 font-bold text-xs sm:text-sm">
                        <Wallet size={14} />
                        {money(l.price)}
                      </div>
                      {auth?.id !== l.player.id && (
                        <button
                          onClick={() => tryBuy(l)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                        >
                          <ArrowRightLeft size={13} /> ضمّ اللاعب
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {buyTarget && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4" onClick={() => !busy && setBuyTarget(null)}>
              <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 relative">
                <h2 className="text-lg font-extrabold text-white mb-1" style={{ fontFamily: "Cairo, sans-serif" }}>
                  ضمّ {buyTarget.player.name}
                </h2>
                <p className="text-xs text-slate-400 mb-4">
                  {buyTarget.player.clubName ?? "لاعب حر"} · {POSITION_LABELS[buyTarget.player.position ?? ""] || buyTarget.player.position || "غير محدد"} · تقييم {buyTarget.player.overall}
                </p>

                {buyDone ? (
                  <div className="text-center py-4">
                    <TrendingUp size={32} className="mx-auto text-emerald-400 mb-3" />
                    <p className="text-sm font-bold text-emerald-300">تمت الصفقة!</p>
                    <p className="text-xs text-slate-400 mt-1">{buyDone}</p>
                  </div>
                ) : (
                  <>
                    <div className="rounded-xl bg-slate-800/60 p-3 mb-4 text-xs space-y-1.5">
                      <div className="flex justify-between"><span className="text-slate-400">السعر المطلوب</span><span className="font-bold text-amber-300">{money(buyTarget.price)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">يستلم اللاعب ({PLAYER_PERCENT}%)</span><span className="text-slate-200">{money(Math.floor((buyTarget.price * PLAYER_PERCENT) / 100))}</span></div>
                      {buyTarget.player.clubId && (
                        <div className="flex justify-between"><span className="text-slate-400">ناديه الحالي ({100 - PLAYER_PERCENT}%)</span><span className="text-slate-200">{money(buyTarget.price - Math.floor((buyTarget.price * PLAYER_PERCENT) / 100))}</span></div>
                      )}
                      {auth?.budget !== undefined && (
                        <div className="flex justify-between border-t border-slate-700 pt-1.5"><span className="text-slate-400">ميزانية ناديك</span><span className="text-slate-200">{money(auth.budget)}</span></div>
                      )}
                    </div>
                    {auth && auth.role !== "president" && (
                      <p className="text-xs text-amber-300 mb-3">شراء اللاعبين متاح لرؤساء الأندية فقط.</p>
                    )}
                    {buyError && <p role="alert" className="text-xs text-red-400 mb-3">{buyError}</p>}
                    <div className="flex gap-2">
                      <button onClick={() => setBuyTarget(null)} disabled={busy} className="flex-1 py-2.5 rounded-lg text-sm font-bold bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50">
                        إلغاء
                      </button>
                      <button onClick={() => void confirmBuy()} disabled={busy || auth?.role !== "president"} className="flex-1 py-2.5 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50">
                        تأكيد الشراء
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center">
          <Lock size={28} className="mx-auto text-slate-600 mb-3" />
          <p className="text-sm font-bold text-slate-300">سوق الانتقالات مغلق حالياً</p>
          <p className="text-xs text-slate-500 mt-1">عند فتح الميركاتو ستتمكن من التداول بين الأندية.</p>
        </div>
      )}

      {clubProfile && <ClubProfileModal club={clubProfile} onClose={() => setClubProfile(null)} />}
    </div>
  );
}
