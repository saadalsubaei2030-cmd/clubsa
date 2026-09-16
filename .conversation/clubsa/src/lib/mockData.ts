import type { Article, MarketListing, ClubProfile, PlayerProfile, ChatMessage } from "@/types";

export type MockClub = {
  id: string;
  name: string;
  president_id: string;
  region: string;
  logo: string | null;
  primary_color: string;
  secondary_color: string;
  wins: number;
  draws: number;
  losses: number;
  trophies: number;
  budget: number;
};

export type MockProfile = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: "president" | "player";
  region: string;
  is_free_agent: boolean;
  join_status: string;
  club_id: string | null;
  position: string | null;
  overall: number;
  avatar: string | null;
  balance: number;
};

export type MockChatMessage = {
  id: number;
  sender_id: string;
  sender_name: string;
  text: string;
  created_at: string;
};

const LS_USERS = "clubsa_users";
const LS_CLUBS = "clubsa_clubs";
const LS_CHAT = "clubsa_chat";
const LS_SESSION = "clubsa_session";

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeLS<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getSeedClubs(): MockClub[] {
  return [
    { id: "club-1", name: "نسور الرياض", president_id: "", region: "المنطقة الوسطى", logo: null, primary_color: "#1e40af", secondary_color: "#f5f5f5", wins: 12, draws: 3, losses: 5, trophies: 2, budget: 15000000 },
    { id: "club-2", name: "أبطال جدة", president_id: "", region: "المنطقة الغربية", logo: null, primary_color: "#0e7490", secondary_color: "#facc15", wins: 10, draws: 4, losses: 6, trophies: 1, budget: 12000000 },
    { id: "club-3", name: "شباب الدمام", president_id: "", region: "المنطقة الشرقية", logo: null, primary_color: "#dc2626", secondary_color: "#f5f5f5", wins: 8, draws: 5, losses: 7, trophies: 0, budget: 8000000 },
    { id: "club-4", name: "صقور الشمال", president_id: "", region: "المنطقة الشمالية", logo: null, primary_color: "#059669", secondary_color: "#1e293b", wins: 15, draws: 2, losses: 3, trophies: 3, budget: 20000000 },
    { id: "club-5", name: "نجوم الجنوب", president_id: "", region: "المنطقة الجنوبية", logo: null, primary_color: "#ea580c", secondary_color: "#f5f5f5", wins: 6, draws: 6, losses: 8, trophies: 0, budget: 5000000 },
  ];
}

export function getSeedPlayers(): MockProfile[] {
  return [
    { id: "p-1", name: "Khalid_07", email: "", password: "", role: "player", region: "المنطقة الوسطى", is_free_agent: false, join_status: "approved", club_id: "club-1", position: "ST", overall: 88, avatar: null, balance: 500000 },
    { id: "p-2", name: "Saud_10", email: "", password: "", role: "player", region: "المنطقة الوسطى", is_free_agent: false, join_status: "approved", club_id: "club-1", position: "CAM", overall: 85, avatar: null, balance: 350000 },
    { id: "p-3", name: "Faisal_5", email: "", password: "", role: "player", region: "المنطقة الغربية", is_free_agent: false, join_status: "approved", club_id: "club-2", position: "CB", overall: 82, avatar: null, balance: 400000 },
    { id: "p-4", name: "Nasser_1", email: "", password: "", role: "player", region: "المنطقة الشرقية", is_free_agent: false, join_status: "approved", club_id: "club-3", position: "GK", overall: 80, avatar: null, balance: 300000 },
    { id: "p-5", name: "Omar_9", email: "", password: "", role: "player", region: "المنطقة الشمالية", is_free_agent: false, join_status: "approved", club_id: "club-4", position: "WG", overall: 90, avatar: null, balance: 750000 },
    { id: "p-6", name: "Ali_8", email: "", password: "", role: "player", region: "المنطقة الجنوبية", is_free_agent: true, join_status: "approved", club_id: null, position: "CM", overall: 78, avatar: null, balance: 200000 },
  ];
}

export function getSeedChat(): MockChatMessage[] {
  return [
    { id: 1, sender_id: "p-1", sender_name: "Khalid_07", text: "مرحبا جميعاً، الميركاتو فتح أخيراً!", created_at: new Date(Date.now() - 3600000).toISOString() },
    { id: 2, sender_id: "p-5", sender_name: "Omar_9", text: "نبحث عن ظهير أيمن قوي، من عنده؟", created_at: new Date(Date.now() - 1800000).toISOString() },
    { id: 3, sender_id: "p-2", sender_name: "Saud_10", text: "عندي لاعب بس السعر بيكون مرتفع شوي", created_at: new Date(Date.now() - 600000).toISOString() },
  ];
}

