import { useState } from "react";
import { initStore, getSession, setSession, getProfile, getClubById, getUsers, saveUsers, newUserId, findLegacyLocalUser, clearLocalPassword, hydrateFromServer, signUp as mockSignUp, signOut as mockSignOut, completeProfile as mockCompleteProfile, updateProfileAvatar, updatePlayerBuild, updateProfileDetails } from "@/lib/mockData";
import { SocialError, fetchAccountProfile, getSocialKey, loginAccount, registerAccount, setSocialKey } from "@/lib/social";
import type { AuthUser, PlayerBuild, UserRole } from "@/types";

initStore();

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const session = getSession();
    if (!session) return null;
    return buildAuthUser(session.uid);
  });
  const [loading] = useState(false);

  function buildAuthUser(uid: string): AuthUser | null {
    const profile = getProfile(uid);
    if (!profile || !profile.name) return null;

    let clubName = "لاعب حر";
    let clubLogo: string | undefined;
    let clubColors: { primary: string; secondary: string } | undefined;

    let budget: number | undefined;
    let balance: number | undefined;

    if (profile.club_id) {
      const club = getClubById(profile.club_id);
      if (club) {
        clubName = club.name;
        clubLogo = club.logo || undefined;
        clubColors = { primary: club.primary_color, secondary: club.secondary_color };
        budget = club.budget;
      }
    }
    balance = profile.balance;

    return {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      username: profile.username,
      eaId: profile.ea_id,
      referralCode: profile.referral_code,
      club: clubName,
      clubId: profile.club_id,
      region: profile.region,
      role: profile.role,
      isFreeAgent: profile.is_free_agent,
      joinStatus: profile.join_status as "approved" | "pending" | "rejected" | undefined,
      position: profile.position || undefined,
      overall: profile.overall || undefined,
      avatar: profile.avatar || undefined,
      clubLogo,
      clubColors,
      budget,
      balance,
      playerBuild: profile.player_build || null,
      clubRank: (profile.club_rank as AuthUser["clubRank"]) || undefined,
    };
  }

  const authErrorText = (error: unknown): string => {
    if (error instanceof SocialError) {
      if (error.code === "email_taken") return "هذا البريد مسجل بالفعل";
      if (error.code === "weak_password") return "كلمة المرور قصيرة جدًا";
      if (error.code === "invalid_login") return "بيانات الدخول غير صحيحة";
      if (error.status === 429) return "محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.";
      if (error.status === 404) return "الخدمة غير متاحة حاليًا. حاول بعد قليل.";
    }
    return "تعذّر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.";
  };

  // الحسابات على الخادم: كلمة المرور تُشفَّر هناك ولا تبقى في المتصفح.
  const signUp = async (email: string, password: string) => {
    const newId = newUserId();
    const result = mockSignUp(email, password, { uid: newId });
    if ("error" in result) return { error: { message: result.error }, data: null };
    try {
      await registerAccount(email.trim(), password, result.uid);
    } catch (error) {
      saveUsers(getUsers().filter((u) => u.id !== result.uid));
      mockSignOut();
      return { error: { message: authErrorText(error) }, data: null };
    }
    return { error: null, data: { user: { id: result.uid } } };
  };

  const signIn = async (email: string, password: string) => {
    const cleanEmail = email.trim();
    let userId: string;
    try {
      const login = await loginAccount(cleanEmail, password);
      setSocialKey(login.key);
      userId = login.userId;
      const remote = await fetchAccountProfile(userId);
      hydrateFromServer(cleanEmail, remote.profile, remote.club, userId);
    } catch (error) {
      // حساب قديم في هذا المتصفح لم يُنقل للخادم بعد: نرحّله الآن بكلمة مروره الحالية.
      const legacy = error instanceof SocialError && error.code === "invalid_login" ? findLegacyLocalUser(cleanEmail, password) : null;
      if (!legacy) return { error: { message: authErrorText(error) }, data: null };
      try {
        await registerAccount(cleanEmail, password, legacy.id);
      } catch (registerError) {
        return { error: { message: authErrorText(registerError) }, data: null };
      }
      clearLocalPassword(legacy.id);
      setSession({ uid: legacy.id });
      getSocialKey();
      userId = legacy.id;
    }
    const authUser = buildAuthUser(userId);
    if (authUser) setUser(authUser);
    return { error: null, data: { user: { id: userId } } };
  };

  const signOut = async () => {
    mockSignOut();
    setUser(null);
  };

  const completeProfile = async (
    uid: string,
    email: string,
    name: string,
    role: UserRole,
    region: string,
    isFreeAgent: boolean,
    clubName: string,
    eaId: string,
    referralCode?: string | null,
  ) => {
    const { error } = mockCompleteProfile(uid, name, role, region, isFreeAgent, clubName, eaId, referralCode);
    if (error) return { error: { message: error } };
    const authUser = buildAuthUser(uid);
    if (authUser) setUser(authUser);
    return { error: null };
  };

  const saveAvatar = (uid: string, avatar: string | null) => {
    updateProfileAvatar(uid, avatar);
    const authUser = buildAuthUser(uid);
    if (authUser) setUser(authUser);
  };

  const saveBuild = (uid: string, build: PlayerBuild) => {
    updatePlayerBuild(uid, build);
    const authUser = buildAuthUser(uid);
    if (authUser) setUser(authUser);
  };

  const saveProfileSettings = (uid: string, updates: { eaId?: string; region?: string; name?: string }) => {
    updateProfileDetails(uid, updates);
    const authUser = buildAuthUser(uid);
    if (authUser) setUser(authUser);
  };

  return { user, loading, signUp, signIn, signOut, completeProfile, saveAvatar, saveBuild, saveProfileSettings, setUser, fetchProfile: buildAuthUser };
}
