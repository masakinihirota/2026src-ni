"use client";

import { useMemo, useState } from "react";

export type DataSourceMode = "live" | "dummy" | "both";

export type WishesAdminSummaryResponse = {
  totals: {
    activeSessionCount: number;
    submissionCount: number;
    uniqueSubmitterCount: number;
    totalSelectedUnits: number;
    lastSubmittedAt: string | null;
  };
  topRooms: { unitId: string; count: number }[];
  dataSourceMode: DataSourceMode;
  sourceStatus: {
    dummyUnitCount: number;
  };
  recentLogs: {
    id: string;
    submittedAt: string;
    sessionId: string;
    userName: string | null;
    zodiacAlias: string | null;
    unitIds: string[];
  }[];
};

export type ChatsAdminSummaryResponse = {
  totals: {
    roomCount: number;
    totalMessageCount: number;
    uniqueSenderCount: number;
    lastPostedAt: string | null;
  };
  roomSummaries: {
    roomScope: string;
    participantCount: number;
    messageCount: number;
    lastPostedAt: string | null;
  }[];
  recentMessages: {
    id: string;
    roomScope: string;
    senderId: string;
    sender: string;
    body: string;
    postedAt: string;
  }[];
};

const DATA_SOURCE_MODE_OPTIONS: { key: DataSourceMode; label: string }[] = [
  { key: "live", label: "本番データのみ" },
  { key: "dummy", label: "ダミーデータのみ" },
  { key: "both", label: "本番 + ダミー" },
];

