// محتوى الأخبار والدليل (ثابت). المصادر مذكورة في كل قسم.
// التصنيفات والـ meta تتغير مع التحديثات، فتأكد منها داخل اللعبة.

export type NewsItem = {
  id: string;
  tag: string;
  title: string;
  date: string;
  summary: string;
  points: string[];
  source: { label: string; url: string };
  accent: "cyan" | "amber" | "violet" | "emerald";
};

export const NEWS: NewsItem[] = [
  {
    id: "grounds",
    tag: "الجديد في FC 27",
    title: "The Grounds: عالم مفتوح لأندية البرو",
    date: "24 سبتمبر 2026",
    summary:
      "ساحة كرة مفتوحة تجمع حتى 100 لاعب في ثلاث مناطق، تلعب فيها وتتطور وتبني سمعة ناديك بدل القوائم الجامدة.",
    points: [
      "ثلاث مناطق: إنجلترا، فرنسا، الأرجنتين، وهي الشوارع حول ستاد ناديك ومقرّه (Clubhouse).",
      "صيغ مصغرة: 1v1 و 2v2 و 3v3 و Rush، مع ألعاب Kickabouts تمزج الكرة مع كرة السلة والبوتشي وغيرها.",
      "كل ما تلعبه هناك يعطيك Grounds Coins وخبرة الأركيتايب (Archetype XP) لتطوير لاعبك.",
      "من الستاد تدخل بطولات 11v11 وفعاليات Live Events مع ناديك.",
      "سمعة النادي: الجماهير تلبس قمصانك، والمقر والملعب يرتفع مستواهم، وتظهر لافتة ناديك لما تلعبون جماعي.",
      "مرشدون داخل اللعبة: ديبالا، تشلوي كيلي، وإمبابي.",
    ],
    source: { label: "EA Sports", url: "https://www.ea.com/news/ea-fc-the-grounds-is-here" },
    accent: "cyan",
  },
  {
    id: "launch",
    tag: "الإصدار",
    title: "FC 27 نزلت: التواريخ والمنصات",
    date: "25 سبتمبر 2026",
    summary: "اللعبة صدرت رسمياً، والوصول المبكر بدأ قبلها بأسبوع.",
    points: [
      "الإصدار الرسمي 25 سبتمبر 2026، والوصول المبكر (Early Access) من 18 سبتمبر.",
      "المنصات: PS5 و Xbox Series X/S و PC و Nintendo Switch 2. الأجهزة الأقدم غير مدعومة.",
      "لم تعلن EA عن مشتريات بمال حقيقي داخل The Grounds حتى الآن، والأزياء والإيموت تُشترى بعملة اللعبة.",
    ],
    source: { label: "Red Bull", url: "https://www.redbull.com/int-en/ea-fc-27-the-grounds-guide" },
    accent: "emerald",
  },
  {
    id: "amps",
    tag: "نظام التطوير",
    title: "Amps و Masteries: كيف تتطور هذا الموسم",
    date: "سبتمبر 2026",
    summary: "نظامان جديدان يغيّران طريقة بناء اللاعب، وفيه أشياء لازم تعرفها قبل ما تصرف نقاطك.",
    points: [
      "Amps: قدرات مميزة تُضاف للأركيتايب، حتى قدرات لا ترتبط عادة بمركزك. الأعلى منها مستوحى من لاعبين حقيقيين وتنزل أنواع جديدة بشكل دوري.",
      "Masteries: لإتقان أركيتايب بالكامل لازم تطوّر أركيتايبات مكمّلة. مثال: بناء المهاجم يبدأ بتطوير جانب الوسط أولاً.",
      "كل الأركيتايبات مفتوحة من البداية، وإعادة توزيع الصفات مجانية.",
      "سقف المستوى 40، ونقاط الصفات (AP) من 100 إلى 962 تقريباً (رقم غير رسمي من Pro Clubs HQ).",
    ],
    source: { label: "EA Sports", url: "https://www.ea.com/news/ea-fc-the-grounds-is-here" },
    accent: "violet",
  },
  {
    id: "live",
    tag: "الفعاليات",
    title: "Live Events صارت في مباريات 11v11",
    date: "سبتمبر 2026",
    summary: "الفعاليات الموسمية ما عادت محصورة في Rush، وتقدر تلعبها مع ناديك كامل.",
    points: [
      "الفعاليات تتبدل بالسنة وخارج المواسم والبلاي أوف.",
      "اللعب متاح حتى لو ما كان فريقك كامل أونلاين، وتقدر تتفرج على المباريات الحية وتكشف لاعبين من حواف الملعب.",
    ],
    source: { label: "EA Sports", url: "https://www.ea.com/news/ea-fc-the-grounds-is-here" },
    accent: "amber",
  },
];

