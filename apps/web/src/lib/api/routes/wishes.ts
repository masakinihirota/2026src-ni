import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { ok } from "@/lib/api/types";

const wishesRoute = new Hono();

const sessionSelections = new Map<string, Set<string>>();
const popularity = new Map<string, number>();

const submitWishSchema = z.object({
  sessionId: z.string().min(8).max(128),
  unitIds: z.array(z.string().min(5)).max(50),
});

function rebuildPopularity(): void {
  popularity.clear();
  for (const units of sessionSelections.values()) {
    for (const unitId of units) {
      popularity.set(unitId, (popularity.get(unitId) ?? 0) + 1);
    }
  }
}

wishesRoute.post("/", zValidator("json", submitWishSchema), (c) => {
  const payload = c.req.valid("json");
  sessionSelections.set(payload.sessionId, new Set(payload.unitIds));
  rebuildPopularity();

  return c.json(
    ok({
      sessionId: payload.sessionId,
      selectedCount: payload.unitIds.length,
    }),
  );
});

wishesRoute.get("/popularity", (c) => {
  const entries = Array.from(popularity.entries()).map(([unitId, count]) => ({ unitId, count }));
  entries.sort((a, b) => b.count - a.count || a.unitId.localeCompare(b.unitId));

  return c.json(
    ok({
      totalSessions: sessionSelections.size,
      entries,
    }),
  );
});

export { wishesRoute };
