export type ChatDisplayMode = "alias" | "unit";
export type VerificationStatus = "unverified" | "verified";

export type UserProfile = {
  userId: string;
  userName: string;
  zodiacAlias: string;
  chatDisplayMode: ChatDisplayMode;
  verificationStatus: VerificationStatus;
};

const ALIAS_COLORS = [
  "赤い",
  "真紅の",
  "紅の",
  "青い",
  "蒼色の",
  "群青の",
  "紺の",
  "翠の",
  "緑の",
  "若草色の",
  "琥珀の",
  "黄色い",
  "桃色の",
  "藍の",
  "水色の",
  "橙の",
  "紫の",
  "藤色の",
  "薔薇の",
  "黄緑の",
  "青緑の",
  "空色の",
  "紅紫の",
  "鉄紺の",
  "白い",
  "黒い",
  "灰色の",
  "銀色の",
  "金色の",
  "虹色の",
] as const;

const ALIAS_ADJECTIVES = [
  "煌めく",
  "情熱の",
  "静寂の",
  "輝く",
  "優雅な",
  "神秘の",
  "強固な",
  "知的な",
  "慈愛の",
  "自由な",
  "不屈の",
  "夢幻の",
  "凛とした",
  "穏やかな",
  "透徹の",
  "祝福の",
  "深淵の",
  "星詠みの",
  "月影の",
  "朝凪の",
  "宵闇の",
  "永遠の",
  "叡智の",
  "革新の",
  "幻想の",
  "炎の",
  "氷の",
  "風の",
  "水の",
  "土の",
  "雷の",
  "砂の",
  "霧の",
  "光の",
  "影の",
  "闇の",
  "宇宙の",
  "時間の",
  "虚空の",
  "重力の",
  "光速の",
  "希望の",
  "絆の",
  "宿命の",
] as const;

const ALIAS_SIGNS = [
  "水瓶座",
  "魚座",
  "牡羊座",
  "牡牛座",
  "双子座",
  "蟹座",
  "獅子座",
  "乙女座",
  "天秤座",
  "蠍座",
  "射手座",
  "山羊座",
] as const;
export const ALIAS_SIGN_OPTIONS = [...ALIAS_SIGNS];

export const USER_ID_STORAGE_KEY = "units:user-id:v1";
export const USER_NAME_STORAGE_KEY = "units:user-name:v1";
export const USER_ALIAS_NONCE_STORAGE_KEY = "units:user-alias-nonce:v1";
export const USER_ALIAS_PREFIX = "units:user-alias:v1:";
export const USER_CHAT_DISPLAY_MODE_STORAGE_KEY = "units:chat-display-mode:v1";
export const ROOM_CHAT_DISPLAY_MODE_PREFIX = "units:chat-display-mode-room:v1:";
export const USER_LOGIN_COMPLETE_STORAGE_KEY = "units:login-complete:v1";
export const USER_VERIFICATION_STATUS_STORAGE_KEY = "units:verification-status:v1";
export const GUEST_TAG_STORAGE_KEY = "units:guest-tag:v1";
export const REGISTERED_ZODIAC_ALIAS_REGISTRY_KEY = "units:registered-zodiac-aliases:v1";

const MANAGEMENT_VERIFICATION_CODES = ["NIKKO-2026-A", "NIKKO-2026-B", "NIKKO-2026-C"] as const;

function hashValue(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function createUserId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

function createGuestTag(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let value = "";
  for (let index = 0; index < 3; index++) {
    value += chars[Math.floor(Math.random() * chars.length)];
  }
  return value;
}

function aliasKeyOf(userId: string): string {
  return `${USER_ALIAS_PREFIX}${userId}`;
}

function readAliasRegistry(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(REGISTERED_ZODIAC_ALIAS_REGISTRY_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return Object.entries(parsed).reduce<Record<string, string>>((acc, [alias, owner]) => {
      if (typeof alias === "string" && typeof owner === "string" && alias.trim() && owner.trim()) {
        acc[alias] = owner;
      }
      return acc;
    }, {});
  } catch (error) {
    console.error("Failed to parse local alias registry", error);
    window.localStorage.removeItem(REGISTERED_ZODIAC_ALIAS_REGISTRY_KEY);
    return {};
  }
}

function writeAliasRegistry(registry: Record<string, string>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REGISTERED_ZODIAC_ALIAS_REGISTRY_KEY, JSON.stringify(registry));
}

