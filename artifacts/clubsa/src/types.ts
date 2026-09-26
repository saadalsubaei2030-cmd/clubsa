export type SubStat = { key: string; label: string };
export type Category = { key: string; label: string; subs: SubStat[] };
export type PositionType = "GK" | "OUT";

export type Position = {
  id: string;
  label: string;
  type: PositionType;
  categories: Category[];
  weights: Record<string, number>;
};

export type UserRole = "president" | "player";

export type PlayerBuild = {
  position: string;
  overall: number;
  stats: Record<string, number>;
  playStylePlus?: string | null;
  playStyles?: string[];
  level: number;
  height: number;
  weight: number;
  updated_at: string;
};

export type ClubInviteStatus = "pending" | "accepted" | "declined";

export type ClubInvite = {
  id: string;
  club_id: string;
  club_name: string;
  club_logo: string | null;
  from_user_id: string;
  from_user_name: string;
  to_user_id: string;
  to_user_name: string;
  status: ClubInviteStatus;
  created_at: string;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  username?: string;
  eaId?: string;
  referralCode?: string;
  club: string;
  clubId: string | null;
  region: string;
  role: UserRole;
  isFreeAgent: boolean;
  joinStatus?: "approved" | "pending" | "rejected";
  position?: string;
  overall?: number;
  avatar?: string;
  clubLogo?: string;
  clubColors?: { primary: string; secondary: string };
  budget?: number;
  balance?: number;
  playerBuild?: PlayerBuild | null;
};

export type TabId = "chat" | "calculator" | "tournaments" | "market" | "news" | "leaderboards";

export type Tab = { id: TabId; label: string };

export type TeamStanding = {
  name: string;
  p: number;
  w: number;
  d: number;
  l: number;
  gd: number;
  pts: number;
};

export type Match = {
  home: string;
  away: string;
  score?: string;
  date: string;
  time: string;
  status: string;
};

export type TournamentData = {
  teams: TeamStanding[];
  matches: Match[];
};

export type CapProfile = {
  base: Record<string, number>;
  growth: Record<string, number>;
};

export type ChatMessage = {
  id: number;
  sender: string;
  text: string;
  time: string;
};

export type Article = {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  created_at: string;
};

export type MarketListing = {
  id: number;
  player_id: string;
  player_name: string;
  club_id: string;
  club_name: string;
  position: string;
  overall: number;
  price: number;
  status: string;
  created_at: string;
};

export type ClubProfile = {
  id: string;
  name: string;
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

export type PlayerProfile = {
  id: string;
  name: string;
  role: string;
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

export type LegalPage = "privacy" | "terms" | "contact" | "about";
