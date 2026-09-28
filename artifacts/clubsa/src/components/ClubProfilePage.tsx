import { ChevronLeft } from "lucide-react";
import ClubRosterSection from "@/components/ClubRosterSection";
import { getClubById } from "@/lib/mockData";
import type { AuthUser } from "@/types";

export default function ClubProfilePage({
  clubId,
  onBack,
  viewer,
  onOpenInvitePlayer,
}: {
  clubId: string;
  onBack: () => void;
  viewer?: AuthUser | null;
  onOpenInvitePlayer?: () => void;
}) {
  const club = getClubById(clubId);
  if (!club) {
    return (
      <div className="mx-auto max-w-3xl py-16 text-center">
        <p className="font-bold text-slate-300">النادي غير موجود</p>
        <button onClick={onBack} className="mt-4 text-sm font-bold text-cyan-300">العودة</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <button onClick={onBack} className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-400 transition-colors hover:text-white">
        <ChevronLeft size={16} /> العودة
      </button>
      <ClubRosterSection
        clubId={club.id}
        viewer={viewer}
        onOpenInvitePlayer={onOpenInvitePlayer}
      />
    </div>
  );
}