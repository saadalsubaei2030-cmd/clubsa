import { useState, useCallback } from "react";
import { initStore, getSession, setSession, getProfile, getClubById, signUp as mockSignUp, signIn as mockSignIn, signOut as mockSignOut, completeProfile as mockCompleteProfile, updateProfileAvatar, updatePlayerBuild } from "@/lib/mockData";
import type { AuthUser, PlayerBuild } from "@/types";

initStore();

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const session = getSession();
    if (!session) return null;
    return buildAuthUser(session.uid);
  });
  const [loading] = useState(false);

  const buildAuthUser = useCallback((uid: string): AuthUser | null => {
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
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    const result = mockSignUp(email, password);
    if ("error" in result) return { error: { message: result.error }, data: null };
    return { error: null, data: { user: { id: result.uid } } };
  };

  const signIn = async (email: string, password: string) => {
    const result = mockSignIn(email, password);
    if ("error" in result) return { error: { message: result.error }, data: null };
    const authUser = buildAuthUser(result.uid);
    if (authUser) setUser(authUser);
    return { error: null, data: { user: { id: result.uid } } };
  };

  const signOut = async () => {
    mockSignOut();
    setUser(null);
  };

  const completeProfile = async (
    uid: string,
    email: string,
    name: string,
    role: "president" | "player",
    region: string,
    isFreeAgent: boolean,
    clubName: string,
  ) => {
    const { error } = mockCompleteProfile(uid, name, role, region, isFreeAgent, clubName);
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

  return { user, loading, signUp, signIn, signOut, completeProfile, saveAvatar, saveBuild, setUser, fetchProfile: buildAuthUser };
}
