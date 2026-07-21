import { UnitsChatPageView } from "@/components/units-chat-page/page.view";

function normalizeRank(value: string | undefined): number {
  if (!value) return 1;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 3) return 1;
  return parsed;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ rank?: string; roomCode?: string; scope?: string }>;
}) {
  const { rank, roomCode, scope } = await searchParams;
  const normalizedRank = normalizeRank(rank);
  const normalizedRoomCode = roomCode?.trim() ?? "";
  const normalizedScope: "room" | "global" = scope === "global" ? "global" : "room";

  return (
    <UnitsChatPageView
      key={`${normalizedScope}-${normalizedRank}-${normalizedRoomCode}`}
      rank={normalizedRank}
      roomCode={normalizedRoomCode}
      scope={normalizedScope}
    />
  );
}
