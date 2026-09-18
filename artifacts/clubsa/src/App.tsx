import { useState } from "react";
import { useGoogleFonts } from "@/hooks/useGoogleFonts";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import CalculatorPage from "@/components/CalculatorPage";
import TournamentsPage from "@/components/TournamentsPage";
import ChatPage from "@/components/ChatPage";
import MarketPage from "@/components/MarketPage";
import NewsPage from "@/components/NewsPage";
import LeaderboardsPage from "@/components/LeaderboardsPage";
import PlayerProfilePage from "@/components/PlayerProfilePage";
import ClubProfilePage from "@/components/ClubProfilePage";
import LoginModal from "@/components/LoginModal";
import WelcomeModal from "@/components/WelcomeModal";
import ClubSettingsModal from "@/components/ClubSettingsModal";
import ConsentBanner from "@/components/ConsentBanner";
import Footer from "@/components/Footer";
import LegalModal from "@/components/LegalModal";
import type { LegalPage } from "@/components/LegalModal";
import type { TabId } from "@/types";

export default function App() {
  useGoogleFonts();
  const { user: auth, loading, signUp, signIn, signOut, completeProfile, saveAvatar, saveBuild, setUser } = useAuth();
  const [tab, setTab] = useState<TabId>("calculator");
  const [welcomeOpen, setWelcomeOpen] = useState(true);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMode, setLoginMode] = useState<"login" | "register">("login");
  const [clubSettingsOpen, setClubSettingsOpen] = useState(false);
  const [legalPage, setLegalPage] = useState<LegalPage | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [clubProfileId, setClubProfileId] = useState<string | null>(null);

  const handleLogout = () => {
    signOut();
    setProfileOpen(false);
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

  const handleClubSettingsSave = (updates: { clubLogo?: string; clubColors?: { primary: string; secondary: string } }) => {
    if (!auth) return;
    setUser({
      ...auth,
      clubLogo: updates.clubLogo ?? auth.clubLogo,
      clubColors: updates.clubColors ?? auth.clubColors,
    });
  };

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
        onOpenClubSettings={() => setClubSettingsOpen(true)}
        onOpenProfile={() => setProfileOpen(true)}
      />

      <div className="flex-1 px-4 py-8 sm:px-8">
        {profileOpen && auth ? (
          <PlayerProfilePage
            auth={auth}
            onBack={() => setProfileOpen(false)}
            onSaveAvatar={(avatar) => saveAvatar(auth.id, avatar)}
            onSaveBuild={(build) => saveBuild(auth.id, build)}
            onOpenClub={(clubId) => { setProfileOpen(false); setClubProfileId(clubId); }}
            onOpenCalculator={() => { setProfileOpen(false); setTab("calculator"); }}
          />
        ) : clubProfileId ? (
          <ClubProfilePage clubId={clubProfileId} onBack={() => setClubProfileId(null)} />
        ) : (
          <>
            {tab === "calculator" && <CalculatorPage auth={auth} onRequireLogin={handleRequireLogin} onSaveBuild={(build) => auth && saveBuild(auth.id, build)} />}
            {tab === "tournaments" && <TournamentsPage />}
            {tab === "chat" && <ChatPage auth={auth} onRequireLogin={handleRequireLogin} />}
            {tab === "market" && <MarketPage auth={auth} onRequireLogin={handleRequireLogin} onOpenClubProfile={(clubId) => setClubProfileId(clubId)} />}
            {tab === "news" && <NewsPage />}
            {tab === "leaderboards" && <LeaderboardsPage />}
          </>
        )}
      </div>

      <Footer onOpenLegal={openLegal} />

      {welcomeOpen && !auth && (
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
      {clubSettingsOpen && auth && auth.role === "president" && (
        <ClubSettingsModal auth={auth} onClose={() => setClubSettingsOpen(false)} onSave={handleClubSettingsSave} />
      )}
      {legalPage && <LegalModal page={legalPage} onClose={() => setLegalPage(null)} />}
      <ConsentBanner onOpenLegal={openLegal} />
    </div>
  );
}
