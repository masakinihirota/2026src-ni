"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { FLOOR_LIST, type AreaBand, type PlanCell, buildPlanForBuilding } from "@/lib/building-plan";
import { buildRoomScope } from "@/lib/chat-room-scope";
import { BUILDINGS, type BuildingId } from "@/lib/housing-data";
import { PDF_UNIT_RECORDS, type PdfUnitRecord } from "@/lib/unit-price-data";
import { getStoredUserProfile, type UserProfile } from "@/lib/user-profile";

type UnitDetail = {
  unitNumber: string;
  unitType: string;
  area: string;
  priceManYen: number | null;
};
type RoomOption = {
  value: string;
  label: string;
  floor: number;
  building: BuildingId;
  district: "北" | "南";
};
type WishFilter = {
  district: "北" | "南";
  building: BuildingId;
  floor: number;
};

type PopularityScope = "firstOnly" | "firstTwo" | "firstThree";
type PopularityEntry = {
  unitId: string;
  count: number;
};
type PopularityResponse = {
  entriesByScope: Record<PopularityScope, PopularityEntry[]>;
};
type ChatRoomSummary = {
  roomScope: string;
  participantCount: number;
  messageCount: number;
  lastPostedAt: string | null;
};
type ChatSummaryResponse = {
  summaries: ChatRoomSummary[];
};

const BAND_META: Record<AreaBand, { tile: string; text: string; border: string }> = {
  35: { tile: "bg-[#f7f7f5]", text: "text-slate-700", border: "border-slate-400" },
  40: { tile: "bg-[#f0cfe2]", text: "text-[#5d4255]", border: "border-[#c9a4bc]" },
  50: { tile: "bg-[#ffe08b]", text: "text-[#6b4d00]", border: "border-[#d2ab42]" },
  60: { tile: "bg-[#d7c8e3]", text: "text-[#4e3f62]", border: "border-[#9f88b1]" },
  70: { tile: "bg-[#d9e8f8]", text: "text-[#355072]", border: "border-[#90adcc]" },
  80: { tile: "bg-[#cfe6bc]", text: "text-[#3d5d26]", border: "border-[#97b97d]" },
};

const MIN_WISH_SLOTS = 1;
const MAX_WISH_SLOTS = 3;
const UNITS_WISH_DRAFT_STORAGE_PREFIX = "units-page:wish-draft:";
const UNITS_WISH_DRAFT_VERSION = 1;

type UnitsWishDraft = {
  version: number;
  selectedRoomCode: string;
  activeRankIndex: number;
  wishes: (string | null)[];
  wishFilters: WishFilter[];
  submittedWishes: (string | null)[];
  savedAt: string;
};

function createEmptyWishes(count = MIN_WISH_SLOTS): (string | null)[] {
  return Array.from({ length: count }, () => null);
}

function createDefaultWishFilters(count = MIN_WISH_SLOTS): WishFilter[] {
  return Array.from({ length: count }, () => ({ district: "北", building: "N-1", floor: 12 }));
}

function unitsWishDraftStorageKey(userId: string): string {
  return `${UNITS_WISH_DRAFT_STORAGE_PREFIX}${userId}`;
}

function normalizeWishes(raw: unknown, preferredCount?: number): (string | null)[] {
  const source = Array.isArray(raw) ? raw : [];
  const slotCount = Math.min(
    MAX_WISH_SLOTS,
    Math.max(MIN_WISH_SLOTS, preferredCount ?? source.length),
  );
  const normalized = Array.from({ length: slotCount }, (_, index) => {
    const value = source[index];
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  });
  const seen = new Set<string>();
  return normalized.map((value) => {
    if (!value) return null;
    if (seen.has(value)) return null;
    seen.add(value);
    return value;
  });
}

function normalizeWishFilters(raw: unknown, slotCount: number): WishFilter[] {
  const source = Array.isArray(raw) ? raw : [];
  const defaults = createDefaultWishFilters(slotCount);
  return Array.from({ length: slotCount }, (_, index) => {
    const fallback = defaults[index];
    const candidate = source[index];
    if (!candidate || typeof candidate !== "object") return fallback;

    const buildingValue = (candidate as { building?: unknown }).building;
    const floorValue = (candidate as { floor?: unknown }).floor;
    const building =
      typeof buildingValue === "string" && BUILDINGS.includes(buildingValue as BuildingId)
        ? (buildingValue as BuildingId)
        : fallback.building;
    const floor =
      typeof floorValue === "number" && FLOOR_LIST.some((floor) => floor === floorValue)
        ? floorValue
        : fallback.floor;

    return {
      district: districtOf(building),
      building,
      floor,
    };
  });
}

function loadUnitsWishDraft(userId: string): UnitsWishDraft | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(unitsWishDraftStorageKey(userId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<UnitsWishDraft>;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.version !== UNITS_WISH_DRAFT_VERSION) return null;

    const wishes = normalizeWishes(parsed.wishes);
    const slotCount = wishes.length;
    const selectedRoomCode = typeof parsed.selectedRoomCode === "string" ? parsed.selectedRoomCode.trim() : "";
    const submittedWishes = normalizeWishes(parsed.submittedWishes, slotCount);
    const wishFilters = normalizeWishFilters(parsed.wishFilters, slotCount);
    const savedAtDate = typeof parsed.savedAt === "string" ? new Date(parsed.savedAt) : null;
    const activeRankIndexRaw = typeof parsed.activeRankIndex === "number" ? parsed.activeRankIndex : 0;
    const activeRankIndex = Math.max(0, Math.min(slotCount - 1, Math.floor(activeRankIndexRaw)));

    return {
      version: UNITS_WISH_DRAFT_VERSION,
      selectedRoomCode,
      activeRankIndex,
      wishes,
      wishFilters,
      submittedWishes,
      savedAt:
        savedAtDate && !Number.isNaN(savedAtDate.getTime())
          ? savedAtDate.toISOString()
          : new Date().toISOString(),
    };
  } catch (error) {
    console.error("Failed to parse units wish draft", error);
    window.localStorage.removeItem(unitsWishDraftStorageKey(userId));
    return null;
  }
}

