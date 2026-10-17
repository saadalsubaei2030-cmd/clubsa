import { useEffect, useMemo, useState } from "react";
import { useGoogleFonts } from "@/hooks/useGoogleFonts";
import { useAuth } from "@/hooks/useAuth";
import { useSocialSync } from "@/hooks/useSocialSync";
import { useMarketSync } from "@/hooks/useMarketSync";
import { useClubInvites } from "@/hooks/useClubInvites";
import { respondToServerInvite, sendClubInvite, toClubInvite } from "@/lib/invites";
import { ackAssignment, getMarketState } from "@/lib/market";
import Navbar from "@/components/Navbar";
import CalculatorPage from "@/components/CalculatorPage";
import ComingSoonPage from "@/components/ComingSoonPage";
import ChatPage from "@/components/ChatPage";
import MarketPage from "@/components/MarketPage";
import NewsPage from "@/components/NewsPage";
import LeaderboardsPage from "@/components/LeaderboardsPage";
import PlayerProfilePage from "@/components/PlayerProfilePage";
import ClubProfilePage from "@/components/ClubProfilePage";
import LoginModal from "@/components/LoginModal";
import WelcomeModal from "@/components/WelcomeModal";
import ConsentBanner from "@/components/ConsentBanner";
import Footer from "@/components/Footer";
import LegalModal from "@/components/LegalModal";
import ClubInviteModal from "@/components/ClubInviteModal";
import InvitePlayerModal from "@/components/InvitePlayerModal";
import type { LegalPage } from "@/components/LegalModal";
import type { TabId } from "@/types";
import { applyMarketState, getPublicAuthUserByUsername } from "@/lib/mockData";

