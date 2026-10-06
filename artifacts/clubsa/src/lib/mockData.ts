import type { Article, MarketListing, ClubProfile, PlayerProfile, ChatMessage, PlayerBuild, AuthUser, ClubInvite, ClubInviteStatus, UserRole } from "@/types";
import { validateRegistrationEmail } from "@/lib/emailValidation";

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
  username?: string;
  ea_id?: string;
  referral_code?: string;
  referred_by?: string | null;
  role: UserRole;
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

// لا توجد بيانات وهمية - تبدأ فارغة تماماً وتتعبى ببياناتك الحقيقية
export function getSeedClubs(): MockClub[] { return []; }
export function getSeedPlayers(): MockProfile[] { return []; }
export function getSeedChat(): MockChatMessage[] { return []; }

export function getSeedArticles(): Article[] {
  return [
    {
      id: 1, title: "دليل المبتدئين في EA FC Pro Clubs", slug: "beginners-guide",
      excerpt: "كل ما تحتاج معرفته للبدء في وضع Pro Clubs من إنشاء اللاعب إلى فهم التقييمات.",
      content: "## مقدمة\nوضع Pro Clubs هو أحد أكثر الأوضاع شعبية في EA FC، حيث تنشئ لاعباً وتطوره عبر المباريات.",
      category: "guide", created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
    {
      id: 2, title: "أفضل تكتيكات اللعب الجماعي", slug: "team-tactics",
      excerpt: "شرح لأهم التكتيكات التي تتبعها الأندية المتميزة في البطولات.",
      content: "## التكتيكات الأساسية\nاللعب الجماعي هو مفتاح النجاح في Pro Clubs.",
      category: "tactics", created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    }
  ];
}

export function initStore() {
  if (!localStorage.getItem(LS_CLUBS)) writeLS(LS_CLUBS, []);
  if (!localStorage.getItem(LS_PLAYERS)) writeLS(LS_PLAYERS, []);
  if (!localStorage.getItem(LS_USERS)) writeLS(LS_USERS, []);
  if (!localStorage.getItem(LS_CHAT)) writeLS(LS_CHAT, []);
  if (!localStorage.getItem(LS_LISTINGS)) writeLS(LS_LISTINGS, []);
  if (!localStorage.getItem(LS_CLUB_INVITES)) writeLS(LS_CLUB_INVITES, []);

  const articles = readLS<Article[]>("clubsa_articles", getSeedArticles())
    .filter((article) => Boolean(article?.id && article.title?.trim() && article.excerpt?.trim()))
    .slice(0, MAX_NEWS_ARTICLES);
  writeLS("clubsa_articles", articles);
}

export function getUsers(): MockProfile[] { return readLS<MockProfile[]>(LS_USERS, []); }
export function saveUsers(users: MockProfile[]) { writeLS(LS_USERS, users); }

export function getClubs(): MockClub[] { return readLS<MockClub[]>(LS_CLUBS, []); }
export function saveClubs(clubs: MockClub[]) { writeLS(LS_CLUBS, clubs); }

export function getPlayers(): MockProfile[] {
  const userPlayers = getUsers().filter((user) => (user.role === "player" || user.role === "president") && user.name.trim());
  return userPlayers;
}

export function savePlayers(players: MockProfile[]) { writeLS(LS_PLAYERS, players); }

export function getChat(): MockChatMessage[] { return readLS<MockChatMessage[]>(LS_CHAT, []); }
export function saveChat(msgs: MockChatMessage[]) { writeLS(LS_CHAT, msgs); }

export function getListings(): MarketListing[] { return readLS<MarketListing[]>(LS_LISTINGS, []); }
export function saveListings(l: MarketListing[]) { writeLS(LS_LISTINGS, l); }

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
  const emailError = validateRegistrationEmail(email);
  if (emailError) return { error: emailError };
  const users = getUsers();
  if (users.some(u => u.email === email)) return { error: "هذا البريد مسجل بالفعل" };
  const newUid = uid();
  const newUser: MockProfile = {
    id: newUid, name: "", email, password, role: "player", region: "",
    username: `player_${newUid.slice(-6)}`,
    ea_id: `EA-${newUid.slice(-6).toUpperCase()}`,
    referral_code: `CLUBSA-${newUid.slice(-8).toUpperCase()}`,
    referred_by: null,
    is_free_agent: true, join_status: "approved", club_id: null, position: "CM",
    overall: 85, avatar: null, balance: DEFAULT_WALLET_BALANCE, player_build: null,
  };
  users.push(newUser);
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
  role: UserRole,
  region: string,
  isFreeAgent: boolean,
  clubName: string,
  eaId: string,
  referralCode?: string | null,
): { error: string | null } {
  const users = getUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return { error: "المستخدم غير موجود" };

  user.name = name;
  user.username = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 24) || user.username;
  user.ea_id = eaId.trim();
  user.role = role;
  user.region = region;
  user.is_free_agent = isFreeAgent;

  if (role === "president" && clubName.trim()) {
    const clubs = getClubs();
    const newClub: MockClub = {
      id: uid(), name: clubName.trim(), president_id: userId, region,
      logo: null, primary_color: "#1e40af", secondary_color: "#f5f5f5",
      wins: 0, draws: 0, losses: 0, trophies: 0, budget: 10000000,
    };
    clubs.push(newClub);
    saveClubs(clubs);
    user.club_id = newClub.id;
    user.join_status = "approved";
    user.is_free_agent = false;
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
    username: profile.username || profileSlug(profile.name),
    eaId: profile.ea_id || "",
    referralCode: profile.referral_code || "",
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

export function updateProfileDetails(userId: string, updates: { eaId?: string; region?: string; name?: string }) {
  const users = getUsers();
  const user = users.find((entry) => entry.id === userId);
  if (!user) return false;
  if (updates.eaId?.trim()) user.ea_id = updates.eaId.trim();
  if (updates.region?.trim()) user.region = updates.region.trim();
  if (updates.name?.trim()) user.name = updates.name.trim();
  saveUsers(users);
  return true;
}

export function getClub