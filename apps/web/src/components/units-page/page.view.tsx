"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { BUILDINGS, type BuildingId } from "@/lib/housing-data";
import { PDF_UNIT_RECORDS, type PdfUnitRecord } from "@/lib/unit-price-data";
import { getStoredUserProfile, type UserProfile } from "@/lib/user-profile";

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

const BAND_META: Record<AreaBand, { tile: string; text: string; border: string }> = {
  35: { tile: "bg-[#f7f7f5]", text: "text-slate-700", border: "border-slate-400" },
  40: { tile: "bg-[#f0cfe2]", text: "text-[#5d4255]", border: "border-[#c9a4bc]" },
  50: { tile: "bg-[#ffe08b]", text: "text-[#6b4d00]", border: "border-[#d2ab42]" },
  60: { tile: "bg-[#d7c8e3]", text: "text-[#4e3f62]", border: "border-[#9f88b1]" },
  70: { tile: "bg-[#d9e8f8]", text: "text-[#355072]", border: "border-[#90adcc]" },
  80: { tile: "bg-[#cfe6bc]", text: "text-[#3d5d26]", border: "border-[#97b97d]" },
};

const FLOOR_LIST = [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
const MIN_WISH_SLOTS = 1;
const MAX_WISH_SLOTS = 3;

function createEmptyWishes(count = MIN_WISH_SLOTS): (string | null)[] {
  return Array.from({ length: count }, () => null);
}

function createDefaultWishFilters(count = MIN_WISH_SLOTS): WishFilter[] {
  return Array.from({ length: count }, () => ({ district: "北", building: "N-1", floor: 12 }));
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

function toColumnLabel(index: number): string {
  let cursor = index;
  let label = "";
  do {
    label = String.fromCharCode(65 + (cursor % 26)) + label;
    cursor = Math.floor(cursor / 26) - 1;
  } while (cursor >= 0);
  return label;
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

  matrix[14] = [
    null,
    null,
    null,
    room("N-1", 14, "A", "78.30㎡", 70, true, 2),
    room("N-1", 14, "B", "69.60㎡", 60),
    room("N-1", 14, "C", "64.72㎡", 60),
    room("N-1", 14, "D", "64.72㎡", 60),
  ];

  matrix[13] = [
    null,
    room("N-1", 13, "A", "78.30㎡", 70, true, 2),
    room("N-1", 13, "B", "71.92㎡", 70, true, 2),
    room("N-1", 13, "C", "69.60㎡", 60),
    room("N-1", 13, "D", "64.72㎡", 60),
    room("N-1", 13, "E", "64.72㎡", 60),
  ];

  for (const floor of [12, 11, 10, 9, 8, 7, 6] as const) {
    matrix[floor] = [
      room("N-1", floor, "A", "84.22㎡", 80),
      room("N-1", floor, "B", "71.92㎡", 70, true, 2),
      room("N-1", floor, "C", "71.92㎡", 70, true, 2),
      room("N-1", floor, "D", "69.60㎡", 60),
      room("N-1", floor, "E", "64.72㎡", 60),
      room("N-1", floor, "F", "64.72㎡", 60),
    ];
  }

  for (const floor of [5, 4, 3, 2] as const) {
    matrix[floor] = [
      room("N-1", floor, "A", "84.22㎡", 80),
      room("N-1", floor, "B", "35.96㎡", 35),
      room("N-1", floor, "C", "35.96㎡", 35),
      room("N-1", floor, "D", "35.96㎡", 35),
      room("N-1", floor, "E", "35.96㎡", 35),
      room("N-1", floor, "F", "69.60㎡", 60),
      room("N-1", floor, "G", "64.72㎡", 60),
      room("N-1", floor, "H", "64.72㎡", 60),
    ];
  }

  matrix[1] = [
    room("N-1", 1, "A", "84.22㎡", 80),
    room("N-1", 1, "B", "35.96㎡", 35),
    room("N-1", 1, "C", "35.96㎡", 35),
    room("N-1", 1, "D", "35.96㎡", 35),
    room("N-1", 1, "E", "35.96㎡", 35),
    room("N-1", 1, "F", "69.60㎡", 60),
    room("N-1", 1, "G", "64.72㎡", 60),
    room("N-1", 1, "X", "サブENT", 35, false),
  ];

  return matrix;
}

function buildGenericPlan(building: BuildingId): Record<number, (PlanCell | null)[]> {
  const matrix: Record<number, (PlanCell | null)[]> = {};
  for (const floor of FLOOR_LIST) {
    matrix[floor] = [
      { roomCode: `${building}-${floor}-A`, label: "35.96㎡", band: 35, selectable: true },
      { roomCode: `${building}-${floor}-B`, label: "50.24㎡", band: 50, selectable: true },
      { roomCode: `${building}-${floor}-C`, label: "67.10㎡", band: 60, selectable: true },
      { roomCode: `${building}-${floor}-D`, label: "71.92㎡", band: 70, selectable: true },
      null,
      null,
      null,
    ];
  }
  return matrix;
}

function buildN2Plan(): Record<number, (PlanCell | null)[]> {
  const matrix: Record<number, (PlanCell | null)[]> = {};
  for (const floor of FLOOR_LIST) {
    matrix[floor] = [
      room("N-2", floor, "A", "61.80㎡", 60),
      room("N-2", floor, "B", "50.02㎡", 50),
      room("N-2", floor, "C", "50.02㎡", 50),
      room("N-2", floor, "D", "47.38㎡", 40),
      room("N-2", floor, "E", "61.80㎡", 60),
    ];
  }
  return matrix;
}

function buildN3Plan(): Record<number, (PlanCell | null)[]> {
  const matrix: Record<number, (PlanCell | null)[]> = {};
  for (const floor of [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3] as const) {
    matrix[floor] = [
      room("N-3", floor, "A", "69.60㎡", 60),
      room("N-3", floor, "B", "69.60㎡", 60),
      room("N-3", floor, "C", "69.60㎡", 60),
      room("N-3", floor, "D", "69.60㎡", 60),
      room("N-3", floor, "E", "69.60㎡", 60),
      room("N-3", floor, "F", "69.60㎡", 60),
      room("N-3", floor, "G", "69.60㎡", 60),
      room("N-3", floor, "H", "68.85㎡", 60),
      room("N-3", floor, "I", "54.25㎡", 50),
      room("N-3", floor, "J", "64.22㎡", 60),
      room("N-3", floor, "K", "81.42㎡", 80),
    ];
  }
  matrix[2] = [
    room("N-3", 2, "A", "69.60㎡", 60),
    room("N-3", 2, "B", "69.60㎡", 60),
    room("N-3", 2, "C", "69.60㎡", 60),
    room("N-3", 2, "D", "69.60㎡", 60),
    room("N-3", 2, "E", "69.60㎡", 60),
    room("N-3", 2, "F", "69.60㎡", 60),
    room("N-3", 2, "G", "69.60㎡", 60),
    room("N-3", 2, "H", "68.85㎡", 60),
    room("N-3", 2, "I", "54.25㎡", 50),
    room("N-3", 2, "J", "64.22㎡", 60),
    room("N-3", 2, "X", "吹抜", 35, false),
  ];
  matrix[1] = [
    room("N-3", 1, "A", "69.60㎡", 60),
    room("N-3", 1, "B", "69.60㎡", 60),
    room("N-3", 1, "C", "69.60㎡", 60),
    room("N-3", 1, "D", "69.60㎡", 60),
    room("N-3", 1, "E", "69.60㎡", 60),
    room("N-3", 1, "F", "69.60㎡", 60),
    room("N-3", 1, "G", "69.60㎡", 60),
    room("N-3", 1, "H", "共用", 35, false),
    room("N-3", 1, "I", "共用", 35, false),
    room("N-3", 1, "J", "メール", 35, false),
    room("N-3", 1, "K", "ENT", 35, false),
  ];
  return matrix;
}

function buildN4Plan(): Record<number, (PlanCell | null)[]> {
  const matrix: Record<number, (PlanCell | null)[]> = {};
  matrix[14] = [
    room("N-4", 14, "A", "64.72㎡", 60),
    room("N-4", 14, "B", "64.72㎡", 60),
    room("N-4", 14, "C", "54.25㎡", 50),
    room("N-4", 14, "D", "54.25㎡", 50),
    room("N-4", 14, "E", "54.25㎡", 50),
    room("N-4", 14, "F", "71.92㎡", 70),
    room("N-4", 14, "G", "80.62㎡", 80),
    null,
  ];
  matrix[13] = [
    room("N-4", 13, "A", "64.72㎡", 60),
    room("N-4", 13, "B", "64.72㎡", 60),
    room("N-4", 13, "C", "54.25㎡", 50),
    room("N-4", 13, "D", "54.25㎡", 50),
    room("N-4", 13, "E", "54.25㎡", 50),
    room("N-4", 13, "F", "71.92㎡", 70),
    room("N-4", 13, "G", "80.62㎡", 80),
    null,
  ];
  for (const floor of [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2] as const) {
    matrix[floor] = [
      room("N-4", floor, "A", "64.72㎡", 60),
      room("N-4", floor, "B", "64.72㎡", 60),
      room("N-4", floor, "C", "54.25㎡", 50),
      room("N-4", floor, "D", "54.25㎡", 50),
      room("N-4", floor, "E", "54.25㎡", 50),
      room("N-4", floor, "F", "71.92㎡", 70),
      room("N-4", floor, "G", "74.24㎡", 70),
      room("N-4", floor, "H", "84.22㎡", 80),
    ];
  }
  matrix[1] = [
    room("N-4", 1, "A", "共用", 35, false),
    room("N-4", 1, "B", "共用", 35, false),
    room("N-4", 1, "C", "54.25㎡", 50),
    room("N-4", 1, "D", "54.25㎡", 50),
    room("N-4", 1, "E", "54.25㎡", 50),
    room("N-4", 1, "F", "71.92㎡", 70),
    room("N-4", 1, "G", "74.24㎡", 70),
    room("N-4", 1, "H", "71.98㎡", 70),
  ];
  return matrix;
}

function buildS1Plan(): Record<number, (PlanCell | null)[]> {
  const matrix: Record<number, (PlanCell | null)[]> = {};
  for (const floor of [10, 9, 8, 7, 6, 5, 4, 3, 2] as const) {
    matrix[floor] = [
      room("S-1", floor, "A", "67.98㎡", 60),
      room("S-1", floor, "B", "61.80㎡", 60),
      room("S-1", floor, "C", "43.26㎡", 40),
      room("S-1", floor, "D", "61.80㎡", 60),
      room("S-1", floor, "E", "61.80㎡", 60),
      room("S-1", floor, "F", "61.80㎡", 60),
      room("S-1", floor, "G", "51.50㎡", 50),
      room("S-1", floor, "H", "51.50㎡", 50),
    ];
  }
  for (const floor of [12, 11] as const) {
    matrix[floor] = [
      null,
      room("S-1", floor, "A", "67.46㎡", 60),
      room("S-1", floor, "B", "43.26㎡", 40),
      room("S-1", floor, "C", "61.80㎡", 60),
      room("S-1", floor, "D", "61.80㎡", 60),
      room("S-1", floor, "E", "61.80㎡", 60),
      room("S-1", floor, "F", "51.50㎡", 50),
      room("S-1", floor, "G", "51.50㎡", 50),
    ];
  }
  matrix[13] = [
    null,
    null,
    null,
    room("S-1", 13, "A", "67.31㎡", 60),
    room("S-1", 13, "B", "61.80㎡", 60),
    room("S-1", 13, "C", "61.80㎡", 60),
    room("S-1", 13, "D", "51.50㎡", 50),
    room("S-1", 13, "E", "51.50㎡", 50),
  ];
  matrix[14] = [
    null,
    null,
    null,
    null,
    room("S-1", 14, "A", "67.10㎡", 60),
    room("S-1", 14, "B", "61.80㎡", 60),
    room("S-1", 14, "C", "51.50㎡", 50),
    room("S-1", 14, "D", "51.50㎡", 50),
  ];
  matrix[1] = [
    room("S-1", 1, "A", "67.98㎡", 60),
    room("S-1", 1, "B", "61.80㎡", 60),
    room("S-1", 1, "C", "43.26㎡", 40),
    room("S-1", 1, "D", "61.80㎡", 60),
    room("S-1", 1, "E", "61.80㎡", 60),
    room("S-1", 1, "F", "61.80㎡", 60),
    room("S-1", 1, "G", "51.50㎡", 50),
    room("S-1", 1, "X", "サブENT", 35, false),
  ];
  return matrix;
}

function buildS2Plan(): Record<number, (PlanCell | null)[]> {
  const matrix: Record<number, (PlanCell | null)[]> = {};
  for (const floor of FLOOR_LIST) {
    matrix[floor] = [
      room("S-2", floor, "A", "71.10㎡", 70),
      room("S-2", floor, "B", "43.26㎡", 40),
      room("S-2", floor, "C", "50.02㎡", 50),
      room("S-2", floor, "D", "50.02㎡", 50),
      room("S-2", floor, "E", "50.02㎡", 50),
      room("S-2", floor, "F", "47.38㎡", 40),
      room("S-2", floor, "G", "61.80㎡", 60),
      room("S-2", floor, "H", "63.86㎡", 60),
      room("S-2", floor, "I", "61.80㎡", 60),
    ];
  }
  return matrix;
}

function buildS3Plan(): Record<number, (PlanCell | null)[]> {
  const matrix: Record<number, (PlanCell | null)[]> = {};
  for (const floor of [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3] as const) {
    matrix[floor] = [
      room("S-3", floor, "A", "71.92㎡", 70),
      room("S-3", floor, "B", "71.92㎡", 70),
      room("S-3", floor, "C", "71.92㎡", 70),
      room("S-3", floor, "D", "71.92㎡", 70),
      room("S-3", floor, "E", "71.08㎡", 70),
      room("S-3", floor, "F", "71.08㎡", 70),
      room("S-3", floor, "G", "71.92㎡", 70),
      room("S-3", floor, "H", "80.05㎡", 80),
    ];
  }
  matrix[2] = [
    room("S-3", 2, "A", "71.92㎡", 70),
    room("S-3", 2, "B", "71.92㎡", 70),
    room("S-3", 2, "C", "71.92㎡", 70),
    room("S-3", 2, "D", "71.92㎡", 70),
    room("S-3", 2, "E", "71.08㎡", 70),
    room("S-3", 2, "F", "71.08㎡", 70),
    room("S-3", 2, "G", "71.92㎡", 70),
    room("S-3", 2, "X", "吹抜", 35, false),
  ];
  matrix[1] = [
    room("S-3", 1, "A", "71.92㎡", 70),
    room("S-3", 1, "B", "71.92㎡", 70),
    room("S-3", 1, "C", "71.92㎡", 70),
    room("S-3", 1, "D", "71.92㎡", 70),
    room("S-3", 1, "E", "共用", 35, false),
    room("S-3", 1, "F", "共用", 35, false),
    room("S-3", 1, "G", "メール", 35, false),
    room("S-3", 1, "H", "ENT", 35, false),
  ];
  return matrix;
}

function buildS4Plan(): Record<number, (PlanCell | null)[]> {
  const matrix: Record<number, (PlanCell | null)[]> = {};
  matrix[14] = [
    room("S-4", 14, "A", "61.24㎡", 60),
    room("S-4", 14, "B", "61.24㎡", 60),
    room("S-4", 14, "C", "71.92㎡", 70, true, 2),
    room("S-4", 14, "D", "43.26㎡", 40),
    room("S-4", 14, "E", "71.92㎡", 70, true, 2),
    room("S-4", 14, "F", "59.50㎡", 50),
    null,
    null,
    null,
  ];
  matrix[13] = [
    room("S-4", 13, "A", "61.24㎡", 60),
    room("S-4", 13, "B", "61.24㎡", 60),
    room("S-4", 13, "C", "71.92㎡", 70, true, 2),
    room("S-4", 13, "D", "43.26㎡", 40),
    room("S-4", 13, "E", "71.92㎡", 70, true, 2),
    room("S-4", 13, "F", "53.75㎡", 50),
    room("S-4", 13, "G", "85.26㎡", 80, true, 2),
    null,
  ];
  for (const floor of [12, 11, 10, 9, 8, 7, 6] as const) {
    matrix[floor] = [
      room("S-4", floor, "A", "61.24㎡", 60),
      room("S-4", floor, "B", "61.24㎡", 60),
      room("S-4", floor, "C", "71.92㎡", 70, true, 2),
      room("S-4", floor, "D", "43.26㎡", 40),
      room("S-4", floor, "E", "71.92㎡", 70, true, 2),
      room("S-4", floor, "F", "53.75㎡", 50),
      room("S-4", floor, "G", "78.88㎡", 70, true, 2),
      room("S-4", floor, "H", "81.24㎡", 80),
    ];
  }
  for (const floor of [5, 4, 3, 2] as const) {
    matrix[floor] = [
      room("S-4", floor, "A", "61.24㎡", 60),
      room("S-4", floor, "B", "61.24㎡", 60),
      room("S-4", floor, "C", "35.96㎡", 35),
      room("S-4", floor, "D", "35.96㎡", 35),
      room("S-4", floor, "E", "43.26㎡", 40),
      room("S-4", floor, "F", "35.96㎡", 35),
      room("S-4", floor, "G", "35.96㎡", 35),
      room("S-4", floor, "H", "53.75㎡", 50),
      room("S-4", floor, "I", "42.92㎡", 40),
      room("S-4", floor, "J", "35.96㎡", 35),
      room("S-4", floor, "K", "81.24㎡", 80),
    ];
  }
  matrix[1] = [
    room("S-4", 1, "A", "共用", 35, false),
    room("S-4", 1, "B", "共用", 35, false),
    room("S-4", 1, "C", "共用", 35, false, 2),
    room("S-4", 1, "D", "43.26㎡", 40),
    room("S-4", 1, "E", "35.96㎡", 35),
    room("S-4", 1, "F", "35.96㎡", 35),
    room("S-4", 1, "G", "53.75㎡", 50),
    room("S-4", 1, "H", "42.92㎡", 40),
    room("S-4", 1, "I", "35.96㎡", 35),
    room("S-4", 1, "J", "71.98㎡", 70),
  ];
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

function hasMissingSourceField(record: PdfUnitRecord): boolean {
  return record.unitType === null || record.area === null || record.priceManYen === null;
}

function RankCard({
  rank,
  roomCode,
  active,
  onActivate,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  rank: number;
  roomCode: string | null;
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
        active ? "border-[#2f6b93] bg-[#eef4fa] shadow-sm" : "border-slate-300 bg-white",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500">希望{rank}</p>
          <p className="mt-0.5 text-sm font-bold text-slate-900">{roomCode ?? "未選択"}</p>
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
  const [selectedRoomCode, setSelectedRoomCode] = useState("");
  const [activeRankIndex, setActiveRankIndex] = useState(0);
  const [wishes, setWishes] = useState<(string | null)[]>(() => createEmptyWishes());
  const [wishFilters, setWishFilters] = useState<WishFilter[]>(() => createDefaultWishFilters());
  const [submittedWishes, setSubmittedWishes] = useState<(string | null)[]>(() => createEmptyWishes());
  const [dragSourceRankIndex, setDragSourceRankIndex] = useState<number | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedAt, setSavedAt] = useState(() => new Date());
  const [hoveredCell, setHoveredCell] = useState<{ floor: number; start: number; end: number } | null>(null);

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
  const columnLabels = useMemo(
    () => Array.from({ length: planColumnCount }, (_, index) => toColumnLabel(index)),
    [planColumnCount],
  );

  const roomMetaByCode = useMemo(() => {
    const map = new Map<string, { floor: number; start: number; end: number; positionLabel: string }>();
    for (const floor of FLOOR_LIST) {
      let slotCursor = 0;
      for (const cell of plan[floor] ?? []) {
        const span = cell?.colSpan ?? 1;
        const start = slotCursor;
        const end = start + span - 1;
        slotCursor += span;
        if (!cell?.selectable) continue;
        map.set(cell.roomCode, {
          floor,
          start,
          end,
          positionLabel: span === 1 ? toColumnLabel(start) : `${toColumnLabel(start)}-${toColumnLabel(end)}`,
        });
      }
    }
    return map;
  }, [plan]);

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
  const unresolvedPdfRecords = useMemo(
    () => pdfRecordsForBuilding.filter((record) => hasMissingSourceField(record)),
    [pdfRecordsForBuilding],
  );

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
          unitNumber: matchedRecord?.unitNumber ?? `${activeBuilding}-${floor}-${roomMetaByCode.get(cell.roomCode)?.positionLabel ?? "資料確認中"}`,
          unitType: derivedType ?? "資料確認中",
          area: matchedRecord?.area ?? areaFromType ?? cell.label,
          priceManYen: matchedRecord?.priceManYen ?? null,
        });
      }
    }
    return map;
  }, [activeBuilding, plan, roomMetaByCode, pdfRecordsForBuilding, fallbackAreaByType]);

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

  const selectionGuideMessage =
    nextRequiredRankIndex >= 0
      ? `第${guidedRankIndex + 1}希望を選んでください。`
      : wishes.length < MAX_WISH_SLOTS
        ? `希望1〜${wishes.length}の選択が完了しました。＋ボタンで次の希望を追加できます。`
        : "希望1〜3の選択が完了しました。必要ならカードをドラッグして順位を調整してください。";

  const chatLinks = useMemo(() => {
    return wishes.map((roomCode, index) => {
      if (!roomCode) return null;
      const roomLabel = roomDisplayByCode.get(roomCode) ?? roomCode;
      return `/units/chat?rank=${index + 1}&roomCode=${encodeURIComponent(roomLabel)}`;
    });
  }, [wishes, roomDisplayByCode]);

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
              <div className="relative mx-auto h-64 w-52 border-[6px] border-slate-500">
                <div className="absolute left-1/2 top-16 grid w-28 -translate-x-1/2 grid-cols-2 border border-red-400 bg-white">
                  {(["N-1", "N-4", "N-2", "N-3"] as const).map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => selectBuildingFromMap(id)}
                      className={[
                        "h-10 border border-red-300 text-lg font-semibold",
                        activeBuilding === id ? "bg-red-100 text-red-800" : "bg-white text-slate-700 hover:bg-red-50",
                      ].join(" ")}
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
                      className={[
                        "h-10 border border-[#d3c1e2] text-lg font-semibold",
                        activeBuilding === id ? "bg-[#d9c7ea] text-[#4f3a67]" : "bg-[#ece3f4] text-slate-700 hover:bg-[#e2d5ee]",
                      ].join(" ")}
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
                      {columnLabels.map((label, index) => (
                        <th
                          key={`col-label-${label}`}
                          className={[
                            "pb-1 text-center text-xs font-bold text-[#5d7e9e]",
                            hoveredCell && index >= hoveredCell.start && index <= hoveredCell.end ? "text-[#2f6d92] underline" : "",
                          ].join(" ")}
                        >
                          {label}
                        </th>
                      ))}
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
                          const columnHint = span === 1 ? toColumnLabel(colStart) : `${toColumnLabel(colStart)}-${toColumnLabel(colEnd)}`;
                          const unitType = detail?.unitType ?? "資料確認中";
                          const unitArea = detail?.area ?? cell.label;
                          const unitPrice = formatPrice(detail?.priceManYen ?? null);

                          if (!cell.selectable) {
                            return (
                              <td
                                key={cell.roomCode}
                                colSpan={cell.colSpan ?? 1}
                                title={`${floor}階 ${columnHint}列`}
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
                                title={`${floor}階 ${columnHint}列 / ${unitNumber}`}
                                aria-label={`${floor}階 ${columnHint}列 ${unitNumber}`}
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
                <div className="mt-3 rounded border border-amber-300 bg-amber-50 p-3 text-sm">
                  <p className="font-semibold text-amber-900">資料未反映住戸（{activeBuilding}棟）</p>
                  {unresolvedPdfRecords.length > 0 ? (
                    <>
                      <p className="mt-1 text-xs text-amber-800">OCR不足により価格/型/面積の一部が欠けています。手動補完対象: {unresolvedPdfRecords.length}件</p>
                      <ul className="mt-2 max-h-36 space-y-1 overflow-auto text-xs text-amber-900">
                        {unresolvedPdfRecords.map((record) => {
                          const missingParts = [
                            record.priceManYen === null ? "価格" : null,
                            record.unitType === null ? "型" : null,
                            record.area === null ? "面積" : null,
                          ].filter((part): part is string => part !== null);
                          return (
                            <li key={record.unitNumber} className="rounded border border-amber-200 bg-white px-2 py-1">
                              {record.unitNumber}（不足: {missingParts.join("・")}）
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  ) : (
                    <p className="mt-1 text-xs text-emerald-700">この棟のOCRデータ欠損はありません。</p>
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
              <RankCard
                key={`rank-${index}`}
                rank={index + 1}
                roomCode={roomCode ? (roomDisplayByCode.get(roomCode) ?? roomCode) : null}
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
        <p className="text-sm font-bold text-slate-900">希望順位ごとの対話チャット</p>
        <p className="mt-1 text-xs text-slate-500">同じ希望順位で同じ部屋を選んだ人と対話できます。入室時に挨拶を自動投稿します。</p>
        <div className="mt-3">
          <Link
            href="/units/chat?scope=global"
            className="inline-flex cursor-pointer rounded-xl border border-[#2f6d92] bg-[#eef6fc] px-3 py-2 text-sm font-semibold text-[#1f5a7d] transition hover:bg-[#e1f0fb]"
          >
            全体調整チャットに入る
          </Link>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {wishes.map((roomCode, index) => {
            const href = chatLinks[index];
            const roomLabel = roomCode ? roomDisplayByCode.get(roomCode) ?? roomCode : null;
            if (!href || !roomCode) {
              return (
                <span
                  key={`chat-rank-${index + 1}`}
                  className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-center text-sm font-semibold text-slate-400"
                >
                  第{index + 1}希望チャット（未選択）
                </span>
              );
            }

            return (
              <Link
                key={`chat-rank-${index + 1}`}
                href={href}
                className="cursor-pointer rounded-xl border border-[#d73a49] bg-[#fff5f6] px-3 py-2 text-center text-sm font-semibold text-[#b22735] transition hover:bg-[#ffecee]"
              >
                第{index + 1}希望: {roomLabel}
              </Link>
            );
          })}
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
