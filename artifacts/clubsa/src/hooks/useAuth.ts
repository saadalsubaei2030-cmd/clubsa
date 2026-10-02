import { useAuth as useClerkAuth, useClerk } from '@clerk/react';
import { useUser } from '@clerk/react';
import {
  getGetMyProfileQueryKey,
  useCreateMyProfile,
  useGetMyProfile,
  useUpdateMyProfile,
} from '@workspace/api-client-react';
import type {
  ProfileInput,
  ProfileResponse,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  updatePlayerBuild,
  updateProfileAvatar,
} from '@/lib/mockData';
import type { AuthUser, PlayerBuild } from '@/types';

function toAuthUser(profile: ProfileResponse): AuthUser {
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    username: profile.username,
    eaId: profile.eaId,
    referralCode: profile.referralCode,
    club: profile.clubName ?? (profile.isFreeAgent ? 'لاعب حر' : 'بانتظار الانضمام'),
    clubId: profile.clubId,
    region: profile.region,
    role: profile.role,
    isFreeAgent: profile.isFreeAgent,
    joinStatus: profile.joinStatus,
    position: profile.position ?? undefined,
    overall: profile.overall,
    avatar: profile.avatar ?? undefined,
    clubLogo: profile.clubLogo ?? undefined,
    balance: profile.walletBalance,
    playerBuild: profile.playerBuild as PlayerBuild | null,
  };
}

export function useAuth() {
  const { isLoaded, isSignedIn } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const { signOut: clerkSignOut } = useClerk();
  const queryClient = useQueryClient();
  const profileQuery = useGetMyProfile({
    query: {
      enabled: Boolean(isLoaded && isSignedIn),
      queryKey: getGetMyProfileQueryKey(),
      retry: false,
    },
  });
  const createProfileMutation = useCreateMyProfile({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getGetMyProfileQueryKey(),
        });
      },
    },
  });
  const updateProfileMutation = useUpdateMyProfile({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getGetMyProfileQueryKey(),
        });
      },
    },
  });

  const profile = profileQuery.data?.profile ?? null;
  const user = profile ? toAuthUser(profile) : null;

  const signOut = async () => {
    await clerkSignOut({ redirectUrl: import.meta.env.BASE_URL });
  };

  const createProfile = async (data: ProfileInput) =>
    createProfileMutation.mutateAsync({ data });

  const saveAvatar = (uid: string, avatar: string | null) => {
    updateProfileAvatar(uid, avatar);
  };

  const saveBuild = (uid: string, build: PlayerBuild) => {
    updatePlayerBuild(uid, build);
  };

  const saveProfileSettings = async (
    uid: string,
    updates: { eaId?: string; region?: string; name?: string },
  ): Promise<void> => {
    if (!profile || profile.id !== uid) {
      throw new Error('Profile is not ready to update');
    }
    await updateProfileMutation.mutateAsync({
      data: {
        eaId: updates.eaId ?? profile.eaId,
        ...(updates.name !== undefined ? { name: updates.name } : {}),
        ...(updates.region !== undefined ? { region: updates.region } : {}),
      },
    });
  };

  return {
    user,
    clerkUser,
    loading:
      !isLoaded ||
      (Boolean(isSignedIn) && profileQuery.isLoading),
    isSignedIn: Boolean(isSignedIn),
    profileError: profileQuery.error,
    profileNotFound: Boolean(isSignedIn && profileQuery.data?.profile === null),
    creatingProfile: createProfileMutation.isPending,
    createProfile,
    signOut,
    saveAvatar,
    saveBuild,
    saveProfileSettings,
  };
}