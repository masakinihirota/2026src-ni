import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { ADMIN_AUTH_COOKIE_NAME, isValidAdminSession } from "@/lib/admin-auth";
import { fail, ok } from "@/lib/api/types";
import { PDF_UNIT_RECORDS } from "@/lib/unit-price-data";

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

const dataSourceModeSchema = z.object({
  mode: z.enum(["live", "dummy", "both"]),
});

type PopularityScope = "firstOnly" | "firstTwo" | "firstThree";
type DataSourceMode = "live" | "dummy" | "both";

type PopularityEntry = {
  unitId: string;
  count: number;
};

type ScopeCountMap = Record<PopularityScope, Map<string, number>>;

const DUMMY_UNIT_IDS = Array.from(new Set(PDF_UNIT_RECORDS.map((record) => record.unitNumber)));
let popularityDataSourceMode: DataSourceMode = "both";

function createScopeCountMap(): ScopeCountMap {
  return {
    firstOnly: new Map<string, number>(),
    firstTwo: new Map<string, number>(),
    firstThree: new Map<string, number>(),
  };
}

function addCount(map: Map<string, number>, unitId: string, count: number): void {
  if (count <= 0) return;
  map.set(unitId, (map.get(unitId) ?? 0) + count);
}

function mergeScopeCountMap(base: ScopeCountMap, extra: ScopeCountMap): ScopeCountMap {
  const merged = createScopeCountMap();
  for (const scope of Object.keys(merged) as PopularityScope[]) {
    for (const [unitId, count] of base[scope]) {
      addCount(merged[scope], unitId, count);
    }
    for (const [unitId, count] of extra[scope]) {
      addCount(merged[scope], unitId, count);
    }
  }
  return merged;
}

function scopeCountMapToEntries(scopeMap: ScopeCountMap): Record<PopularityScope, PopularityEntry[]> {
  return {
    firstOnly: Array.from(scopeMap.firstOnly.entries())
      .map(([unitId, count]) => ({ unitId, count }))
      .sort((a, b) => b.count - a.count || a.unitId.localeCompare(b.unitId)),
    firstTwo: Array.from(scopeMap.firstTwo.entries())
      .map(([unitId, count]) => ({ unitId, count }))
      .sort((a, b) => b.count - a.count || a.unitId.localeCompare(b.unitId)),
    firstThree: Array.from(scopeMap.firstThree.entries())
      .map(([unitId, count]) => ({ unitId, count }))
      .sort((a, b) => b.count - a.count || a.unitId.localeCompare(b.unitId)),
  };
}

function hashValue(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function collectLiveScopeCounts(): ScopeCountMap {
  const counts = createScopeCountMap();
  for (const unitIds of sessionSelections.values()) {
    const first = unitIds[0];
    const second = unitIds[1];
    const third = unitIds[2];
    if (first) {
      addCount(counts.firstOnly, first, 1);
      addCount(counts.firstTwo, first, 1);
      addCount(counts.firstThree, first, 1);
    }
    if (second) {
      addCount(counts.firstTwo, second, 1);
      addCount(counts.firstThree, second, 1);
    }
    if (third) {
      addCount(counts.firstThree, third, 1);
    }
  }
  return counts;
}

function collectDummyScopeCounts(): ScopeCountMap {
  const counts = createScopeCountMap();
  for (const unitId of DUMMY_UNIT_IDS) {
    const first = hashValue(`${unitId}:rank1`) % 5;
    const second = hashValue(`${unitId}:rank2`) % 4;
    const third = hashValue(`${unitId}:rank3`) % 3;
    addCount(counts.firstOnly, unitId, first);
    addCount(counts.firstTwo, unitId, first + second);
    addCount(counts.firstThree, unitId, first + second + third);
  }
  return counts;
}

function collectPopularityByScope(
  mode: DataSourceMode,
): {
  entriesByScope: Record<PopularityScope, PopularityEntry[]>;
} {
  const liveCounts = collectLiveScopeCounts();
  const dummyCounts = collectDummyScopeCounts();
  let scopedCounts: ScopeCountMap;

  if (mode === "live") {
    scopedCounts = liveCounts;
  } else if (mode === "dummy") {
    scopedCounts = dummyCounts;
  } else {
    scopedCounts = mergeScopeCountMap(liveCounts, dummyCounts);
  }

  return {
    entriesByScope: scopeCountMapToEntries(scopedCounts),
  };
}

function collectTopRooms(entriesByScope: Record<PopularityScope, PopularityEntry[]>): PopularityEntry[] {
  return entriesByScope.firstThree.slice(0, 10);
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

function ensureAdmin(cookiesHeader: string | undefined): { ok: true } | { ok: false; response: Response } {
  const adminCookie = readCookieValue(cookiesHeader, ADMIN_AUTH_COOKIE_NAME);
  if (!isValidAdminSession(adminCookie)) {
    return {
      ok: false,
      response: new Response(JSON.stringify(fail("FORBIDDEN", "管理者ログインが必要です。")), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }
  return { ok: true };
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
  const { entriesByScope } = collectPopularityByScope(popularityDataSourceMode);

  return c.json(
    ok({
      totalSessions: sessionSelections.size,
      dataSourceMode: popularityDataSourceMode,
      entriesByScope,
      entries: entriesByScope.firstThree,
    }),
  );
});

wishesRoute.get("/admin-data-source", (c) => {
  const auth = ensureAdmin(c.req.header("cookie"));
  if (!auth.ok) return auth.response;
  return c.json(
    ok({
      mode: popularityDataSourceMode,
      options: ["live", "dummy", "both"] as const,
    }),
  );
});

wishesRoute.post("/admin-data-source", zValidator("json", dataSourceModeSchema), (c) => {
  const auth = ensureAdmin(c.req.header("cookie"));
  if (!auth.ok) return auth.response;
  const payload = c.req.valid("json");
  popularityDataSourceMode = payload.mode;
  return c.json(
    ok({
      mode: popularityDataSourceMode,
    }),
  );
});

wishesRoute.get("/admin-summary", (c) => {
  const auth = ensureAdmin(c.req.header("cookie"));
  if (!auth.ok) return auth.response;

  const { entriesByScope } = collectPopularityByScope(popularityDataSourceMode);
  const topRooms = collectTopRooms(entriesByScope);

  const uniqueSubmitterCount = new Set(submissionLogs.map((log) => log.sessionId)).size;
  const totalSelectedUnits = submissionLogs.reduce((sum, log) => sum + log.unitIds.length, 0);
  const recentLogs = submissionLogs.slice(0, 120);

  return c.json(
    ok({
      totals: {
        activeSessionCount: sessionSelections.size,
        submissionCount: submissionLogs.length,
        uniqueSubmitterCount,
        totalSelectedUnits,
        lastSubmittedAt: submissionLogs[0]?.submittedAt ?? null,
      },
      dataSourceMode: popularityDataSourceMode,
      sourceStatus: {
        dummyUnitCount: DUMMY_UNIT_IDS.length,
      },
      topRooms,
      recentLogs,
    }),
  );
});

export { wishesRoute };
