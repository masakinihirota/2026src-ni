"use client";

import { useSyncExternalStore } from "react";

import { getStoredUserProfile, type UserProfile } from "@/lib/user-profile";

let cachedSnapshot: UserProfile | null = null;

function subscribeStorage(onStoreChange: () => void): () => void {
  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

function getServerSnapshot(): UserProfile | null {
  return null;
}

function isSameProfile(left: UserProfile | null, right: UserProfile | null): boolean {
  if (left === right) return true;
  if (!left || !right) return false;

  return (
    left.userId === right.userId &&
    left.userName === right.userName &&
    left.zodiacAlias === right.zodiacAlias &&
    left.chatDisplayMode === right.chatDisplayMode &&
    left.verificationStatus === right.verificationStatus
  );
}

function getSnapshot(): UserProfile | null {
  const nextSnapshot = getStoredUserProfile();
  if (isSameProfile(cachedSnapshot, nextSnapshot)) return cachedSnapshot;
  cachedSnapshot = nextSnapshot;
  return cachedSnapshot;
}

export function useStoredUserProfile(): UserProfile | null {
  return useSyncExternalStore(
    subscribeStorage,
    getSnapshot,
    getServerSnapshot,
  );
}
