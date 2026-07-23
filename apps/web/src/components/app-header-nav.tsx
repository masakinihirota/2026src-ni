"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";

import { clearStoredUserProfile } from "@/lib/user-profile";
import { useStoredUserProfile } from "@/lib/use-stored-user-profile";

type MenuItem = {
  href: string;
  label: string;
  emphasis?: boolean;
};

function itemClassname(active: boolean, emphasis?: boolean): string {
  if (emphasis) {
    return [
      "cursor-pointer rounded-full border px-3 py-1 font-semibold transition",
      active ? "border-[#2f6d92] bg-[#2f6d92] text-white" : "border-[#2f6d92] bg-[#eef6fc] text-[#1f5a7d] hover:bg-[#e1f0fb]",
    ].join(" ");
  }
  return [
    "cursor-pointer rounded-full border px-3 py-1 font-semibold transition",
    active ? "border-[#2f6d92] bg-[#eef6fc] text-[#1f5a7d]" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
  ].join(" ");
}

export function AppHeaderNav() {
  const pathname = usePathname();
  const router = useRouter();
  const profile = useStoredUserProfile();
  const isLoggedIn = profile !== null;
  const items = useMemo<MenuItem[]>(
    () =>
      isLoggedIn
        ? [
            { href: "/dashboard", label: "ログイン中トップ", emphasis: true },
            { href: "/units", label: "希望住戸入力" },
            { href: "/overview", label: "ヒートマップ" },
            { href: "/materials", label: "資料集" },
            { href: "/units/chat?scope=global", label: "全体チャット" },
            { href: "/sitemap", label: "サイトマップ" },
          ]
        : [
            { href: "/", label: "トップ", emphasis: true },
            { href: "/trial", label: "お試し" },
            { href: "/login", label: "ユーザー登録/ログイン" },
            { href: "/units/chat?scope=global", label: "全体チャット" },
            { href: "/sitemap", label: "サイトマップ" },
          ],
    [isLoggedIn],
  );

  return (
    <nav className="flex flex-wrap items-center gap-2">
      {items.map((item) => {
        const itemPath = item.href.split("?")[0] ?? item.href;
        const active = pathname === itemPath;
        return (
          <Link key={item.href} href={item.href} className={itemClassname(active, item.emphasis)}>
            {item.label}
          </Link>
        );
      })}
      {isLoggedIn ? (
        <button
          type="button"
          onClick={() => {
            clearStoredUserProfile();
            router.push("/");
          }}
          className="cursor-pointer rounded-full border border-[#d73a49] bg-white px-3 py-1 font-semibold text-[#b22735] transition hover:bg-[#fff1f3]"
        >
          ログアウト
        </button>
      ) : null}
    </nav>
  );
}
