export type BuildingId = "N-1" | "N-2" | "N-3" | "N-4" | "S-1" | "S-2" | "S-3" | "S-4";

export type Unit = {
  id: string;
  building: BuildingId;
  floor: number;
  line: "A" | "B" | "C" | "D";
  areaM2: number;
  orientation: "東" | "西" | "南" | "北";
  page: 1 | 2;
};

export const BUILDINGS: BuildingId[] = ["N-1", "N-2", "N-3", "N-4", "S-1", "S-2", "S-3", "S-4"];

const AREA_BY_LINE: Record<Unit["line"], number> = {
  A: 35.96,
  B: 50.24,
  C: 67.1,
  D: 71.92,
};

const ORIENTATION_BY_BUILDING: Record<BuildingId, Unit["orientation"]> = {
  "N-1": "東",
  "N-2": "東",
  "N-3": "西",
  "N-4": "西",
  "S-1": "南",
  "S-2": "南",
  "S-3": "南",
  "S-4": "北",
};

export const UNITS: Unit[] = BUILDINGS.flatMap((building) => {
  const orientation = ORIENTATION_BY_BUILDING[building];
  const floors = Array.from({ length: 14 }, (_, i) => i + 1);
  const lines: Unit["line"][] = ["A", "B", "C", "D"];

  return floors.flatMap((floor) => {
    const page: 1 | 2 = floor <= 7 ? 1 : 2;
    return lines.map((line) => ({
      id: `${building}-${floor.toString().padStart(2, "0")}-${line}`,
      building,
      floor,
      line,
      areaM2: AREA_BY_LINE[line],
      orientation,
      page,
    }));
  });
});

export function getUnitsByBuildingAndPage(building: BuildingId, page: 1 | 2): Unit[] {
  return UNITS.filter((unit) => unit.building === building && unit.page === page).sort(
    (a, b) => b.floor - a.floor || a.line.localeCompare(b.line),
  );
}