export function getSeedListings(): MarketListing[] {
  return [
    { id: 1, player_id: "p-1", player_name: "Khalid_07", club_id: "club-1", club_name: "نسور الرياض", position: "ST", overall: 88, price: 5000000, status: "active", created_at: new Date(Date.now() - 86400000).toISOString() },
    { id: 2, player_id: "p-5", player_name: "Omar_9", club_id: "club-4", club_name: "صقور الشمال", position: "WG", overall: 90, price: 8000000, status: "active", created_at: new Date(Date.now() - 43200000).toISOString() },
    { id: 3, player_id: "p-3", player_name: "Faisal_5", club_id: "club-2", club_name: "أبطال جدة", position: "CB", overall: 82, price: 3000000, status: "active", created_at: new Date(Date.now() - 21600000).toISOString() },
  ];
}

export function getSeedArticles(): Article[] {
  return [
    {
      id: 1, title: "دليل المبتدئين في EA FC Pro Clubs", slug: "beginners-guide",
      excerpt: "كل ما تحتاج معرفته للبدء في وضع Pro Clubs من إنشاء اللاعب إلى فهم التقييمات.",
      content: "## مقدمة\nوضع Pro Clubs هو أحد أكثر الأوضاع شعبية في EA FC، حيث تنشئ لاعباً وتطوره عبر المباريات.\n\n## إنشاء اللاعب\n- اختر المركز المناسب لأسلوب لعبك\n- وزّع النقاط بحكمة على المهارات الأساسية\n- لا تتجاهل السرعة واللياقة\n\n## فهم التقييمات\nكل مركز له مهارات رئيسية تؤثر على التقييم العام. ركز على تطويرها أولاً.",
      category: "guide", created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
    {
      id: 2, title: "أفضل تكتيكات اللعب الجماعي", slug: "team-tactics",
      excerpt: "شرح لأهم التكتيكات التي تتبعها الأندية المتميزة في البطولات.",
      content: "## التكتيكات الأساسية\nاللعب الجماعي هو مفتاح النجاح في Pro Clubs.\n\n## الضغط المرتد\n- اضغط على حامل الكرة بأقرب لاعب\n- غطِ المساحات بباقي الفريق\n- انتقل للهجوم السريع عند استعادة الكرة\n\n## التمرير المتقدم\n- استخدم التمرير الأرضي في المساحات الضيقة\n- التمرير الطويل للهجمات المرتدة",
      category: "tactics", created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 3, title: "إعلان: افتتاح الميركاتو للموسم الجديد", slug: "mercato-opening",
      excerpt: "يفتح سوق الانتقالات أبوابه من الخميس إلى السبت لجميع الأندية المسجلة.",
      content: "## مواعيد الميركاتو\nيفتح سوق الانتقالات من يوم الخميس حتى السبت من كل أسبوع.\n\n## الشروط\n- يجب أن يكون النادي مسجلاً ومعتمداً\n- الانتقالات تتم بموافقة الطرفين\n- الأسعار تتفق عليها الأندية",
      category: "news", created_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 4, title: "أفضل بيلد للمهاجم (ST) في الموسم الحالي", slug: "best-st-build",
      excerpt: "توزيع النقاط والمهارات المثالية لمركز المهاجم لتحقيق أقصى فاعلية هجومية.",
      content: "## مقدمة\nالمهاجم هو اللاعب الذي ينهي الهجمات، وتوزيع نقاطه يحدد فعاليته.\n\n## المهارات الأساسية\n- إنهاء الكرة (Finishing): أولوية قصوى\n- قوة التسديد (Shot Power): مهمة للتسديدات القوية\n- التمركز (Positioning): لتفادي التسلل والوصول للكرات\n\n## المهارات الثانوية\n- السرعة (Sprint Speed): للانطلاق خلف الدفاع\n- التحكم بالكرة (Ball Control): لاستقبال التمريرات\n- التوازن (Balance): للمراوغة في المنطقة",
      category: "guide", created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
    {
      id: 5, title: "أفضل بيلد لصانع الألعاب (CAM)", slug: "best-cam-build",
      excerpt: "كيف تبني صانع ألعاب متكامل يربط بين الوسط والهجوم بكفاءة عالية.",
      content: "## دور صانع الألعاب\nصانع الألعاب هو العقل المدبر للفريق، يصنع الفرص ويوزع التمريرات.\n\n## المهارات الأساسية\n- الرؤية (Vision): لرؤية التمريرات العميقة\n- التمرير القصير (Short Passing): لدقة التمريرات\n- التمرير الطويل (Long Passing): للكرات الطويلة\n\n## المهارات الثانوية\n- المراوغة (Dribbling): لتجاوز المنافس\n- التوازن (Agility): للحركة السريعة\n- التسديد من خارج المنطقة (Long Shots)",
      category: "guide", created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    },
    {
      id: 6, title: "تحديثات نمط الأندية: ميزات جديدة للموسم", slug: "club-mode-updates",
      excerpt: "استعراض لأهم التحديثات في نمط الأندية بما فيها التخصيص والميزانية.",
      content: "## تحديثات النمط\nأضيفت ميزات جديدة لتعزيز تجربة إدارة الأندية.\n\n## التخصيص\n- إمكانية تغيير ألوان الطقم الأساسي والاحتياطي\n- رفع شعار مخصص للنادي\n- عرض ميزانية النادي في الواجهة\n\n## إدارة اللاعبين\n- عرض رصيد كل لاعب في ملفه\n- نظام طلب الانضمام للأندية\n- حالة الانضمام (بانتظار الموافقة / معتمد)",
      category: "news", created_at: new Date(Date.now() - 86400000 * 2 + 3600000).toISOString(),
    },
    {
      id: 7, title: "تحديثات البطولات: جدول المباريات والنتائج", slug: "tournament-updates",
      excerpt: "مواعيد البطولات القادمة وتحديثات نظام التأهل والترتيب.",
      content: "## بطولات الموسم\nتنطلق البطولات الرسمية بين الأندية المسجلة في النظام.\n\n## نظام التأهل\n- تتأهل أعلى الأندية في ترتيب المجموعة\n- نظام نقاط: الفوز 3 نقاط، التعادل نقطة، الخسارة صفر\n- المباريات تُلعب وفق جدول معلن مسبقاً\n\n## النتائج المباشرة\n- تُحدّث النتائج فور انتهاء المباراة\n- ترتيب المجموعات يتغير تلقائياً\n- متابعة المباريات القادمة في صفحة البطولات",
      category: "news", created_at: new Date(Date.now() - 86400000 + 7200000).toISOString(),
    },
    {
      id: 8, title: "أفضل بيلد لقلب الدفاع (CB)", slug: "best-cb-build",
      excerpt: "بناء دفاعي متكامل لقلب الدفاع يوازن بين القوة والسرعة والذكاء التكتيكي.",
      content: "## مقدمة\nقلب الدفاع هو صمام الأمان، مهمته إيقاف الهجمات قبل الوصول للمرمى.\n\n## المهارات الأساسية\n- الاعتراض (Interceptions): لقطع التمريرات\n- التدخل (Standing Tackle): لاستخلاص الكرة\n- القوة (Strength): للصراعات الجسدية\n\n## المهارات الثانوية\n- الرأسية (Heading Accuracy): للكرات العالية\n- التمركز الدفاعي (Defensive Awareness)\n- السرعة (Sprint Speed): لمتابعة المهاجمين السريعين",
      category: "guide", created_at: new Date(Date.now() - 86400000 * 6).toISOString(),
    },
    {
      id: 9, title: "استراتيجيات الحراسة: دليل حارس المرمى", slug: "goalkeeper-guide",
      excerpt: "كل ما تحتاجه لبناء حارس مرمى متكامل من مهارات التصدية إلى ردات الفعل.",
      content: "## دور حارس المرمى\nالحارس هو آخر خط دفاع وأول خط هجوم.\n\n## المهارات الأساسية\n- التصدية (GK Diving): للتصديات الأرضية والهوائية\n- ردة الفعل (GK Reflexes): للرد السريع على التسديدات\n- التمركز (GK Positioning): لقراءة زوايا التسديد\n\n## المهارات الثانوية\n- التعامل مع الكرات العالية (GK Handling)\n- الإرسال (GK Kicking): لبدء الهجمات\n- السرعة على الخط (Acceleration)",
      category: "guide", created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    },
  ];
}

export function initStore() {
  if (!localStorage.getItem(LS_CLUBS)) writeLS(LS_CLUBS, getSeedClubs());
  if (!localStorage.getItem("clubsa_players")) writeLS("clubsa_players", getSeedPlayers());
  if (!localStorage.getItem(LS_CHAT)) writeLS(LS_CHAT, getSeedChat());
  if (!localStorage.getItem("clubsa_listings")) writeLS("clubsa_listings", getSeedListings());
  if (!localStorage.getItem("clubsa_articles")) writeLS("clubsa_articles", getSeedArticles());
}

export function getUsers(): MockProfile[] { return readLS<MockProfile[]>(LS_USERS, []); }
export function saveUsers(users: MockProfile[]) { writeLS(LS_USERS, users); }
export function getClubs(): MockClub[] { return readLS<MockClub[]>(LS_CLUBS, getSeedClubs()); }
export function saveClubs(clubs: MockClub[]) { writeLS(LS_CLUBS, clubs); }
export function getPlayers(): MockProfile[] { return readLS<MockProfile[]>("clubsa_players", getSeedPlayers()); }
export function savePlayers(players: MockProfile[]) { writeLS("clubsa_players", players); }
export function getChat(): MockChatMessage[] { return readLS<MockChatMessage[]>(LS_CHAT, getSeedChat()); }
export function saveChat(msgs: MockChatMessage[]) { writeLS(LS_CHAT, msgs); }
export function getListings(): MarketListing[] { return readLS<MarketListing[]>("clubsa_listings", getSeedListings()); }
export function saveListings(l: MarketListing[]) { writeLS("clubsa_listings", l); }
export function getArticles(): Article[] { return readLS<Article[]>("clubsa_articles", getSeedArticles()); }
export function getSession(): { uid: string } | null { return readLS<{ uid: string } | null>(LS_SESSION, null); }
export function setSession(s: { uid: string } | null) { writeLS(LS_SESSION, s); }

export function signUp(email: string, password: string): { uid: string } | { error: string } {
  const users = getUsers();
  if (users.some(u => u.email === email)) return { error: "هذا البريد مسجل بالفعل" };
  const newUid = uid();
  users.push({ id: newUid, name: "", email, password, role: "player", region: "", is_free_agent: false, join_status: "pending", club_id: null, position: null, overall: 0, avatar: null, balance: 100000 });
  saveUsers(users);
  setSession({ uid: newUid });
  return { uid: newUid };
}

export function signIn(email: string, password: string): { uid: string } | { error: string } {
  const users = getUsers();
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return { error: "بيانات الدخول غير صحيحة" };
  setSession({ uid: user.id });
  return { uid: user.id };
}

export function signOut() {
  setSession(null);
}

export function completeProfile(
  userId: string,
  name: string,
  role: "president" | "player",
  region: string,
  isFreeAgent: boolean,
  clubName: string,
): { error: string | null } {
  const users = getUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return { error: "المستخدم غير موجود" };

  user.name = name;
  user.role = role;
  user.region = region;
  user.is_free_agent = isFreeAgent;

  if (role === "president") {
    const clubs = getClubs();
    const newClub: MockClub = {
      id: uid(), name: clubName, president_id: userId, region,
      logo: null, primary_color: "#1e40af", secondary_color: "#f5f5f5",
      wins: 0, draws: 0, losses: 0, trophies: 0, budget: 10000000,
    };
    clubs.push(newClub);
    saveClubs(clubs);
    user.club_id = newClub.id;
    user.join_status = "approved";
    user.is_free_agent = false;
  } else {
    if (!isFreeAgent && clubName) {
      const clubs = getClubs();
      const club = clubs.find(c => c.name === clubName);
      if (club) {
        user.club_id = club.id;
        user.join_status = "pending";
      } else {
        user.join_status = "approved";
      }
    } else {
      user.join_status = "approved";
    }
  }

  saveUsers(users);
  return { error: null };
}

export function getProfile(userId: string): MockProfile | null {
  const users = getUsers();
  return users.find(u => u.id === userId) || null;
}

export function getClubById(clubId: string): MockClub | null {
  return getClubs().find(c => c.id === clubId) || null;
}

export function updateClubSettings(clubId: string, logo: string | null, primary: string, secondary: string) {
  const clubs = getClubs();
  const club = clubs.find(c => c.id === clubId);
  if (club) {
    club.logo = logo;
    club.primary_color = primary;
    club.secondary_color = secondary;
    saveClubs(clubs);
  }
}

export function sendChatMessage(senderId: string, senderName: string, text: string): MockChatMessage {
  const msgs = getChat();
  const newMsg: MockChatMessage = {
    id: msgs.length + 1,
    sender_id: senderId,
    sender_name: senderName,
    text,
    created_at: new Date().toISOString(),
  };
  msgs.push(newMsg);
  saveChat(msgs);
  return newMsg;
}

export function getClubPlayers(clubId: string): MockProfile[] {
  return getPlayers().filter(p => p.club_id === clubId);
}

export function getClubProfile(clubId: string): ClubProfile | null {
  const club = getClubById(clubId);
  if (!club) return null;
  return {
    id: club.id, name: club.name, region: club.region,
    logo: club.logo, primary_color: club.primary_color, secondary_color: club.secondary_color,
    wins: club.wins, draws: club.draws, losses: club.losses, trophies: club.trophies, budget: club.budget,
  };
}

export function submitOffer(listingId: number, clubId: string, clubName: string, amount: number): { error: string | null } {
  return { error: null };
}
