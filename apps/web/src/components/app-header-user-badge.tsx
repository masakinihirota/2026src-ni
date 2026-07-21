"use client";

import { usePathname } from "next/navigation";

import { ensureGuestTag, getStoredUserProfile } from "@/lib/user-profile";

export function AppHeaderUserBadge() {
  usePathname();
  const label = (() => {
    const profile = getStoredUserProfile();
    if (profile) {
      return `ログイン中（${profile.zodiacAlias}）`;
    }
    const guestTag = ensureGuestTag();
    return `ゲストユーザー${guestTag}`;
  })();

  return (
    <span className="rounded-full border border-[#b8cce0] bg-[#f4f8fc] px-3 py-1 text-xs font-semibold text-[#2f5f84]">
      {label}
    </span>
  );
}
