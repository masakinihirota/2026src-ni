import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { ADMIN_AUTH_COOKIE_NAME, isValidAdminSession } from "@/lib/admin-auth";
import { fail, ok } from "@/lib/api/types";

const wishesRoute = new Hono();

const sessionSelections = new Map<string, string[]>();
const submissionLogs: {
  id: string;
  submittedAt: string;
  sessionId: string;
  userName: string | null;
  zodiacAlias: string | null;
  unitIds: string[];
}[] = [];
const MAX_LOG_ENTRIES = 2000;

const submitWishSchema = z.object({
  sessionId: z.string().min(8).max(128),
  unitIds: z.array(z.string().min(5)).max(3),
  userName: z.string().trim().min(1).max(80).optional(),
  zodiacAlias: z.string().trim().min(1).max(80).optional(),
});

const POPULARITY_SCOPE_LIMIT = {
  firstOnly: 1,
  firstTwo: 2,
  firstThree: 3,
} as const;

type PopularityScope = keyof typeof POPULARITY_SCOPE_LIMIT;

type PopularityEntry = {
  unitId: string;
  count: number;
};

function collectPopularityEntries(rankLimit: number): PopularityEntry[] {
  const counts = new Map<string, number>();
  for (const unitIds of sessionSelections.values()) {
    const maxIndex = Math.min(rankLimit, unitIds.length);
    for (let index = 0; index < maxIndex; index += 1) {
      const unitId = unitIds[index];
      if (!unitId) continue;
      counts.set(unitId, (counts.get(unitId) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([unitId, count]) => ({ unitId, count }))
    .sort((a, b) => b.count - a.count || a.unitId.localeCompare(b.unitId));
}

function collectPopularityByScope(): Record<PopularityScope, PopularityEntry[]> {
  return {
    firstOnly: collectPopularityEntries(POPULARITY_SCOPE_LIMIT.firstOnly),
    firstTwo: collectPopularityEntries(POPULARITY_SCOPE_LIMIT.firstTwo),
    firstThree: collectPopularityEntries(POPULARITY_SCOPE_LIMIT.firstThree),
  };
}

function createLogId(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1_000_000_000)}`;
}

function readCookieValue(rawCookie: string | undefined, key: string): string | null {
  if (!rawCookie) return null;
  const pairs = rawCookie.split(";");
  for (const pair of pairs) {
    const [cookieKey, ...valueParts] = pair.split("=");
    if (!cookieKey) continue;
    if (cookieKey.trim() !== key) continue;
    return decodeURIComponent(valueParts.join("=").trim());
  }
  return null;
}

wishesRoute.post("/", zValidator("json", submitWishSchema), (c) => {
  const payload = c.req.valid("json");
  const normalizedUnitIds = Array.from(new Set(payload.unitIds));
  sessionSelections.set(payload.sessionId, normalizedUnitIds);
  submissionLogs.unshift({
    id: createLogId(),
    submittedAt: new Date().toISOString(),
    sessionId: payload.sessionId,
    userName: payload.userName ?? null,
    zodiacAlias: payload.zodiacAlias ?? null,
    unitIds: normalizedUnitIds,
  });
  if (submissionLogs.length > MAX_LOG_ENTRIES) {
    submissionLogs.length = MAX_LOG_ENTRIES;
  }

  return c.json(
    ok({
      sessionId: payload.sessionId,
      selectedCount: normalizedUnitIds.length,
    }),
  );
});

wishesRoute.get("/popularity", (c) => {
  const entriesByScope = collectPopularityByScope();

  return c.json(
    ok({
      totalSessions: sessionSelections.size,
      entriesByScope,
      entries: entriesByScope.firstThree,
    }),
  );
});

wishesRoute.get("/admin-summary", (c) => {
  const adminCookie = readCookieValue(c.req.header("cookie"), ADMIN_AUTH_COOKIE_NAME);
  if (!isValidAdminSession(adminCookie)) {
    return c.json(fail("FORBIDDEN", "管理者ログインが必要です。"), 403);
  }

  const topRooms = collectPopularityEntries(POPULARITY_SCOPE_LIMIT.firstThree).slice(0, 10);

  const uniqueSubmitterCount = new Set(submissionLogs.map((log) => log.sessionId)).size;
  const totalSelectedUnits = submissionLogs.reduce((sum, log) => sum + log.unitIds.length, 0);
  const recentLogs = submissionLogs.slice(0, 80);

  return c.json(
    ok({
      totals: {
        activeSessionCount: sessionSelections.size,
        submissionCount: submissionLogs.length,
        uniqueSubmitterCount,
        totalSelectedUnits,
        lastSubmittedAt: submissionLogs[0]?.submittedAt ?? null,
      },
      topRooms,
      recentLogs,
    }),
  );
});

export { wishesRoute };
