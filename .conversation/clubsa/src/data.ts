import type { Position, Tab, TournamentData, CapProfile } from "@/types";

export const REGIONS = [
  "المنطقة الوسطى",
  "المنطقة الغربية",
  "المنطقة الشرقية",
  "المنطقة الشمالية",
  "المنطقة الجنوبية",
];

export const TABS: Tab[] = [
  { id: "chat", label: "الشات" },
  { id: "calculator", label: "حاسبة الطاقات" },
  { id: "tournaments", label: "البطولات" },
  { id: "market", label: "سوق الانتقالات" },
  { id: "leaderboards", label: "الإحصائيات" },
  { id: "news", label: "الأخبار والدليل" },
];

const OUTFIELD_CATEGORIES = [
  { key: "PAC", label: "السرعة", subs: [
    { key: "ACC", label: "التسارع" },
    { key: "SPR", label: "سرعة الركض" },
  ]},
  { key: "SHO", label: "التسديد", subs: [
    { key: "ATP", label: "التمركز الهجومي" },
    { key: "FIN", label: "الإنهاء" },
    { key: "SHP", label: "قوة التسديد" },
    { key: "LSH", label: "تسديد بعيد المدى" },
    { key: "VOL", label: "كرات طائرة" },
    { key: "PEN", label: "ركلات جزاء" },
  ]},
  { key: "PAS", label: "التمرير", subs: [
    { key: "VIS", label: "الرؤية" },
    { key: "CRO", label: "تمرير عرضي" },
    { key: "FKA", label: "ركلات حرة" },
    { key: "SPA", label: "تمرير قصير" },
    { key: "LPA", label: "تمرير طويل" },
    { key: "CUR", label: "تقويس الكرة" },
  ]},
  { key: "DRI", label: "المراوغة", subs: [
    { key: "AGI", label: "الرشاقة" },
    { key: "BAL", label: "التوازن" },
    { key: "REA", label: "ردود الفعل" },
    { key: "BCT", label: "التحكم بالكرة" },
    { key: "DRB", label: "المراوغة" },
    { key: "COM", label: "رباطة الجأش" },
  ]},
  { key: "DEF", label: "الدفاع", subs: [
    { key: "INT", label: "قطع الكرات" },
    { key: "HEA", label: "دقة الرأسيات" },
    { key: "DAW", label: "الوعي الدفاعي" },
    { key: "STA", label: "تدخل ثابت" },
    { key: "SLT", label: "تدخل بالانزلاق" },
  ]},
  { key: "PHY", label: "القوة البدنية", subs: [
    { key: "JUM", label: "القفز" },
    { key: "STM", label: "التحمل" },
    { key: "STR", label: "القوة" },
    { key: "AGG", label: "الحدة" },
  ]},
];

const GK_CATEGORIES = [
  { key: "DIV", label: "الغطسات", subs: [{ key: "DIV", label: "الغطسات" }] },
  { key: "HAN", label: "الإمساك بالكرة", subs: [{ key: "HAN", label: "الإمساك بالكرة" }] },
  { key: "KIC", label: "الركلات", subs: [{ key: "KIC", label: "الركلات" }] },
  { key: "REF", label: "ردود الفعل", subs: [{ key: "REF", label: "ردود فعل الحارس" }] },
  { key: "SPD", label: "سرعة الحارس", subs: [{ key: "SPD", label: "سرعة الحارس" }] },
  { key: "POS", label: "قراءة الموقف", subs: [{ key: "POS", label: "قراءة الموقف" }] },
];

export const POSITIONS: Position[] = [
  { id: "GK", label: "حارس مرمى", type: "GK", categories: GK_CATEGORIES,
    weights: { DIV: 0.24, HAN: 0.21, KIC: 0.09, REF: 0.24, SPD: 0.1, POS: 0.12 } },
  { id: "CB", label: "قلب دفاع", type: "OUT", categories: OUTFIELD_CATEGORIES,
    weights: { DEF: 0.42, PHY: 0.29, PAC: 0.09, PAS: 0.09, DRI: 0.06, SHO: 0.05 } },
  { id: "FB", label: "ظهير", type: "OUT", categories: OUTFIELD_CATEGORIES,
    weights: { DEF: 0.3, PAC: 0.24, PHY: 0.16, DRI: 0.14, PAS: 0.12, SHO: 0.04 } },
  { id: "CDM", label: "مدافع وسط", type: "OUT", categories: OUTFIELD_CATEGORIES,
    weights: { DEF: 0.3, PAS: 0.22, PHY: 0.2, DRI: 0.14, PAC: 0.09, SHO: 0.05 } },
  { id: "CM", label: "وسط ميدان", type: "OUT", categories: OUTFIELD_CATEGORIES,
    weights: { PAS: 0.28, DRI: 0.22, DEF: 0.16, PHY: 0.14, PAC: 0.12, SHO: 0.08 } },
  { id: "CAM", label: "صانع ألعاب", type: "OUT", categories: OUTFIELD_CATEGORIES,
    weights: { PAS: 0.28, DRI: 0.28, SHO: 0.2, PAC: 0.12, PHY: 0.07, DEF: 0.05 } },
  { id: "WG", label: "جناح", type: "OUT", categories: OUTFIELD_CATEGORIES,
    weights: { PAC: 0.3, DRI: 0.27, SHO: 0.2, PAS: 0.13, PHY: 0.06, DEF: 0.04 } },
  { id: "ST", label: "مهاجم", type: "OUT", categories: OUTFIELD_CATEGORIES,
    weights: { SHO: 0.34, PAC: 0.22, DRI: 0.2, PHY: 0.14, PAS: 0.08, DEF: 0.02 } },
];

