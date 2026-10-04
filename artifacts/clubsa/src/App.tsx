import React, { useState } from 'react';

// ==========================================
// 1. OMNIROUTE CONFIGURATION & TYPES
// ==========================================
type RoutePath = 'chat' | 'calculator' | 'tournaments' | 'market' | 'stats' | 'news';

interface UserSession {
  isAuthenticated: boolean;
  username: string;
  role: 'guest' | 'player' | 'admin';
}

// ==========================================
// 2. MAIN OMNIROUTE APPLICATION COMPONENT
// ==========================================
export default function OmniRouteApp() {
  const [currentRoute, setCurrentRoute] = useState<RoutePath>('calculator');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [cookieAccepted, setCookieAccepted] = useState(false);

  // Session state mock based on project architecture
  const [session, setSession] = useState<UserSession>({
    isAuthenticated: false,
    username: 'Guest',
    role: 'guest',
  });

  return (
    <div 
      dir="rtl" 
      className="min-h-screen bg-[#0a0d14] text-white flex flex-col justify-between font-sans selection:bg-[#0066ff] selection:text-white"
    >
      {/* ================= TOP NAVIGATION BAR ================= */}
      <header className="flex justify-between items-center px-6 md:px-10 py-4 bg-[#0a0d14] border-b border-[#1e293b]">
        <div 
          className="flex items-center gap-3 cursor-pointer" 
          onClick={() => setCurrentRoute('calculator')}
        >
          <div className="bg-gradient-to-br from-[#0066ff] to-[#00d2ff] text-white px-3 py-1.5 rounded-lg font-bold text-sm shadow-lg shadow-blue-500/20">
            S
          </div>
          <span className="text-xl font-black tracking-wider">CLUBSA</span>
        </div>

        <nav className="hidden md:flex">
          <ul className="flex gap-8 text-sm font-medium">
            <li>
              <button 
                onClick={() => setCurrentRoute('chat')}
                className={`transition-colors duration-200 ${currentRoute === 'chat' ? 'text-white font-bold' : 'text-[#8b9bb4] hover:text-white'}`}
              >
                الشات
              </button>
            </li>
            <li>
              <button 
                onClick={() => setCurrentRoute('calculator')}
                className={`transition-colors duration-200 ${currentRoute === 'calculator' ? 'text-white font-bold' : 'text-[#8b9bb4] hover:text-white'}`}
              >
                حاسبة الطاقات
              </button>
            </li>
            <li>
              <button 
                onClick={() => setCurrentRoute('tournaments')}
                className={`transition-colors duration-200 ${currentRoute === 'tournaments' ? 'text-white font-bold' : 'text-[#8b9bb4] hover:text-white'}`}
              >
                البطولات
              </button>
            </li>
            <li>
              <button 
                onClick={() => setCurrentRoute('market')}
                className={`transition-colors duration-200 ${currentRoute === 'market' ? 'text-white font-bold' : 'text-[#8b9bb4] hover:text-white'}`}
              >
                سوق الانتقالات
              </button>
            </li>
            <li>
              <button 
                onClick={() => setCurrentRoute('stats')}
                className={`transition-colors duration-200 ${currentRoute === 'stats' ? 'text-white font-bold' : 'text-[#8b9bb4] hover:text-white'}`}
              >
                الإحصائيات
              </button>
            </li>
            <li>
              <button 
                onClick={() => setCurrentRoute('news')}
                className={`transition-colors duration-200 ${currentRoute === 'news' ? 'text-white font-bold' : 'text-[#8b9bb4] hover:text-white'}`}
              >
                الأخبار والدليل
              </button>
            </li>
          </ul>
        </nav>

        <button 
          onClick={() => setIsAuthModalOpen(true)}
          className="bg-[#0066ff] hover:bg-[#0052cc] text-white px-5 py-2 rounded-xl font-bold text-sm transition-all duration-200 shadow-md shadow-blue-600/30 active:scale-95"
        >
          {session.isAuthenticated ? session.username : 'تسجيل الدخول / حساب جديد'}
        </button>
      </header>

      {/* ================= OMNIROUTE DYNAMIC VIEWPORT ================= */}
      <main className="flex-grow flex flex-col items-center justify-center p-6 text-center">
        {currentRoute === 'calculator' && (
          <div className="max-w-4xl w-full bg-[#121824] border border-[#1e293b] rounded-2xl p-8 shadow-2xl">
            <h1 className="text-3xl font-black mb-2">حاسبة طاقات اللاعبين</h1>
            <p className="text-[#8b9bb4] text-sm mb-6">CLUBSA • Pro Clubs Builder</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-right mb-6">
              <div className="bg-[#0a0d14] p-4 rounded-xl border border-[#1e293b]">
                <span className="text-xs text-[#8b9bb4] block">المستوى (Level)</span>
                <span className="text-lg font-bold">50</span>
              </div>
              <div className="bg-[#0a0d14] p-4 rounded-xl border border-[#1e293b]">
                <span className="text-xs text-[#8b9bb4] block">الطول (سم)</span>
                <span className="text-lg font-bold">178</span>
              </div>
              <div className="bg-[#0a0d14] p-4 rounded-xl border border-[#1e293b]">
                <span className="text-xs text-[#8b9bb4] block">الوزن (كجم)</span>
                <span className="text-lg font-bold">74</span>
              </div>
            </div>
            <div className="w-full bg-[#0a0d14] h-3 rounded-full overflow-hidden border border-[#1e293b]">
              <div className="bg-gradient-to-r from-[#0066ff] to-[#00d2ff] w-3/4 h-full"></div>
            </div>
          </div>
        )}

        {currentRoute === 'tournaments' && (
          <div className="max-w-4xl w-full bg-[#121824] border border-[#1e293b] rounded-2xl p-8 shadow-2xl">
            <h1 className="text-3xl font-black mb-2">بطولات مناطق السعودية</h1>
            <p className="text-[#8b9bb4] text-sm mb-6">دوريات إقليمية بين أندية Pro Clubs في كل منطقة</p>
            <div className="p-4 bg-[#0a0d14] border border-amber-500/30 rounded-xl text-amber-400 text-sm font-medium">
              🎁 جوائز مالية حقيقية - الفوز بالبطولات يمنح جوائز مالية حقيقية يتم تحديدها وتوزيعها مع كل بطولة
            </div>
          </div>
        )}

        {currentRoute !== 'calculator' && currentRoute !== 'tournaments' && (
          <div className="p-8 bg-[#121824] border border-[#1e293b] rounded-2xl shadow-xl">
            <h2 className="text-2xl font-bold mb-2">قسم {currentRoute}</h2>
            <p className="text-[#8b9bb4]">جاري تحميل محتوى المسار عبر نظام OmniRoute بنجاح...</p>
          </div>
        )}
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="bg-[#0a0d14] border-t border-[#1e293b] px-6 md:px-10 py-6 flex flex-col gap-4 items-center">
        <div className="w-full flex flex-col md:flex-row justify-between items-center text-sm gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-[#0066ff] to-[#00d2ff] text-