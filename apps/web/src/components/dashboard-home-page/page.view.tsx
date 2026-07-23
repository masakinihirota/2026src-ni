"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { buildRoomScope } from "@/lib/chat-room-scope";
import { clearStoredUserProfile } from "@/lib/user-profile";
import { useStoredUserProfile } from "@/lib/use-stored-user-profile";

type PopularityScope = "firstOnly" | "firstTwo" | "firstThree";
type PopularityEntry = {
  unitId: string;
  count: number;
};
type PopularityResponse = {
  entriesByScope: Record<PopularityScope, PopularityEntry[]>;
};
type ChatRoomSummary = {
  roomScope: string;
  participantCount: number;
  messageCount: number;
};
type ChatSummaryResponse = {
  summaries: ChatRoomSummary[];
};

const SAMPLE_CHAT_ROOMS = [
  { rank: 1, roomCode: "N1-1-1201" },
  { rank: 1, roomCode: "N2-2-1210" },
  { rank: 1, roomCode: "S4-6-1233" },
] as const;

export function DashboardHomePageView() {
  const router = useRouter();
  const profile = useStoredUserProfile();
  const [wishDemandByRoom, setWishDemandByRoom] = useState<Record<string, number>>({});
  const [chatSummaryByScope, setChatSummaryByScope] = useState<Record<string, ChatRoomSummary>>({});
  const [statsError, setStatsError] = useState<string | null>(null);
  const sampleChatEntries = useMemo(
    () =>
      SAMPLE_CHAT_ROOMS.map((entry) => ({
        ...entry,
        href: `/units/chat?rank=${entry.rank}&roomCode=${encodeURIComponent(entry.roomCode)}`,
        roomScope: buildRoomScope({ scope: "room", roomCode: entry.roomCode }),
      })),
    [],
  );

  useEffect(() => {
    if (!profile) {
      router.replace("/");
    }
  }, [profile, router]);

  useEffect(() => {
    let alive = true;

    void (async () => {
      try {
        const [popularityResponse, summaryResponse] = await Promise.all([
          fetch("/api/wishes/popularity", { cache: "no-store" }),
          fetch(
            `/api/chats/summaries?roomScopes=${encodeURIComponent(sampleChatEntries.map((entry) => entry.roomScope).join(","))}`,
            { cache: "no-store" },
          ),
        ]);

        const popularityJson = (await popularityResponse.json()) as {
          success?: boolean;
          data?: PopularityResponse;
          error?: { message?: string };
        };
        if (!popularityResponse.ok || !popularityJson.success || !popularityJson.data) {
          throw new Error(popularityJson.error?.message ?? "希望者数の取得に失敗しました。");
        }

        const summaryJson = (await summaryResponse.json()) as {
          success?: boolean;
          data?: ChatSummaryResponse;
          error?: { message?: string };
        };
        if (!summaryResponse.ok || !summaryJson.success || !summaryJson.data) {
          throw new Error(summaryJson.error?.message ?? "チャット統計の取得に失敗しました。");
        }

        if (!alive) return;

        const demandMap = popularityJson.data.entriesByScope.firstThree.reduce<Record<string, number>>((acc, entry) => {
          acc[entry.unitId] = entry.count;
          return acc;
        }, {});
        setWishDemandByRoom(demandMap);

        const summaryMap = summaryJson.data.summaries.reduce<Record<string, ChatRoomSummary>>((acc, summary) => {
          acc[summary.roomScope] = summary;
          return acc;
        }, {});
        setChatSummaryByScope(summaryMap);
        setStatsError(null);
      } catch (error) {
        if (!alive) return;
        const message = error instanceof Error ? error.message : "統計の取得に失敗しました。";
        setStatsError(message);
      }
    })();

    return () => {
      alive = false;
    };
  }, [sampleChatEntries]);

  if (!profile) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 py-10">
        <p className="text-sm font-semibold text-slate-600">ログイン状態を確認しています…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-10">
      <section className="rounded-3xl border border-slate-300 bg-white/90 p-8 shadow-sm">
        <p className="text-sm text-slate-500">ログイン中ホーム</p>
        <h1 className="mt-1 text-4xl font-black tracking-tight text-slate-900">ようこそ、{profile.zodiacAlias} さん</h1>
        <p className="mt-3 max-w-3xl text-slate-700">
          ここから「希望住戸の複数選択」「人気ヒートマップ確認」「資料確認」「チャット」へ進めます。
          初見の方はまず希望住戸入力→ヒートマップ確認の順がおすすめです。
        </p>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => {
              clearStoredUserProfile();
              router.push("/");
            }}
            className="inline-flex cursor-pointer rounded-full border border-[#d73a49] bg-white px-4 py-2 text-sm font-semibold text-[#b22735] transition hover:bg-[#fff1f3]"
          >
            ログアウト
          </button>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link href="/units" className="cursor-pointer rounded-2xl border border-[#2f6d92] bg-[#eef6fc] p-6 transition hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-sm text-[#2f6d92]">Step 1</p>
          <h2 className="text-2xl font-bold text-slate-900">希望住戸を複数選択する</h2>
          <p className="mt-2 text-slate-700">棟と階を切り替えて住戸を選び、希望1〜3を提出します。</p>
        </Link>

        <Link href="/overview" className="cursor-pointer rounded-2xl border border-slate-300 bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-sm text-slate-500">Step 2</p>
          <h2 className="text-2xl font-bold text-slate-900">人気ヒートマップを見る</h2>
          <p className="mt-2 text-slate-700">希望集中の場所を確認し、次の選択方針を決めやすくします。</p>
        </Link>

        <Link href="/materials" className="cursor-pointer rounded-2xl border border-slate-300 bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-sm text-slate-500">補助資料</p>
          <h2 className="text-2xl font-bold text-slate-900">資料集を見る</h2>
          <p className="mt-2 text-slate-700">PDF・画面キャプチャをまとめて確認できます。</p>
        </Link>

        <Link href="/units/chat?scope=global" className="cursor-pointer rounded-2xl border border-slate-300 bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-sm text-slate-500">質問窓口</p>
          <h2 className="text-2xl font-bold text-slate-900">全体チャットへ進む</h2>
          <p className="mt-2 text-slate-700">使い方がわからない時の質問や、全体運用ルールの確認に使えます。</p>
        </Link>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-slate-800">個別チャット（希望住戸を提出した方向け）</p>
        <p className="mt-2 text-sm text-slate-700">希望提出後、住戸ごとの個別チャットへ入れます。希望順位が違っても同じ住戸なら同じ部屋で対話します。</p>
        {statsError ? <p className="mt-2 text-xs font-semibold text-rose-700">{statsError}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {sampleChatEntries.map((entry) => {
            const summary = chatSummaryByScope[entry.roomScope];
            const demand = wishDemandByRoom[entry.roomCode] ?? 0;
            const participantCount = summary?.participantCount ?? 0;
            const logCount = summary?.messageCount ?? 0;
            return (
              <Link
                key={`${entry.rank}-${entry.roomCode}`}
                href={entry.href}
                className="inline-flex cursor-pointer rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                <span>
                  第{entry.rank}希望チャット（例: {entry.roomCode}）
                  <span className="mt-1 block text-xs font-medium text-slate-600">希望者数 {demand}人 / 参加者 {participantCount}人 / 過去ログ {logCount}件</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
