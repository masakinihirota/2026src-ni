"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { BUILDINGS, type BuildingId } from "@/lib/housing-data";
import { PDF_UNIT_RECORDS, type PdfUnitRecord } from "@/lib/unit-price-data";

type AreaBand = 35 | 40 | 50 | 60 | 70 | 80;
type PlanCell = {
  roomCode: string;
  label: string;
  band: AreaBand;
  selectable: boolean;
  colSpan?: number;
};
type UnitDetail = {
  unitNumber: string;
  unitType: string;
  area: string;
  priceManYen: number | null;
};

const BAND_META: Record<AreaBand, { tile: string; text: string; border: string }> = {
  35: { tile: "bg-[#f7f7f5]", text: "text-slate-700", border: "border-slate-400" },
  40: { tile: "bg-[#f0cfe2]", text: "text-[#5d4255]", border: "border-[#c9a4bc]" },
  50: { tile: "bg-[#ffe08b]", text: "text-[#6b4d00]", border: "border-[#d2ab42]" },
  60: { tile: "bg-[#d7c8e3]", text: "text-[#4e3f62]", border: "border-[#9f88b1]" },
  70: { tile: "bg-[#d9e8f8]", text: "text-[#355072]", border: "border-[#90adcc]" },
  80: { tile: "bg-[#cfe6bc]", text: "text-[#3d5d26]", border: "border-[#97b97d]" },
};

