"use client";

import { useEffect, useMemo, useState } from "react";

import { FLOOR_LIST, buildPlanForBuilding } from "@/lib/building-plan";
import { BUILDINGS, type BuildingId } from "@/lib/housing-data";
import { PDF_UNIT_RECORDS } from "@/lib/unit-price-data";
import { getStoredUnitsWishDraft, upsertStoredUnitsWishDraft } from "@/lib/units-wish-draft";
import { useStoredUserProfile } from "@/lib/use-stored-user-profile";

type PopularityScope = "firstOnly" | "firstTwo" | "firstThree";
type RankKey = "first" | "second" | "third";

type PopularityEntry = {
  unitId: string;
  count: number;
};

type PopularityResponse = {
  totalSessions: number;
  entriesByScope: Record<PopularityScope, PopularityEntry[]>;
};

const RANK_KEYS: RankKey[] = ["first", "second", "third"];
const RANK_LABEL: Record<RankKey, string> = {
  first: "第1希望",
  second: "第2希望",
  third: "第3希望",
};

function colorFor(count: number, max: number): string {
  if (max <= 0 || count <= 0) {
    return "#ebedf0";
  }

  const ratio = count / max;
  if (ratio >= 0.8) return "#196127";
  if (ratio >= 0.55) return "#239a3b";
  if (ratio >= 0.3) return "#7bc96f";
  return "#c6e48b";
}

function areaFromLabel(label: string): number | null {
  const matched = label.match(/(\d+(?:\.\d+)?)/);
  if (!matched) return null;
  return Number(matched[1]);
}

function toBuildingIdFromUnitNumber(unitNumber: string): BuildingId | null {
  const matched = unitNumber.match(/^([NS])([1-4])-/);
  if (!matched) return null;
  return `${matched[1]}-${matched[2]}` as BuildingId;
}

function toCountMap(entries: PopularityEntry[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const entry of entries) {
    map.set(entry.unitId, entry.count);
  }
  return map;
}

function subtractCounts(base: Map<string, number>, diff: Map<string, number>): Map<string, number> {
  const keys = new Set<string>([...base.keys(), ...diff.keys()]);
  const map = new Map<string, number>();
  for (const key of keys) {
    const count = Math.max(0, (base.get(key) ?? 0) - (diff.get(key) ?? 0));
    if (count > 0) {
      map.set(key, count);
    }
  }
  return map;
}

function mergeCounts(...maps: Map<string, number>[]): Map<string, number> {
  const result = new Map<string, number>();
  for (const map of maps) {
    for (const [key, count] of map.entries()) {
      result.set(key, (result.get(key) ?? 0) + count);
    }
  }
  return result;
}

function addOneCountPerUnit(base: Map<string, number>, unitIds: string[]): Map<string, number> {
  const next = new Map(base);
  for (const unitId of unitIds) {
    if (!unitId) continue;
    next.set(unitId, (next.get(unitId) ?? 0) + 1);
  }
  return next;
}

function formatPrice(priceManYen: number | null | undefined): string {
  if (typeof priceManYen !== "number") return "資料確認中";
  return `${priceManYen.toLocaleString("ja-JP")}万円`;
}

function borderColorForBand(band: number): string {
  if (band === 35) return "#94a3b8";
  if (band === 40) return "#c9a4bc";
  if (band === 50) return "#d2ab42";
  if (band === 60) return "#9f88b1";
  if (band === 70) return "#90adcc";
  return "#97b97d";
}

type BuildingShape = {
  building: BuildingId;
  plan: ReturnType<typeof buildPlanForBuilding>;
  columnCount: number;
  unitNumberByRoomCode: Map<string, string>;
};