export const POSITION_LABELS: Record<string, string> = Object.fromEntries(
  POSITIONS.map((p) => [p.id, p.label]),
);

export const TOURNAMENTS: Record<string, TournamentData> = {
  "المنطقة الوسطى": { teams: [], matches: [] },
  "المنطقة الغربية": { teams: [], matches: [] },
  "المنطقة الشرقية": { teams: [], matches: [] },
  "المنطقة الشمالية": { teams: [], matches: [] },
  "المنطقة الجنوبية": { teams: [], matches: [] },
};

export const CAP_PROFILES: Record<string, CapProfile> = {
  GK: {
    base: { DIV: 50, HAN: 50, KIC: 45, REF: 50, SPD: 45, POS: 50 },
    growth: { DIV: 0.78, HAN: 0.78, KIC: 0.6, REF: 0.78, SPD: 0.6, POS: 0.78 },
  },
  CB: {
    base: { ACC: 42, SPR: 42, ATP: 30, FIN: 30, SHP: 30, LSH: 25, VOL: 25, PEN: 33, VIS: 35, CRO: 35, FKA: 30, SPA: 38, LPA: 35, CUR: 35, AGI: 33, BAL: 33, REA: 40, BCT: 35, DRB: 33, COM: 37, INT: 55, HEA: 55, DAW: 55, STA: 55, SLT: 55, JUM: 50, STM: 50, STR: 55, AGG: 55 },
    growth: { ACC: 0.82, SPR: 0.8, ATP: 0.4, FIN: 0.4, SHP: 0.4, LSH: 0.4, VOL: 0.4, PEN: 0.4, VIS: 0.4, CRO: 0.4, FKA: 0.4, SPA: 0.4, LPA: 0.4, CUR: 0.4, AGI: 0.4, BAL: 0.4, REA: 0.4, BCT: 0.4, DRB: 0.4, COM: 0.4, INT: 0.76, HEA: 0.7, DAW: 0.78, STA: 0.7, SLT: 0.7, JUM: 0.8, STM: 0.72, STR: 0.74, AGG: 0.66 },
  },
  FB: {
    base: { ACC: 50, SPR: 50, ATP: 35, FIN: 35, SHP: 35, LSH: 30, VOL: 30, PEN: 38, VIS: 40, CRO: 43, FKA: 35, SPA: 43, LPA: 40, CUR: 43, AGI: 43, BAL: 40, REA: 45, BCT: 43, DRB: 43, COM: 42, INT: 45, HEA: 40, DAW: 48, STA: 45, SLT: 45, JUM: 40, STM: 43, STR: 43, AGG: 40 },
    growth: { ACC: 0.86, SPR: 0.84, ATP: 0.6, FIN: 0.6, SHP: 0.6, LSH: 0.6, VOL: 0.6, PEN: 0.6, VIS: 0.7, CRO: 0.84, FKA: 0.7, SPA: 0.84, LPA: 0.8, CUR: 0.84, AGI: 0.78, BAL: 0.76, REA: 0.74, BCT: 0.78, DRB: 0.78, COM: 0.76, INT: 0.84, HEA: 0.7, DAW: 0.78, STA: 0.8, SLT: 0.8, JUM: 0.76, STM: 0.86, STR: 0.86, AGG: 0.7 },
  },
  CDM: {
    base: { ACC: 42, SPR: 42, ATP: 35, FIN: 35, SHP: 35, LSH: 30, VOL: 30, PEN: 38, VIS: 48, CRO: 43, FKA: 40, SPA: 48, LPA: 48, CUR: 43, AGI: 40, BAL: 38, REA: 48, BCT: 43, DRB: 40, COM: 45, INT: 50, HEA: 43, DAW: 50, STA: 50, SLT: 48, JUM: 43, STM: 48, STR: 48, AGG: 45 },
    growth: { ACC: 0.82, SPR: 0.8, ATP: 0.66, FIN: 0.66, SHP: 0.66, LSH: 0.6, VOL: 0.6, PEN: 0.64, VIS: 0.8, CRO: 0.74, FKA: 0.76, SPA: 0.8, LPA: 0.76, CUR: 0.74, AGI: 0.7, BAL: 0.68, REA: 0.68, BCT: 0.7, DRB: 0.7, COM: 0.7, INT: 0.74, HEA: 0.74, DAW: 0.76, STA: 0.7, SLT: 0.74, JUM: 0.74, STM: 0.84, STR: 0.76, AGG: 0.74 },
  },
  CM: {
    base: { ACC: 42, SPR: 42, ATP: 40, FIN: 40, SHP: 40, LSH: 35, VOL: 35, PEN: 40, VIS: 48, CRO: 43, FKA: 40, SPA: 50, LPA: 48, CUR: 45, AGI: 43, BAL: 40, REA: 48, BCT: 45, DRB: 45, COM: 48, INT: 40, HEA: 38, DAW: 40, STA: 38, SLT: 35, JUM: 38, STM: 43, STR: 40, AGG: 38 },
    growth: { ACC: 0.82, SPR: 0.8, ATP: 0.7, FIN: 0.7, SHP: 0.7, LSH: 0.66, VOL: 0.66, PEN: 0.7, VIS: 0.8, CRO: 0.74, FKA: 0.76, SPA: 0.8, LPA: 0.76, CUR: 0.74, AGI: 0.74, BAL: 0.76, REA: 0.72, BCT: 0.74, DRB: 0.74, COM: 0.72, INT: 0.8, HEA: 0.74, DAW: 0.8, STA: 0.8, SLT: 0.8, JUM: 0.74, STM: 0.84, STR: 0.76, AGG: 0.74 },
  },
  CAM: {
    base: { ACC: 46, SPR: 45, ATP: 45, FIN: 45, SHP: 44, LSH: 46, VOL: 43, PEN: 44, VIS: 50, CRO: 45, FKA: 44, SPA: 50, LPA: 48, CUR: 46, AGI: 48, BAL: 46, REA: 48, BCT: 50, DRB: 48, COM: 48, INT: 25, HEA: 33, DAW: 25, STA: 25, SLT: 22, JUM: 35, STM: 38, STR: 35, AGG: 33 },
    growth: { ACC: 0.84, SPR: 0.82, ATP: 0.8, FIN: 0.8, SHP: 0.8, LSH: 0.84, VOL: 0.78, PEN: 0.8, VIS: 0.88, CRO: 0.8, FKA: 0.8, SPA: 0.86, LPA: 0.84, CUR: 0.84, AGI: 0.84, BAL: 0.84, REA: 0.8, BCT: 0.84, DRB: 0.84, COM: 0.8, INT: 0.2, HEA: 0.24, DAW: 0.2, STA: 0.2, SLT: 0.16, JUM: 0.2, STM: 0.2, STR: 0.2, AGG: 0.2 },
  },
  WG: {
    base: { ACC: 50, SPR: 50, ATP: 45, FIN: 48, SHP: 45, LSH: 45, VOL: 42, PEN: 45, VIS: 45, CRO: 48, FKA: 42, SPA: 47, LPA: 45, CUR: 48, AGI: 50, BAL: 48, REA: 48, BCT: 48, DRB: 50, COM: 45, INT: 25, HEA: 35, DAW: 25, STA: 25, SLT: 22, JUM: 35, STM: 35, STR: 33, AGG: 30 },
    growth: { ACC: 0.9, SPR: 0.88, ATP: 0.8, FIN: 0.76, SHP: 0.8, LSH: 0.8, VOL: 0.76, PEN: 0.8, VIS: 0.8, CRO: 0.84, FKA: 0.76, SPA: 0.8, LPA: 0.8, CUR: 0.8, AGI: 0.86, BAL: 0.84, REA: 0.8, BCT: 0.86, DRB: 0.84, COM: 0.8, INT: 0.3, HEA: 0.4, DAW: 0.3, STA: 0.26, SLT: 0.26, JUM: 0.4, STM: 0.4, STR: 0.34, AGG: 0.3 },
  },
  ST: {
    base: { ACC: 47, SPR: 46, ATP: 52, FIN: 52, SHP: 49, LSH: 46, VOL: 44, PEN: 49, VIS: 39, CRO: 36, FKA: 34, SPA: 39, LPA: 36, CUR: 39, AGI: 44, BAL: 41, REA: 46, BCT: 44, DRB: 44, COM: 46, INT: 26, HEA: 41, DAW: 26, STA: 26, SLT: 23, JUM: 44, STM: 41, STR: 46, AGG: 41 },
    growth: { ACC: 0.90, SPR: 0.90, ATP: 0.78, FIN: 0.78, SHP: 0.76, LSH: 0.68, VOL: 0.72, PEN: 0.76, VIS: 0.40, CRO: 0.40, FKA: 0.32, SPA: 0.40, LPA: 0.40, CUR: 0.40, AGI: 0.64, BAL: 0.56, REA: 0.64, BCT: 0.64, DRB: 0.88, COM: 0.64, INT: 0.16, HEA: 0.48, DAW: 0.16, STA: 0.19, SLT: 0.12, JUM: 0.56, STM: 0.48, STR: 0.64, AGG: 0.48 },
  },
};

export function capForLevel(posId: string, level: number): Record<string, number> {
  const profile = CAP_PROFILES[posId];
  if (!profile) return {};
  const caps: Record<string, number> = {};
  for (const key of Object.keys(profile.base)) {
    caps[key] = Math.min(99, Math.round(profile.base[key] + profile.growth[key] * level));
  }
  return caps;
}

export const FORBIDDEN_WORDS = ["غبي", "احمق", "تافه", "نصاب", "حقير", "خرا"];