const FLOOR_LIST = [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
const MAX_TRIAL_WISHES = 3;

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

function room(
  building: BuildingId,
  floor: number,
  suffix: string,
  label: string,
  band: AreaBand,
  selectable = true,
  colSpan = 1,
): PlanCell {
  return {
    roomCode: `${building}-${floor}-${suffix}`,
    label,
    band,
    selectable,
    colSpan,
  };
}

function buildN1Plan(): Record<number, (PlanCell | null)[]> {
  const matrix: Record<number, (PlanCell | null)[]> = {};
  for (const floor of FLOOR_LIST) {
    matrix[floor] = Array.from({ length: 8 }, () => null);
  }

  matrix[14] = [null, null, null, room("N-1", 14, "A", "78.30㎡", 70, true, 2), room("N-1", 14, "B", "69.60㎡", 60), room("N-1", 14, "C", "64.72㎡", 60), room("N-1", 14, "D", "64.72㎡", 60)];
  matrix[13] = [null, room("N-1", 13, "A", "78.30㎡", 70, true, 2), room("N-1", 13, "B", "71.92㎡", 70, true, 2), room("N-1", 13, "C", "69.60㎡", 60), room("N-1", 13, "D", "64.72㎡", 60), room("N-1", 13, "E", "64.72㎡", 60)];

  for (const floor of [12, 11, 10, 9, 8, 7, 6] as const) {
    matrix[floor] = [room("N-1", floor, "A", "84.22㎡", 80), room("N-1", floor, "B", "71.92㎡", 70, true, 2), room("N-1", floor, "C", "71.92㎡", 70, true, 2), room("N-1", floor, "D", "69.60㎡", 60), room("N-1", floor, "E", "64.72㎡", 60), room("N-1", floor, "F", "64.72㎡", 60)];
  }
  for (const floor of [5, 4, 3, 2] as const) {
    matrix[floor] = [room("N-1", floor, "A", "84.22㎡", 80), room("N-1", floor, "B", "35.96㎡", 35), room("N-1", floor, "C", "35.96㎡", 35), room("N-1", floor, "D", "35.96㎡", 35), room("N-1", floor, "E", "35.96㎡", 35), room("N-1", floor, "F", "69.60㎡", 60), room("N-1", floor, "G", "64.72㎡", 60), room("N-1", floor, "H", "64.72㎡", 60)];
  }
  matrix[1] = [room("N-1", 1, "A", "84.22㎡", 80), room("N-1", 1, "B", "35.96㎡", 35), room("N-1", 1, "C", "35.96㎡", 35), room("N-1", 1, "D", "35.96㎡", 35), room("N-1", 1, "E", "35.96㎡", 35), room("N-1", 1, "F", "69.60㎡", 60), room("N-1", 1, "G", "64.72㎡", 60), room("N-1", 1, "X", "サブENT", 35, false)];

  return matrix;
}

function buildGenericPlan(building: BuildingId): Record<number, (PlanCell | null)[]> {
  const matrix: Record<number, (PlanCell | null)[]> = {};
  for (const floor of FLOOR_LIST) {
    matrix[floor] = [{ roomCode: `${building}-${floor}-A`, label: "35.96㎡", band: 35, selectable: true }, { roomCode: `${building}-${floor}-B`, label: "50.24㎡", band: 50, selectable: true }, { roomCode: `${building}-${floor}-C`, label: "67.10㎡", band: 60, selectable: true }, { roomCode: `${building}-${floor}-D`, label: "71.92㎡", band: 70, selectable: true }, null, null, null];
  }
  return matrix;
}

function buildN2Plan(): Record<number, (PlanCell | null)[]> {
  const matrix: Record<number, (PlanCell | null)[]> = {};
  for (const floor of FLOOR_LIST) {
    matrix[floor] = [room("N-2", floor, "A", "61.80㎡", 60), room("N-2", floor, "B", "50.02㎡", 50), room("N-2", floor, "C", "50.02㎡", 50), room("N-2", floor, "D", "47.38㎡", 40), room("N-2", floor, "E", "61.80㎡", 60)];
  }
  return matrix;
}

function buildN3Plan(): Record<number, (PlanCell | null)[]> {
  const matrix: Record<number, (PlanCell | null)[]> = {};
  for (const floor of [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3] as const) {
    matrix[floor] = [room("N-3", floor, "A", "69.60㎡", 60), room("N-3", floor, "B", "69.60㎡", 60), room("N-3", floor, "C", "69.60㎡", 60), room("N-3", floor, "D", "69.60㎡", 60), room("N-3", floor, "E", "69.60㎡", 60), room("N-3", floor, "F", "69.60㎡", 60), room("N-3", floor, "G", "69.60㎡", 60), room("N-3", floor, "H", "68.85㎡", 60), room("N-3", floor, "I", "54.25㎡", 50), room("N-3", floor, "J", "64.22㎡", 60), room("N-3", floor, "K", "81.42㎡", 80)];
  }
  matrix[2] = [room("N-3", 2, "A", "69.60㎡", 60), room("N-3", 2, "B", "69.60㎡", 60), room("N-3", 2, "C", "69.60㎡", 60), room("N-3", 2, "D", "69.60㎡", 60), room("N-3", 2, "E", "69.60㎡", 60), room("N-3", 2, "F", "69.60㎡", 60), room("N-3", 2, "G", "69.60㎡", 60), room("N-3", 2, "H", "68.85㎡", 60), room("N-3", 2, "I", "54.25㎡", 50), room("N-3", 2, "J", "64.22㎡", 60), room("N-3", 2, "X", "吹抜", 35, false)];
  matrix[1] = [room("N-3", 1, "A", "69.60㎡", 60), room("N-3", 1, "B", "69.60㎡", 60), room("N-3", 1, "C", "69.60㎡", 60), room("N-3", 1, "D", "69.60㎡", 60), room("N-3", 1, "E", "69.60㎡", 60), room("N-3", 1, "F", "69.60㎡", 60), room("N-3", 1, "G", "69.60㎡", 60), room("N-3", 1, "H", "共用", 35, false), room("N-3", 1, "I", "共用", 35, false), room("N-3", 1, "J", "メール", 35, false), room("N-3", 1, "K", "ENT", 35, false)];
  return matrix;
}

function buildN4Plan(): Record<number, (PlanCell | null)[]> {
  const matrix: Record<number, (PlanCell | null)[]> = {};
  matrix[14] = [room("N-4", 14, "A", "64.72㎡", 60), room("N-4", 14, "B", "64.72㎡", 60), room("N-4", 14, "C", "54.25㎡", 50), room("N-4", 14, "D", "54.25㎡", 50), room("N-4", 14, "E", "54.25㎡", 50), room("N-4", 14, "F", "71.92㎡", 70), room("N-4", 14, "G", "80.62㎡", 80), null];
  matrix[13] = [room("N-4", 13, "A", "64.72㎡", 60), room("N-4", 13, "B", "64.72㎡", 60), room("N-4", 13, "C", "54.25㎡", 50), room("N-4", 13, "D", "54.25㎡", 50), room("N-4", 13, "E", "54.25㎡", 50), room("N-4", 13, "F", "71.92㎡", 70), room("N-4", 13, "G", "80.62㎡", 80), null];
  for (const floor of [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2] as const) {
    matrix[floor] = [room("N-4", floor, "A", "64.72㎡", 60), room("N-4", floor, "B", "64.72㎡", 60), room("N-4", floor, "C", "54.25㎡", 50), room("N-4", floor, "D", "54.25㎡", 50), room("N-4", floor, "E", "54.25㎡", 50), room("N-4", floor, "F", "71.92㎡", 70), room("N-4", floor, "G", "74.24㎡", 70), room("N-4", floor, "H", "84.22㎡", 80)];
  }
  matrix[1] = [room("N-4", 1, "A", "共用", 35, false), room("N-4", 1, "B", "共用", 35, false), room("N-4", 1, "C", "54.25㎡", 50), room("N-4", 1, "D", "54.25㎡", 50), room("N-4", 1, "E", "54.25㎡", 50), room("N-4", 1, "F", "71.92㎡", 70), room("N-4", 1, "G", "74.24㎡", 70), room("N-4", 1, "H", "71.98㎡", 70)];
  return matrix;
}

function buildS1Plan(): Record<number, (PlanCell | null)[]> {
  const matrix: Record<number, (PlanCell | null)[]> = {};
  for (const floor of [10, 9, 8, 7, 6, 5, 4, 3, 2] as const) {
    matrix[floor] = [room("S-1", floor, "A", "67.98㎡", 60), room("S-1", floor, "B", "61.80㎡", 60), room("S-1", floor, "C", "43.26㎡", 40), room("S-1", floor, "D", "61.80㎡", 60), room("S-1", floor, "E", "61.80㎡", 60), room("S-1", floor, "F", "61.80㎡", 60), room("S-1", floor, "G", "51.50㎡", 50), room("S-1", floor, "H", "51.50㎡", 50)];
  }
  for (const floor of [12, 11] as const) {
    matrix[floor] = [null, room("S-1", floor, "A", "67.46㎡", 60), room("S-1", floor, "B", "43.26㎡", 40), room("S-1", floor, "C", "61.80㎡", 60), room("S-1", floor, "D", "61.80㎡", 60), room("S-1", floor, "E", "61.80㎡", 60), room("S-1", floor, "F", "51.50㎡", 50), room("S-1", floor, "G", "51.50㎡", 50)];
  }
  matrix[13] = [null, null, null, room("S-1", 13, "A", "67.31㎡", 60), room("S-1", 13, "B", "61.80㎡", 60), room("S-1", 13, "C", "61.80㎡", 60), room("S-1", 13, "D", "51.50㎡", 50), room("S-1", 13, "E", "51.50㎡", 50)];
  matrix[14] = [null, null, null, null, room("S-1", 14, "A", "67.10㎡", 60), room("S-1", 14, "B", "61.80㎡", 60), room("S-1", 14, "C", "51.50㎡", 50), room("S-1", 14, "D", "51.50㎡", 50)];
  matrix[1] = [room("S-1", 1, "A", "67.98㎡", 60), room("S-1", 1, "B", "61.80㎡", 60), room("S-1", 1, "C", "43.26㎡", 40), room("S-1", 1, "D", "61.80㎡", 60), room("S-1", 1, "E", "61.80㎡", 60), room("S-1", 1, "F", "61.80㎡", 60), room("S-1", 1, "G", "51.50㎡", 50), room("S-1", 1, "X", "サブENT", 35, false)];
  return matrix;
}

function buildS2Plan(): Record<number, (PlanCell | null)[]> {
  const matrix: Record<number, (PlanCell | null)[]> = {};
  for (const floor of FLOOR_LIST) {
    matrix[floor] = [room("S-2", floor, "A", "71.10㎡", 70), room("S-2", floor, "B", "43.26㎡", 40), room("S-2", floor, "C", "50.02㎡", 50), room("S-2", floor, "D", "50.02㎡", 50), room("S-2", floor, "E", "50.02㎡", 50), room("S-2", floor, "F", "47.38㎡", 40), room("S-2", floor, "G", "61.80㎡", 60), room("S-2", floor, "H", "63.86㎡", 60), room("S-2", floor, "I", "61.80㎡", 60)];
  }
  return matrix;
}

function buildS3Plan(): Record<number, (PlanCell | null)[]> {
  const matrix: Record<number, (PlanCell | null)[]> = {};
  for (const floor of [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3] as const) {
    matrix[floor] = [room("S-3", floor, "A", "71.92㎡", 70), room("S-3", floor, "B", "71.92㎡", 70), room("S-3", floor, "C", "71.92㎡", 70), room("S-3", floor, "D", "71.92㎡", 70), room("S-3", floor, "E", "71.08㎡", 70), room("S-3", floor, "F", "71.08㎡", 70), room("S-3", floor, "G", "71.92㎡", 70), room("S-3", floor, "H", "80.05㎡", 80)];
  }
  matrix[2] = [room("S-3", 2, "A", "71.92㎡", 70), room("S-3", 2, "B", "71.92㎡", 70), room("S-3", 2, "C", "71.92㎡", 70), room("S-3", 2, "D", "71.92㎡", 70), room("S-3", 2, "E", "71.08㎡", 70), room("S-3", 2, "F", "71.08㎡", 70), room("S-3", 2, "G", "71.92㎡", 70), room("S-3", 2, "X", "吹抜", 35, false)];
  matrix[1] = [room("S-3", 1, "A", "71.92㎡", 70), room("S-3", 1, "B", "71.92㎡", 70), room("S-3", 1, "C", "71.92㎡", 70), room("S-3", 1, "D", "71.92㎡", 70), room("S-3", 1, "E", "共用", 35, false), room("S-3", 1, "F", "共用", 35, false), room("S-3", 1, "G", "メール", 35, false), room("S-3", 1, "H", "ENT", 35, false)];
  return matrix;
}

function buildS4Plan(): Record<number, (PlanCell | null)[]> {
  const matrix: Record<number, (PlanCell | null)[]> = {};
  matrix[14] = [room("S-4", 14, "A", "61.24㎡", 60), room("S-4", 14, "B", "61.24㎡", 60), room("S-4", 14, "C", "71.92㎡", 70, true, 2), room("S-4", 14, "D", "43.26㎡", 40), room("S-4", 14, "E", "71.92㎡", 70, true, 2), room("S-4", 14, "F", "59.50㎡", 50), null, null, null];
  matrix[13] = [room("S-4", 13, "A", "61.24㎡", 60), room("S-4", 13, "B", "61.24㎡", 60), room("S-4", 13, "C", "71.92㎡", 70, true, 2), room("S-4", 13, "D", "43.26㎡", 40), room("S-4", 13, "E", "71.92㎡", 70, true, 2), room("S-4", 13, "F", "53.75㎡", 50), room("S-4", 13, "G", "85.26㎡", 80, true, 2), null];
  for (const floor of [12, 11, 10, 9, 8, 7, 6] as const) {
    matrix[floor] = [room("S-4", floor, "A", "61.24㎡", 60), room("S-4", floor, "B", "61.24㎡", 60), room("S-4", floor, "C", "71.92㎡", 70, true, 2), room("S-4", floor, "D", "43.26㎡", 40), room("S-4", floor, "E", "71.92㎡", 70, true, 2), room("S-4", floor, "F", "53.75㎡", 50), room("S-4", floor, "G", "78.88㎡", 70, true, 2), room("S-4", floor, "H", "81.24㎡", 80)];
  }
  for (const floor of [5, 4, 3, 2] as const) {
    matrix[floor] = [room("S-4", floor, "A", "61.24㎡", 60), room("S-4", floor, "B", "61.24㎡", 60), room("S-4", floor, "C", "35.96㎡", 35), room("S-4", floor, "D", "35.96㎡", 35), room("S-4", floor, "E", "43.26㎡", 40), room("S-4", floor, "F", "35.96㎡", 35), room("S-4", floor, "G", "35.96㎡", 35), room("S-4", floor, "H", "53.75㎡", 50), room("S-4", floor, "I", "42.92㎡", 40), room("S-4", floor, "J", "35.96㎡", 35), room("S-4", floor, "K", "81.24㎡", 80)];
  }
  matrix[1] = [room("S-4", 1, "A", "共用", 35, false), room("S-4", 1, "B", "共用", 35, false), room("S-4", 1, "C", "共用", 35, false, 2), room("S-4", 1, "D", "43.26㎡", 40), room("S-4", 1, "E", "35.96㎡", 35), room("S-4", 1, "F", "35.96㎡", 35), room("S-4", 1, "G", "53.75㎡", 50), room("S-4", 1, "H", "42.92㎡", 40), room("S-4", 1, "I", "35.96㎡", 35), room("S-4", 1, "J", "71.98㎡", 70)];
  return matrix;
}

function buildPlanForBuilding(building: BuildingId): Record<number, (PlanCell | null)[]> {
  switch (building) {
    case "N-1":
      return buildN1Plan();
    case "N-2":
      return buildN2Plan();
    case "N-3":
      return buildN3Plan();
    case "N-4":
      return buildN4Plan();
    case "S-1":
      return buildS1Plan();
    case "S-2":
      return buildS2Plan();
    case "S-3":
      return buildS3Plan();
    case "S-4":
      return buildS4Plan();
    default:
      return buildGenericPlan(building);
  }
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

function areaFromLabel(label: string): number | null {
  const matched = label.match(/(\d+(?:\.\d+)?)/);
  if (!matched) return null;
  return Number(matched[1]);
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

function reorder<T>(items: T[], from: number, to: number): T[] {
  const clone = [...items];
  const [picked] = clone.splice(from, 1);
  clone.splice(to, 0, picked);
  return clone;
}

export function TrialPageView() {
  const router = useRouter();
  const [district, setDistrict] = useState<"北" | "南">("北");
  const [building, setBuilding] = useState<BuildingId>("N-1");
  const [selectedFloor, setSelectedFloor] = useState(12);
  const [selectedRoomCode, setSelectedRoomCode] = useState("");
  const [activeWishIndex, setActiveWishIndex] = useState(0);
  const [dragSourceWishIndex, setDragSourceWishIndex] = useState<number | null>(null);
  const [trialWishes, setTrialWishes] = useState<string[]>([]);
  const [hoveredCell, setHoveredCell] = useState<{ floor: number; start: number; end: number } | null>(null);
  const [lastMessage, setLastMessage] = useState("まだお試し入力はありません。図面から住戸を選んでください。");

  const plan = useMemo(() => buildPlanForBuilding(building), [building]);
  const planColumnCount = useMemo(
    () =>
      Math.max(
        ...FLOOR_LIST.map((floor) => (plan[floor] ?? []).reduce((sum, cell) => sum + (cell?.colSpan ?? 1), 0)),
      ),
    [plan],
  );
  const pdfRecordsForBuilding = useMemo(
    () => PDF_UNIT_RECORDS.filter((record) => toBuildingIdFromUnitNumber(record.unitNumber) === building),
    [building],
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
          unitNumber: matchedRecord?.unitNumber ?? `${building}-${floor}-資料確認中`,
          unitType: derivedType ?? "資料確認中",
          area: matchedRecord?.area ?? areaFromType ?? cell.label,
          priceManYen: matchedRecord?.priceManYen ?? null,
        });
      }
    }
    return map;
  }, [building, fallbackAreaByType, pdfRecordsForBuilding, plan]);

  const roomOptions = useMemo(() => {
    const values: { value: string; label: string }[] = [];
    for (const floor of FLOOR_LIST) {
      for (const cell of plan[floor]) {
        if (!cell?.selectable) continue;
        const details = unitDetailsByRoomCode.get(cell.roomCode);
        const unitNumber = details?.unitNumber ?? cell.roomCode;
        const area = details?.area ?? cell.label;
        const priceLabel = formatPrice(details?.priceManYen ?? null);
        values.push({ value: cell.roomCode, label: `${unitNumber}（${floor}階 / ${area} / ${priceLabel}）` });
      }
    }
    return values;
  }, [plan, unitDetailsByRoomCode]);
  const roomDisplayByCode = useMemo(() => {
    const map = new Map<string, string>();
    for (const option of roomOptions) map.set(option.value, option.label);
    return map;
  }, [roomOptions]);
  const selectedRoomDetail = useMemo(
    () => (selectedRoomCode ? unitDetailsByRoomCode.get(selectedRoomCode) ?? null : null),
    [selectedRoomCode, unitDetailsByRoomCode],
  );
  const trialWishRankByRoom = useMemo(() => {
    return trialWishes.reduce<Map<string, number>>((map, roomCode, index) => {
      map.set(roomCode, index + 1);
      return map;
    }, new Map<string, number>());
  }, [trialWishes]);
  const trialHitsByRoom = useMemo(() => {
    return trialWishes.reduce<Record<string, number>>((acc, roomCode) => {
      acc[roomCode] = 1;
      return acc;
    }, {});
  }, [trialWishes]);

  const availableBuildings = useMemo(() => BUILDINGS.filter((item) => districtOf(item) === district), [district]);

  function changeBuilding(nextBuilding: BuildingId): void {
    setBuilding(nextBuilding);
    setSelectedFloor(12);
    setSelectedRoomCode("");
  }
  function selectBuildingFromMap(nextBuilding: BuildingId): void {
    setDistrict(districtOf(nextBuilding));
    changeBuilding(nextBuilding);
  }

  function promptLoginForTrial(actionLabel: string): void {
    const accepted = window.confirm(`現在お試しモードです。${actionLabel}には新規ユーザー登録またはログインが必要です。今すぐ進みますか？`);
    if (!accepted) return;
    router.push("/login");
  }

  function addRoomToTrialWishes(roomCode: string): void {
    if (!roomCode) {
      setLastMessage("先に図面から住戸を選択してください。");
      return;
    }
    const existingIndex = trialWishes.findIndex((wishRoomCode) => wishRoomCode === roomCode);
    if (existingIndex >= 0) {
      setActiveWishIndex(existingIndex);
      setLastMessage("この住戸はすでに候補に追加済みです。");
      return;
    }

    if (trialWishes.length < MAX_TRIAL_WISHES) {
      const nextWishes = [...trialWishes, roomCode];
      setTrialWishes(nextWishes);
      setActiveWishIndex(Math.min(nextWishes.length - 1, MAX_TRIAL_WISHES - 1));
      setLastMessage(`候補に追加しました（${nextWishes.length}/3）。お試しでは選んだ住戸だけ希望者数が1として表示されます。`);
      return;
    }

    const targetIndex = Math.max(0, Math.min(activeWishIndex, trialWishes.length - 1));
    const nextWishes = [...trialWishes];
    nextWishes[targetIndex] = roomCode;
    setTrialWishes(nextWishes);
    setActiveWishIndex(Math.min(targetIndex + 1, nextWishes.length - 1));
    setLastMessage(`第${targetIndex + 1}候補を置き換えました。`);
  }

  function addTrialWish(): void {
    addRoomToTrialWishes(selectedRoomCode);
  }

  function removeTrialWish(targetRoomCode: string): void {
    const removedIndex = trialWishes.findIndex((roomCode) => roomCode === targetRoomCode);
    const nextWishes = trialWishes.filter((roomCode) => roomCode !== targetRoomCode);
    setTrialWishes(nextWishes);
    if (nextWishes.length === 0) {
      setActiveWishIndex(0);
    } else if (removedIndex >= 0) {
      setActiveWishIndex(Math.max(0, Math.min(activeWishIndex, nextWishes.length - 1)));
    }
    setLastMessage(`候補を削除しました（${nextWishes.length}/3）。`);
  }

  function moveTrialWish(from: number, to: number): void {
    if (from === to) return;
    const next = reorder(trialWishes, from, to);
    setTrialWishes(next);
    if (activeWishIndex === from) {
      setActiveWishIndex(to);
    } else if (from < activeWishIndex && activeWishIndex <= to) {
      setActiveWishIndex(activeWishIndex - 1);
    } else if (to <= activeWishIndex && activeWishIndex < from) {
      setActiveWishIndex(activeWishIndex + 1);
    }
    setLastMessage("候補の順番を入れ替えました。");
  }

  return (
    <main className="mx-auto w-full max-w-[1180px] px-4 pb-8 pt-4">
      <header className="mb-4">
        <h1 className="text-[42px] font-extrabold leading-none tracking-tight text-[#2e6d92]">お試し住戸入力</h1>
        <div className="mt-3 h-3 bg-[#bba6cf]" />
      </header>

      <section className="mb-4 rounded-2xl border border-[#b8cce0] bg-[#f8fbff] p-4 shadow-sm">
        <p className="text-sm font-bold text-[#2f5f84]">この画面は本番入力とは独立した「学習・体験専用」です。実際の希望数には反映されません。</p>
        <p className="mt-1 text-xs text-slate-700">実際の希望数を見たい方は、参加者登録でご本人を特定してから本入力を行ってください。</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/login" className="inline-flex cursor-pointer rounded-full border border-[#2f6d92] bg-white px-4 py-1.5 text-sm font-semibold text-[#2f6d92] transition hover:bg-[#edf5fd]">
            参加者登録して本入力へ
          </Link>
          <Link href="/" className="inline-flex cursor-pointer rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-semibold text-slate-700">
            ホームへ戻る
          </Link>
        </div>
      </section>

      <section className="rounded-3xl border border-[#c8d5e3] bg-[#f8fbff] p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">
            街区
            <select
              value={district}
              onChange={(event) => {
                const nextDistrict = event.target.value as "北" | "南";
                setDistrict(nextDistrict);
                const nextBuilding = BUILDINGS.find((item) => districtOf(item) === nextDistrict) ?? "N-1";
                changeBuilding(nextBuilding);
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
              value={building}
              onChange={(event) => changeBuilding(event.target.value as BuildingId)}
              className="mt-1 w-full rounded-xl border border-[#b8cce0] bg-white px-3 py-2.5 text-sm"
            >
              {availableBuildings.map((item) => (
                <option key={item} value={item}>
                  {item}棟
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4">
          <p className="text-sm font-semibold text-slate-700">図面（棟→部屋の順でクリック）</p>
          <div className="mt-2 overflow-x-auto rounded-2xl border border-[#b8cce0] bg-[#f2f6fb] p-3">
            <div className="mb-4 rounded border border-slate-500 bg-white p-3">
              <p className="mb-2 text-sm font-semibold text-[#2f5f84]">棟を選んでください。</p>
              <div className="relative mx-auto h-64 w-52 border-[6px] border-slate-500">
                <div className="absolute left-1/2 top-16 grid w-28 -translate-x-1/2 grid-cols-2 border border-red-400 bg-white">
                  {(["N-1", "N-4", "N-2", "N-3"] as const).map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => selectBuildingFromMap(id)}
                      className={["h-10 border border-red-300 text-lg font-semibold", building === id ? "bg-red-100 text-red-800" : "bg-white text-slate-700 hover:bg-red-50"].join(" ")}
                    >
                      {id}
                    </button>
                  ))}
                </div>
                <div className="absolute left-1/2 top-40 grid w-28 -translate-x-1/2 grid-cols-2 bg-[#ece3f4]">
                  {(["S-1", "S-4", "S-2", "S-3"] as const).map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => selectBuildingFromMap(id)}
                      className={["h-10 border border-[#d3c1e2] text-lg font-semibold", building === id ? "bg-[#d9c7ea] text-[#4f3a67]" : "bg-[#ece3f4] text-slate-700 hover:bg-[#e2d5ee]"].join(" ")}
                    >
                      {id}
                    </button>
                  ))}
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
                  <span className="rounded-sm border border-[#7ea5c6] bg-white px-4 py-1 text-[42px] font-bold leading-none text-[#2f6d92]">{building}棟</span>
                  <span className="text-[42px] font-bold leading-none text-[#2f6d92]">（{orientationOf(building)}）</span>
                </div>

                <table className="table-fixed border-separate border-spacing-0 text-[#50535a]">
                  <colgroup>
                    <col className="w-12" />
                    {Array.from({ length: planColumnCount }).map((_, index) => (
                      <col key={`trial-plan-col-${index}`} className="w-24" />
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
                        <td className={["w-12 pr-2 text-right text-xl font-bold text-[#2f5072]", hoveredCell?.floor === floor ? "text-[#1f5f89]" : ""].join(" ")}>
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
                              return <td key={`trial-void-${floor}-${index}`} className={["h-16 w-24", crossHighlight ? "bg-[#eaf2fb]" : ""].join(" ")} />;
                            }

                            const count = trialHitsByRoom[cell.roomCode] ?? 0;
                            const selectedRank = trialWishRankByRoom.get(cell.roomCode) ?? null;
                            const isPicked = selectedRank !== null;
                            const borderWidth = count >= 5 ? "border-4" : count >= 3 ? "border-2" : "border";
                            const detail = unitDetailsByRoomCode.get(cell.roomCode);
                            const unitNumber = detail?.unitNumber ?? cell.roomCode;
                            const unitType = detail?.unitType ?? "資料確認中";
                            const unitArea = detail?.area ?? cell.label;
                            const unitPrice = formatPrice(detail?.priceManYen ?? null);

                            if (!cell.selectable) {
                              return (
                                <td
                                  key={cell.roomCode}
                                  colSpan={cell.colSpan ?? 1}
                                  title={`${floor}階`}
                                  className={["h-16 border border-slate-500 bg-[#f4f4f4] px-1 text-center text-sm font-semibold", crossHighlight ? "shadow-[inset_0_0_0_1px_rgba(47,109,146,0.45)]" : ""].join(" ")}
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
                                    setSelectedFloor(floor);
                                    setSelectedRoomCode(cell.roomCode);
                                    addRoomToTrialWishes(cell.roomCode);
                                  }}
                                  onMouseEnter={() => setHoveredCell({ floor, start: colStart, end: colEnd })}
                                  onMouseLeave={() => setHoveredCell(null)}
                                  onFocus={() => setHoveredCell({ floor, start: colStart, end: colEnd })}
                                  onBlur={() => setHoveredCell(null)}
                                  title={`${floor}階 / ${unitNumber}`}
                                  aria-label={`${floor}階 ${unitNumber}`}
                                  className={["relative h-16 w-full cursor-pointer px-1 py-1 text-left text-[10px] leading-3 transition", BAND_META[cell.band].tile, BAND_META[cell.band].text, BAND_META[cell.band].border, borderWidth, isPicked ? "ring-2 ring-[#d73a49] border-[#d73a49]" : "", crossHighlight ? "shadow-[inset_0_0_0_1px_rgba(47,109,146,0.55)]" : ""].join(" ")}
                                >
                                  <div className="font-bold">{unitNumber}</div>
                                  <div>{unitType}</div>
                                  <div>{unitArea}</div>
                                  <div>{unitPrice}</div>
                                  <span className="absolute -left-1 -top-1 z-10 rounded-full bg-[#0d1f3f] px-1.5 text-[11px] font-bold text-white">{count}</span>
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
                  <p className="font-semibold text-slate-700">選択中住戸</p>
                  <p className="mt-1 text-slate-900">{selectedRoomCode ? roomDisplayByCode.get(selectedRoomCode) ?? selectedRoomCode : "未選択"}</p>
                  <p className="mt-2 text-xs text-slate-500">選択階: {selectedFloor}階</p>
                </div>
                <div className="mt-3 rounded border border-slate-300 bg-white p-3 text-sm">
                  <p className="font-semibold text-slate-700">選択中住戸の詳細</p>
                  {selectedRoomDetail ? (
                    <dl className="mt-2 space-y-1 text-slate-800">
                      <div>
                        <dt className="text-xs text-slate-500">住戸番号</dt>
                        <dd className="font-semibold">{selectedRoomDetail.unitNumber}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">住戸タイプ</dt>
                        <dd>{selectedRoomDetail.unitType}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">面積</dt>
                        <dd>{selectedRoomDetail.area}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">予定価格</dt>
                        <dd>{formatPrice(selectedRoomDetail.priceManYen)}</dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">図面の住戸セルをクリックすると詳細を表示します。</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={addTrialWish}
                  disabled={!selectedRoomCode}
                  className="mt-3 cursor-pointer rounded-xl border border-[#2f6d92] bg-[#2f6d92] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#255a79] disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300"
                >
                  選択中住戸を候補に追加/置き換え（最大3件）
                </button>
                <p className="mt-2 text-xs text-slate-600">※ お試しは体験専用です。提出や個別チャット入室は、登録・ログイン後に本入力で行えます。</p>
                <p className="mt-3 rounded-lg border border-[#c9d7e5] bg-[#f4f8fc] px-3 py-2 text-sm font-semibold text-[#2f5f84]">{lastMessage}</p>
                <div className="mt-3 rounded border border-slate-300 bg-white p-3 text-xs">
                  <p className="font-semibold text-slate-700">選択候補（最大3件）</p>
                  <p className="mt-1 text-slate-600">ドラッグ&ドロップで希望順位を並び替えできます。</p>
                  {trialWishes.length > 0 ? (
                    <ul className="mt-2 space-y-2">
                      {trialWishes.map((roomCode, index) => (
                        <li
                          key={roomCode}
                          draggable
                          onDragStart={() => setDragSourceWishIndex(index)}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={() => {
                            if (dragSourceWishIndex === null) return;
                            moveTrialWish(dragSourceWishIndex, index);
                            setDragSourceWishIndex(null);
                          }}
                          onClick={() => setActiveWishIndex(index)}
                          className={[
                            "rounded-lg border bg-slate-50 p-2",
                            activeWishIndex === index ? "border-[#2f6d92] ring-1 ring-[#2f6d92]" : "border-slate-200",
                          ].join(" ")}
                        >
                          <p className="text-slate-700">第{index + 1}候補: {roomDisplayByCode.get(roomCode) ?? roomCode}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Link
                              href={`/units/chat?rank=${index + 1}&roomCode=${encodeURIComponent(roomCode)}`}
                              onClick={(event) => {
                                event.preventDefault();
                                promptLoginForTrial("個別チャット入室");
                              }}
                              className="inline-flex rounded-xl border border-[#2f6d92] bg-[#eef6fc] px-3 py-1.5 font-semibold text-[#1f5a7d] transition hover:bg-[#e1f0fb]"
                            >
                              第{index + 1}候補の個別チャットへ
                            </Link>
                            <button
                              type="button"
                              onClick={() => removeTrialWish(roomCode)}
                              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 transition hover:bg-slate-100"
                            >
                              候補から外す
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-slate-500">まだ候補はありません。住戸を選択して追加してください。</p>
                  )}
                  <p className="mt-2 text-slate-600">※ お試しでは、個別チャットボタンを押してもログインしないと入れません。</p>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
        <p className="text-sm font-bold text-slate-900">希望部屋ごとの対話チャット（本番のみ入室可能）</p>
        <p className="mt-1 text-xs text-slate-600">お試しでは、ログインしないと入室できません。</p>
               <p className="mt-1 text-xs text-slate-600">お試しでは、自分の部屋の選択しか反映されていません</p>
        <div className="mt-3">
          <Link
            href="/units/chat?scope=global"
            onClick={(event) => {
              event.preventDefault();
              promptLoginForTrial("全体チャット入室");
            }}
            className="inline-flex rounded-xl border border-[#2f6d92] bg-[#eef6fc] px-3 py-2 text-sm font-semibold text-[#1f5a7d] transition hover:bg-[#e1f0fb]"
          >
            全体チャット（ユーザー同士による使い方相談・質問）に入る
          </Link>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {Array.from({ length: MAX_TRIAL_WISHES }).map((_, index) => {
            const roomCode = trialWishes[index] ?? null;
            if (!roomCode) {
              return (
                <div key={`trial-chat-empty-${index}`} className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-slate-500">
                  第{index + 1}希望チャット（未選択）
                </div>
              );
            }
            return (
              <Link
                key={`trial-chat-${roomCode}-${index}`}
                href={`/units/chat?rank=${index + 1}&roomCode=${encodeURIComponent(roomCode)}`}
                onClick={(event) => {
                  event.preventDefault();
                  promptLoginForTrial("個別チャット入室");
                }}
                className="rounded-xl border border-[#2f6d92] bg-[#eef6fc] px-3 py-2 text-[#1f5a7d] transition hover:bg-[#e1f0fb]"
              >
                <p>第{index + 1}希望: {roomDisplayByCode.get(roomCode) ?? roomCode}</p>
                <p className="mt-1 text-xs font-medium text-[#6d1c2a]">希望者数 1人 / 参加者 0人 / 過去ログ 0件</p>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
