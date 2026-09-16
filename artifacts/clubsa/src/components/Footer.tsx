import { Shield, FileText, Mail, Info } from "lucide-react";
import type { LegalPage } from "@/components/LegalModal";

export default function Footer({
  onOpenLegal,
}: {
  onOpenLegal: (page: LegalPage) => void;
}) {
  const links: { page: LegalPage; label: string; icon: typeof Shield }[] = [
    { page: "about", label: "من نحن", icon: Info },
    { page: "privacy", label: "سياسة الخصوصية", icon: Shield },
    { page: "terms", label: "الشروط والأحكام", icon: FileText },
    { page: "contact", label: "اتصل بنا", icon: Mail },
  ];

  return (
    <footer className="border-t border-slate-800 bg-slate-950 mt-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-slate-950 font-extrabold text-xs">S</div>
            <span className="font-extrabold text-white text-sm" style={{ fontFamily: "Cairo, sans-serif" }}>CLUBSA</span>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            {links.map((link) => (
              <button
                key={link.page}
                onClick={() => onOpenLegal(link.page)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-300 transition-colors font-bold"
              >
                <link.icon size={14} />
                {link.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-800/60 text-center">
          <p className="text-sm text-slate-400 font-bold mb-2">
            نسبة من أرباح موقع CLUBSA تُخصص وتُتبرع لصالح الجمعيات الخيرية 🤍
          </p>
          <p className="text-xs text-slate-500">جميع الحقوق محفوظة &copy; CLUBSA 2026</p>
        </div>
      </div>
    </footer>
  );
}
