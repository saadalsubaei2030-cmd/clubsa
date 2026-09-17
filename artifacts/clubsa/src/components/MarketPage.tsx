import { useState, useEffect } from "react";
import { Repeat, Clock, TrendingUp, Search, Wallet, Lock, ArrowRightLeft, Shield, X } from "lucide-react";
import { getListings, getClubProfile, getClubPlayers, submitOffer } from "@/lib/mockData";
import { POSITION_LABELS } from "@/data";
import type { AuthUser, MarketListing, ClubProfile, PlayerProfile } from "@/types";

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
                  p.role === "president" ? "bg-blue-500/15 text-blue-300" : "bg-cyan-500/15 text-cyan-300"
                }`}>
                  {p.role === "president" ? "رئيس" : "لاعب"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MarketPage({
  auth,
  onRequireLogin,
  onOpenClubProfile,
}: {
  auth: AuthUser | null;
  onRequireLogin: () => void;
  onOpenClubProfile?: (clubId: string) => void;
}) {
  const open = isMercatoOpen();
  const [target] = useState(() => (open ? getNextMercatoClose() : getNextMercatoOpen()));
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calcTimeLeft(target));
  const [query, setQuery] = useState("");
  const [offerListing, setOfferListing] = useState<MarketListing | null>(null);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerError, setOfferError] = useState("");
  const [offerSuccess, setOfferSuccess] = useState(false);
  const [listings] = useState<MarketListing[]>(() => getListings());
  const [clubProfile, setClubProfile] = useState<ClubProfile | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(calcTimeLeft(target)), 1000);
    return () => clearInterval(interval);
  }, [target]);

  const targetLabel = target.toLocaleDateString("ar-SA", { weekday: "long", day: "numeric", month: "long" });

  const filtered = listings.filter(
    (l) => !query || l.player_name.includes(query) || l.club_name.includes(query) || (POSITION_LABELS[l.position] || l.position).includes(query)
  );

  const openClubProfile = (clubId: string) => {
    if (onOpenClubProfile) {
      onOpenClubProfile(clubId);
      return;
    }
    const profile = getClubProfile(clubId);
    if (profile) setClubProfile(profile);
  };

  const handleOffer = () => {
    if (!auth) { onRequireLogin(); return; }
    if (auth.role !== "president") { setOfferError("عرض الانتقالات متاح لرؤساء الأندية فقط."); return; }
    const amount = Number(offerAmount);
    if (!amount || amount <= 0) { setOfferError("يرجى إدخال مبلغ صحيح."); return; }
    if (amount < offerListing!.price * 0.5) { setOfferError("العرض منخفض جداً عن قيمة اللاعب."); return; }
    if (!auth.clubId) { setOfferError("لا يوجد نادي مرتبط بحسابك."); return; }

    setOfferError("");
    const { error } = submitOffer(offerListing!.id, auth.clubId, auth.club, amount);
    if (error) { setOfferError(error); return; }
    setOfferSuccess(true);
    setTimeout(() => { setOfferSuccess(false); setOfferListing(null); setOfferAmount(""); }, 2500);
  };

  const tryOffer = (listing: MarketListing) => {
    if (!auth) { onRequireLogin(); return; }
    setOfferListing(listing);
    setOfferAmount("");
    setOfferError("");
    setOfferSuccess(false);
  };

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
                  <p className="text-sm font-bold text-slate-300">لا توجد لاعبون معروضون حالياً</p>
                  <p className="text-xs text-slate-500 mt-1">عندما يعرض الرؤساء لاعبيهم للبيع سيظهرون هنا</p>
                </div>
              ) : (
                filtered.map((l) => (
                  <div key={l.id} className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-3 hover:border-slate-700 transition-colors sm:px-4">
                    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                      <div className="h-9 w-9 shrink-0 rounded-lg bg-slate-800 flex items-center justify-center text-cyan-300 font-extrabold text-sm sm:h-10 sm:w-10">
                        {l.overall}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-100">{l.player_name}</p>
                        <button onClick={() => openClubProfile(l.club_id)} className="text-xs text-slate-500 hover:text-cyan-300 transition-colors">
                          {l.club_name} · {POSITION_LABELS[l.position] || l.position}
                        </button>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                      <div className="hidden items-center gap-1 text-amber-300 font-bold text-sm sm:flex">
                        <Wallet size={14} />
                        {l.price.toLocaleString()}
                      </div>
                      <button
                        onClick={() => tryOffer(l)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                      >
                        <ArrowRightLeft size={13} /> تقديم عرض
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {offerListing && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4" onClick={() => setOfferListing(null)}>
              <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 relative">
                <h2 className="text-lg font-extrabold text-white mb-1" style={{ fontFamily: "Cairo, sans-serif" }}>
                  تقديم عرض لـ {offerListing.player_name}
                </h2>
                <p className="text-xs text-slate-400 mb-5">
                  {offerListing.club_name} · {POSITION_LABELS[offerListing.position] || offerListing.position} · تقييم {offerListing.overall} · القيمة التقديرية {offerListing.price.toLocaleString()}
                </p>

                {offerSuccess ? (
                  <div className="text-center py-6">
                    <TrendingUp size={32} className="mx-auto text-emerald-400 mb-3" />
                    <p className="text-sm font-bold text-emerald-300">تم تقديم عرضك بنجاح!</p>
                    <p className="text-xs text-slate-500 mt-1">سيتم إشعارك برد النادي المالك.</p>
                  </div>
                ) : (
                  <>
                    <label className="block mb-4">
                      <span className="text-xs text-slate-400 mb-1 block">مبلغ العرض</span>
                      <input
                        type="number"
                        value={offerAmount}
                        onChange={(e) => setOfferAmount(e.target.value)}
                        placeholder={`${offerListing.price.toLocaleString()}`}
                        className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500"
                      />
                    </label>
                    {offerError && <p className="text-xs text-red-400 mb-3">{offerError}</p>}
                    <div className="flex gap-2">
                      <button onClick={() => setOfferListing(null)} className="flex-1 py-2.5 rounded-lg text-sm font-bold bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
                        إلغاء
                      </button>
                      <button onClick={handleOffer} className="flex-1 py-2.5 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors">
                        تأكيد العرض
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
