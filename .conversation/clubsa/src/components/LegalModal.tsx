import { X } from "lucide-react";

export type LegalPage = "privacy" | "terms" | "contact" | "about";

const PRIVACY_CONTENT = [
  { title: "حماية البيانات الشخصية", body: "نلتزم في CLUBSA بحماية بياناتك الشخصية. نجمع فقط المعلومات اللازمة لتشغيل الموقع مثل الاسم، البريد الإلكتروني، والمنطقة. لا نقوم ببيع أو مشاركة بياناتك مع أي طرف ثالث لأغراض تجارية." },
  { title: "خصوصية الدردشة", body: "رسائل الدردشة المجتمعية تمر على فلتر تلقائي للكلمات الممنوعة. لا نقوم بتخزين محادثاتك بشكل دائم إلا ما يلزم لتشغيل الموقع. لا نشارك محتوى رسائلك مع أي جهة خارجية." },
  { title: "ملفات تعريف الارتباط (Cookies)", body: "يستخدم CLUBSA ملفات تعريف الارتباط (Cookies) والتخزين المحلي (localStorage) لحفظ تفضيلاتك مثل موافقتك على الشروط وبيانات الجلسة. يمكنك مسح هذه البيانات في أي وقت من إعدادات المتصفح." },
  { title: "حقوق المستخدم", body: "لديك الحق في الوصول إلى بياناتك، طلب تعديلها أو حذفها. للقيام بذلك، تواصل معنا عبر صفحة «اتصل بنا»." },
];

const TERMS_CONTENT = [
  { title: "قبول الشروط", body: "باستخدامك لموقع CLUBSA، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا لم توافق على أي بند منها، يرجى التوقف عن استخدام الموقع." },
  { title: "احترام أفراد المجتمع", body: "يلتزم جميع المستخدمين باحترام بعضهم البعض في الدردشة المجتمعية والبطولات. يُمنع استخدام الألفاظ المسيئة، التشهير، أو مضايقة أي لاعب أو نادٍ. قد يؤدي المخالفة إلى حظر الحساب." },
  { title: "اللعب النظيف", body: "يُمنع الغش، التلاعب بالنتائج، أو استغلال الثغرات في النظام. CLUBSA يحتفظ بحق إلغاء أي حساب يثبت تورطه في مخالفات اللعب النظيف." },
  { title: "المسؤولية", body: "موقع CLUBSA منصة ترفيهية غير ربحية. لا نتحمل مسؤولية أي خسارة مادية أو معنوية ناتجة عن استخدام الموقع. المحتوى المنشور من قبل المستخدمين يعكس آراءهم ولا يمثل رأي الموقع." },
  { title: "تعديل الشروط", body: "نحتفظ بحق تعديل هذه الشروط في أي وقت. سيتم إشعار المستخدمين بأي تغيير جوهري عبر الموقع." },
];

const CONTACT_CONTENT = [
  { title: "تواصل معنا", body: "يسعدنا تواصلك معنا لأي استفسار، اقتراح، أو ملاحظة. فريق CLUBSA جاهز لمساعدتك." },
  { title: "البريد الإلكتروني", body: "clubsa6886@gmail.com" },
  { title: "نموذج التواصل", body: "يمكنك إرسال رسالتك مباشرة عبر النموذج أدناه وسنرد عليك في أقرب وقت." },
];

const ABOUT_CONTENT = [
  { title: "رؤيتنا", body: "CLUBSA هي أول منصة متكاملة لمجتمع البرو كلبس (Pro Clubs) والميركاتو في الخليج. هدفنا توحيد اللاعبين والأندية في مكان واحد، وتنظيم البطولات والانتقالات بشكل احترافي." },
  { title: "ماذا نقدم؟", body: "نوفر لكم: حاسبة طاقات احترافية لتطوير لاعبيكم، سوق انتقالات ينفتح أسبوعياً، بطولات إقليمية بجوائز مالية، شات مجتمعي، وقسم أخبار ودليل غني بمحتوى EA FC." },
  { title: "مجتمعنا", body: "نؤمن بأن المجتمع هو أساس كل نجاح. CLUBSA مبنية على الاحترام واللعب النظيف والمنافسة الشريفة. انضم إلينا وكن جزءاً من أول مجتمع متكامل للبرو كلبس في الخليج." },
  { title: "التزامنا المجتمعي", body: "نسبة من أرباح موقع CLUBSA تُخصص وتُتبرع لصالح الجمعيات الخيرية. نؤمن بأن النجاح الحقيقي هو ما يعود بالنفع على المجتمع." },
];

const TITLES: Record<LegalPage, string> = {
  privacy: "سياسة الخصوصية",
  terms: "الشروط والأحكام",
  contact: "اتصل بنا",
  about: "من نحن",
};

export default function LegalModal({
  page, onClose,
}: {
  page: LegalPage; onClose: () => void;
}) {
  const content = page === "privacy" ? PRIVACY_CONTENT : page === "terms" ? TERMS_CONTENT : page === "about" ? ABOUT_CONTENT : CONTACT_CONTENT;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900">
          <h2 className="text-lg font-extrabold text-white" style={{ fontFamily: "Cairo, sans-serif" }}>
            {TITLES[page]}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-red-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {content.map((section, i) => (
            <div key={i}>
              <h3 className="text-sm font-bold text-cyan-300 mb-1.5">{section.title}</h3>
              <p className="text-sm text-slate-300 leading-relaxed">{section.body}</p>
            </div>
          ))}

          {page === "contact" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onClose();
              }}
              className="space-y-3 pt-2"
            >
              <input
                type="text"
                placeholder="اسمك"
                className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500"
              />
              <input
                type="email"
                placeholder="بريدك الإلكتروني"
                className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500"
              />
              <textarea
                placeholder="رسالتك..."
                rows={4}
                className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 resize-none"
              />
              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-colors"
              >
                إرسال الرسالة
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
