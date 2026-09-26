import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  CircleHelp,
  GripVertical,
  RotateCcw,
  Save,
  Search,
  Shield,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { getClubPlayers, getClubSquad, saveClubSquad } from "@/lib/mockData";

type Formation = "4-3-3" | "4-2-3-1";
type PlayerSearchResult = {
  id: string;
  username: string;
  name: string;
  eaId: string;
  region: string;
  clubId: string | null;
  clubName: string | null;
  position: string | null;
  overall: number;
  avatar: string | null;
};
type SquadResponse = {
  clubId: string;
  formation: Formation;
  assignments: Array<{ slotId: string; playerId: string | null; playerName: string | null; position: string }>;
  updatedAt: string;
};

type SlotDefinition = {
  id: string;
  label: string;
  shortLabel: string;
  position: string;
  x: string;
  y: string;
};

const FORMATIONS: Record<Formation, SlotDefinition[]> = {
  "4-3-3": [
    { id: "gk", label: "Goalkeeper", shortLabel: "GK", position: "GK", x: "50%", y: "91%" },
    { id: "lb", label: "Left back", shortLabel: "LB", position: "LB", x: "12%", y: "72%" },
    { id: "lcb", label: "Left centre back", shortLabel: "LCB", position: "CB", x: "35%", y: "74%" },
    { id: "rcb", label: "Right centre back", shortLabel: "RCB", position: "CB", x: "65%", y: "74%" },
    { id: "rb", label: "Right back", shortLabel: "RB", position: "RB", x: "88%", y: "72%" },
    { id: "lcm", label: "Left central midfielder", shortLabel: "LCM", position: "CM", x: "25%", y: "50%" },
    { id: "cm", label: "Central midfielder", shortLabel: "CM", position: "CM", x: "50%", y: "45%" },
    { id: "rcm", label: "Right central midfielder", shortLabel: "RCM", position: "CM", x: "75%", y: "50%" },
    { id: "lw", label: "Left winger", shortLabel: "LW", position: "LW", x: "14%", y: "22%" },
    { id: "st", label: "Striker", shortLabel: "ST", position: "ST", x: "50%", y: "16%" },
    { id: "rw", label: "Right winger", shortLabel: "RW", position: "RW", x: "86%", y: "22%" },
  ],
  "4-2-3-1": [
    { id: "gk", label: "Goalkeeper", shortLabel: "GK", position: "GK", x: "50%", y: "91%" },
    { id: "lb", label: "Left back", shortLabel: "LB", position: "LB", x: "12%", y: "72%" },
    { id: "lcb", label: "Left centre back", shortLabel: "LCB", position: "CB", x: "35%", y: "74%" },
    { id: "rcb", label: "Right centre back", shortLabel: "RCB", position: "CB", x: "65%", y: "74%" },
    { id: "rb", label: "Right back", shortLabel: "RB", position: "RB", x: "88%", y: "72%" },
    { id: "lcdm", label: "Left defensive midfielder", shortLabel: "LDM", position: "CDM", x: "34%", y: "55%" },
    { id: "rcdm", label: "Right defensive midfielder", shortLabel: "RDM", position: "CDM", x: "66%", y: "55%" },
    { id: "lam", label: "Left attacking midfielder", shortLabel: "LAM", position: "CAM", x: "19%", y: "31%" },
    { id: "cam", label: "Central attacking midfielder", shortLabel: "CAM", position: "CAM", x: "50%", y: "27%" },
    { id: "ram", label: "Right attacking midfielder", shortLabel: "RAM", position: "CAM", x: "81%", y: "31%" },
    { id: "st", label: "Striker", shortLabel: "ST", position: "ST", x: "50%", y: "10%" },
  ],
};

const FORMATION_OPTIONS: Formation[] = ["4-3-3", "4-2-3-1"];

const initials = (player: PlayerSearchResult) =>
  player.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || player.username.slice(0, 2).toUpperCase();

const errorCopy = (error: unknown) =>
  error instanceof Error && error.message ? error.message : "The lineup could not be loaded.";

function createEmptyAssignments(formation: Formation): Record<string, string | null> {
  return Object.fromEntries(FORMATIONS[formation].map((slot) => [slot.id, null]));
}

function getPlayerPosition(player: PlayerSearchResult) {
  return player.position?.toUpperCase() || "FLEX";
}

