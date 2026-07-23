"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

import { ensureGuestTag } from "@/lib/user-profile";
import { useStoredUserProfile } from "@/lib/use-stored-user-profile";

let cachedGuestTag = "000";

function subscribeGuestTag(onStoreChange: () => void): () => void {
  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

function getGuestTagSnapshot(): string {
  const nextTag = ensureGuestTag();
  if (nextTag === cachedGuestTag) return cachedGuestTag;
  cachedGuestTag = nextTag;
  return cachedGuestTag;
}

function getGuestTagServerSnapshot(): string {
  return "000";
}

export function AppHeaderUserBadge() {
  usePathname();
  const profile = useStoredUserProfile();
  const guestTag = useSyncExternalStore(subscribeGuestTag, getGuestTagSnapshot, getGuestTagServerSnapshot);

  const label = profile ? `ログイン中（${profile.zodiacAlias}）` : `未ログイン（ゲスト${guestTag}）`;

  return (
    <span className="rounded-full border border-[#b8cce0] bg-[#f4f8fc] px-3 py-1 text-xs font-semibold text-[#2f5f84]">
      {label}
    </span>
  );
}