function getPublicProfileSlugFromPath(): string | null {
  const match = window.location.pathname.match(/\/profile\/([^/]+)\/?$/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function getClubIdFromPath(): string | null | undefined {
  const match = window.location.pathname.match(/\/club(?:\/([^/]+))?\/?$/);
  if (!match) return undefined;
  if (!match[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function getAppHomePath(): string {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${basePath || ""}/`;
}

export default function App() {
  useGoogleFonts();
  const { user: auth, loading, signUp, signIn, signOut, completeProfile, saveAvatar, saveBuild, saveProfileSettings, setUser, fetchProfile } = useAuth();
  useSocialSync(auth);
  useMarketSync(auth, (uid) => {
    const next = fetchProfile(uid);
    if (next) setUser(next);
  });
  const [tab, setTab] = useState<TabId>("calculator");
  const [welcomeOpen, setWelcomeOpen] = useState(true);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMode, setLoginMode] = useState<"login" | "register">("login");
  const [legalPage, setLegalPage] = useState<LegalPage | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const initialClubRoute = getClubIdFromPath();
  const [clubPathOpen, setClubPathOpen] = useState(initialClubRoute !== undefined);
  const [clubProfileId, setClubProfileId] = useState<string | null>(initialClubRoute || null);
  const [publicProfileSlug, setPublicProfileSlug] = useState<string | null>(() => getPublicProfileSlugFromPath());
  const [invitesOpen, setInvitesOpen] = useState(false);
  const [invitePlayerOpen, setInvitePlayerOpen] = useState(false);
  const { incoming, sent, refresh: refreshInvites } = useClubInvites(auth);

  useEffect(() => {
    const handlePopState = () => {
      const clubRoute = getClubIdFromPath();
      setPublicProfileSlug(getPublicProfileSlugFromPath());
      setClubPathOpen(clubRoute !== undefined);
      setClubProfileId(clubRoute || null);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const publicProfile = publicProfileSlug ? getPublicAuthUserByUsername(publicProfileSlug) : null;
  const activeClubId = clubProfileId || (clubPathOpen ? auth?.clubId || null : null);
  const pendingInvites = useMemo(() => incoming.map(toClubInvite), [incoming]);

  const navigateHome = () => {
    window.history.pushState({}, "", getAppHomePath());
    setPublicProfileSlug(null);
    setClubPathOpen(false);
    setClubProfileId(null);
  };

  const openClubProfile = (clubId: string) => {
    const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
    window.history.pushState({}, "", `${basePath || ""}/club/${encodeURIComponent(clubId)}`);
    setProfileOpen(false);
    setPublicProfileSlug(null);
    setClubPathOpen(true);
    setClubProfileId(clubId);
  };

  const handleInviteToClub = () => {
    if (!auth || !publicProfile || !["president", "scout"].includes(auth.role) || !auth.clubId || publicProfile.role !== "player") return;
    void sendClubInvite(auth.id, publicProfile.id)
      .then(() => refreshInvites())
      .catch(() => undefined);
  };

  const handleRespondToInvite = async (inviteId: string, status: "accepted" | "declined") => {
    if (!auth) return;
    try {
      await respondToServerInvite(auth.id, Number(inviteId), status);
    } catch {
      await refreshInvites();
      return;
    }
    if (status === "accepted") {
      // النادي الجديد يصل من الخادم؛ نطبّقه فورًا بدل انتظار الدورة التالية.
      try {
        const state = await getMarketState(auth.id);
        if (applyMarketState(auth.id, state)) {
          const refreshedUser = fetchProfile(auth.id);
          if (refreshedUser) setUser(refreshedUser);
        }
        if (state.assignment) await ackAssignment(auth.id).catch(() => undefined);
      } catch {
        // دورة المزامنة العادية ستلتقطه بعد قليل
      }
    }
    await refreshInvites();
  };

  const handleLogout = () => {
    signOut();
    setProfileOpen(false);
    setClubPathOpen(false);
    setClubProfileId(null);
    setWelcomeOpen(true);
  };
  const openLegal = (page: LegalPage) => setLegalPage(page);

  const handleWelcomeSelect = (action: "login" | "register" | "guest") => {
    setWelcomeOpen(false);
    if (action === "login") { setLoginMode("login"); setLoginOpen(true); }
    else if (action === "register") { setLoginMode("register"); setLoginOpen(true); }
  };

  const handleRequireLogin = () => { setLoginMode("login"); setLoginOpen(true); };

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center" style={{ fontFamily: "Tajawal, sans-serif" }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-slate-950 font-extrabold text-xl mx-auto mb-4 animate-pulse">S</div>
          <p className="text-slate-400 text-sm">جارٍ التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col" style={{ fontFamily: "Tajawal, sans-serif" }}>
      <Navbar
        active={tab}
        onChange={setTab}
        auth={auth}
        onOpenLogin={() => { setLoginMode("login"); setLoginOpen(true); }}
        onLogout={handleLogout}
        onOpenProfile={() => setProfileOpen(true)}
        pendingInviteCount={pendingInvites.length}
        onOpenInvites={() => setInvitesOpen(true)}
      />

      <div className="flex-1 px-4 py-8 sm:px-8">
        {publicProfileSlug ? (
          publicProfile ? (
            <PlayerProfilePage
              auth={publicProfile}
              isPublic
              viewer={auth}
              inviteStatus={auth?.clubId ? sent.find((i) => i.toUserId === publicProfile.id && i.clubId === auth.clubId)?.status ?? null : null}
              onInviteToClub={handleInviteToClub}
              onBack={navigateHome}
              onSaveAvatar={() => undefined}
              onSaveBuild={() => undefined}
               onOpenClub={openClubProfile}
              onOpenCalculator={() => undefined}
            />
          ) : (
            <div className="mx-auto max-w-3xl py-20 text-center">
              <p className="text-lg font-extrabold text-slate-200">ملف اللاعب غير موجود</p>
              <p className="mt-2 text-sm text-slate-500">تأكد من صحة رابط الملف العام.</p>
              <button onClick={navigateHome} className="mt-5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-500">
                العودة للرئيسية
              </button>
            </div>
          )
        ) : profileOpen && auth ? (
          <PlayerProfilePage
            auth={auth}
            onBack={() => setProfileOpen(false)}
            onSaveAvatar={(avatar) => saveAvatar(auth.id, avatar)}
            onSaveBuild={(build) => saveBuild(auth.id, build)}
            onSaveProfile={(updates) => saveProfileSettings(auth.id, updates)}
              pendingInvites={pendingInvites}
              onRespondToInvite={handleRespondToInvite}
              onOpenInvitePlayer={() => setInvitePlayerOpen(true)}
             onOpenClub={openClubProfile}
            onOpenCalculator={() => { setProfileOpen(false); setTab("calculator"); }}
          />
        ) : clubPathOpen ? (
          activeClubId ? (
            <ClubProfilePage
              clubId={activeClubId}
              viewer={auth}
              onBack={navigateHome}
              onOpenInvitePlayer={() => setInvitePlayerOpen(true)}
            />
          ) : (
            <div className="mx-auto max-w-3xl py-20 text-center">
              <p className="text-lg font-extrabold text-slate-200">لا يوجد نادي مرتبط بهذا الحساب</p>
              <button onClick={navigateHome} className="mt-5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-500">
                العودة للرئيسية
              </button>
            </div>
          )
        ) : (
          <>
            {tab === "calculator" && <CalculatorPage auth={auth} onRequireLogin={handleRequireLogin} onSaveBuild={(build) => auth && saveBuild(auth.id, build)} />}
            {tab === "tournaments" && <ComingSoonPage title="البطولات" text="نجهّز لكم بطولات الأندية مع الجداول والنتائج. تابعونا." />}
            {tab === "chat" && <ChatPage auth={auth} onRequireLogin={handleRequireLogin} />}
            {tab === "market" && <MarketPage auth={auth} onRequireLogin={handleRequireLogin} onOpenClubProfile={openClubProfile} onAuthRefresh={(uid) => { const next = fetchProfile(uid); if (next) setUser(next); }} />}
            {tab === "news" && <NewsPage />}
            {tab === "leaderboards" && <LeaderboardsPage />}
          </>
        )}
      </div>

      <Footer onOpenLegal={openLegal} />

      {welcomeOpen && !auth && !publicProfileSlug && !clubPathOpen && (
        <WelcomeModal onClose={() => setWelcomeOpen(false)} onSelect={handleWelcomeSelect} />
      )}
      {loginOpen && (
        <LoginModal
          onClose={() => setLoginOpen(false)}
          onSignUp={signUp}
          onSignIn={signIn}
          onCompleteProfile={completeProfile}
          initialMode={loginMode}
        />
      )}
      {invitesOpen && auth && (
        <ClubInviteModal
          invites={pendingInvites}
          onClose={() => setInvitesOpen(false)}
          onRespond={handleRespondToInvite}
        />
      )}
      {invitePlayerOpen && auth && ["president", "scout"].includes(auth.role) && auth.clubId && (
        <InvitePlayerModal
          auth={auth}
          onClose={() => setInvitePlayerOpen(false)}
          onInviteSent={() => void refreshInvites()}
        />
      )}
      {legalPage && <LegalModal page={legalPage} onClose={() => setLegalPage(null)} />}
      <ConsentBanner onOpenLegal={openLegal} />
    </div>
  );
}
