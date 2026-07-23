export function sanitizeRoomToken(value: string): string {
  const normalized = value.trim();
  if (!normalized) return "unknown";
  return normalized.replace(/[^A-Za-z0-9_-]/g, "_");
}

export function buildRoomScope(params: { scope: "room" | "global"; roomCode: string }): string {
  if (params.scope === "global") return "global";
  const roomToken = sanitizeRoomToken(params.roomCode);
  return `room-${roomToken}`;
}
