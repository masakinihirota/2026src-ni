import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { ADMIN_AUTH_COOKIE_NAME, isValidAdminSession } from "@/lib/admin-auth";
import { fail, ok } from "@/lib/api/types";

const chatsRoute = new Hono();

type StoredChatMessage = {
  id: string;
  roomScope: string;
  senderId: string;
  sender: string;
  body: string;
  postedAt: string;
};

const roomMessages = new Map<string, StoredChatMessage[]>();
const MAX_MESSAGES_PER_ROOM = 500;
const ROOM_SCOPE_REGEX = /^[A-Za-z0-9\-_:]+$/;

const postMessageSchema = z.object({
  senderId: z.string().trim().min(1).max(128),
  sender: z.string().trim().min(1).max(80),
  body: z.string().trim().min(1).max(2000),
});

function normalizeRoomScope(rawRoomScope: string): string | null {
  const value = rawRoomScope.trim();
  if (!value) return null;
  if (!ROOM_SCOPE_REGEX.test(value)) return null;
  return value;
}

function createMessageId(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1_000_000_000)}`;
}

function roomSnapshot(roomScope: string): {
  participantCount: number;
  messageCount: number;
  lastPostedAt: string | null;
} {
  const messages = roomMessages.get(roomScope) ?? [];
  const participantCount = new Set(messages.map((message) => message.senderId)).size;
  return {
    participantCount,
    messageCount: messages.length,
    lastPostedAt: messages[messages.length - 1]?.postedAt ?? null,
  };
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

chatsRoute.get("/rooms/:roomScope/messages", (c) => {
  const roomScope = normalizeRoomScope(c.req.param("roomScope"));
  if (!roomScope) {
    return c.json(fail("VALIDATION_ERROR", "roomScope が不正です。"), 400);
  }

  const messages = roomMessages.get(roomScope) ?? [];
  return c.json(
    ok({
      roomScope,
      messages,
      ...roomSnapshot(roomScope),
    }),
  );
});

chatsRoute.post("/rooms/:roomScope/messages", zValidator("json", postMessageSchema), (c) => {
  const roomScope = normalizeRoomScope(c.req.param("roomScope"));
  if (!roomScope) {
    return c.json(fail("VALIDATION_ERROR", "roomScope が不正です。"), 400);
  }

  const payload = c.req.valid("json");
  const nextMessage: StoredChatMessage = {
    id: createMessageId(),
    roomScope,
    senderId: payload.senderId,
    sender: payload.sender,
    body: payload.body,
    postedAt: new Date().toISOString(),
  };

  const existing = roomMessages.get(roomScope) ?? [];
  existing.push(nextMessage);
  if (existing.length > MAX_MESSAGES_PER_ROOM) {
    existing.splice(0, existing.length - MAX_MESSAGES_PER_ROOM);
  }
  roomMessages.set(roomScope, existing);

  return c.json(
    ok({
      message: nextMessage,
      ...roomSnapshot(roomScope),
    }),
  );
});

chatsRoute.get("/summaries", (c) => {
  const raw = c.req.query("roomScopes") ?? "";
  const roomScopes = raw
    .split(",")
    .map((item) => normalizeRoomScope(item))
    .filter((item): item is string => item !== null);

  if (roomScopes.length === 0) {
    return c.json(fail("VALIDATION_ERROR", "roomScopes を指定してください。"), 400);
  }

  return c.json(
    ok({
      summaries: roomScopes.map((roomScope) => ({
        roomScope,
        ...roomSnapshot(roomScope),
      })),
    }),
  );
});

chatsRoute.get("/admin-summary", (c) => {
  const adminCookie = readCookieValue(c.req.header("cookie"), ADMIN_AUTH_COOKIE_NAME);
  if (!isValidAdminSession(adminCookie)) {
    return c.json(fail("FORBIDDEN", "管理者ログインが必要です。"), 403);
  }

  const roomSummaries = Array.from(roomMessages.entries())
    .map(([roomScope, messages]) => ({
      roomScope,
      ...roomSnapshot(roomScope),
      messageCount: messages.length,
    }))
    .sort((a, b) => b.messageCount - a.messageCount || a.roomScope.localeCompare(b.roomScope, "ja-JP"));

  const recentMessages = Array.from(roomMessages.values())
    .flatMap((messages) => messages)
    .sort((a, b) => b.postedAt.localeCompare(a.postedAt))
    .slice(0, 200);

  const uniqueSenderCount = new Set(recentMessages.map((message) => message.senderId)).size;
  const totalMessageCount = Array.from(roomMessages.values()).reduce((sum, messages) => sum + messages.length, 0);
  const lastPostedAt = recentMessages[0]?.postedAt ?? null;

  return c.json(
    ok({
      totals: {
        roomCount: roomMessages.size,
        totalMessageCount,
        uniqueSenderCount,
        lastPostedAt,
      },
      roomSummaries,
      recentMessages,
    }),
  );
});

export { chatsRoute };
