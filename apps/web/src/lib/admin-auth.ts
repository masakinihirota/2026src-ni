export const ADMIN_AUTH_COOKIE_NAME = "units-admin-session";

const ADMIN_HIDDEN_PATH_ENV_KEY = "ADMIN_HIDDEN_PATH";
const ADMIN_PASSWORD_ENV_KEY = "ADMIN_PORTAL_PASSWORD";

function normalizeAdminHiddenPath(raw: string | undefined): string | null {
  const value = (raw ?? "").trim().replace(/^\/+|\/+$/g, "");
  if (!value || value.includes("/")) return null;
  return value;
}

function getAdminPassword(): string | null {
  const value = (process.env[ADMIN_PASSWORD_ENV_KEY] ?? "").trim();
  return value ? value : null;
}

function hashString(input: string): string {
  let hashA = 0x811c9dc5;
  let hashB = 0x01000193;
  for (let index = 0; index < input.length; index++) {
    const code = input.charCodeAt(index);
    hashA = Math.imul(hashA ^ code, 0x01000193) >>> 0;
    hashB = Math.imul(hashB ^ code, 0x27d4eb2d) >>> 0;
  }
  return `${hashA.toString(16).padStart(8, "0")}${hashB.toString(16).padStart(8, "0")}`;
}

function safeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index++) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}

function buildAdminSessionToken(hiddenPath: string, password: string): string {
  return hashString(`units-admin:v1:${hiddenPath}:${password}`);
}

export function getAdminHiddenPath(): string | null {
  return normalizeAdminHiddenPath(process.env[ADMIN_HIDDEN_PATH_ENV_KEY]);
}

export function isAdminAuthConfigured(): boolean {
  return Boolean(getAdminHiddenPath() && getAdminPassword());
}

export function isAdminPasswordValid(inputPassword: string): boolean {
  const configuredPassword = getAdminPassword();
  if (!configuredPassword) return false;
  return safeEqual(inputPassword, configuredPassword);
}

export function createAdminSessionValue(): string | null {
  const hiddenPath = getAdminHiddenPath();
  const password = getAdminPassword();
  if (!hiddenPath || !password) return null;
  return buildAdminSessionToken(hiddenPath, password);
}

export function isValidAdminSession(value: string | undefined | null): boolean {
  if (!value) return false;
  const expected = createAdminSessionValue();
  if (!expected) return false;
  return safeEqual(value, expected);
}
