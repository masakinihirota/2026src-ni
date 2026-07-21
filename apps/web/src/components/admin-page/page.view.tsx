"use client";

import { useMemo, useState } from "react";

export type AdminSummaryResponse = {
  totals: {
    activeSessionCount: number;
    submissionCount: number;
    uniqueSubmitterCount: number;
    totalSelectedUnits: number;
    lastSubmittedAt: string | null;
  };
  topRooms: { unitId: string; count: number }[];
  recentLogs: {
    id: string;
    submittedAt: string;
    sessionId: string;
    userName: string | null;
    zodiacAlias: string | null;
    unitIds: string[];
  }[];
};

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
  initialData,
  initialError,
}: {
  initialData: AdminSummaryResponse | null;
  initialError: string | null;
}) {
  const [data, setData] = useState<AdminSummaryResponse | null>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  async function loadSummary(options?: { resetStatus?: boolean }): Promise<void> {
    if (options?.resetStatus) {
      setLoading(true);
      setError(null);
    }
    try {
      const response = await fetch("/api/wishes/admin-summary", { cache: "no-store" });
      const json = (await response.json()) as {
        success?: boolean;
        data?: AdminSummaryResponse;
        error?: { message?: string };
      };

      if (!response.ok || !json.success || !json.data) {
        setError(json.error?.message ?? "管理集計の取得に失敗しました。");
        setData(null);
        return;
      }

      setData(json.data);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "通信エラーが発生しました。";
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  const topThreeRoomText = useMemo(() => {
    if (!data || data.topRooms.length === 0) return "まだ提出データがありません。";
    return data.topRooms
      .slice(0, 3)
      .map((room) => `${room.unitId}（${room.count}件）`)
      .join(" / ");
  }, [data]);

  return (
    <div className="mt-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
          管理者としてログイン済みです。
        </p>
        <button
          type="button"
          onClick={() => void loadSummary({ resetStatus: true })}
          className="cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          最新化
        </button>
      </div>

      {loading ? <p className="text-sm text-slate-600">集計を読み込み中です...</p> : null}
      {error ? (
        <p className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>
      ) : null}

      {!loading && !error && data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">利用人数（最新状態）</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{data.totals.activeSessionCount}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">提出ログ件数</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{data.totals.submissionCount}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">提出したユニーク人数</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{data.totals.uniqueSubmitterCount}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">提出住戸の総数</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{data.totals.totalSelectedUnits}</p>
            </article>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <p>
              最終提出時刻: <span className="font-semibold text-slate-900">{formatDateTime(data.totals.lastSubmittedAt)}</span>
            </p>
            <p className="mt-1">
              希望が多い部屋（上位3件）: <span className="font-semibold text-slate-900">{topThreeRoomText}</span>
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <h3 className="text-sm font-bold text-slate-900">希望が多い部屋（上位10件）</h3>
            {data.topRooms.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">まだ提出データがありません。</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {data.topRooms.map((room, index) => (
                  <li key={room.unitId} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    {index + 1}. {room.unitId} - {room.count}件
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <h3 className="text-sm font-bold text-slate-900">提出ログ（新しい順）</h3>
            {data.recentLogs.length === 0 ? (
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
                    {data.recentLogs.map((log) => (
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
        </>
      ) : null}
    </div>
  );
}