function hashValue(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function seedCount(roomCode: string): number {
  return hashValue(roomCode) % 5;
}

function districtOf(building: BuildingId): "北" | "南" {
  return building.startsWith("N-") ? "北" : "南";
}

function orientationOf(building: BuildingId): string {
  const map: Record<BuildingId, string> = {
    "N-1": "西向き",
    "N-2": "南向き",
    "N-3": "南向き",
    "N-4": "東向き",
    "S-1": "西向き",
    "S-2": "南向き",
    "S-3": "南向き",
    "S-4": "東向き",
  };
  return map[building];
}

function reorder<T>(items: T[], from: number, to: number): T[] {
  const clone = [...items];
  const [picked] = clone.splice(from, 1);
  clone.splice(to, 0, picked);
  return clone;
}

function formatPrice(priceManYen: number | null): string {
  if (priceManYen === null) return "資料確認中";
  return `${priceManYen.toLocaleString("ja-JP")}万円`;
}

function toBuildingIdFromUnitNumber(unitNumber: string): BuildingId | null {
  const matched = unitNumber.match(/^([NS])([1-4])-/);
  if (!matched) return null;
  return `${matched[1]}-${matched[2]}` as BuildingId;
}

function deriveUnitType(unitNumber: string): string | null {
  const matched = unitNumber.match(/^([NS][1-4]-\d+r?)-\d{4}$/);
  return matched?.[1] ?? null;
}

function inferFloorFromUnitNumber(unitNumber: string): number | null {
  const lastToken = unitNumber.split("-").at(-1) ?? "";
  if (!/^\d{3,4}$/.test(lastToken)) return null;
  const roomNumeric = Number(lastToken);
  if (!Number.isFinite(roomNumeric)) return null;
  const floor = Math.floor(roomNumeric / 100);
  return floor > 0 ? floor : null;
}

function extractRoomNumberFromUnitNumber(unitNumber: string): string | null {
  const lastToken = unitNumber.split("-").at(-1) ?? "";
  if (!/^\d{3,4}$/.test(lastToken)) return null;
  return lastToken;
}

function formatChatRoomMeta(unitNumber: string): string {
  const building = toBuildingIdFromUnitNumber(unitNumber);
  const wingLabel = building
    ? `${building.startsWith("N-") ? "北棟" : "南棟"}-${building.split("-")[1] ?? "?"}`
    : "棟情報未設定";
  const floor = inferFloorFromUnitNumber(unitNumber);
  const floorLabel = floor ? `${floor}階` : "階情報未設定";
  const roomNumber = extractRoomNumberFromUnitNumber(unitNumber);
  const roomLabel = roomNumber ? `${roomNumber}号室` : "号室情報未設定";
  return `${wingLabel} / ${floorLabel} / ${roomLabel}`;
}

function formatChatJoinLabel(unitNumber: string): string {
  const building = toBuildingIdFromUnitNumber(unitNumber);
  const wingLabel = building
    ? `${building.startsWith("N-") ? "北棟" : "南棟"}-${building.split("-")[1] ?? "?"}`
    : "棟情報未設定";
  const floor = inferFloorFromUnitNumber(unitNumber);
  const floorLabel = floor ? `${floor}階` : "階情報未設定";
  const roomNumber = extractRoomNumberFromUnitNumber(unitNumber);
  const roomLabel = roomNumber ? `${roomNumber}号室` : "号室情報未設定";
  return `${wingLabel} ${floorLabel} ${roomLabel}のチャットに入る`;
}

function areaFromLabel(label: string): number | null {
  const matched = label.match(/(\d+(?:\.\d+)?)/);
  if (!matched) return null;
  return Number(matched[1]);
}

function areaBandFromAreaLabel(areaLabel: string | null | undefined): AreaBand | null {
  if (!areaLabel) return null;
  const areaValue = areaFromLabel(areaLabel);
  if (areaValue === null) return null;
  if (areaValue < 40) return 35;
  if (areaValue < 50) return 40;
  if (areaValue < 60) return 50;
  if (areaValue < 70) return 60;
  if (areaValue < 80) return 70;
  return 80;
}

function pickRecordIndexByArea(
  records: PdfUnitRecord[],
  usedIndexes: Set<number>,
  areaValue: number | null,
): number {
  if (areaValue !== null) {
    const areaMatchedIndex = records.findIndex((record, index) => {
      if (usedIndexes.has(index) || !record.area) return false;
      const recordArea = areaFromLabel(record.area);
      return recordArea !== null && Math.abs(recordArea - areaValue) < 0.01;
    });
    if (areaMatchedIndex >= 0) return areaMatchedIndex;
  }
  return records.findIndex((_, index) => !usedIndexes.has(index));
}

function RankCard({
  rank,
  roomCode,
  roomReadableLabel,
  roomToneClass,
  active,
  onActivate,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  rank: number;
  roomCode: string | null;
  roomReadableLabel: string | null;
  roomToneClass: string;
  active: boolean;
  onActivate: () => void;
  onRemove: () => void;
  onDragStart: () => void;
  onDragOver: (event: React.DragEvent<HTMLButtonElement>) => void;
  onDrop: () => void;
}) {
  return (
    <button
      type="button"
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={onActivate}
      className={[
        "w-full rounded-xl border px-3 py-3 text-left transition",
        roomCode ? roomToneClass : "border-slate-300 bg-white text-slate-900",
        active ? "ring-2 ring-[#2f6b93] shadow-sm" : "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold">希望{rank}</p>
          {roomCode ? (
            <>
              <p className="mt-0.5 text-sm font-bold">{roomReadableLabel}</p>
              <p className="mt-1 text-xs font-semibold">対象住戸: {roomCode}</p>
            </>
          ) : (
            <p className="mt-0.5 text-sm font-bold">未選択</p>
          )}
        </div>
        {roomCode ? (
          <span
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
            className="rounded-full border border-slate-300 px-2 py-0.5 text-[11px] text-slate-600"
          >
            削除
          </span>
        ) : null}
      </div>
    </button>
  );
}

export function UnitsPageView() {
  const [userProfile] = useState<UserProfile | null>(() => getStoredUserProfile());
  const [initialDraft] = useState<UnitsWishDraft | null>(() => {
    if (!userProfile) return null;
    return loadUnitsWishDraft(userProfile.userId);
  });
  const [selectedRoomCode, setSelectedRoomCode] = useState(() => initialDraft?.selectedRoomCode ?? "");
  const [activeRankIndex, setActiveRankIndex] = useState(() => initialDraft?.activeRankIndex ?? 0);
  const [wishes, setWishes] = useState<(string | null)[]>(() => initialDraft?.wishes ?? createEmptyWishes());
  const [wishFilters, setWishFilters] = useState<WishFilter[]>(() => initialDraft?.wishFilters ?? createDefaultWishFilters());
  const [submittedWishes, setSubmittedWishes] = useState<(string | null)[]>(() => initialDraft?.submittedWishes ?? createEmptyWishes());
  const [dragSourceRankIndex, setDragSourceRankIndex] = useState<number | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedAt, setSavedAt] = useState(() => (initialDraft ? new Date(initialDraft.savedAt) : new Date()));
  const [hoveredCell, setHoveredCell] = useState<{ floor: number; start: number; end: number } | null>(null);
  const [wishDemandByRoom, setWishDemandByRoom] = useState<Record<string, number>>({});
  const [chatSummaryByRoomScope, setChatSummaryByRoomScope] = useState<Record<string, ChatRoomSummary>>({});
  const [chatStatsError, setChatStatsError] = useState<string | null>(null);

  const activeWishFilter = wishFilters[Math.min(activeRankIndex, wishFilters.length - 1)] ?? createDefaultWishFilters()[0];
  const activeDistrict = activeWishFilter.district;
  const activeBuilding = activeWishFilter.building;
  const activeFloor = activeWishFilter.floor;

  const plan = useMemo(() => buildPlanForBuilding(activeBuilding), [activeBuilding]);
  const planColumnCount = useMemo(
    () =>
      Math.max(
        ...FLOOR_LIST.map((floor) =>
          (plan[floor] ?? []).reduce((sum, cell) => sum + (cell?.colSpan ?? 1), 0),
        ),
      ),
    [plan],
  );
  const pdfRecordsForBuilding = useMemo(
    () => PDF_UNIT_RECORDS.filter((record) => toBuildingIdFromUnitNumber(record.unitNumber) === activeBuilding),
    [activeBuilding],
  );
  const fallbackAreaByType = useMemo(() => {
    const map = new Map<string, string>();
    for (const record of pdfRecordsForBuilding) {
      const derivedType = record.unitType ?? deriveUnitType(record.unitNumber);
      if (!derivedType || !record.area || map.has(derivedType)) continue;
      map.set(derivedType, record.area);
    }
    return map;
  }, [pdfRecordsForBuilding]);
  const unitDetailsByRoomCode = useMemo(() => {
    const map = new Map<string, UnitDetail>();
    const recordsByFloor = new Map<number, PdfUnitRecord[]>();
    for (const record of pdfRecordsForBuilding) {
      const floorRecords = recordsByFloor.get(record.floor) ?? [];
      floorRecords.push(record);
      recordsByFloor.set(record.floor, floorRecords);
    }
    for (const floorRecords of recordsByFloor.values()) {
      floorRecords.sort((a, b) => a.unitNumber.localeCompare(b.unitNumber, "ja-JP"));
    }

    for (const floor of FLOOR_LIST) {
      const selectableCells = (plan[floor] ?? []).filter((cell): cell is PlanCell => Boolean(cell?.selectable));
      const records = recordsByFloor.get(floor) ?? [];
      const usedIndexes = new Set<number>();
      for (const cell of selectableCells) {
        const areaValue = areaFromLabel(cell.label);
        const matchedIndex = pickRecordIndexByArea(records, usedIndexes, areaValue);
        const matchedRecord = matchedIndex >= 0 ? records[matchedIndex] : null;
        if (matchedRecord) usedIndexes.add(matchedIndex);
        const derivedType = matchedRecord ? (matchedRecord.unitType ?? deriveUnitType(matchedRecord.unitNumber)) : null;
        const areaFromType = derivedType ? fallbackAreaByType.get(derivedType) ?? null : null;
        map.set(cell.roomCode, {
          unitNumber: matchedRecord?.unitNumber ?? `${activeBuilding}-${floor}-資料確認中`,
          unitType: derivedType ?? "資料確認中",
          area: matchedRecord?.area ?? areaFromType ?? cell.label,
          priceManYen: matchedRecord?.priceManYen ?? null,
        });
      }
    }
    return map;
  }, [activeBuilding, plan, pdfRecordsForBuilding, fallbackAreaByType]);

  const allRoomOptions = useMemo(() => {
    const sortedRecords = [...PDF_UNIT_RECORDS].sort((a, b) => {
      const buildingA = toBuildingIdFromUnitNumber(a.unitNumber);
      const buildingB = toBuildingIdFromUnitNumber(b.unitNumber);
      if (buildingA && buildingB && buildingA !== buildingB) {
        return buildingA.localeCompare(buildingB, "ja-JP");
      }
      if (a.floor !== b.floor) return b.floor - a.floor;
      return a.unitNumber.localeCompare(b.unitNumber, "ja-JP");
    });
    return sortedRecords.flatMap((record) => {
      const buildingId = toBuildingIdFromUnitNumber(record.unitNumber);
      if (!buildingId) return [];
      return [
        {
          value: record.unitNumber,
          label: `${record.unitNumber}（${record.floor}階 / ${record.area ?? "資料確認中"} / ${formatPrice(record.priceManYen)}）`,
          floor: record.floor,
          building: buildingId,
          district: districtOf(buildingId),
        } satisfies RoomOption,
      ];
    });
  }, []);
  const allUnitDetailsByUnitNumber = useMemo(() => {
    const map = new Map<string, UnitDetail>();
    for (const record of PDF_UNIT_RECORDS) {
      map.set(record.unitNumber, {
        unitNumber: record.unitNumber,
        unitType: record.unitType ?? deriveUnitType(record.unitNumber) ?? "資料確認中",
        area: record.area ?? "資料確認中",
        priceManYen: record.priceManYen,
      });
    }
    return map;
  }, []);

  const roomDisplayByCode = useMemo(() => {
    const map = new Map<string, string>();
    for (const option of allRoomOptions) {
      map.set(option.value, option.label);
    }
    return map;
  }, [allRoomOptions]);
  const totalRoomChatCount = allRoomOptions.length;
  const selectedRoomDetail = useMemo(
    () => (selectedRoomCode ? allUnitDetailsByUnitNumber.get(selectedRoomCode) ?? null : null),
    [selectedRoomCode, allUnitDetailsByUnitNumber],
  );

  const wishRoomOptionsByIndex = useMemo(() => {
    return wishFilters.map((filter) =>
      allRoomOptions.filter(
        (option) => option.district === filter.district && option.building === filter.building && option.floor === filter.floor,
      ),
    );
  }, [allRoomOptions, wishFilters]);

  const aliasWithWishes = useMemo(() => {
    const parts = wishes.map((room, index) => `希${index + 1}:${room ? roomDisplayByCode.get(room) ?? room : "未定"}`);
    return `${userProfile?.zodiacAlias ?? "未ログイン"}｜${parts.join(" / ")}`;
  }, [userProfile?.zodiacAlias, wishes, roomDisplayByCode]);

  const popularityByRoom = useMemo(() => {
    const counts = new Map<string, number>();
    for (const option of allRoomOptions) {
      counts.set(option.value, seedCount(option.value));
    }
    for (const roomCode of wishes) {
      if (!roomCode) continue;
      counts.set(roomCode, (counts.get(roomCode) ?? 0) + 1);
    }
    return counts;
  }, [allRoomOptions, wishes]);

  const wishRankByRoom = useMemo(() => {
    const map = new Map<string, number>();
    wishes.forEach((roomCode, index) => {
      if (!roomCode) return;
      map.set(roomCode, index + 1);
    });
    return map;
  }, [wishes]);

  const nextRequiredRankIndex = useMemo(
    () => wishes.findIndex((roomCode) => roomCode === null),
    [wishes],
  );
  const selectedWishCount = useMemo(
    () => wishes.filter((roomCode): roomCode is string => roomCode !== null).length,
    [wishes],
  );
  const hasUnsavedSubmission = useMemo(
    () => wishes.some((roomCode, index) => roomCode !== submittedWishes[index]),
    [wishes, submittedWishes],
  );

  const guidedRankIndex = nextRequiredRankIndex >= 0 ? nextRequiredRankIndex : Math.min(activeRankIndex, wishes.length - 1);

  useEffect(() => {
    if (!userProfile) return;
    const draft: UnitsWishDraft = {
      version: UNITS_WISH_DRAFT_VERSION,
      selectedRoomCode,
      activeRankIndex: Math.max(0, Math.min(wishes.length - 1, activeRankIndex)),
      wishes,
      wishFilters,
      submittedWishes: normalizeWishes(submittedWishes, wishes.length),
      savedAt: savedAt.toISOString(),
    };
    window.localStorage.setItem(unitsWishDraftStorageKey(userProfile.userId), JSON.stringify(draft));
  }, [
    userProfile,
    selectedRoomCode,
    activeRankIndex,
    wishes,
    wishFilters,
    submittedWishes,
    savedAt,
  ]);

  const selectionGuideMessage =
    nextRequiredRankIndex >= 0
      ? `第${guidedRankIndex + 1}希望を選んでください。`
      : wishes.length < MAX_WISH_SLOTS
        ? `希望1〜${wishes.length}の選択が完了しました。＋ボタンで次の希望を追加できます。`
        : "希望1〜3の選択が完了しました。必要ならカードをドラッグして順位を調整してください。";

  const roomChatEntries = useMemo(() => {
    return wishes.map((roomCode, index) => {
      if (!roomCode) return null;
      return {
        roomCode,
        roomScope: buildRoomScope({ scope: "room", roomCode }),
        href: `/units/chat?rank=${index + 1}&roomCode=${encodeURIComponent(roomCode)}`,
      };
    });
  }, [wishes]);

  useEffect(() => {
    const activeEntries = roomChatEntries.filter((entry): entry is NonNullable<(typeof roomChatEntries)[number]> => entry !== null);
    if (activeEntries.length === 0) {
      return;
    }

    let alive = true;

    void (async () => {
      try {
        const [popularityResponse, summaryResponse] = await Promise.all([
          fetch("/api/wishes/popularity", { cache: "no-store" }),
          fetch(
            `/api/chats/summaries?roomScopes=${encodeURIComponent(
              Array.from(new Set(activeEntries.map((entry) => entry.roomScope))).join(","),
            )}`,
            { cache: "no-store" },
          ),
        ]);

        const popularityJson = (await popularityResponse.json()) as {
          success?: boolean;
          data?: PopularityResponse;
          error?: { message?: string };
        };
        if (!popularityResponse.ok || !popularityJson.success || !popularityJson.data) {
          throw new Error(popularityJson.error?.message ?? "希望者数の取得に失敗しました。");
        }

        const summaryJson = (await summaryResponse.json()) as {
          success?: boolean;
          data?: ChatSummaryResponse;
          error?: { message?: string };
        };
        if (!summaryResponse.ok || !summaryJson.success || !summaryJson.data) {
          throw new Error(summaryJson.error?.message ?? "チャット統計の取得に失敗しました。");
        }

        if (!alive) return;

        const roomDemandMap = popularityJson.data.entriesByScope.firstThree.reduce<Record<string, number>>((acc, entry) => {
          acc[entry.unitId] = entry.count;
          return acc;
        }, {});
        setWishDemandByRoom(roomDemandMap);

        const summaryMap = summaryJson.data.summaries.reduce<Record<string, ChatRoomSummary>>((acc, summary) => {
          acc[summary.roomScope] = summary;
          return acc;
        }, {});
        setChatSummaryByRoomScope(summaryMap);
        setChatStatsError(null);
      } catch (error) {
        if (!alive) return;
        const message = error instanceof Error ? error.message : "統計の取得に失敗しました。";
        setChatStatsError(message);
      }
    })();

    return () => {
      alive = false;
    };
  }, [roomChatEntries]);

  function applyWish(rankIndex: number, roomCode: string | null): void {
    if (rankIndex < 0 || rankIndex >= wishes.length) return;
    if (roomCode && wishes.some((picked, index) => picked === roomCode && index !== rankIndex)) {
      setWarningMessage("同じユーザー内で同一住戸は重複選択できません。");
      return;
    }

    const sourceFilter = wishFilters[rankIndex] ?? createDefaultWishFilters()[0];
    let nextActiveRankIndex = rankIndex;
    let appendedNewSlot = false;
    setWishes((previous) => {
      const next = [...previous];
      next[rankIndex] = roomCode;
      if (roomCode !== null && rankIndex === previous.length - 1 && previous.length < MAX_WISH_SLOTS) {
        next.push(null);
        appendedNewSlot = true;
      }
      nextActiveRankIndex = roomCode ? Math.min(rankIndex + 1, next.length - 1) : rankIndex;
      return next;
    });
    if (appendedNewSlot) {
      setWishFilters((previous) => [...previous, { ...sourceFilter }]);
    }
    setActiveRankIndex(nextActiveRankIndex);
    setWarningMessage(null);
    setSubmitMessage(null);
    setSavedAt(new Date());
  }

  function updateWishFilter(
    rankIndex: number,
    patch: Partial<Pick<WishFilter, "district" | "building" | "floor">>,
  ): void {
    if (rankIndex < 0 || rankIndex >= wishFilters.length) return;
    setWishFilters((previous) => {
      const next = [...previous];
      const current = previous[rankIndex];
      let districtValue = patch.district ?? current.district;
      let buildingValue = patch.building ?? current.building;
      if (patch.district && districtOf(buildingValue) !== patch.district) {
        buildingValue = BUILDINGS.find((item) => districtOf(item) === patch.district) ?? buildingValue;
      }
      if (patch.building) {
        districtValue = districtOf(patch.building);
      }
      next[rankIndex] = {
        district: districtValue,
        building: buildingValue,
        floor: patch.floor ?? current.floor,
      };
      return next;
    });
    setWishes((previous) => {
      const next = [...previous];
      next[rankIndex] = null;
      return next;
    });
    setWarningMessage(null);
    setSubmitMessage(null);
    setSavedAt(new Date());
  }

  function selectBuildingFromMap(nextBuilding: BuildingId): void {
    updateWishFilter(guidedRankIndex, { building: nextBuilding });
    setActiveRankIndex(guidedRankIndex);
  }

  function resetWishes(): void {
    setWishes(createEmptyWishes());
    setWishFilters(createDefaultWishFilters());
    setActiveRankIndex(0);
    setSelectedRoomCode("");
    setWarningMessage(null);
    setSubmitMessage(null);
    setSavedAt(new Date());
  }

  function addWishSlot(): void {
    if (wishes.length >= MAX_WISH_SLOTS) return;
    const next = [...wishes, null];
    setWishes(next);
    setWishFilters((previous) => [
      ...previous,
      {
        district: activeDistrict,
        building: activeBuilding,
        floor: activeFloor,
      },
    ]);
    const firstEmpty = next.findIndex((item) => item === null);
    setActiveRankIndex(firstEmpty >= 0 ? firstEmpty : next.length - 1);
    setWarningMessage(null);
    setSubmitMessage(null);
    setSavedAt(new Date());
  }

  function removeWishSlot(rankIndex: number): void {
    if (wishes.length <= MIN_WISH_SLOTS) return;
    const next = wishes.filter((_, index) => index !== rankIndex);
    setWishes(next);
    setWishFilters((previous) => previous.filter((_, index) => index !== rankIndex));
    setActiveRankIndex((previous) => {
      if (rankIndex < previous) return previous - 1;
      return Math.min(previous, next.length - 1);
    });
    setWarningMessage(null);
    setSubmitMessage(null);
    setSavedAt(new Date());
  }

  async function submitWishesToServer(): Promise<void> {
    if (isSubmitting) return;
    if (selectedWishCount === 0) {
      setWarningMessage("提出する前に、希望住戸を1件以上選択してください。");
      return;
    }
    if (!hasUnsavedSubmission) {
      setSubmitMessage("最新の提出内容がすでにサーバーへ反映されています。");
      return;
    }

    setIsSubmitting(true);
    setWarningMessage(null);
    setSubmitMessage(null);

    const payload = {
      sessionId: userProfile?.userId ?? "unknown-user",
      unitIds: wishes.filter((roomCode): roomCode is string => roomCode !== null),
      userName: userProfile?.userName ?? undefined,
      zodiacAlias: userProfile?.zodiacAlias ?? undefined,
    };

    try {
      const response = await fetch("/api/wishes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await response.json()) as { success?: boolean; error?: { message?: string } };
      if (!response.ok || !json.success) {
        const message = json.error?.message ?? "提出に失敗しました。時間をおいて再試行してください。";
        setWarningMessage(message);
        return;
      }

      setSubmittedWishes([...wishes]);
      setSubmitMessage(`提出完了: 第1〜第${selectedWishCount}希望をサーバーへ反映しました。`);
      setSavedAt(new Date());
    } catch (error) {
      const message = error instanceof Error ? error.message : "提出中に通信エラーが発生しました。";
      setWarningMessage(`提出エラー: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!userProfile) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <section className="rounded-2xl border border-slate-300 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">利用開始設定が必要です</h1>
          <p className="mt-2 text-sm text-slate-700">先に利用開始設定画面で参加者登録（ユーザー名・星座匿名）を行ってください。</p>
          <Link href="/login" className="mt-4 inline-flex cursor-pointer rounded-full border border-[#2f6d92] bg-[#eef6fc] px-4 py-2 text-sm font-semibold text-[#1f5a7d]">
            利用開始設定へ
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1180px] px-4 pb-8 pt-4">
      <header className="mb-4">
        <h1 className="text-[48px] font-extrabold leading-none tracking-tight text-[#2e6d92]">建物計画</h1>
        <div className="mt-3 h-3 bg-[#bba6cf]" />
      </header>

      <section className="mb-4 rounded-2xl border border-[#b8cce0] bg-[#f8fbff] p-4 shadow-sm">
        <p className="text-sm font-bold text-[#2f5f84]">
          現在登録: {userProfile.userName}（星座匿名: {userProfile.zodiacAlias}）
        </p>
        <p className="mt-1 text-xs font-semibold text-slate-700">
          確認状態: {userProfile.verificationStatus === "verified" ? "確認済み（最終交渉機能を利用可能）" : "未確認（公開表示は星座匿名のみ）"}
        </p>
        <p className="mt-1 text-xs text-slate-600">公開表示は星座匿名が基本です。表示方式の変更やユーザー名更新は利用開始設定画面から行えます。</p>
        <Link href="/login" className="mt-3 inline-flex cursor-pointer rounded-full border border-[#2f6d92] bg-white px-4 py-1.5 text-sm font-semibold text-[#2f6d92] transition hover:bg-[#edf5fd]">
          利用開始設定を変更
        </Link>
      </section>

      <section className="rounded-3xl border border-[#c8d5e3] bg-[#f8fbff] p-4 shadow-sm">
        <div>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">希望ごとの選択セット（街区・棟・階数・部屋）</p>
            <button
              type="button"
              onClick={addWishSlot}
              disabled={wishes.length >= MAX_WISH_SLOTS}
              className="cursor-pointer rounded-full border border-[#2f6d92] bg-white px-3 py-1 text-xs font-semibold text-[#2f6d92] transition hover:bg-[#edf5fd] disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400 disabled:hover:bg-white"
            >
              ＋ 希望を追加
            </button>
          </div>

          <div className="mt-2 space-y-2">
            {wishes.map((roomCode, index) => (
              <div key={`wish-select-${index}`} className="rounded-xl border border-[#d7e2ee] bg-white p-3">
                {(() => {
                  const selectedDetail = roomCode ? allUnitDetailsByUnitNumber.get(roomCode) ?? null : null;
                  const selectedBand = areaBandFromAreaLabel(selectedDetail?.area ?? null);
                  const roomSelectTone = selectedBand
                    ? `${BAND_META[selectedBand].tile} ${BAND_META[selectedBand].text} ${BAND_META[selectedBand].border}`
                    : "bg-white text-slate-900 border-[#b8cce0]";
                  return (
                    <>
                <p className="text-sm font-bold text-[#2f5f84]">第{index + 1}希望</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="text-sm font-semibold text-slate-700">
                    街区
                    <select
                      value={wishFilters[index]?.district ?? "北"}
                      onChange={(event) => {
                        updateWishFilter(index, { district: event.target.value as "北" | "南" });
                        setActiveRankIndex(index);
                      }}
                      className="mt-1 w-full rounded-xl border border-[#b8cce0] bg-white px-3 py-2.5 text-sm"
                    >
                      <option value="北">北街区</option>
                      <option value="南">南街区</option>
                    </select>
                  </label>
                  <label className="text-sm font-semibold text-slate-700">
                    棟
                    <select
                      value={wishFilters[index]?.building ?? "N-1"}
                      onChange={(event) => {
                        updateWishFilter(index, { building: event.target.value as BuildingId });
                        setActiveRankIndex(index);
                      }}
                      className="mt-1 w-full rounded-xl border border-[#b8cce0] bg-white px-3 py-2.5 text-sm"
                    >
                      {BUILDINGS.filter((item) => districtOf(item) === (wishFilters[index]?.district ?? "北")).map((item) => (
                        <option key={item} value={item}>
                          {item}棟
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-semibold text-slate-700">
                    階数
                    <select
                      value={wishFilters[index]?.floor ?? 12}
                      onChange={(event) => {
                        updateWishFilter(index, { floor: Number(event.target.value) });
                        setActiveRankIndex(index);
                      }}
                      className="mt-1 w-full rounded-xl border border-[#b8cce0] bg-white px-3 py-2.5 text-sm"
                    >
                      {FLOOR_LIST.map((floor) => (
                        <option key={floor} value={floor}>
                          {floor}階
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-semibold text-slate-700">
                    部屋
                    <select
                      value={roomCode ?? ""}
                      onChange={(event) => {
                        const next = event.target.value;
                        setSelectedRoomCode(next);
                        setActiveRankIndex(index);
                        applyWish(index, next || null);
                      }}
                      className={`mt-1 w-full rounded-xl border px-3 py-2.5 text-sm ${roomSelectTone}`}
                    >
                      <option value="">選択してください</option>
                      {(wishRoomOptionsByIndex[index] ?? []).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeWishSlot(index)}
                    disabled={wishes.length <= MIN_WISH_SLOTS}
                    className="cursor-pointer rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-white"
                  >
                    削除
                  </button>
                </div>
                    </>
                  );
                })()}
              </div>
            ))}
          </div>
        </div>

        <p className="mt-3 rounded-lg border border-[#b7c9dd] bg-[#edf4fb] px-3 py-2 text-sm font-semibold text-[#2f5f84]">
          {selectionGuideMessage}
        </p>
        <p className="mt-2 text-xs text-slate-600">
          現在はローカル編集中です。提出ボタンを押すまで本番集計（サーバー）には反映されません。
        </p>
        <p className="mt-1 text-xs text-slate-600">
          提出後も何度でも修正して再提出できます。提出中は連打防止のためボタンが一時的に無効になります。
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              void submitWishesToServer();
            }}
            disabled={isSubmitting || selectedWishCount === 0 || !hasUnsavedSubmission}
            className="cursor-pointer rounded-full border border-[#2f6d92] bg-[#2f6d92] px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-[#255a79] disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300"
          >
            {isSubmitting ? "提出中..." : "提出して本番へ反映"}
          </button>
          <button
            type="button"
            onClick={resetWishes}
            className="cursor-pointer rounded-full border border-[#d73a49] bg-white px-4 py-1.5 text-sm font-semibold text-[#d73a49] transition hover:bg-[#fff1f3]"
          >
            選択をリセット
          </button>
        </div>
        {submitMessage ? <p className="mt-2 text-xs font-semibold text-emerald-700">{submitMessage}</p> : null}

        <div className="mt-4">
          <p className="text-sm font-semibold text-slate-700">図面（タップで選択）</p>
          <div className="mt-2 overflow-x-auto rounded-2xl border border-[#b8cce0] bg-[#f2f6fb] p-3">
            <div className="mb-4 rounded border border-slate-500 bg-white p-3">
              <p className="mb-2 text-sm font-semibold text-[#2f5f84]">棟を選んでください。</p>
              <div className="relative mx-auto h-[320px] w-[360px] overflow-hidden rounded-xl border-[6px] border-slate-500 bg-[#f8fafc]">
                <div className="absolute left-4 top-4 flex h-12 w-12 items-center justify-center rounded-full border-2 border-sky-300 bg-white text-xs font-bold text-sky-700 shadow-sm">
                  <span className="absolute -top-1.5 text-[11px] font-extrabold text-sky-700">N</span>
                  <span className="h-0 w-0 border-x-[5px] border-b-[12px] border-x-transparent border-b-rose-500" />
                </div>
                <p className="absolute left-1/2 top-5 z-20 -translate-x-1/2 text-xs font-semibold text-slate-600">北街区（N1-N4）</p>
                <p className="absolute left-1/2 top-[292px] z-20 -translate-x-1/2 text-xs font-semibold text-slate-600">南街区（S1-S4）</p>

                <div className="absolute left-1/2 top-10 h-[110px] w-[220px] -translate-x-1/2">
                  <button
                    type="button"
                    onClick={() => selectBuildingFromMap("N-1")}
                    className={[
                      "absolute left-0 top-0 h-[70px] w-[44px] border text-sm font-bold",
                      activeBuilding === "N-1" ? "border-red-500 bg-red-100 text-red-800" : "border-red-300 bg-white text-slate-700 hover:bg-red-50",
                    ].join(" ")}
                  >
                    N-1
                  </button>
                  <button
                    type="button"
                    onClick={() => selectBuildingFromMap("N-4")}
                    className={[
                      "absolute right-0 top-0 h-[70px] w-[44px] border text-sm font-bold",
                      activeBuilding === "N-4" ? "border-red-500 bg-red-100 text-red-800" : "border-red-300 bg-white text-slate-700 hover:bg-red-50",
                    ].join(" ")}
                  >
                    N-4
                  </button>
                  <button
                    type="button"
                    onClick={() => selectBuildingFromMap("N-2")}
                    className={[
                      "absolute bottom-0 left-0 h-[34px] w-[108px] border text-sm font-bold",
                      activeBuilding === "N-2" ? "border-red-500 bg-red-100 text-red-800" : "border-red-300 bg-white text-slate-700 hover:bg-red-50",
                    ].join(" ")}
                  >
                    N-2
                  </button>
                  <button
                    type="button"
                    onClick={() => selectBuildingFromMap("N-3")}
                    className={[
                      "absolute bottom-0 right-0 h-[34px] w-[108px] border text-sm font-bold",
                      activeBuilding === "N-3" ? "border-red-500 bg-red-100 text-red-800" : "border-red-300 bg-white text-slate-700 hover:bg-red-50",
                    ].join(" ")}
                  >
                    N-3
                  </button>
                </div>

                <div className="absolute left-1/2 top-[170px] h-[110px] w-[220px] -translate-x-1/2">
                  <button
                    type="button"
                    onClick={() => selectBuildingFromMap("S-1")}
                    className={[
                      "absolute left-0 top-0 h-[70px] w-[44px] border text-sm font-bold",
                      activeBuilding === "S-1"
                        ? "border-[#8e62b3] bg-[#d9c7ea] text-[#4f3a67]"
                        : "border-[#d3c1e2] bg-[#ece3f4] text-slate-700 hover:bg-[#e2d5ee]",
                    ].join(" ")}
                  >
                    S-1
                  </button>
                  <button
                    type="button"
                    onClick={() => selectBuildingFromMap("S-4")}
                    className={[
                      "absolute right-0 top-0 h-[70px] w-[44px] border text-sm font-bold",
                      activeBuilding === "S-4"
                        ? "border-[#8e62b3] bg-[#d9c7ea] text-[#4f3a67]"
                        : "border-[#d3c1e2] bg-[#ece3f4] text-slate-700 hover:bg-[#e2d5ee]",
                    ].join(" ")}
                  >
                    S-4
                  </button>
                  <button
                    type="button"
                    onClick={() => selectBuildingFromMap("S-2")}
                    className={[
                      "absolute bottom-0 left-0 h-[34px] w-[108px] border text-sm font-bold",
                      activeBuilding === "S-2"
                        ? "border-[#8e62b3] bg-[#d9c7ea] text-[#4f3a67]"
                        : "border-[#d3c1e2] bg-[#ece3f4] text-slate-700 hover:bg-[#e2d5ee]",
                    ].join(" ")}
                  >
                    S-2
                  </button>
                  <button
                    type="button"
                    onClick={() => selectBuildingFromMap("S-3")}
                    className={[
                      "absolute bottom-0 right-0 h-[34px] w-[108px] border text-sm font-bold",
                      activeBuilding === "S-3"
                        ? "border-[#8e62b3] bg-[#d9c7ea] text-[#4f3a67]"
                        : "border-[#d3c1e2] bg-[#ece3f4] text-slate-700 hover:bg-[#e2d5ee]",
                    ].join(" ")}
                  >
                    S-3
                  </button>
                </div>
              </div>
            </div>

            <div className="grid min-w-[900px] gap-4 lg:grid-cols-[1fr_280px]">
              <div>
                <div className="mb-3 flex items-center gap-3">
                  <span className="text-[32px] leading-none text-[#2f6d92]">■</span>
                  <h2 className="text-[44px] font-bold leading-none text-[#2f6d92]">住戸構成</h2>
                </div>

                <div className="mb-2 flex items-center gap-5">
                  <span className="rounded-sm border border-[#7ea5c6] bg-white px-4 py-1 text-[42px] font-bold leading-none text-[#2f6d92]">{activeBuilding}棟</span>
                  <span className="text-[42px] font-bold leading-none text-[#2f6d92]">（{orientationOf(activeBuilding)}）</span>
                </div>

                <table className="table-fixed border-separate border-spacing-0 text-[#50535a]">
                  <colgroup>
                    <col className="w-12" />
                    {Array.from({ length: planColumnCount }).map((_, index) => (
                      <col key={`plan-col-${index}`} className="w-24" />
                    ))}
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="pb-1 pr-2 text-right text-xs font-bold text-[#476b8d]">階数</th>
                      <th className="pb-1" colSpan={planColumnCount} />
                    </tr>
                  </thead>
                  <tbody>
                    {FLOOR_LIST.map((floor) => (
                      <tr key={floor}>
                        <td
                          className={[
                            "w-12 pr-2 text-right text-xl font-bold text-[#2f5072]",
                            hoveredCell?.floor === floor ? "text-[#1f5f89]" : "",
                          ].join(" ")}
                        >
                          {floor}
                        </td>
                        {(() => {
                          let slotCursor = 0;
                          return (plan[floor] ?? []).map((cell, index) => {
                            const span = cell?.colSpan ?? 1;
                            const colStart = slotCursor;
                            const colEnd = colStart + span - 1;
                            slotCursor += span;
                            const isHoveredRow = hoveredCell?.floor === floor;
                            const isHoveredColumn = hoveredCell ? !(colEnd < hoveredCell.start || colStart > hoveredCell.end) : false;
                            const crossHighlight = isHoveredRow || isHoveredColumn;

                          if (!cell) {
                            return (
                              <td
                                key={`void-${floor}-${index}`}
                                className={[
                                  "h-16 w-24",
                                  crossHighlight ? "bg-[#eaf2fb]" : "",
                                ].join(" ")}
                              />
                            );
                          }

                          const detail = unitDetailsByRoomCode.get(cell.roomCode);
                          const unitNumber = detail?.unitNumber ?? cell.roomCode;
                          const count = popularityByRoom.get(unitNumber) ?? 0;
                          const selectedRank = wishRankByRoom.get(unitNumber) ?? null;
                          const isPicked = selectedRank !== null;
                          const borderWidth = count >= 5 ? "border-4" : count >= 3 ? "border-2" : "border";
                          const unitType = detail?.unitType ?? "資料確認中";
                          const unitArea = detail?.area ?? cell.label;
                          const unitPrice = formatPrice(detail?.priceManYen ?? null);

                          if (!cell.selectable) {
                            return (
                              <td
                                key={cell.roomCode}
                                colSpan={cell.colSpan ?? 1}
                                title={`${floor}階`}
                                className={[
                                  "h-16 border border-slate-500 bg-[#f4f4f4] px-1 text-center text-sm font-semibold",
                                  crossHighlight ? "shadow-[inset_0_0_0_1px_rgba(47,109,146,0.45)]" : "",
                                ].join(" ")}
                              >
                                {cell.label}
                              </td>
                            );
                          }

                          return (
                            <td key={cell.roomCode} colSpan={cell.colSpan ?? 1} className="h-16 p-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveRankIndex(guidedRankIndex);
                                  updateWishFilter(guidedRankIndex, {
                                    district: activeDistrict,
                                    building: activeBuilding,
                                    floor,
                                  });
                                  applyWish(guidedRankIndex, unitNumber);
                                  setSelectedRoomCode(unitNumber);
                                }}
                                onMouseEnter={() => setHoveredCell({ floor, start: colStart, end: colEnd })}
                                onMouseLeave={() => setHoveredCell(null)}
                                onFocus={() => setHoveredCell({ floor, start: colStart, end: colEnd })}
                                onBlur={() => setHoveredCell(null)}
                                title={`${floor}階 / ${unitNumber}`}
                                aria-label={`${floor}階 ${unitNumber}`}
                                className={[
                                  "relative h-16 w-full cursor-pointer px-1 py-1 text-left text-[10px] leading-3 transition",
                                  BAND_META[cell.band].tile,
                                  BAND_META[cell.band].text,
                                  BAND_META[cell.band].border,
                                  borderWidth,
                                  isPicked ? "ring-2 ring-[#d73a49] border-[#d73a49]" : "",
                                  crossHighlight ? "shadow-[inset_0_0_0_1px_rgba(47,109,146,0.55)]" : "",
                                ].join(" ")}
                              >
                                <div className="font-bold">{unitNumber}</div>
                                <div>{unitType}</div>
                                <div>{unitArea}</div>
                                <div>{unitPrice}</div>
                                <span className="absolute -left-1 -top-1 z-10 rounded-full bg-[#0d1f3f] px-1.5 text-[11px] font-bold text-white">
                                  {count}
                                </span>
                                {selectedRank ? (
                                  <span className="absolute -right-1.5 -top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#d73a49] text-base font-extrabold leading-none text-white shadow">
                                    {selectedRank}
                                  </span>
                                ) : null}
                              </button>
                            </td>
                          );
                        });
                        })()}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <aside className="flex flex-col">
                <div className="rounded border border-slate-300 bg-white p-3 text-sm">
                  <p className="font-semibold text-slate-700">表示名（星座匿名）</p>
                  <p className="mt-1 text-slate-900">{aliasWithWishes}</p>
                  <p className="mt-2 text-xs text-slate-500">最終保存: {savedAt.toLocaleTimeString("ja-JP")}</p>
                </div>
                <div className="mt-3 rounded border-2 border-[#7ea5c6] bg-white p-4 text-sm shadow-sm">
                  <p className="text-base font-bold text-[#2f5f84]">選択中住戸の詳細</p>
                  {selectedRoomDetail ? (
                    <dl className="mt-2 space-y-2 text-slate-900">
                      <div>
                        <dt className="text-xs text-slate-500">住戸番号</dt>
                        <dd className="text-lg font-extrabold">{selectedRoomDetail.unitNumber}</dd>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                        <dt className="text-xs text-slate-500">住戸タイプ</dt>
                          <dd className="font-semibold">{selectedRoomDetail.unitType}</dd>
                        </div>
                        <div>
                        <dt className="text-xs text-slate-500">面積</dt>
                          <dd className="font-semibold">{selectedRoomDetail.area}</dd>
                        </div>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">予定価格</dt>
                        <dd className="text-lg font-bold text-[#1f5a7d]">{formatPrice(selectedRoomDetail.priceManYen)}</dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">図面の住戸セルをクリックすると詳細を表示します。</p>
                  )}
                </div>
              </aside>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_280px]">
        <article className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
          <p className="text-sm font-bold text-slate-900">希望順位（ドラッグで並び替え）</p>
          <p className="mt-1 text-xs text-slate-500">編集中の希望: {guidedRankIndex + 1}</p>
          <p className="mt-1 text-xs font-semibold text-[#2f5f84]">{selectionGuideMessage}</p>
          <div className="mt-3 space-y-2">
            {wishes.map((roomCode, index) => (
              (() => {
                const detail = roomCode ? allUnitDetailsByUnitNumber.get(roomCode) ?? null : null;
                const band = areaBandFromAreaLabel(detail?.area);
                const roomToneClass = band
                  ? `${BAND_META[band].tile} ${BAND_META[band].text} ${BAND_META[band].border}`
                  : "bg-slate-100 text-slate-600 border-slate-300";
                const roomReadableLabel = roomCode ? formatChatRoomMeta(roomCode) : null;
                return (
              <RankCard
                key={`rank-${index}`}
                rank={index + 1}
                roomCode={roomCode}
                roomReadableLabel={roomReadableLabel}
                roomToneClass={roomToneClass}
                active={activeRankIndex === index}
                onActivate={() => setActiveRankIndex(index)}
                onRemove={() => applyWish(index, null)}
                onDragStart={() => setDragSourceRankIndex(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (dragSourceRankIndex === null || dragSourceRankIndex === index) return;
                  setWishes((previous) => reorder(previous, dragSourceRankIndex, index));
                  setDragSourceRankIndex(null);
                  setSubmitMessage(null);
                  setSavedAt(new Date());
                }}
              />
                );
              })()
            ))}
          </div>
          {warningMessage ? <p className="mt-2 text-xs font-semibold text-rose-700">{warningMessage}</p> : null}
        </article>

        <aside className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
          <p className="text-sm font-bold text-slate-900">住戸面積</p>
          <div className="mt-3 overflow-hidden rounded border border-slate-500">
            {([35, 40, 50, 60, 70, 80] as AreaBand[]).map((band) => (
              <div key={band} className={`grid grid-cols-[1fr_auto] border-b border-slate-500 px-3 py-2 text-sm last:border-b-0 ${BAND_META[band].tile} ${BAND_META[band].text}`}>
                <span>{band}㎡</span>
                <span>台</span>
              </div>
            ))}
            <div className="grid grid-cols-[1fr_auto] bg-[#e3e3e3] px-3 py-2 font-semibold text-slate-700">
              <span>共用部</span>
              <span />
            </div>
          </div>
        </aside>
      </section>

      <section className="mt-4 rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
        <p className="text-sm font-bold text-slate-900">希望順位ごとの対話チャット部屋</p>
        <p className="mt-1 text-xs text-slate-500">
          ここに表示される3つは「あなたの希望部屋で協議するチャット部屋」です。 部屋別チャットは全住戸分あり、現在 {totalRoomChatCount} 部屋あります。
        </p>
        {chatStatsError ? <p className="mt-2 text-xs font-semibold text-rose-700">{chatStatsError}</p> : null}
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {wishes.map((roomCode, index) => {
            const chatEntry = roomChatEntries[index];
            if (!chatEntry || !roomCode) {
              return (
                <div
                  key={`chat-rank-${index + 1}`}
                  className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-left text-sm text-slate-500"
                >
                  <p className="text-xs font-semibold text-slate-500">第{index + 1}希望チャット</p>
                  <p className="mt-1 text-xs">部屋を選ぶと、その部屋番号のチャットへ入れます。</p>
                  <div className="mt-2 rounded-lg border border-slate-300 bg-slate-200 px-3 py-2 text-center text-sm font-semibold text-slate-500">
                    部屋番号のチャットに入る（未選択）
                  </div>
                  <div className="mt-2 border-t border-slate-300 pt-2">
                    <p className="text-xs font-semibold text-slate-500">この部屋で話し合う人の状況</p>
                    <p className="mt-1 text-xs">部屋を選択すると表示されます。</p>
                  </div>
                </div>
              );
            }

            const wishCount = wishDemandByRoom[chatEntry.roomCode] ?? 0;
            const summary = chatSummaryByRoomScope[chatEntry.roomScope];
            const participantCount = summary?.participantCount ?? 0;
            const logCount = summary?.messageCount ?? 0;
            const roomDetail = allUnitDetailsByUnitNumber.get(chatEntry.roomCode) ?? null;
            const areaBand = areaBandFromAreaLabel(roomDetail?.area);
            const areaStyle = areaBand ? BAND_META[areaBand] : null;
            const readableRoomMeta = formatChatRoomMeta(chatEntry.roomCode);
            const areaText = roomDetail?.area ?? "資料確認中";
            const priceText = formatPrice(roomDetail?.priceManYen ?? null);
            const joinLabel = formatChatJoinLabel(chatEntry.roomCode);

            return (
              <div key={`chat-rank-${index + 1}`} className="rounded-xl border border-[#f3b7be] bg-[#fff5f6] px-3 py-2">
                <p className="text-xs font-semibold text-[#8f2a35]">第{index + 1}希望チャット</p>
                <p className="mt-1 text-xs text-[#8f2a35]">部屋番号を確認して、その部屋のチャットへ入ります。</p>
                <Link
                  href={chatEntry.href}
                  className={[
                    "mt-2 block cursor-pointer rounded-lg border px-3 py-2 text-left transition",
                    areaStyle
                      ? `${areaStyle.tile} ${areaStyle.text} ${areaStyle.border} hover:brightness-95`
                      : "border-[#d73a49] bg-white text-[#b22735] hover:bg-[#ffecee]",
                  ].join(" ")}
                >
                  <p className="text-center text-sm font-bold">{joinLabel}</p>
                  <p className="mt-1 text-xs font-semibold">対象住戸: {chatEntry.roomCode}</p>
                </Link>
                <p className="mt-1 text-xs text-[#6d1c2a]">部屋情報: {readableRoomMeta} / {areaText} / {priceText}</p>
                <div className="mt-2 border-t border-[#f3b7be] pt-2">
                  <p className="text-xs font-semibold text-[#6d1c2a]">この部屋で話し合う人の状況</p>
                  <p className="mt-1 text-xs text-[#6d1c2a]">希望者数 {wishCount}人 / 参加者 {participantCount}人 / 過去ログ {logCount}件</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3">
          <Link
            href="/units/chat?scope=global"
            className="inline-flex cursor-pointer rounded-xl border border-[#2f6d92] bg-[#eef6fc] px-3 py-2 text-sm font-semibold text-[#1f5a7d] transition hover:bg-[#e1f0fb]"
          >
            全体チャット（使い方相談・質問）に入る
          </Link>
        </div>
      </section>

      <footer className="mt-4 flex flex-wrap gap-2 text-sm">
        <Link href="/" className="cursor-pointer rounded-full border border-slate-300 bg-white px-4 py-1.5 text-slate-700">
          ホームへ戻る
        </Link>
        <Link href="/overview" className="cursor-pointer rounded-full border border-slate-300 bg-white px-4 py-1.5 text-slate-700">
          人気ヒートマップを見る
        </Link>
      </footer>
    </main>
  );
}

export function BuildingUnitsPageView({ building }: { building: BuildingId }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <section className="rounded-2xl border border-slate-300 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">{building}棟個別ページはモック段階では簡略化しています。</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">住戸選択モックへ統合済み</h1>
        <p className="mt-2 text-sm text-slate-700">希望住戸の選択は住戸選択モック画面で一括操作してください（最大3件）。</p>
        <Link href="/units" className="mt-4 inline-flex rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
          住戸選択モックに戻る
        </Link>
      </section>
    </main>
  );
}