export type Archetype = {
  name: string; // الاسم بالإنجليزي كما هو داخل اللعبة
  ar: string;
  inspired?: string;
  pick: string; // لمن يناسب
  strengths: string[];
  playstyles: string[];
  stats: { label: string; value: number }[]; // أسقف تقريبية 0-100
};

export type PositionGuide = {
  id: string;
  label: string;
  short: string;
  verdict: string;
  best: string; // الاسم الإنجليزي للأفضل
  alt: { name: string; why: string }[];
  note?: string;
};

export const POSITIONS: PositionGuide[] = [
  {
    id: "st",
    label: "مهاجم",
    short: "ST",
    verdict:
      "Finisher هو الخيار الأول في أغلب البورد، وPoacher على Finisher شكله عند اللاعبين. والـ Magician ممتاز كمهاجم متكامل يسجل ويصنع.",
    best: "Finisher",
    alt: [
      { name: "Magician", why: "للمهاجم المتكامل: تسديد قوي ومراوغة وتمرير (بناءات مثل كين وإيساك)." },
      { name: "Target", why: "للأطوال من 6'3\" فأكثر والاعتماد على الكرات العرضية والرأسيات." },
    ],
    note: "التقييم من بورد Pro Clubs HQ وRealSport101، ويتغير مع التحديثات.",
  },
  {
    id: "cam",
    label: "صانع ألعاب",
    short: "CAM",
    verdict:
      "Maestro هو الأكثر تنوعاً ويكبر مع الوقت (يجي معه Pinged Pass+). والـ Magician يتصدر خانة الوسط المهاجم في بورد Pro Clubs HQ.",
    best: "Maestro",
    alt: [
      { name: "Magician", why: "للمراوغة والتمرير الإبداعي، رقم 1 في الوسط المهاجم عند Pro Clubs HQ." },
      { name: "Creator", why: "المرتبة الثانية بعد Maestro لأن Maestro يتطور أحسن على المدى الطويل." },
    ],
    note: "ستايلات مقترحة للكام: Pinged Pass+ ثم Incisive Pass أو Technical، مع Tiki Taka و First Touch.",
  },
  {
    id: "w",
    label: "جناح",
    short: "LW / RW",
    verdict:
      "Spark يتصدر الوسط الجناحي (LM/RM) بأعلى سقف سرعة، والـ Magician خيار قوي للجناح الذي يراوغ ويصنع.",
    best: "Spark",
    alt: [
      { name: "Magician", why: "جناح مراوغ وصانع، مع Ankle Breaker و Getaway Driver." },
    ],
  },
  {
    id: "cm",
    label: "وسط",
    short: "CM",
    verdict: "Maestro يسوي كل شي في الوسط ويعطيك Pinged Pass+ من أول يوم.",
    best: "Maestro",
    alt: [{ name: "Creator", why: "بديل جيد إذا تبي صناعة لعب أكثر." }],
  },
  {
    id: "cdm",
    label: "وسط دفاعي",
    short: "CDM",
    verdict: "Maestro هو الافتراضي، وRecycler لو تبي وسط يدافع أكثر.",
    best: "Maestro",
    alt: [{ name: "Recycler", why: "قوة دفاعية أعلى واستخلاص للكرات." }],
  },
  {
    id: "fb",
    label: "ظهير",
    short: "LB / RB",
    verdict:
      "Marauder للظهير الذي يلحق المهاجمين (عنده Quick Step)، وBoss للظهير الذي يدافع بقوة ويصارع.",
    best: "Marauder",
    alt: [{ name: "Boss", why: "دفاع متقدم وتحامل بالكتف." }],
  },
  {
    id: "cb",
    label: "قلب دفاع",
    short: "CB",
    verdict: "Boss هو الاختيار المعتاد للقلب.",
    best: "Boss",
    alt: [],
  },
  {
    id: "gk",
    label: "حارس",
    short: "GK",
    verdict: "Shot Stopper هو أركيتايب الحراسة المعتمد.",
    best: "Shot Stopper",
    alt: [],
  },
];

