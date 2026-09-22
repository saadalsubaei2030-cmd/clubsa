import type { Article, MarketListing, ClubProfile, PlayerProfile, ChatMessage, PlayerBuild, AuthUser, ClubInvite, ClubInviteStatus } from "@/types";

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
  player_build?: PlayerBuild | null;
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
const LS_PLAYERS = "clubsa_players";
const LS_LISTINGS = "clubsa_listings";
const LS_CLUB_INVITES = "clubsa_club_invites";
const LS_SEED_CLEANUP = "clubsa_seed_cleanup_v2";
const LS_WALLET_MIGRATION = "clubsa_wallet_default_v3";
export const DEFAULT_WALLET_BALANCE = 100000;

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
  return [];
}

export function getSeedPlayers(): MockProfile[] {
  return [];
}

export function getSeedChat(): MockChatMessage[] {
  return [];
}

export function getSeedListings(): MarketListing[] {
  return [];
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
  if (!localStorage.getItem(LS_SEED_CLEANUP)) {
    writeLS(LS_CLUBS, []);
    writeLS(LS_PLAYERS, []);
    writeLS(LS_CHAT, []);
    writeLS(LS_LISTINGS, []);
    localStorage.setItem(LS_SEED_CLEANUP, "done");
  }
  if (!localStorage.getItem(LS_CLUBS)) writeLS(LS_CLUBS, []);
  if (!localStorage.getItem(LS_PLAYERS)) writeLS(LS_PLAYERS, []);
  if (!localStorage.getItem(LS_CHAT)) writeLS(LS_CHAT, []);
  if (!localStorage.getItem(LS_LISTINGS)) writeLS(LS_LISTINGS, []);
  if (!localStorage.getItem(LS_CLUB_INVITES)) writeLS(LS_CLUB_INVITES, []);
  if (!localStorage.getItem(LS_WALLET_MIGRATION)) {
    const users = getUsers().map((user) =>
      user.balance === 10 ? { ...user, balance: DEFAULT_WALLET_BALANCE } : user,
    );
    saveUsers(users);
    localStorage.setItem(LS_WALLET_MIGRATION, "done");
  }
  const articles = readLS<Article[]>("clubsa_articles", getSeedArticles())
    .filter((article) => Boolean(article?.id && article.title?.trim() && article.excerpt?.trim()))
    .slice(0, MAX_NEWS_ARTICLES);
  writeLS("clubsa_articles", articles);
}

export function getUsers(): MockProfile[] { return readLS<MockProfile[]>(LS_USERS, []); }
export function saveUsers(users: MockProfile[]) { writeLS(LS_USERS, users); }
export function getClubs(): MockClub[] { return readLS<MockClub[]>(LS_CLUBS, getSeedClubs()); }
export function saveClubs(clubs: MockClub[]) { writeLS(LS_CLUBS, clubs); }
export function getPlayers(): MockProfile[] {
  const storedPlayers = readLS<MockProfile[]>(LS_PLAYERS, []);
  const userPlayers = getUsers().filter((user) => user.role === "player" && user.name.trim());
  const userIds = new Set(userPlayers.map((player) => player.id));
  return [...userPlayers, ...storedPlayers.filter((player) => !userIds.has(player.id))];
}
export function savePlayers(players: MockProfile[]) { writeLS("clubsa_players", players); }
export function getChat(): MockChatMessage[] { return readLS<MockChatMessage[]>(LS_CHAT, []); }
export function saveChat(msgs: MockChatMessage[]) { writeLS(LS_CHAT, msgs); }
export function getListings(): MarketListing[] { return readLS<MarketListing[]>(LS_LISTINGS, []); }
export function saveListings(l: MarketListing[]) { writeLS("clubsa_listings", l); }
export function getClubInvites(): ClubInvite[] { return readLS<ClubInvite[]>(LS_CLUB_INVITES, []); }
export function saveClubInvites(invites: ClubInvite[]) { writeLS(LS_CLUB_INVITES, invites); }
const MAX_NEWS_ARTICLES = 6;

export function getArticles(): Article[] {
  return readLS<Article[]>("clubsa_articles", getSeedArticles())
    .filter((article) => Boolean(article?.id && article.title?.trim() && article.excerpt?.trim()))
    .slice(0, MAX_NEWS_ARTICLES);
}
export function getSession(): { uid: string } | null { return readLS<{ uid: string } | null>(LS_SESSION, null); }
export function setSession(s: { uid: string } | null) { writeLS(LS_SESSION, s); }

