// فلتر الكلمات الممنوعة. هذا الملف نسخة طبق الأصل من artifacts/clubsa/src/lib/profanity.ts
// (الخادم هو المرجع لأنه لا يثق بالمتصفح). عدّل الملفين معًا.
//
// يلتقط: التشكيل والتطويل (غـبـي)، تكرار الحروف (غبييي)، الفواصل بين الحروف (غ.ب.ي)،
// اختلاف الهمزات والتاء المربوطة (عاهرة/عاهره)، ويحجب الكلمة كاملة بما يلحق بها من حروف.

// كلمات الجذر العربية. الكلمات القصيرة (3 أحرف أو أقل) تُحجب فقط إذا لم يلحقها حرف
// حتى لا تُحجب كلمات سليمة مثل «خراب».
const ARABIC_WORDS = [
  "غبي", "احمق", "تافه", "نصاب", "حقير", "خرا",
  "عاهر", "شرموط", "قحب", "منيوك", "ديوث", "متناك",
];
const LATIN_WORDS = ["fuck", "shit", "bitch"];

export const FORBIDDEN_WORDS = [...ARABIC_WORDS, ...LATIN_WORDS];

const MARKS = "\\u064B-\\u0652\\u0640"; // تشكيل + تطويل
const SEPARATORS = "._\\-*"; // فواصل يستخدمها الناس لتجاوز الفلتر
const ARABIC_LETTER = "\\u0621-\\u064A";

const LETTER_CLASS: Record<string, string> = {
  "ا": "[اأإآٱ]",
  "ي": "[يى]",
  "ه": "[هة]",
  "و": "[وؤ]",
};

function escapeLiteral(char: string): string {
  return char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildPattern(word: string): RegExp {
  const letters = [...word].map((char) => {
    const cls = LETTER_CLASS[char] ?? escapeLiteral(char);
    return `${cls}+[${MARKS}${SEPARATORS}]*`;
  });
  const isArabic = /[؀-ۿ]/.test(word);
  if (!isArabic) return new RegExp(`\\b${letters.join("")}\\b`, "gi");
  const body = letters.join("");
  // الجذور الطويلة تُحجب بما يلحقها من حروف (عاهر → عاهرات). القصيرة لا يجوز أن يلحقها حرف.
  const tail = word.length >= 4 ? `[${ARABIC_LETTER}${MARKS}]*` : `[هة]?(?![${ARABIC_LETTER}])`;
  return new RegExp(`${body}${tail}`, "g");
}

const PATTERNS = FORBIDDEN_WORDS.map(buildPattern);

export function maskForbidden(text: string): string {
  let result = text;
  for (const pattern of PATTERNS) {
    result = result.replace(pattern, (match) => "*".repeat(match.length));
  }
  return result;
}