function formatDateTime(value: string | null): string {
  if (!value) return "未記録";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未記録";
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function AdminPageView({
  initialWishesData,
  initialChatData,
  initialDataSourceMode,
  initialError,
}: {
  initialWishesData: WishesAdminSummaryResponse | null;
  initialChatData: ChatsAdminSummaryResponse | null;
  initialDataSourceMode: DataSourceMode | null;
  initialError: string | null;
}) {
  const [wishesData, setWishesData] = useState<WishesAdminSummaryResponse | null>(initialWishesData);
  const [chatData, setChatData] = useState<ChatsAdminSummaryResponse | null>(initialChatData);
  const [dataSourceMode, setDataSourceMode] = useState<DataSourceMode | null>(initialDataSourceMode);
  const [loading, setLoading] = useState(false);
  const [modeUpdating, setModeUpdating] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  async function loadSummary(options?: { resetStatus?: boolean }): Promise<void> {
    if (options?.resetStatus) {
      setLoading(true);
      setError(null);
    }
    try {
      const [wishesResponse, chatsResponse, dataSourceResponse] = await Promise.all([
        fetch("/api/wishes/admin-summary", { cache: "no-store" }),
        fetch("/api/chats/admin-summary", { cache: "no-store" }),
        fetch("/api/wishes/admin-data-source", { cache: "no-store" }),
      ]);

      const wishesJson = (await wishesResponse.json()) as {
        success?: boolean;
        data?: WishesAdminSummaryResponse;
        error?: { message?: string };
      };
      const chatsJson = (await chatsResponse.json()) as {
        success?: boolean;
        data?: ChatsAdminSummaryResponse;
        error?: { message?: string };
      };
      const dataSourceJson = (await dataSourceResponse.json()) as {
        success?: boolean;
        data?: { mode?: DataSourceMode };
        error?: { message?: string };
      };

      if (!wishesResponse.ok || !wishesJson.success || !wishesJson.data) {
        setError(wishesJson.error?.message ?? "希望入力の管理集計取得に失敗しました。");
        setWishesData(null);
        return;
      }
      if (!chatsResponse.ok || !chatsJson.success || !chatsJson.data) {
        setError(chatsJson.error?.message ?? "チャットの管理集計取得に失敗しました。");
        setChatData(null);
        return;
      }
      if (!dataSourceResponse.ok || !dataSourceJson.success || !dataSourceJson.data?.mode) {
        setError(dataSourceJson.error?.message ?? "データソース設定の取得に失敗しました。");
        setDataSourceMode(null);
        return;
      }

      setWishesData(wishesJson.data);
      setChatData(chatsJson.data);
      setDataSourceMode(dataSourceJson.data.mode);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "通信エラーが発生しました。";
      setError(message);
      setWishesData(null);
      setChatData(null);
    } finally {
      setLoading(false);
    }
  }

  async function updateDataSourceMode(nextMode: DataSourceMode): Promise<void> {
    if (modeUpdating || nextMode === dataSourceMode) return;
    setModeUpdating(true);
    setError(null);
    try {
      const response = await fetch("/api/wishes/admin-data-source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: nextMode }),
      });
      const json = (await response.json()) as {
        success?: boolean;
        data?: { mode?: DataSourceMode };
        error?: { message?: string };
      };
      if (!response.ok || !json.success || !json.data?.mode) {
        setError(json.error?.message ?? "データソース切替に失敗しました。");
        return;
      }
      setDataSourceMode(json.data.mode);
      await loadSummary();
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "通信エラーが発生しました。";
      setError(`データソース切替エラー: ${message}`);
    } finally {
      setModeUpdating(false);
    }
  }

  const topThreeRoomText = useMemo(() => {
    if (!wishesData || wishesData.topRooms.length === 0) return "まだ提出データがありません。";
    return wishesData.topRooms
      .slice(0, 3)
      .map((room) => `${room.unitId}（${room.count}件）`)
      .join(" / ");
  }, [wishesData]);

  return (
    <div className="mt-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
          管理者としてログイン済みです。
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadSummary({ resetStatus: true })}
            className="cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            最新化
          </button>
        </div>
      </div>

      {loading ? <p className="text-sm text-slate-600">集計を読み込み中です...</p> : null}
      {error ? (
        <p className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>
      ) : null}

      {!loading && !error && wishesData && chatData ? (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <h3 className="text-sm font-bold text-slate-900">データソース切替（テスト運用）</h3>
            <p className="mt-1 text-xs text-slate-600">ヒートマップや集計表示で利用する母集団を切り替えます。</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {DATA_SOURCE_MODE_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => void updateDataSourceMode(option.key)}
                  disabled={modeUpdating}
                  className={[
                    "rounded-full border px-3 py-1.5 text-sm font-semibold transition",
                    dataSourceMode === option.key
                      ? "border-[#2f6d92] bg-[#2f6d92] text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
                    modeUpdating ? "cursor-not-allowed opacity-70" : "",
                  ].join(" ")}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-600">
              現在の設定:{" "}
              <span className="font-semibold text-slate-900">
                {DATA_SOURCE_MODE_OPTIONS.find((option) => option.key === dataSourceMode)?.label ?? "未取得"}
              </span>{" "}
              / ダミー対象住戸数: {wishesData.sourceStatus.dummyUnitCount}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">利用人数（最新状態）</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{wishesData.totals.activeSessionCount}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">提出ログ件数</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{wishesData.totals.submissionCount}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">提出したユニーク人数</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{wishesData.totals.uniqueSubmitterCount}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">提出住戸の総数</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{wishesData.totals.totalSelectedUnits}</p>
            </article>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <p>
              最終提出時刻: <span className="font-semibold text-slate-900">{formatDateTime(wishesData.totals.lastSubmittedAt)}</span>
            </p>
            <p className="mt-1">
              希望が多い部屋（上位3件）: <span className="font-semibold text-slate-900">{topThreeRoomText}</span>
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <h3 className="text-sm font-bold text-slate-900">希望が多い部屋（上位10件）</h3>
            {wishesData.topRooms.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">まだ提出データがありません。</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {wishesData.topRooms.map((room, index) => (
                  <li key={room.unitId} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    {index + 1}. {room.unitId} - {room.count}件
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <h3 className="text-sm font-bold text-slate-900">提出ログ（新しい順）</h3>
            {wishesData.recentLogs.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">ログはまだありません。</p>
            ) : (
              <div className="mt-2 max-h-[420px] overflow-auto">
                <table className="w-full min-w-[760px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600">
                      <th className="px-2 py-2">時刻</th>
                      <th className="px-2 py-2">ユーザー</th>
                      <th className="px-2 py-2">星座匿名</th>
                      <th className="px-2 py-2">セッションID</th>
                      <th className="px-2 py-2">提出住戸</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wishesData.recentLogs.map((log) => (
                      <tr key={log.id} className="border-b border-slate-100 align-top text-slate-700">
                        <td className="px-2 py-2 whitespace-nowrap">{formatDateTime(log.submittedAt)}</td>
                        <td className="px-2 py-2">{log.userName ?? "未設定"}</td>
                        <td className="px-2 py-2">{log.zodiacAlias ?? "未設定"}</td>
                        <td className="px-2 py-2 font-mono text-[11px]">{log.sessionId}</td>
                        <td className="px-2 py-2">{log.unitIds.join(" / ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">チャット部屋数</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{chatData.totals.roomCount}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">総メッセージ件数</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{chatData.totals.totalMessageCount}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">発言者ユニーク数</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{chatData.totals.uniqueSenderCount}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">最終投稿時刻</p>
              <p className="mt-1 text-sm font-bold text-slate-900">{formatDateTime(chatData.totals.lastPostedAt)}</p>
            </article>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <h3 className="text-sm font-bold text-slate-900">チャット部屋サマリー（発言数順）</h3>
            {chatData.roomSummaries.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">チャットログはまだありません。</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {chatData.roomSummaries.slice(0, 20).map((room) => (
                  <li key={room.roomScope} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <span className="font-semibold">{room.roomScope}</span> / 発言 {room.messageCount}件 / 参加者 {room.participantCount}人 / 最終 {formatDateTime(room.lastPostedAt)}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <h3 className="text-sm font-bold text-slate-900">チャット投稿ログ（新しい順）</h3>
            {chatData.recentMessages.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">ログはまだありません。</p>
            ) : (
              <div className="mt-2 max-h-[420px] overflow-auto">
                <table className="w-full min-w-[860px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600">
                      <th className="px-2 py-2">時刻</th>
                      <th className="px-2 py-2">部屋</th>
                      <th className="px-2 py-2">送信者</th>
                      <th className="px-2 py-2">送信者ID</th>
                      <th className="px-2 py-2">本文</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chatData.recentMessages.map((message) => (
                      <tr key={message.id} className="border-b border-slate-100 align-top text-slate-700">
                        <td className="px-2 py-2 whitespace-nowrap">{formatDateTime(message.postedAt)}</td>
                        <td className="px-2 py-2 font-mono text-[11px]">{message.roomScope}</td>
                        <td className="px-2 py-2">{message.sender}</td>
                        <td className="px-2 py-2 font-mono text-[11px]">{message.senderId}</td>
                        <td className="px-2 py-2">{message.body}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