function buildBuildingShape(building: BuildingId): BuildingShape {
  const plan = buildPlanForBuilding(building);
  const recordsByFloor = new Map<number, { unitNumber: string; area: string | null }[]>();

  for (const record of PDF_UNIT_RECORDS) {
    if (toBuildingIdFromUnitNumber(record.unitNumber) !== building) continue;
    const floorRecords = recordsByFloor.get(record.floor) ?? [];
    floorRecords.push({ unitNumber: record.unitNumber, area: record.area });
    recordsByFloor.set(record.floor, floorRecords);
  }

  for (const floorRecords of recordsByFloor.values()) {
    floorRecords.sort((a, b) => a.unitNumber.localeCompare(b.unitNumber, "ja-JP"));
  }

  const unitNumberByRoomCode = new Map<string, string>();
  for (const floor of FLOOR_LIST) {
    const records = recordsByFloor.get(floor) ?? [];
    const used = new Set<number>();
    const cells = (plan[floor] ?? []).filter((cell): cell is NonNullable<(typeof plan)[number][number]> => Boolean(cell?.selectable));
    for (const cell of cells) {
      const cellArea = areaFromLabel(cell.label);
      const matchedIndex = records.findIndex((record, index) => {
        if (used.has(index)) return false;
        const recordArea = areaFromLabel(record.area ?? "");
        return cellArea !== null && recordArea !== null && Math.abs(cellArea - recordArea) < 0.01;
      });
      const fallbackIndex = records.findIndex((_, index) => !used.has(index));
      const pickedIndex = matchedIndex >= 0 ? matchedIndex : fallbackIndex;
      const unitNumber = pickedIndex >= 0 ? records[pickedIndex]?.unitNumber : null;
      if (pickedIndex >= 0) used.add(pickedIndex);
      unitNumberByRoomCode.set(cell.roomCode, unitNumber ?? cell.roomCode);
    }
  }

  const columnCount = Math.max(
    ...FLOOR_LIST.map((floor) => (plan[floor] ?? []).reduce((sum, cell) => sum + (cell?.colSpan ?? 1), 0)),
  );

  return { building, plan, columnCount, unitNumberByRoomCode };
}

type HeatmapSectionProps = {
  title: string;
  caption: string;
  buildings: BuildingShape[];
  countByUnitId: Map<string, number>;
  onUnitClick?: (unitId: string) => void;
};

