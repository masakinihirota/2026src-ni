import type { BuildingId } from "@/lib/housing-data";

export type AreaBand = 35 | 40 | 50 | 60 | 70 | 80;

export type PlanCell = {
  roomCode: string;
  label: string;
  band: AreaBand;
  selectable: boolean;
  colSpan?: number;
};

export const FLOOR_LIST = [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1] as const;

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

export function buildPlanForBuilding(building: BuildingId): Record<number, (PlanCell | null)[]> {
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