export default function ClubSquadBuilder({ clubId }: { clubId: string }) {
  const [formation, setFormation] = useState<Formation>("4-3-3");
  const [assignments, setAssignments] = useState<Record<string, string | null>>(() => createEmptyAssignments("4-3-3"));
  const [roster, setRoster] = useState<PlayerSearchResult[]>([]);
  const [savedSquad, setSavedSquad] = useState<SquadResponse | undefined>();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState("ALL");
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const initializedClub = useRef<string | null>(null);

  const slots = FORMATIONS[formation];

  useEffect(() => {
    initializedClub.current = clubId;
    const players = getClubPlayers(clubId).filter((player) => player.role === "player" && player.join_status === "approved");
    setRoster(players.map((player) => ({
      id: player.id,
      username: player.username || player.name,
      name: player.name,
      eaId: player.ea_id || "",
      region: player.region,
      clubId: player.club_id,
      clubName: null,
      position: player.position,
      overall: player.overall,
      avatar: player.avatar,
    })));
    const localSquad = getClubSquad(clubId);
    setSavedSquad(localSquad ? {
      clubId: localSquad.clubId,
      formation: localSquad.formation,
      assignments: localSquad.assignments.map((assignment) => {
        const player = players.find((entry) => entry.id === assignment.playerId);
        return { ...assignment, playerName: player?.name || null, position: player?.position || assignment.slotId };
      }),
      updatedAt: localSquad.updatedAt,
    } : undefined);
    setFormation("4-3-3");
    setAssignments(createEmptyAssignments("4-3-3"));
    setSelectedPlayerId(null);
    setSelectedSlotId(null);
    setFeedback(null);
  }, [clubId]);

  useEffect(() => {
    if (!savedSquad || initializedClub.current !== clubId) return;
    setFormation(savedSquad.formation);
    const next = createEmptyAssignments(savedSquad.formation);
    savedSquad.assignments.forEach((assignment) => {
      if (assignment.slotId in next) next[assignment.slotId] = assignment.playerId;
    });
    setAssignments(next);
  }, [savedSquad, clubId]);

  const playerById = useMemo(
    () => new Map(roster.map((player) => [player.id, player])),
    [roster],
  );
  const assignedIds = useMemo(
    () => new Set(Object.values(assignments).filter((playerId): playerId is string => Boolean(playerId))),
    [assignments],
  );
  const filters = useMemo(
    () => ["ALL", ...Array.from(new Set(roster.map(getPlayerPosition))).sort()],
    [roster],
  );
  const visiblePlayers = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return roster
      .filter((player) => {
        const matchesPosition = positionFilter === "ALL" || getPlayerPosition(player) === positionFilter;
        const matchesSearch =
          !normalized ||
          player.name.toLowerCase().includes(normalized) ||
          player.username.toLowerCase().includes(normalized) ||
          player.eaId.toLowerCase().includes(normalized);
        return matchesPosition && matchesSearch;
      })
      .sort((a, b) => Number(assignedIds.has(b.id)) - Number(assignedIds.has(a.id)) || b.overall - a.overall);
  }, [assignedIds, positionFilter, roster, search]);

  const assignPlayerToSlot = (playerId: string, slotId: string) => {
    setAssignments((current) => {
      const next = { ...current };
      const previousSlot = Object.entries(next).find(([, assignedId]) => assignedId === playerId)?.[0];
      if (previousSlot && previousSlot !== slotId) next[previousSlot] = null;
      next[slotId] = playerId;
      return next;
    });
    setSelectedPlayerId(null);
    setSelectedSlotId(null);
    setFeedback(null);
  };

  const clearSlot = (slotId: string) => {
    setAssignments((current) => ({ ...current, [slotId]: null }));
    setSelectedSlotId(null);
    setFeedback(null);
  };

  const handleSlotClick = (slotId: string) => {
    if (selectedPlayerId) {
      assignPlayerToSlot(selectedPlayerId, slotId);
      return;
    }
    setSelectedSlotId((current) => (current === slotId ? null : slotId));
  };

  const handleFormationChange = (nextFormation: Formation) => {
    if (nextFormation === formation) return;
    setAssignments((current) => {
      const next = createEmptyAssignments(nextFormation);
      Object.keys(next).forEach((slotId) => {
        if (slotId in current) next[slotId] = current[slotId];
      });
      return next;
    });
    setFormation(nextFormation);
    setSelectedSlotId(null);
    setSelectedPlayerId(null);
    setFeedback(null);
  };

  const save = () => {
    if (!clubId || assignedIds.size !== 11) return;
    const data = {
      formation,
      assignments: slots.map((slot) => ({ slotId: slot.id, playerId: assignments[slot.id] ?? null })),
    };
    setFeedback(null);
    const response = saveClubSquad(clubId, data);
    setSavedSquad({
      ...response,
      assignments: response.assignments.map((assignment) => {
        const player = playerById.get(assignment.playerId || "");
        return { ...assignment, playerName: player?.name || null, position: player?.position || assignment.slotId };
      }),
    });
    setFeedback({
      tone: "success",
      text: `تم حفظ التشكيلة في ${new Date(response.updatedAt).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}`,
    });
  };

  return (
    <main data-testid="club-squad-builder" className="min-h-[600px] rounded-[28px] border border-[#222936] bg-[#0B0E14] p-4 text-[#eef4f8] shadow-[0_24px_80px_rgba(0,0,0,0.24)] sm:p-7">
      <header className="flex flex-col gap-5 border-b border-[#202733] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#61e7c4]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#61e7c4]" /> Matchday setup
          </div>
          <h1 data-testid="text-squad-builder-title" className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Build your starting XI</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#8996a7]">Set the shape, place your players, and save a lineup your club can trust when the lobby opens.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div data-testid="status-assignment-count" className="rounded-xl border border-[#293342] bg-[#121821] px-3 py-2 text-xs font-bold text-[#9aa7b7]">
            <span className="text-[#eef4f8]">{assignedIds.size}</span> / 11 starters
          </div>
          <button
            type="button"
            data-testid="button-save-squad"
            onClick={save}
            disabled={assignedIds.size !== 11}
            className="inline-flex items-center gap-2 rounded-xl bg-[#61e7c4] px-4 py-2.5 text-sm font-black text-[#09211d] transition hover:bg-[#82f0d5] disabled:cursor-not-allowed disabled:bg-[#263b39] disabled:text-[#71847e]"
          >
            <Save size={16} /> Save lineup
          </button>
        </div>
      </header>

      <section aria-label="Formation controls" className="mt-5 flex flex-col gap-3 rounded-2xl border border-[#222c38] bg-[#111720] p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1a2930] text-[#61e7c4]"><Shield size={17} /></div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#6f7d90]">Formation</p>
            <p data-testid="text-current-formation" className="mt-0.5 text-sm font-black text-[#f2f6f8]">{formation}</p>
          </div>
        </div>
        <div className="flex gap-2" role="group" aria-label="Choose formation">
          {FORMATION_OPTIONS.map((option) => (
            <button
              type="button"
              key={option}
              data-testid={`button-formation-${option.replace("-", "")}`}
              aria-pressed={formation === option}
              onClick={() => handleFormationChange(option)}
              className={`rounded-lg px-3 py-2 text-xs font-black transition ${formation === option ? "bg-[#d4ff68] text-[#18220c]" : "bg-[#1b232e] text-[#91a0b1] hover:text-[#eef4f8]"}`}
            >
              {option}
            </button>
          ))}
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
        <section data-testid="section-formation-pitch" className="relative overflow-hidden rounded-2xl border border-[#273341] bg-[#101720] p-3 sm:p-5">
          <div className="mb-3 flex items-center justify-between px-1">
            <div>
              <h2 className="text-sm font-black">Tactical board</h2>
              <p className="mt-1 text-xs text-[#768497]">Drag a player onto a slot, or select a player then a slot.</p>
            </div>
            <span className="hidden rounded-lg border border-[#2b3946] px-2 py-1 text-[10px] font-bold text-[#7f8d9d] sm:inline-flex">DROP ZONES ACTIVE</span>
          </div>
          <div className="relative aspect-[0.76] min-h-[500px] overflow-hidden rounded-xl border border-[#375343] bg-[#18372e] sm:aspect-[1.08] sm:min-h-[570px]">
            <div className="pointer-events-none absolute inset-0 opacity-35" style={{ backgroundImage: "linear-gradient(90deg, rgba(12,39,32,.7) 1px, transparent 1px), linear-gradient(rgba(12,39,32,.7) 1px, transparent 1px)", backgroundSize: "34px 34px" }} />
            <div className="pointer-events-none absolute inset-[7%] rounded-[50%] border border-[#8ec1a4]/40" />
            <div className="pointer-events-none absolute left-[20%] right-[20%] top-0 h-[18%] border-x border-b border-[#8ec1a4]/45" />
            <div className="pointer-events-none absolute left-[34%] right-[34%] top-0 h-[9%] rounded-b-[50%] border-x border-b border-[#8ec1a4]/35" />
            <div className="pointer-events-none absolute bottom-0 left-[20%] right-[20%] h-[18%] border-x border-t border-[#8ec1a4]/45" />
            <div className="pointer-events-none absolute bottom-0 left-[34%] right-[34%] h-[9%] rounded-t-[50%] border-x border-t border-[#8ec1a4]/35" />
            <div className="pointer-events-none absolute left-[7%] right-[7%] top-1/2 border-t border-[#8ec1a4]/45" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#8ec1a4]/40" />

            {slots.map((slot) => {
              const playerId = assignments[slot.id];
              const player = playerId ? playerById.get(playerId) : undefined;
              const isSelected = selectedSlotId === slot.id;
              return (
                <button
                  type="button"
                  key={slot.id}
                  data-testid={`button-slot-${slot.id}`}
                  aria-label={`${slot.label}${player ? `, ${player.name}` : ", empty"}. ${selectedPlayerId ? "Click to assign selected player." : "Click to select slot."}`}
                  onClick={() => handleSlotClick(slot.id)}
                  onDragOver={(event) => { event.preventDefault(); event.currentTarget.dataset.dropActive = "true"; }}
                  onDragLeave={(event) => { delete event.currentTarget.dataset.dropActive; }}
                  onDrop={(event) => {
                    event.preventDefault();
                    delete event.currentTarget.dataset.dropActive;
                    const droppedPlayerId = event.dataTransfer.getData("text/plain");
                    if (droppedPlayerId && playerById.has(droppedPlayerId)) assignPlayerToSlot(droppedPlayerId, slot.id);
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-2xl p-1 outline-none transition focus-visible:ring-2 focus-visible:ring-[#d4ff68] ${isSelected || selectedPlayerId ? "ring-1 ring-[#61e7c4]/70" : ""}`}
                  style={{ left: slot.x, top: slot.y }}
                >
                  <span className={`relative flex h-[58px] w-[62px] flex-col items-center justify-center rounded-xl border text-center shadow-lg transition sm:h-[67px] sm:w-[75px] ${player ? "border-[#61e7c4]/65 bg-[#102923]/95" : "border-dashed border-[#92b7a2]/55 bg-[#173b32]/90 hover:border-[#d4ff68]"}`} data-drop-card={slot.id}>
                    {player ? (
                      <>
                        <span className="absolute -top-2 right-1 rounded bg-[#d4ff68] px-1.5 py-0.5 text-[9px] font-black text-[#17220d]">{player.overall}</span>
                        <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-[#61e7c4]/60 bg-[#29473e] text-[9px] font-black text-[#d5fff3] sm:h-7 sm:w-7">
                          {player.avatar ? <img data-testid={`img-player-avatar-${player.id}`} src={player.avatar} alt="" className="h-full w-full object-cover" /> : initials(player)}
                        </span>
                        <span data-testid={`text-slot-player-${slot.id}`} className="mt-1 max-w-[64px] truncate text-[10px] font-black text-[#f1f8f5] sm:text-[11px]">{player.username}</span>
                        <span className="text-[9px] font-bold text-[#8bb5a5]">{slot.shortLabel}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-lg font-light text-[#8ec1a4]">+</span>
                        <span className="text-[9px] font-black tracking-wide text-[#b1cebd]">{slot.shortLabel}</span>
                      </>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 px-1 text-[11px] text-[#748296]">
            <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#61e7c4]" /> Assigned</span>
            <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full border border-[#9fc4af]" /> Open slot</span>
            <span className="hidden sm:inline">Tip: use Tab + Enter for keyboard placement.</span>
          </div>
        </section>

        <aside data-testid="section-club-roster" className="flex min-h-[500px] flex-col rounded-2xl border border-[#27313d] bg-[#111720] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Users size={17} className="text-[#61e7c4]" />
                <h2 className="text-sm font-black">Club roster</h2>
              </div>
              <p data-testid="text-roster-count" className="mt-1 text-xs text-[#798798]">{roster.length} approved players · {assignedIds.size} selected</p>
            </div>
            {selectedPlayerId && (
              <button type="button" data-testid="button-clear-player-selection" aria-label="Clear player selection" onClick={() => setSelectedPlayerId(null)} className="rounded-lg p-1.5 text-[#8492a3] hover:bg-[#202935] hover:text-[#eef4f8]">
                <X size={15} />
              </button>
            )}
          </div>

          <div className="relative mt-4">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#687689]" />
            <input
              type="search"
              data-testid="input-roster-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, username, EA ID"
              aria-label="Search club roster"
              className="h-10 w-full rounded-xl border border-[#2a3542] bg-[#0c1118] pl-9 pr-3 text-xs font-bold text-[#e7edf3] outline-none placeholder:text-[#5f6d7e] focus:border-[#61e7c4]"
            />
          </div>

          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {filters.map((filter) => (
              <button
                type="button"
                key={filter}
                data-testid={`button-position-filter-${filter.toLowerCase()}`}
                aria-pressed={positionFilter === filter}
                onClick={() => setPositionFilter(filter)}
                className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-black transition ${positionFilter === filter ? "bg-[#d4ff68] text-[#18220c]" : "bg-[#1a222d] text-[#8190a1] hover:text-[#e7edf3]"}`}
              >
                {filter === "ALL" ? "All" : filter}
              </button>
            ))}
          </div>

          {roster.length === 0 ? (
            <div data-testid="empty-club-roster" className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[#303b48] px-5 py-12 text-center">
              <UserRound size={25} className="text-[#687789]" />
              <p className="mt-3 text-sm font-black text-[#dbe4eb]">Your roster is empty</p>
              <p className="mt-1 text-xs leading-5 text-[#758396]">Approved club players will appear here when they join the squad.</p>
            </div>
          ) : visiblePlayers.length === 0 ? (
            <div data-testid="empty-roster-filtered" className="flex flex-1 flex-col items-center justify-center px-5 py-12 text-center">
              <Search size={24} className="text-[#687789]" />
              <p className="mt-3 text-sm font-black text-[#dbe4eb]">No players match</p>
              <button type="button" data-testid="button-clear-roster-filters" onClick={() => { setSearch(""); setPositionFilter("ALL"); }} className="mt-3 text-xs font-black text-[#61e7c4] hover:text-[#d4ff68]">Clear filters</button>
            </div>
          ) : (
            <div data-testid="list-roster-players" className="mt-3 flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
              {visiblePlayers.map((player) => {
                const isAssigned = assignedIds.has(player.id);
                const isSelected = selectedPlayerId === player.id;
                return (
                  <button
                    type="button"
                    draggable
                    key={player.id}
                    data-testid={`button-roster-player-${player.id}`}
                    aria-pressed={isSelected}
                    aria-label={`${player.name}, ${getPlayerPosition(player)}, overall ${player.overall}${isAssigned ? ", assigned" : ""}. Select to place on pitch.`}
                    onClick={() => {
                      setSelectedPlayerId((current) => (current === player.id ? null : player.id));
                      setSelectedSlotId(null);
                      setFeedback(null);
                    }}
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/plain", player.id);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    className={`group flex items-center gap-3 rounded-xl border p-2.5 text-left transition ${isSelected ? "border-[#61e7c4] bg-[#17302b]" : "border-[#26313d] bg-[#151c25] hover:border-[#3a4b5d]"} ${isAssigned ? "opacity-65" : ""}`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#354252] bg-[#24303d] text-[11px] font-black text-[#b9d8ca]">
                      {player.avatar ? <img data-testid={`img-roster-avatar-${player.id}`} src={player.avatar} alt="" className="h-full w-full object-cover" /> : initials(player)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span data-testid={`text-roster-player-${player.id}`} className="block truncate text-xs font-black text-[#e9f0f3]">{player.name}</span>
                      <span className="mt-0.5 block truncate text-[10px] font-bold text-[#728194]">@{player.username} · {getPlayerPosition(player)}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span data-testid={`text-roster-overall-${player.id}`} className="text-sm font-black text-[#d4ff68]">{player.overall}</span>
                      <GripVertical size={13} className="text-[#526172] transition group-hover:text-[#8ea0b4]" />
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-4 rounded-xl border border-[#2a3541] bg-[#0d131a] p-3">
            <div className="flex gap-2.5">
              <CircleHelp size={16} className="mt-0.5 shrink-0 text-[#d4ff68]" />
              <p className="text-[11px] leading-5 text-[#8593a4]">
                {selectedPlayerId ? "Player selected. Click any pitch slot to assign them." : "Select a player here, then click a pitch slot. Drag and drop also works."}
              </p>
            </div>
          </div>
        </aside>
      </div>

      {feedback && (
        <div data-testid={`status-save-${feedback.tone}`} role="status" className={`mt-4 rounded-xl border px-4 py-3 text-sm font-bold ${feedback.tone === "success" ? "border-[#2b6658] bg-[#102a25] text-[#8de9cd]" : "border-[#63303a] bg-[#2c1820] text-[#ff9aa7]"}`}>
          {feedback.text}
        </div>
      )}

      {selectedSlotId && (
        <div data-testid="status-selected-slot" className="sr-only" aria-live="polite">
          {playerById.get(assignments[selectedSlotId] ?? "")?.name || FORMATIONS[formation].find((slot) => slot.id === selectedSlotId)?.label} selected.
        </div>
      )}
    </main>
  );
}