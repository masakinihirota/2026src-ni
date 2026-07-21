"use client";

import { useEffect, useMemo, useState } from "react";

import { BUILDINGS, UNITS } from "@/lib/housing-data";

type PopularityScope = "firstOnly" | "firstTwo" | "firstThree";

type PopularityEntry = {
  unitId: string;
  count: number;
};

type PopularityResponse = {
  totalSessions: number;
  entriesByScope: Record<PopularityScope, PopularityEntry[]>;
};

const SCOPE_OPTIONS: { key: PopularityScope; label: string; caption: string }[] = [
  { key: "firstOnly", label: "第1希望のみ", caption: "第1希望として選ばれた数だけを表示" },
  { key: "firstTwo", label: "第1+第2希望", caption: "第1希望と第2希望の合計で表示" },
  { key: "firstThree", label: "第1〜第3希望", caption: "第1〜第3希望すべての合計で表示" },
];

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

function formatScopeLabel(scope: PopularityScope): string {
  const option = SCOPE_OPTIONS.find((item) => item.key === scope);
  return option?.label ?? "不明";
}

export function OverviewPageView() {
  const [entriesByScope, setEntriesByScope] = useState<Record<PopularityScope, PopularityEntry[]>>({
    firstOnly: [],
    firstTwo: [],
    firstThree: [],
  });
  const [totalSessions, setTotalSessions] = useState(0);
  const [scope, setScope] = useState<PopularityScope>("firstOnly");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

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

  const activeEntries = useMemo(() => entriesByScope[scope] ?? [], [entriesByScope, scope]);

  const countMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of activeEntries) {
      map.set(e.unitId, e.count);
    }
    return map;
  }, [activeEntries]);

  const max = useMemo(() => Math.max(0, ...activeEntries.map((e) => e.count)), [activeEntries]);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8">
      <header className="mb-6 rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">画面2: 団地全体の人気可視化</p>
        <h1 className="text-2xl font-bold text-slate-900">団地全体ヒートマップ（草マップ）</h1>
        <p className="mt-2 text-sm text-slate-600">
          1住戸=1ブロックで表示します。色が濃いほど希望人数が多い状態です。集計セッション数: {totalSessions}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {SCOPE_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setScope(option.key)}
              className={[
                "rounded-full border px-3 py-1.5 text-sm font-semibold transition",
                scope === option.key
                  ? "border-emerald-700 bg-emerald-700 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
              ].join(" ")}
            >
              {option.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void fetchPopularity()}
            className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            {loading ? "更新中..." : "最新情報に更新"}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          表示モード: {formatScopeLabel(scope)} / {SCOPE_OPTIONS.find((option) => option.key === scope)?.caption}
        </p>
        <p className="mt-1 text-xs text-slate-500">最終更新: {lastUpdatedAt ? lastUpdatedAt.toLocaleTimeString("ja-JP") : "未取得"}</p>
        {error ? <p className="mt-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}
      </header>

      <section className="mb-4 flex items-center justify-end gap-3 text-xs text-slate-600">
        <span>少</span>
        <div className="h-3 w-3 rounded-[2px] bg-[#ebedf0]" />
        <div className="h-3 w-3 rounded-[2px] bg-[#c6e48b]" />
        <div className="h-3 w-3 rounded-[2px] bg-[#7bc96f]" />
        <div className="h-3 w-3 rounded-[2px] bg-[#239a3b]" />
        <div className="h-3 w-3 rounded-[2px] bg-[#196127]" />
        <span>多</span>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {BUILDINGS.map((building) => {
          const units = UNITS.filter((unit) => unit.building === building).sort(
            (a, b) => b.floor - a.floor || a.line.localeCompare(b.line),
          );

          return (
            <article key={building} className="rounded-2xl border border-slate-300 bg-slate-50 p-4">
              <h2 className="mb-3 text-lg font-semibold text-slate-900">{building}棟</h2>
              <div className="grid grid-cols-8 gap-1">
                {units.map((unit) => {
                  const count = countMap.get(unit.id) ?? 0;
                  return (
                    <div
                      key={unit.id}
                      title={`${unit.id} / 希望 ${count}件`}
                      className="flex h-5 w-5 items-center justify-center rounded-[2px] text-[10px] font-bold text-slate-900"
                      style={{ background: colorFor(count, max) }}
                    >
                      {count > 0 ? count : ""}
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
