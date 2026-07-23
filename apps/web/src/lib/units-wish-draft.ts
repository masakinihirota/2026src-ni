const UNITS_WISH_DRAFT_STORAGE_PREFIX = "units-page:wish-draft:";
const UNITS_WISH_DRAFT_VERSION = 1;
const MIN_WISH_SLOTS = 1;
const MAX_WISH_SLOTS = 3;

export type UnitsWishDraft = {
  version: number;
  selectedRoomCode: string;
  activeRankIndex: number;
  wishes: (string | null)[];
  submittedWishes: (string | null)[];
  savedAt: string;
};

function unitsWishDraftStorageKey(userId: string): string {
  return `${UNITS_WISH_DRAFT_STORAGE_PREFIX}${userId}`;
}

function normalizeWishes(raw: unknown, preferredCount?: number): (string | null)[] {
  const source = Array.isArray(raw) ? raw : [];
  const slotCount = Math.min(MAX_WISH_SLOTS, Math.max(MIN_WISH_SLOTS, preferredCount ?? source.length));
  const normalized = Array.from({ length: slotCount }, (_, index) => {
    const value = source[index];
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed || null;
  });

  const seen = new Set<string>();
  return normalized.map((value) => {
    if (!value) return null;
    if (seen.has(value)) return null;
    seen.add(value);
    return value;
  });
}

export function getStoredUnitsWishDraft(userId: string): UnitsWishDraft | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(unitsWishDraftStorageKey(userId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<UnitsWishDraft>;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.version !== UNITS_WISH_DRAFT_VERSION) return null;

    const wishes = normalizeWishes(parsed.wishes);
    const slotCount = wishes.length;
    const submittedWishes = normalizeWishes(parsed.submittedWishes, slotCount);
    const selectedRoomCode = typeof parsed.selectedRoomCode === "string" ? parsed.selectedRoomCode.trim() : "";
    const activeRankIndexRaw = typeof parsed.activeRankIndex === "number" ? parsed.activeRankIndex : 0;
    const activeRankIndex = Math.max(0, Math.min(slotCount - 1, Math.floor(activeRankIndexRaw)));
    const savedAtDate = typeof parsed.savedAt === "string" ? new Date(parsed.savedAt) : null;

    return {
      version: UNITS_WISH_DRAFT_VERSION,
      selectedRoomCode,
      activeRankIndex,
      wishes,
      submittedWishes,
      savedAt:
        savedAtDate && !Number.isNaN(savedAtDate.getTime())
          ? savedAtDate.toISOString()
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function createEmptyWishes(count = MIN_WISH_SLOTS): (string | null)[] {
  return Array.from({ length: count }, () => null);
}

export function upsertStoredUnitsWishDraft(params: {
  userId: string;
  rankIndex: number;
  unitId: string;
}): UnitsWishDraft | null {
  if (typeof window === "undefined") return null;
  const { userId, rankIndex, unitId } = params;
  const trimmedUnitId = unitId.trim();
  if (!trimmedUnitId) return null;
  if (rankIndex < 0 || rankIndex >= MAX_WISH_SLOTS) return null;

  const existing = getStoredUnitsWishDraft(userId);
  const slotCount = Math.max(existing?.wishes.length ?? MIN_WISH_SLOTS, rankIndex + 1);
  const wishes = normalizeWishes(existing?.wishes ?? createEmptyWishes(slotCount), slotCount);
  const submittedWishes = normalizeWishes(existing?.submittedWishes ?? createEmptyWishes(slotCount), slotCount);

  const duplicateIndex = wishes.findIndex((value, index) => value === trimmedUnitId && index !== rankIndex);
  if (duplicateIndex >= 0) {
    const current = wishes[rankIndex] ?? null;
    wishes[duplicateIndex] = current;
  }
  wishes[rankIndex] = trimmedUnitId;

  const next: UnitsWishDraft = {
    version: UNITS_WISH_DRAFT_VERSION,
    selectedRoomCode: trimmedUnitId,
    activeRankIndex: rankIndex,
    wishes,
    submittedWishes,
    savedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(unitsWishDraftStorageKey(userId), JSON.stringify(next));
  return next;
}