function loadAliasRegistry(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const registry = readAliasRegistry();
  let changed = false;

  for (let index = 0; index < window.localStorage.length; index++) {
    const key = window.localStorage.key(index);
    if (!key || !key.startsWith(USER_ALIAS_PREFIX)) continue;
    const ownerId = key.slice(USER_ALIAS_PREFIX.length);
    const alias = window.localStorage.getItem(key)?.trim() ?? "";
    if (!ownerId || !alias) continue;
    if (registry[alias] !== ownerId) {
      registry[alias] = ownerId;
      changed = true;
    }
  }

  if (changed) writeAliasRegistry(registry);
  return registry;
}

function aliasTakenByOther(alias: string, userId: string): boolean {
  if (typeof window === "undefined") return false;
  const ownerFromRegistry = loadAliasRegistry()[alias];
  if (ownerFromRegistry && ownerFromRegistry !== userId) return true;
  for (let index = 0; index < window.localStorage.length; index++) {
    const key = window.localStorage.key(index);
    if (!key || !key.startsWith(USER_ALIAS_PREFIX)) continue;
    const ownerId = key.slice(USER_ALIAS_PREFIX.length);
    if (ownerId === userId) continue;
    if (window.localStorage.getItem(key) === alias) return true;
  }
  return false;
}

function buildAliasCandidate(userId: string, sign: string, nonce: number, slot: number): string {
  const base = `${userId}:${nonce}:${slot}`;
  const color = ALIAS_COLORS[hashValue(`${base}:color`) % ALIAS_COLORS.length];
  const modifier = ALIAS_ADJECTIVES[hashValue(`${base}:adj`) % ALIAS_ADJECTIVES.length];
  const connector = modifier.endsWith("の") ? "" : "の";
  return `${color}${modifier}${connector}${sign}`;
}

export function detectSignFromAlias(alias: string): string | null {
  for (const sign of ALIAS_SIGNS) {
    if (alias.endsWith(sign)) return sign;
  }
  return null;
}

function normalizeVerificationCode(input: string): string {
  return input
    .trim()
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/[―ー－]/g, "-")
    .toUpperCase();
}

export function isValidManagementVerificationCode(code: string): boolean {
  const normalized = normalizeVerificationCode(code);
  return MANAGEMENT_VERIFICATION_CODES.includes(normalized as (typeof MANAGEMENT_VERIFICATION_CODES)[number]);
}

export function ensureUserId(): string {
  if (typeof window === "undefined") return "temp-user";
  const existingUserId = window.localStorage.getItem(USER_ID_STORAGE_KEY)?.trim();
  if (existingUserId) return existingUserId;
  const generated = createUserId();
  window.localStorage.setItem(USER_ID_STORAGE_KEY, generated);
  return generated;
}

export function readAliasNonce(): number {
  if (typeof window === "undefined") return 0;
  const raw = Number(window.localStorage.getItem(USER_ALIAS_NONCE_STORAGE_KEY) ?? "0");
  return Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 0;
}

export function writeAliasNonce(nonce: number): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USER_ALIAS_NONCE_STORAGE_KEY, String(Math.max(0, Math.floor(nonce))));
}

export function generateAliasChoices(userId: string, sign: string, startNonce: number, count = 3): { aliases: string[]; nextNonce: number } {
  const aliases: string[] = [];
  let nonce = startNonce;

  while (aliases.length < count && nonce < startNonce + 5_000) {
    const candidate = buildAliasCandidate(userId, sign, nonce, aliases.length);
    if (!aliases.includes(candidate) && !aliasTakenByOther(candidate, userId)) {
      aliases.push(candidate);
    } else {
      const fallback = `${candidate}${(hashValue(`${userId}:${nonce}:fallback`) % 90) + 10}`;
      if (!aliases.includes(fallback) && !aliasTakenByOther(fallback, userId)) {
        aliases.push(fallback);
      }
    }
    nonce += 1;
  }

  return { aliases, nextNonce: nonce };
}

