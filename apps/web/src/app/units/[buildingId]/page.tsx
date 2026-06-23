import { notFound } from "next/navigation";

import { BuildingUnitsPageView } from "@/components/units-page";
import { BUILDINGS, type BuildingId } from "@/lib/housing-data";

function isBuildingId(value: string): value is BuildingId {
  return BUILDINGS.includes(value as BuildingId);
}

export default async function Page({ params }: { params: Promise<{ buildingId: string }> }) {
  const { buildingId } = await params;

  if (!isBuildingId(buildingId)) {
    notFound();
  }

  return <BuildingUnitsPageView building={buildingId} />;
}