export function signUp(email: string, password: string): { uid: string } | { error: string } {
  const users = getUsers();
  if (users.some(u => u.email === email)) return { error: "هذا البريد مسجل بالفعل" };
  const newUid = uid();
  users.push({
    id: newUid, name: "", email, password, role: "player", region: "",
    is_free_agent: false, join_status: "pending", club_id: null, position: null,
    overall: 0, avatar: null, balance: DEFAULT_WALLET_BALANCE, player_build: null,
  });
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

export function profileSlug(name: string): string {
  return encodeURIComponent(name.trim().toLowerCase().replace(/\s+/g, "-"));
}

export function getProfilePath(name: string): string {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${basePath || ""}/profile/${profileSlug(name)}`;
}

export function getProfileByUsername(username: string): MockProfile | null {
  const normalizedUsername = username.trim().toLowerCase().replace(/\s+/g, "-");
  return getUsers().find((user) => profileSlug(user.name) === encodeURIComponent(normalizedUsername)) || null;
}

export function getPublicAuthUserByUsername(username: string): AuthUser | null {
  const profile = getProfileByUsername(username);
  if (!profile || !profile.name) return null;

  const club = profile.club_id ? getClubById(profile.club_id) : null;
  return {
    id: profile.id,
    name: profile.name,
    email: "",
    club: club?.name || "لاعب حر",
    clubId: profile.club_id,
    region: profile.region,
    role: profile.role,
    isFreeAgent: profile.is_free_agent,
    joinStatus: profile.join_status as "approved" | "pending" | "rejected" | undefined,
    position: profile.position || undefined,
    overall: profile.overall || undefined,
    avatar: profile.avatar || undefined,
    clubLogo: club?.logo || undefined,
    clubColors: club ? { primary: club.primary_color, secondary: club.secondary_color } : undefined,
    budget: club?.budget,
    playerBuild: profile.player_build || null,
  };
}

export function updateProfileAvatar(userId: string, avatar: string | null) {
  const users = getUsers();
  const user = users.find((entry) => entry.id === userId);
  if (!user) return;
  user.avatar = avatar;
  saveUsers(users);
}

export function updatePlayerBuild(userId: string, build: PlayerBuild) {
  const users = getUsers();
  const user = users.find((entry) => entry.id === userId);
  if (!user) return;
  user.position = build.position;
  user.overall = build.overall;
  user.player_build = build;
  saveUsers(users);
}

export function getClubById(clubId: string): MockClub | null {
  return getClubs().find(c => c.id === clubId) || null;
}

export function getPendingClubInvites(userId: string): ClubInvite[] {
  return getClubInvites().filter((invite) => invite.to_user_id === userId && invite.status === "pending");
}

export function getClubInviteStatus(fromUserId: string, toUserId: string, clubId: string): ClubInviteStatus | null {
  const matching = getClubInvites()
    .filter((invite) => invite.from_user_id === fromUserId && invite.to_user_id === toUserId && invite.club_id === clubId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return matching[0]?.status || null;
}

export function createClubInvite(fromUserId: string, toUserId: string, clubId: string): ClubInvite | null {
  const fromUser = getProfile(fromUserId);
  const toUser = getProfile(toUserId);
  const club = getClubById(clubId);
  if (!fromUser || !toUser || !club || fromUser.role !== "president" || fromUser.club_id !== clubId || toUser.role !== "player" || fromUser.id === toUser.id) {
    return null;
  }

  const invites = getClubInvites();
  const existing = invites.find((invite) =>
    invite.from_user_id === fromUserId &&
    invite.to_user_id === toUserId &&
    invite.club_id === clubId &&
    invite.status === "pending",
  );
  if (existing) return existing;

  const invite: ClubInvite = {
    id: uid(),
    club_id: club.id,
    club_name: club.name,
    club_logo: club.logo,
    from_user_id: fromUser.id,
    from_user_name: fromUser.name,
    to_user_id: toUser.id,
    to_user_name: toUser.name,
    status: "pending",
    created_at: new Date().toISOString(),
  };
  invites.push(invite);
  saveClubInvites(invites);
  return invite;
}

export function respondToClubInvite(inviteId: string, userId: string, status: "accepted" | "declined"): boolean {
  const invites = getClubInvites();
  const invite = invites.find((entry) => entry.id === inviteId && entry.to_user_id === userId && entry.status === "pending");
  if (!invite) return false;

  invite.status = status;
  saveClubInvites(invites);

  if (status === "accepted") {
    const users = getUsers();
    const user = users.find((entry) => entry.id === userId);
    if (!user) return false;
    user.club_id = invite.club_id;
    user.join_status = "approved";
    user.is_free_agent = false;
    saveUsers(users);
  }
  return true;
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
  const userPlayers = getUsers().filter((player) => player.club_id === clubId && player.name.trim());
  const userIds = new Set(userPlayers.map((player) => player.id));
  return [
    ...userPlayers,
    ...getPlayers().filter((player) => player.club_id === clubId && !userIds.has(player.id)),
  ];
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