export function getStoredUserProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  if (window.localStorage.getItem(USER_LOGIN_COMPLETE_STORAGE_KEY) !== "1") return null;

  const userId = window.localStorage.getItem(USER_ID_STORAGE_KEY)?.trim() ?? "";
  const userName = window.localStorage.getItem(USER_NAME_STORAGE_KEY)?.trim() ?? "";
  const modeRaw = window.localStorage.getItem(USER_CHAT_DISPLAY_MODE_STORAGE_KEY);
  const verificationRaw = window.localStorage.getItem(USER_VERIFICATION_STATUS_STORAGE_KEY);
  const verificationStatus: VerificationStatus = verificationRaw === "verified" ? "verified" : "unverified";
  const chatDisplayMode: ChatDisplayMode = verificationStatus === "verified" && modeRaw === "unit" ? "unit" : "alias";
  const alias = userId ? window.localStorage.getItem(aliasKeyOf(userId)) : null;

  if (!userId || !userName || !alias || aliasTakenByOther(alias, userId)) return null;
  return { userId, userName, zodiacAlias: alias, chatDisplayMode, verificationStatus };
}

export function createAndStoreUserProfile(params: {
  userName: string;
  chatDisplayMode: ChatDisplayMode;
  zodiacAlias: string;
  verificationCode?: string;
}): UserProfile {
  const verificationStatus: VerificationStatus = isValidManagementVerificationCode(params.verificationCode ?? "") ? "verified" : "unverified";
  const chatDisplayMode: ChatDisplayMode = verificationStatus === "verified" ? params.chatDisplayMode : "alias";

  if (typeof window === "undefined") {
    return {
      userId: "temp-user",
      userName: params.userName,
      zodiacAlias: params.zodiacAlias,
      chatDisplayMode,
      verificationStatus,
    };
  }

  const userId = ensureUserId();
  const aliasStorageKey = aliasKeyOf(userId);
  const selectedAlias = params.zodiacAlias.trim();
  let zodiacAlias = selectedAlias;

  if (!selectedAlias || aliasTakenByOther(selectedAlias, userId)) {
    const generated = generateAliasChoices(userId, ALIAS_SIGNS[0], readAliasNonce(), 1);
    zodiacAlias = generated.aliases[0] ?? "青い煌めくの水瓶座";
    writeAliasNonce(generated.nextNonce);
  }

  const aliasRegistry = loadAliasRegistry();
  for (const [alias, ownerId] of Object.entries(aliasRegistry)) {
    if (ownerId === userId) {
      delete aliasRegistry[alias];
    }
  }
  aliasRegistry[zodiacAlias] = userId;
  writeAliasRegistry(aliasRegistry);

  window.localStorage.setItem(aliasStorageKey, zodiacAlias);
  window.localStorage.setItem(USER_NAME_STORAGE_KEY, params.userName);
  window.localStorage.setItem(USER_CHAT_DISPLAY_MODE_STORAGE_KEY, chatDisplayMode);
  window.localStorage.setItem(USER_VERIFICATION_STATUS_STORAGE_KEY, verificationStatus);
  window.localStorage.setItem(USER_LOGIN_COMPLETE_STORAGE_KEY, "1");

  return {
    userId,
    userName: params.userName,
    zodiacAlias,
    chatDisplayMode,
    verificationStatus,
  };
}

export function updateChatDisplayMode(mode: ChatDisplayMode): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USER_CHAT_DISPLAY_MODE_STORAGE_KEY, mode);
}

function roomChatDisplayModeKey(roomScope: string): string {
  return `${ROOM_CHAT_DISPLAY_MODE_PREFIX}${roomScope}`;
}

export function getRoomChatDisplayMode(roomScope: string, verificationStatus: VerificationStatus): ChatDisplayMode {
  if (typeof window === "undefined") return "alias";
  const raw = window.localStorage.getItem(roomChatDisplayModeKey(roomScope));
  return verificationStatus === "verified" && raw === "unit" ? "unit" : "alias";
}

export function setRoomChatDisplayMode(roomScope: string, mode: ChatDisplayMode): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(roomChatDisplayModeKey(roomScope), mode);
}

export function ensureGuestTag(): string {
  if (typeof window === "undefined") return "000";
  const existing = window.localStorage.getItem(GUEST_TAG_STORAGE_KEY)?.trim().toUpperCase() ?? "";
  if (/^[A-Z0-9]{3}$/.test(existing)) return existing;
  const generated = createGuestTag();
  window.localStorage.setItem(GUEST_TAG_STORAGE_KEY, generated);
  return generated;
}
