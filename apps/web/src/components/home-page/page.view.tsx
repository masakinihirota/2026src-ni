"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useStoredUserProfile } from "@/lib/use-stored-user-profile";

export function HomePageView() {
  const router = useRouter();
  const profile = useStoredUserProfile();
  const isLoggedIn = profile !== null;

  useEffect(() => {
    if (isLoggedIn) {
      router.replace("/dashboard");
    }
  }, [isLoggedIn, router]);

  if (isLoggedIn) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 py-10">
        <p className="text-sm font-semibold text-slate-600">ログイン状態を確認しています…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-10">
      <section className="rounded-3xl border border-slate-300 bg-white/90 p-8 shadow-sm">
        <p className="text-sm text-slate-500">団地住戸選定デモ</p>
        <h1 className="mt-1 text-4xl font-black tracking-tight text-slate-900">住戸希望チェック Web アプリ</h1>
        <p className="mt-3 max-w-3xl text-slate-700">
          このアプリは「まだ登録していない方」と「登録済みの方」で入口を分けています。
          まずはお試しページで操作を体験し、実際に希望を提出する場合は利用開始設定へ進んでください。
        </p>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link href="/trial" className="cursor-pointer rounded-2xl border border-[#c9d8e7] bg-[#f3f8fd] p-6 transition hover:-translate-y-0.5 hover:shadow-md sm:col-span-2">
          <p className="text-sm text-[#476b8d]">登録前の方向け</p>
          <h2 className="text-2xl font-bold text-slate-900">ログインせずに試す</h2>
          <p className="mt-2 text-slate-700">
            棟と部屋を選ぶ流れを登録なしで確認できます。お試し入力は本番データに影響しません。
          </p>
        </Link>

        <Link href="/login" className="cursor-pointer rounded-2xl border border-slate-300 bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-sm text-slate-500">登録・ログイン</p>
          <h2 className="text-2xl font-bold text-slate-900">ユーザー登録 / ログイン</h2>
          <p className="mt-2 text-slate-700">
            住戸希望の本提出、順位別チャット、重複状況の確認を行うための利用開始設定です。
          </p>
        </Link>

        <Link href="/units/chat?scope=global" className="cursor-pointer rounded-2xl border border-slate-300 bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-sm text-slate-500">全体向け</p>
          <h2 className="text-2xl font-bold text-slate-900">全体チャットを見る</h2>
          <p className="mt-2 text-slate-700">使い方を聞いたり会話をしたりするための全体チャットです。部屋の話をしたい人は個別チャットがあります。</p>
        </Link>
      </section>
    </main>
  );
}
