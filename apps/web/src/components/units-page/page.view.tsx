"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { BUILDINGS, type BuildingId, UNITS, type Unit } from "@/lib/housing-data";

const ROOM_CLICK_COUNTS_STORAGE_KEY = "housing-demo-room-click-counts";

const BUILDING_LAYOUT_ROWS: BuildingId[][] = [["N-1", "N-4"], ["N-2", "N-3"], ["S-1", "S-4"], ["S-2", "S-3"]];

function loadRoomClickCounts(): Record<string, number> {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.localStorage.getItem(ROOM_CLICK_COUNTS_STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function saveRoomClickCounts(next: Record<string, number>): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(ROOM_CLICK_COUNTS_STORAGE_KEY, JSON.stringify(next));
  }
}

function getBuildingDirectionLabel(buildingId: BuildingId): string {
  if (buildingId === "N-1") return "西向き";
  if (buildingId === "N-4") return "東向き";
  return "南向き";
}

function getZoneLabel(buildingId: BuildingId): "北の棟" | "南の棟" {
  return buildingId.startsWith("N-") ? "北の棟" : "南の棟";
}

function UnitCell({
  unit,
  count,
  onCountUp,
}: {
  unit: Unit;
  count: number;
  onCountUp: (unitId: string) => void;
}) {
  return (
    <button
      type="button"
      aria-label={`${unit.id} を希望する。現在 ${count} 件`}
      onClick={() => onCountUp(unit.id)}
      className={[
        "h-20 rounded-lg border p-2 text-left transition",
        count > 0 ? "border-emerald-700 bg-emerald-100 text-emerald-900 shadow-sm" : "border-slate-300 bg-white text-slate-700 hover:border-slate-500",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-[11px] font-semibold leading-tight">{unit.id}</div>
        <div className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-white">{count}</div>
      </div>
      <div className="mt-1 text-[11px]">{unit.areaM2.toFixed(2)}m2</div>
      <div className="text-[11px]">{unit.orientation}向き / {unit.line}列</div>
    </button>
  );
}

export function UnitsPageView() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="mb-6 rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">ステップ1: 棟を選択</p>
        <h1 className="text-2xl font-bold text-slate-900">希望する棟を先に選んでください</h1>
        <p className="mt-2 text-sm text-slate-600">
          中央図の棟ラベルをクリックすると、該当する棟の部屋ページへ移動します。最初は北4棟・南4棟のどこを希望するかを選択します。
        </p>
      </header>

      <section className="rounded-2xl border border-slate-300 bg-[#ede8f2] p-4 sm:p-6">
        <div className="mx-auto grid max-w-2xl grid-cols-2 gap-3 sm:gap-4">
          {BUILDING_LAYOUT_ROWS.flatMap((row) =>
            row.map((buildingId) => (
              <Link
                key={buildingId}
                href={`/units/${buildingId}`}
                className="cursor-pointer rounded-xl border-2 border-indigo-400 bg-white/90 px-4 py-4 text-center text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-600 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <div className="text-2xl font-black tracking-tight">{buildingId}</div>
                <div className="mt-1 text-xs text-slate-600">{getZoneLabel(buildingId)} / {getBuildingDirectionLabel(buildingId)}</div>
              </Link>
            )),
          )}
        </div>
      </section>

      <footer className="mt-6 rounded-2xl border border-slate-300 bg-white p-4 text-sm text-slate-700">
        例: N-2 を押すと N-2棟の部屋一覧ページへ移動し、各住戸をクリックして希望数を加算できます。
      </footer>
    </main>
  );
}

export function BuildingUnitsPageView({ building }: { building: BuildingId }) {
  const [roomClickCounts, setRoomClickCounts] = useState<Record<string, number>>(() => loadRoomClickCounts());

  const units = useMemo(
    () =>
      UNITS.filter((unit) => unit.building === building).sort(
        (a, b) => b.floor - a.floor || a.line.localeCompare(b.line),
      ),
    [building],
  );

  const floors = useMemo(() => {
    const floorSet = new Set<number>();
    for (const unit of units) {
      floorSet.add(unit.floor);
    }
    return Array.from(floorSet).sort((a, b) => b - a);
  }, [units]);

  const unitsByFloorAndLine = useMemo(() => {
    const map = new Map<string, Unit>();
    for (const unit of units) {
      map.set(`${unit.floor}-${unit.line}`, unit);
    }
    return map;
  }, [units]);

  function countUpUnit(unitId: string): void {
    setRoomClickCounts((prev) => {
      const next = {
        ...prev,
        [unitId]: (prev[unitId] ?? 0) + 1,
      };
      saveRoomClickCounts(next);
      return next;
    });
  }

  const totalClicks = useMemo(
    () => Object.values(roomClickCounts).reduce((sum, value) => sum + value, 0),
    [roomClickCounts],
  );

  const buildingClicks = useMemo(
    () => units.reduce((sum, unit) => sum + (roomClickCounts[unit.id] ?? 0), 0),
    [roomClickCounts, units],
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="mb-6 rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">ステップ2: {building}棟の部屋を選択</p>
        <h1 className="text-2xl font-bold text-slate-900">{building}棟 住戸クリックページ</h1>
        <p className="mt-2 text-sm text-slate-600">
          部屋をクリックするたびに希望数が1件ずつ増えます。別の棟を見るときは「棟選択へ戻る」から切り替えてください。
        </p>
      </header>

      <section className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/units"
          className="cursor-pointer rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm text-slate-700 transition hover:border-slate-500"
        >
          棟選択へ戻る
        </Link>
        {BUILDINGS.map((id) => (
          <Link
            key={id}
            href={`/units/${id}`}
            className={[
              "cursor-pointer rounded-full border px-4 py-1.5 text-sm",
              building === id ? "border-sky-700 bg-sky-700 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-slate-500",
            ].join(" ")}
          >
            {id}棟を表示
          </Link>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-300 bg-slate-50 p-4">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{building}棟 住戸一覧</h2>
          <p className="text-sm text-slate-600">この棟の希望クリック数: {buildingClicks}件 / 全体: {totalClicks}件</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-1">
            <thead>
              <tr>
                <th className="px-2 py-1 text-left text-xs text-slate-600">階</th>
                {(["A", "B", "C", "D"] as Unit["line"][]).map((line) => (
                  <th key={line} className="px-2 py-1 text-left text-xs text-slate-600">
                    {line}列
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {floors.map((floor) => (
                <tr key={floor}>
                  <td className="w-10 px-2 py-1 text-xs font-semibold text-slate-700">{floor}</td>
                  {(["A", "B", "C", "D"] as Unit["line"][]).map((line) => {
                    const unit = unitsByFloorAndLine.get(`${floor}-${line}`);
                    if (!unit) {
                      return <td key={line} className="h-20 rounded-lg border border-dashed border-slate-300 bg-slate-100" />;
                    }

                    return (
                      <td key={line}>
                        <UnitCell unit={unit} count={roomClickCounts[unit.id] ?? 0} onCountUp={countUpUnit} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="mt-6 rounded-2xl border border-slate-300 bg-white p-4 text-sm text-slate-700">
        この棟で選んだ希望数はブラウザ内に保存され、他の棟ページへ移動しても維持されます。
      </footer>
    </main>
  );
}
