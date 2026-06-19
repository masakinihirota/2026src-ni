"use client";

import { useEffect, useMemo, useState } from "react";

import { BUILDINGS, UNITS } from "@/lib/housing-data";

type PopularityEntry = {
  unitId: string;
  count: number;
};

function colorFor(count: number, max: number): string {
  if (max <= 0 || count <= 0) {
    return "#e2e8f0";
  }

  const ratio = count / max;
  if (ratio > 0.8) return "#dc2626";
  if (ratio > 0.55) return "#ea580c";
  if (ratio > 0.3) return "#d97706";
  return "#65a30d";
}

export default function OverviewPage() {
  const [entries, setEntries] = useState<PopularityEntry[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);

  useEffect(() => {
    let alive = true;

    async function fetchPopularity() {
      try {
        const res = await fetch("/api/wishes/popularity", { cache: "no-store" });
        if (!res.ok) return;

        const json = await res.json();
        if (!alive || !json?.success) return;

        setEntries(json.data.entries ?? []);
        setTotalSessions(json.data.totalSessions ?? 0);
      } catch {
        // no-op
      }
    }

    void fetchPopularity();
    return () => {
      alive = false;
    };
  }, []);

  const countMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) {
      map.set(e.unitId, e.count);
    }
    return map;
  }, [entries]);

  const max = useMemo(() => Math.max(0, ...entries.map((e) => e.count)), [entries]);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8">
      <header className="mb-6 rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">画面2: 団地全体の人気可視化</p>
        <h1 className="text-2xl font-bold text-slate-900">団地全体ヒートマップ</h1>
        <p className="mt-2 text-sm text-slate-600">
          色が濃いほど希望数が多い状態です。全体の人気傾向を一目で確認できます。集計セッション数: {totalSessions}
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {BUILDINGS.map((building) => {
          const units = UNITS.filter((unit) => unit.building === building);

          return (
            <article key={building} className="rounded-2xl border border-slate-300 bg-slate-50 p-4">
              <h2 className="mb-3 text-lg font-semibold text-slate-900">{building}棟</h2>
              <div className="grid grid-cols-4 gap-1.5">
                {units.map((unit) => {
                  const count = countMap.get(unit.id) ?? 0;
                  return (
                    <div
                      key={unit.id}
                      title={`${unit.id} / 希望 ${count}件`}
                      className="h-8 rounded"
                      style={{ background: colorFor(count, max) }}
                    />
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
