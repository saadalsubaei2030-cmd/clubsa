import { useState } from "react";
import { X, Shield, Upload, Palette, Check, Loader2 } from "lucide-react";
import { updateClubSettings } from "@/lib/mockData";
import type { AuthUser } from "@/types";

const PRESET_COLORS = [
  "#1e40af", "#0e7490", "#059669", "#dc2626", "#ea580c",
  "#7c3aed", "#be185d", "#1e293b", "#facc15", "#f5f5f5",
];

export default function ClubSettingsModal({
  auth,
  onClose,
  onSave,
}: {
  auth: AuthUser;
  onClose: () => void;
  onSave: (updates: { clubLogo?: string; clubColors?: { primary: string; secondary: string } }) => void;
}) {
  const [logo, setLogo] = useState(auth.clubLogo || "");
  const [primary, setPrimary] = useState(auth.clubColors?.primary || "#1e40af");
  const [secondary, setSecondary] = useState(auth.clubColors?.secondary || "#f5f5f5");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    setSaving(true);
    if (auth.clubId) {
      updateClubSettings(auth.clubId, logo || null, primary, secondary);
    }
    setSaving(false);
    onSave({ clubLogo: logo, clubColors: { primary, secondary } });
    setSaved(true);
    setTimeout(onClose, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 left-4 text-slate-500 hover:text-slate-200 transition-colors">
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <Shield size={18} className="text-blue-400" />
          <h2 className="text-lg font-extrabold text-white" style={{ fontFamily: "Cairo, sans-serif" }}>
            إعدادات النادي
          </h2>
        </div>
        <p className="text-xs text-slate-400 mb-5">{auth.club} — تخصيص هوية ناديك</p>

        <div className="space-y-5">
          <div>
            <span className="text-xs text-slate-400 mb-2 block">شعار / صورة النادي</span>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl border-2 border-slate-700 bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                {logo ? (
                  <img src={logo} alt="شعار النادي" className="w-full h-full object-cover" />
                ) : (
                  <Shield size={24} className="text-slate-600" />
                )}
              </div>
              <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 bg-slate-800/60 hover:border-slate-600 cursor-pointer transition-colors">
                <Upload size={14} className="text-slate-400" />
                <span className="text-xs font-bold text-slate-300">رفع صورة</span>
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </label>
              {logo && (
                <button onClick={() => setLogo("")} className="text-xs text-red-400 hover:text-red-300">
                  إزالة
                </button>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Palette size={14} className="text-slate-400" />
              <span className="text-xs text-slate-400">لون الطقم الأساسي</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setPrimary(c)}
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${primary === c ? "border-white scale-110" : "border-slate-700 hover:border-slate-500"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={primary}
                onChange={(e) => setPrimary(e.target.value)}
                className="w-8 h-8 rounded-lg border-2 border-slate-700 bg-transparent cursor-pointer"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Palette size={14} className="text-slate-400" />
              <span className="text-xs text-slate-400">لون الطقم الاحتياطي</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setSecondary(c)}
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${secondary === c ? "border-white scale-110" : "border-slate-700 hover:border-slate-500"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={secondary}
                onChange={(e) => setSecondary(e.target.value)}
                className="w-8 h-8 rounded-lg border-2 border-slate-700 bg-transparent cursor-pointer"
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-4">
            <span className="text-xs text-slate-400 mb-2 block">معاينة الطقم</span>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: primary }}>
                <span className="text-xs font-extrabold" style={{ color: secondary }}>أساسي</span>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: secondary }}>
                <span className="text-xs font-extrabold" style={{ color: primary }}>احتياطي</span>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className={`w-full mt-6 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
            saved ? "bg-emerald-600 text-white" : "bg-blue-600 hover:bg-blue-500 text-white"
          } ${saving ? "opacity-70" : ""}`}
        >
          {saving ? <><Loader2 size={16} className="animate-spin" /> جارٍ الحفظ...</> : saved ? <><Check size={16} /> تم الحفظ</> : "حفظ الإعدادات"}
        </button>
      </div>
    </div>
  );
}