function HeatmapSection({ title, caption, buildings, countByUnitId, onUnitClick }: HeatmapSectionProps) {
  const max = useMemo(() => {
    let highest = 0;
    for (const building of buildings) {
      for (const floor of FLOOR_LIST) {
        for (const cell of building.plan[floor] ?? []) {
          if (!cell?.selectable) continue;
          const unitNumber = building.unitNumberByRoomCode.get(cell.roomCode) ?? cell.roomCode;
          highest = Math.max(highest, countByUnitId.get(unitNumber) ?? 0);
        }
      }
    }
    return highest;
  }, [buildings, countByUnitId]);

  return (
    <section className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-600">{caption}</p>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        {buildings.map((building) => (
          <article key={building.building} className="rounded-xl border border-slate-300 bg-slate-50 p-3">
            <h3 className="mb-2 text-sm font-bold text-slate-900">{building.building}棟</h3>
            <table className="table-fixed border-separate border-spacing-0">
              <colgroup>
                <col className="w-8" />
                {Array.from({ length: building.columnCount }).map((_, index) => (
                  <col key={`${building.building}-col-${index}`} className="w-6" />
                ))}
              </colgroup>
              <tbody>
                {FLOOR_LIST.map((floor) => (
                  <tr key={`${building.building}-${floor}`}>
                    <td className="pr-1 text-right text-[10px] font-semibold text-slate-500">{floor}</td>
                    {(building.plan[floor] ?? []).map((cell, index) => {
                      if (!cell) {
                        return <td key={`void-${building.building}-${floor}-${index}`} className="h-4" />;
                      }
                      if (!cell.selectable) {
                        return (
                          <td
                            key={cell.roomCode}
                            colSpan={cell.colSpan ?? 1}
                            className="h-4 border border-slate-200 bg-slate-100"
                          />
                        );
                      }
                      const unitNumber = building.unitNumberByRoomCode.get(cell.roomCode) ?? cell.roomCode;
                      const count = countByUnitId.get(unitNumber) ?? 0;
                      const borderColor = borderColorForBand(cell.band);
                      return (
                        <td key={cell.roomCode} colSpan={cell.colSpan ?? 1} className="p-0.5">
                          {onUnitClick ? (
                            <button
                              type="button"
                              onClick={() => onUnitClick(unitNumber)}
                              title={`${unitNumber} / 希望 ${count}件`}
                              className="block h-4 w-full rounded-[2px] border transition hover:ring-2 hover:ring-[#2f6d92]"
                              style={{ background: colorFor(count, max), borderColor }}
                            />
                          ) : (
                            <div
                              title={`${unitNumber} / 希望 ${count}件`}
                              className="h-4 rounded-[2px] border"
                              style={{ background: colorFor(count, max), borderColor }}
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        ))}
      </div>
    </section>
  );
}

export function OverviewPageView() {
  const profile = useStoredUserProfile();
  const [entriesByScope, setEntriesByScope] = useState<Record<PopularityScope, PopularityEntry[]>>({
    firstOnly: [],
    firstTwo: [],
    firstThree: [],
  });
  const [totalSessions, setTotalSessions] = useState(0);
  const [enabledRanks, setEnabledRanks] = useState<Record<RankKey, boolean>>({
    first: true,
    second: true,
    third: true,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [activeWishRankIndex, setActiveWishRankIndex] = useState(0);
  const [wishDraftVersion, setWishDraftVersion] = useState(0);

  async function fetchPopularity(options?: { silent?: boolean }): Promise<void> {
    if (!options?.silent) {
      setLoading(true);
      setError(null);
    }

    try {
      const res = await fetch("/api/wishes/popularity", { cache: "no-store" });
      const json = (await res.json()) as { success?: boolean; data?: PopularityResponse; error?: { message?: string } };

      if (!res.ok || !json.success || !json.data) {
        setError(json.error?.message ?? "人気集計の取得に失敗しました。");
        return;
      }

      setEntriesByScope(json.data.entriesByScope);
      setTotalSessions(json.data.totalSessions);
      setLastUpdatedAt(new Date());
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "通信エラーが発生しました。";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;

    const request = fetch("/api/wishes/popularity", { cache: "no-store" })
      .then(async (res) => {
        const json = (await res.json()) as { success?: boolean; data?: PopularityResponse; error?: { message?: string } };
        if (!alive) return;
        if (!res.ok || !json.success || !json.data) {
          setError(json.error?.message ?? "人気集計の取得に失敗しました。");
          return;
        }
        setEntriesByScope(json.data.entriesByScope);
        setTotalSessions(json.data.totalSessions);
        setLastUpdatedAt(new Date());
      })
      .catch((requestError: unknown) => {
        if (!alive) return;
        const message = requestError instanceof Error ? requestError.message : "通信エラーが発生しました。";
        setError(message);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    void request;
    return () => {
      alive = false;
    };
  }, []);

  const buildingShapes = useMemo(() => BUILDINGS.map((building) => buildBuildingShape(building)), []);

  const firstOnlyMap = useMemo(() => toCountMap(entriesByScope.firstOnly), [entriesByScope.firstOnly]);
  const firstTwoMap = useMemo(() => toCountMap(entriesByScope.firstTwo), [entriesByScope.firstTwo]);
  const firstThreeMap = useMemo(() => toCountMap(entriesByScope.firstThree), [entriesByScope.firstThree]);

  const secondOnlyMap = useMemo(() => subtractCounts(firstTwoMap, firstOnlyMap), [firstTwoMap, firstOnlyMap]);
  const thirdOnlyMap = useMemo(() => subtractCounts(firstThreeMap, firstTwoMap), [firstThreeMap, firstTwoMap]);

  const ownWishSlots = useMemo(() => {
    void wishDraftVersion;
    if (!profile) return [];
    const draft = getStoredUnitsWishDraft(profile.userId);
    if (!draft) return [null, null, null] as (string | null)[];
    const slots = [draft.wishes[0] ?? null, draft.wishes[1] ?? null, draft.wishes[2] ?? null];
    return slots;
  }, [profile, wishDraftVersion]);

  const ownWishByRank = useMemo(
    () => ({
      first: ownWishSlots[0] ? [ownWishSlots[0]] : [],
      second: ownWishSlots[1] ? [ownWishSlots[1]] : [],
      third: ownWishSlots[2] ? [ownWishSlots[2]] : [],
    }),
    [ownWishSlots],
  );

  const mergedByToggle = useMemo(() => {
    const selected: Map<string, number>[] = [];
    if (enabledRanks.first) selected.push(firstOnlyMap);
    if (enabledRanks.second) selected.push(secondOnlyMap);
    if (enabledRanks.third) selected.push(thirdOnlyMap);
    const merged = mergeCounts(...selected);
    const ownUnits: string[] = [];
    if (enabledRanks.first) ownUnits.push(...ownWishByRank.first);
    if (enabledRanks.second) ownUnits.push(...ownWishByRank.second);
    if (enabledRanks.third) ownUnits.push(...ownWishByRank.third);
    return addOneCountPerUnit(merged, ownUnits);
  }, [enabledRanks, firstOnlyMap, ownWishByRank, secondOnlyMap, thirdOnlyMap]);

  const ownWishDetailMap = useMemo(() => {
    const map = new Map<string, { unitType: string | null; area: string | null; priceManYen: number | null }>();
    for (const record of PDF_UNIT_RECORDS) {
      map.set(record.unitNumber, {
        unitType: record.unitType,
        area: record.area,
        priceManYen: record.priceManYen,
      });
    }
    return map;
  }, []);

  function toggleRank(rank: RankKey): void {
    setEnabledRanks((prev) => ({
      ...prev,
      [rank]: !prev[rank],
    }));
  }

  function handleUnitClick(unitId: string): void {
    if (!profile) return;
    const next = upsertStoredUnitsWishDraft({
      userId: profile.userId,
      rankIndex: activeWishRankIndex,
      unitId,
    });
    if (!next) return;
    setWishDraftVersion((previous) => previous + 1);
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8">
      <header className="mb-6 rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">画面2: 団地全体の人気可視化</p>
        <h1 className="text-2xl font-bold text-slate-900">団地全体ヒートマップ（草マップ）</h1>
        <p className="mt-2 text-sm text-slate-600">
          1住戸=1ブロックで表示します。色が濃いほど希望人数が多い状態です。集計セッション数: {totalSessions}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {RANK_KEYS.map((rank) => (
            <button
              key={rank}
              type="button"
              onClick={() => toggleRank(rank)}
              className={[
                "rounded-full border px-3 py-1.5 text-sm font-semibold transition",
                enabledRanks[rank]
                  ? "border-emerald-700 bg-emerald-700 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
              ].join(" ")}
            >
              {RANK_LABEL[rank]} {enabledRanks[rank] ? "ON" : "OFF"}
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void fetchPopularity()}
            className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            {loading ? "更新中..." : "最新情報に更新"}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">デフォルト表示: 合計（第1〜第3希望 ON）</p>
        <p className="mt-1 text-xs text-slate-500">ログイン中ユーザーの希望住戸は、順位ONの範囲でヒートマップに +1 加算して表示します。</p>
        <p className="mt-1 text-xs text-slate-500">最終更新: {lastUpdatedAt ? lastUpdatedAt.toLocaleTimeString("ja-JP") : "未取得"}</p>
        {error ? <p className="mt-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}
      </header>

      <section className="mb-4 rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900">あなたの希望住戸（ログイン中）</h2>
        {!profile ? (
          <p className="mt-2 text-sm text-slate-600">ログインすると、あなたの希望住戸をここに表示します。</p>
        ) : ownWishSlots.every((unitId) => unitId === null) ? (
          <p className="mt-2 text-sm text-slate-600">住戸選択画面で希望住戸を選ぶと、この画面にも反映されます。</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {ownWishSlots.map((unitId, index) => {
              if (!unitId) return null;
              const detail = ownWishDetailMap.get(unitId);
              return (
                <li key={`${unitId}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
                  <span className="font-semibold">第{index + 1}希望</span>: {unitId}
                  <span className="ml-2 text-xs text-slate-600">
                    {detail?.unitType ?? "資料確認中"} / {detail?.area ?? "資料確認中"} / {formatPrice(detail?.priceManYen)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {profile ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-700">クリック時に変更する希望枠:</span>
            {[0, 1, 2].map((index) => (
              <button
                key={index}
                type="button"
                onClick={() => setActiveWishRankIndex(index)}
                className={[
                  "rounded-full border px-3 py-1 font-semibold transition",
                  activeWishRankIndex === index
                    ? "border-[#2f6d92] bg-[#2f6d92] text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
                ].join(" ")}
              >
                第{index + 1}希望
              </button>
            ))}
            <span className="text-slate-600">ヒートマップの部屋をクリックすると選択中の希望枠に反映されます。</span>
          </div>
        ) : null}
      </section>

      <section className="mb-4 flex items-center justify-end gap-3 text-xs text-slate-600">
        <span>少</span>
        <div className="h-3 w-3 rounded-[2px] bg-[#ebedf0]" />
        <div className="h-3 w-3 rounded-[2px] bg-[#c6e48b]" />
        <div className="h-3 w-3 rounded-[2px] bg-[#7bc96f]" />
        <div className="h-3 w-3 rounded-[2px] bg-[#239a3b]" />
        <div className="h-3 w-3 rounded-[2px] bg-[#196127]" />
        <span>多</span>
      </section>

      <HeatmapSection
        title="希望順位ヒートマップ（組み合わせ表示）"
        caption={`表示中: ${RANK_KEYS.filter((rank) => enabledRanks[rank]).map((rank) => RANK_LABEL[rank]).join(" + ") || "すべてOFF"}`}
        buildings={buildingShapes}
        countByUnitId={mergedByToggle}
        onUnitClick={profile ? handleUnitClick : undefined}
      />
    </main>
  );
}
