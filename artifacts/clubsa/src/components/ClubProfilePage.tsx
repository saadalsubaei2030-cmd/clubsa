import { ChevronLeft } from "lucide-react";
import ClubRosterSection from "@/components/ClubRosterSection";
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
  return (
    <div className="mx-auto max-w-5xl">
      <button onClick={onBack} className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-400 transition-colors hover:text-white">
        <ChevronLeft size={16} /> العودة
      </button>
      <ClubRosterSection
        clubId={clubId}
        viewer={viewer}
        onOpenInvitePlayer={onOpenInvitePlayer}
      />
    </div>
  );
}