"use client";

import { useMemo, useState } from "react";

import { BUILDINGS, type BuildingId, getUnitsByBuildingAndPage, type Unit } from "@/lib/housing-data";

const SESSION_STORAGE_KEY = "housing-demo-session";
const SELECTED_STORAGE_KEY = "housing-demo-selected";

function makeSessionId(): string {
  if (typeof window === "undefined") {
    return "server-session";
  }

  const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const next = `s-${crypto.randomUUID()}`;
  window.localStorage.setItem(SESSION_STORAGE_KEY, next);
  return next;
}

function loadSelected(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(SELECTED_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSelected(next: string[]): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(SELECTED_STORAGE_KEY, JSON.stringify(next));
  }
}

function UnitCell({
  unit,
  selected,
  onToggle,
}: {
  unit: Unit;
  selected: boolean;
  onToggle: (unitId: string) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onToggle(unit.id)}
      className={[
        "h-20 rounded-xl border p-2 text-left transition",
        selected
          ? "border-sky-600 bg-sky-100 text-sky-900 shadow-sm"
          : "border-slate-300 bg-white text-slate-700 hover:border-slate-500",
      ].join(" ")}
    >
      <div className="text-xs font-semibold">{unit.id}</div>
      <div className="mt-1 text-xs">{unit.areaM2.toFixed(2)}m2</div>
      <div className="text-xs">{unit.orientation}向き</div>
    </button>
  );
}

export default function UnitsPage() {
  const [building, setBuilding] = useState<BuildingId>("N-1");
  const [page, setPage] = useState<1 | 2>(1);
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>(() => loadSelected());
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string>("");

  const units = useMemo(() => getUnitsByBuildingAndPage(building, page), [building, page]);

  function toggleUnit(unitId: string): void {
    setSelectedUnitIds((prev) => {
      const next = prev.includes(unitId) ? prev.filter((id) => id !== unitId) : [...prev, unitId];
      saveSelected(next);
      return next;
    });
  }

  async function submitWish(): Promise<void> {
    setSubmitting(true);
    setMessage("");

    try {
      const sessionId = makeSessionId();
      const res = await fetch("/api/wishes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, unitIds: selectedUnitIds }),
      });

      if (!res.ok) {
        throw new Error("登録に失敗しました");
      }

      setMessage(`希望を登録しました（${selectedUnitIds.length}件）`);
    } catch {
      setMessage("登録時にエラーが発生しました。時間をおいて再試行してください。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="mb-6 rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">画面1: 部屋をクリックして複数チェック</p>
        <h1 className="text-2xl font-bold text-slate-900">住戸選択ボード</h1>
        <p className="mt-2 text-sm text-slate-600">
          棟とページを切り替えて、希望する部屋を複数選択できます。入居前はログイン不要です。
        </p>
      </header>

      <section className="mb-4 flex flex-wrap gap-2">
        {BUILDINGS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setBuilding(id)}
            className={[
              "rounded-full border px-4 py-1.5 text-sm",
              building === id ? "border-sky-700 bg-sky-700 text-white" : "border-slate-300 bg-white text-slate-700",
            ].join(" ")}
          >
            {id}棟
          </button>
        ))}
      </section>

      <section className="mb-6 flex gap-2">
        {[1, 2].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => setPage(num as 1 | 2)}
            className={[
              "rounded-lg px-3 py-1.5 text-sm",
              page === num ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700",
            ].join(" ")}
          >
            ページ {num}
          </button>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-300 bg-slate-50 p-4">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {building}棟 / ページ{page}
          </h2>
          <p className="text-sm text-slate-600">選択中: {selectedUnitIds.length}件</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {units.map((unit) => (
            <UnitCell key={unit.id} unit={unit} selected={selectedUnitIds.includes(unit.id)} onToggle={toggleUnit} />
          ))}
        </div>
      </section>

      <footer className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          disabled={submitting}
          onClick={submitWish}
          className="rounded-xl bg-emerald-700 px-5 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "登録中..." : "希望を登録する"}
        </button>
        {message ? <p className="text-sm text-slate-700">{message}</p> : null}
      </footer>
    </main>
  );
}