export const ARCHETYPES: Record<string, Archetype> = {
  Finisher: {
    name: "Finisher",
    ar: "القناص",
    inspired: "أليكس مورغان",
    pick: "المهاجم الأساسي. الأكثر توازناً في المقدمة.",
    strengths: [
      "أعلى سقف تسجيل (99) بين المهاجمين",
      "أرخص في رفع: Agility و Dribbling و Sprint Speed و Vision",
      "أغلى في رفع: Finishing و Short Pass و الدفاع",
    ],
    playstyles: ["Low Driven Shot", "Fake to Real", "1v1 Master"],
    stats: [
      { label: "تسجيل", value: 99 },
      { label: "مراوغة", value: 90 },
      { label: "سرعة", value: 90 },
      { label: "تمرير", value: 80 },
      { label: "قوة", value: 80 },
    ],
  },
  Magician: {
    name: "Magician",
    ar: "الساحر",
    inspired: "رونالدينيو",
    pick: "للي يبي يراوغ ويصنع ويسجل. شكل ونوع مختلف.",
    strengths: [
      "أعلى سقف تحكم بالكرة وتمرير مع غيره",
      "أرخص في رفع: Balance و Composure و Volleys و Shot Power",
      "أغلى في رفع: Dribbling و Agility و Sprint Speed",
    ],
    playstyles: ["Technical", "Getaway Driver", "Ankle Breaker", "Power Shot"],
    stats: [
      { label: "تسجيل", value: 92 },
      { label: "مراوغة", value: 95 },
      { label: "سرعة", value: 85 },
      { label: "تمرير", value: 95 },
      { label: "قوة", value: 75 },
    ],
  },
  Maestro: {
    name: "Maestro",
    ar: "المايسترو",
    pick: "قائد الوسط. يسوي كل شي ويكبر مع الوقت.",
    strengths: [
      "أنسب أركيتايب لكل مراكز الوسط",
      "Pinged Pass+ مدمج بدون صرف إضافي",
      "يستمر في التطور مع فتح ستايلات جديدة",
    ],
    playstyles: ["Pinged Pass+", "Incisive Pass", "Tiki Taka", "First Touch"],
    stats: [
      { label: "تسجيل", value: 80 },
      { label: "مراوغة", value: 88 },
      { label: "سرعة", value: 82 },
      { label: "تمرير", value: 99 },
      { label: "قوة", value: 78 },
    ],
  },
  Spark: {
    name: "Spark",
    ar: "الشرارة",
    inspired: "لويس فيغو",
    pick: "الجناح السريع الذي يقطع للداخل ويرسل العرضيات.",
    strengths: [
      "أعلى سقف سرعة (97) بين المهاجمين والأجنحة",
      "أرخص في رفع: Curve و Dribbling و Vision و Long Shots",
      "رقم 1 في الوسط الجناحي عند Pro Clubs HQ",
    ],
    playstyles: ["Trickster", "Bail Out", "Cut Back Specialist"],
    stats: [
      { label: "تسجيل", value: 82 },
      { label: "مراوغة", value: 92 },
      { label: "سرعة", value: 97 },
      { label: "تمرير", value: 90 },
      { label: "قوة", value: 70 },
    ],
  },
  Target: {
    name: "Target",
    ar: "الهدّاف الطويل",
    inspired: "إبراهيموفيتش",
    pick: "الطويل القوي (حتى 6'5\") للكرات العالية والاحتكاك.",
    strengths: [
      "أعلى سقف قوة بدنية (95)",
      "أرخص في رفع: Short Pass و Acceleration و Ball Control",
      "يبدأ بنجمتين في المهارات والرجل الضعيفة بدل ثلاث",
    ],
    playstyles: ["Precision Header", "No Look Finisher", "Physical Shooter", "Bruiser"],
    stats: [
      { label: "تسجيل", value: 90 },
      { label: "مراوغة", value: 72 },
      { label: "سرعة", value: 75 },
      { label: "تمرير", value: 80 },
      { label: "قوة", value: 95 },
    ],
  },
  Creator: {
    name: "Creator",
    ar: "المبدع",
    pick: "صانع لعب بديل. ثاني أفضل بعد Maestro في الوسط.",
    strengths: ["رؤية وتمرير عاليين", "تصنيفه أقل من Maestro لأن تطوره أبطأ على المدى الطويل"],
    playstyles: ["Incisive Pass", "Technical"],
    stats: [],
  },
  Recycler: {
    name: "Recycler",
    ar: "المستخلِص",
    pick: "وسط دفاعي يقطع الكرات ويعيد بناء اللعب.",
    strengths: ["قدرة دفاعية أعلى من Maestro", "يناسب CDM الذي يحمي القلب"],
    playstyles: [],
    stats: [],
  },
  Marauder: {
    name: "Marauder",
    ar: "المطارِد",
    pick: "ظهير سريع يلحق المهاجمين.",
    strengths: ["يملك Quick Step", "مناسب لظهير يصعد ويرجع"],
    playstyles: ["Quick Step"],
    stats: [],
  },
  Boss: {
    name: "Boss",
    ar: "المسيطر",
    pick: "مدافع قوي للقلب أو الظهير الدفاعي.",
    strengths: ["دفاع متقدم وتحامل بالكتف", "الاختيار المعتاد لقلب الدفاع"],
    playstyles: [],
    stats: [],
  },
  "Shot Stopper": {
    name: "Shot Stopper",
    ar: "حارس التصديات",
    pick: "أركيتايب الحراسة المعتمد.",
    strengths: ["متخصص في التصدي للتسديدات"],
    playstyles: [],
    stats: [],
  },
};

export type FormationGuide = {
  id: string;
  name: string;
  tag: string;
  desc: string;
  lines: { label: string; roles: string }[];
  // مواقع اللاعبين على المستطيل (x,y بالنسبة المئوية؛ y=0 هجوم)
  dots: [number, number][];
};

export const FORMATIONS: FormationGuide[] = [
  {
    id: "4213",
    name: "4-2-1-3",
    tag: "الأفضل عموماً",
    desc: "توازن بين الدفاع والهجوم مع ثلاثي هجومي.",
    lines: [
      { label: "دفاع", roles: "ظهيران (Fullback) + قلبان (Defender)" },
      { label: "وسط", roles: "محوريان (Deep-Lying Playmaker) + صانع (Playmaker)" },
      { label: "هجوم", roles: "جناحان (Inside Forward) + مهاجم (Advanced Forward)" },
    ],
    dots: [[50, 92], [15, 72], [38, 74], [62, 74], [85, 72], [36, 52], [64, 52], [50, 38], [20, 20], [80, 20], [50, 12]],
  },
  {
    id: "4411",
    name: "4-4-1-1",
    tag: "متوازن",
    desc: "خطان متراصان وخلفهم مهاجم وصانع قريب منه.",
    lines: [
      { label: "دفاع", roles: "ظهيران + قلبان (Defend)" },
      { label: "وسط", roles: "وسطان (Box-to-Box) + جناحان (Inside Forward)" },
      { label: "هجوم", roles: "ظل المهاجم (Shadow Striker) + مهاجم متقدم" },
    ],
    dots: [[50, 92], [15, 72], [38, 74], [62, 74], [85, 72], [38, 54], [62, 54], [15, 48], [85, 48], [50, 30], [50, 12]],
  },
  {
    id: "4312",
    name: "4-3-1-2",
    tag: "مهاجمان",
    desc: "للي يبي ثنائي هجومي وصانع خلفهم.",
    lines: [
      { label: "دفاع", roles: "ظهيران + قلبان" },
      { label: "وسط", roles: "وسطان (Box-to-Box) + ارتكاز (Holding) + ظل مهاجم" },
      { label: "هجوم", roles: "مهاجمان (Advanced Forward)" },
    ],
    dots: [[50, 92], [15, 72], [38, 74], [62, 74], [85, 72], [28, 54], [50, 58], [72, 54], [50, 34], [36, 14], [64, 14]],
  },
  {
    id: "41212",
    name: "4-1-2-1-2 ضيّق",
    tag: "تمرير سريع",
    desc: "معين على اللعب القصير في العمق.",
    lines: [
      { label: "دفاع", roles: "ظهيران + قلبان" },
      { label: "وسط", roles: "ارتكاز + وسطان (Box-to-Box) + ظل مهاجم" },
      { label: "هجوم", roles: "مهاجمان (Advanced Forward)" },
    ],
    dots: [[50, 92], [15, 72], [38, 74], [62, 74], [85, 72], [50, 60], [33, 48], [67, 48], [50, 32], [36, 14], [64, 14]],
  },
  {
    id: "4231",
    name: "4-2-3-1 عريض",
    tag: "تحكّم دفاعي",
    desc: "ثنائي ارتكاز يحمي القلب مع جناحين عريضين.",
    lines: [
      { label: "دفاع", roles: "ظهيران (Defend) + قلبان" },
      { label: "وسط", roles: "محوريان (Deep-Lying Playmaker) + صانع + جناحان (Inside Forward)" },
      { label: "هجوم", roles: "مهاجم متقدم (Advanced Forward)" },
    ],
    dots: [[50, 92], [15, 72], [38, 74], [62, 74], [85, 72], [36, 54], [64, 54], [50, 36], [15, 32], [85, 32], [50, 12]],
  },
];

export const TEAM_TIPS: { title: string; body: string }[] = [
  {
    title: "ابقَ في مركزك",
    body: "قوة البرو كلوب في تغطية المساحات. لا تترك مركزك للكرة، وخلّ زميلك يعرف وين تكون.",
  },
  {
    title: "اللعب بدون كرة يصنع الهدف",
    body: "اعمل تحركات وفتح مساحات للتمرير. أغلب الأهداف تجي من الحركة قبل التمريرة.",
  },
  {
    title: "ثنائي ارتكاز ثابت",
    body: "وجود لاعب يحمي أمام القلب يمنح الفريق أمان، خصوصاً مع أجنحة تصعد وتترك خلفها مساحة.",
  },
  {
    title: "اتفقوا قبل المباراة",
    body: "من يصعد من الأظهرة؟ من يضغط؟ من يغطي؟ دقيقتان تفاهم قبل المباراة تفرق أكثر من أي صفة.",
  },
];
