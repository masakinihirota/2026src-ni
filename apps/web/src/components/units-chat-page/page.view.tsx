"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { buildRoomScope } from "@/lib/chat-room-scope";
import { getRoomChatDisplayMode, setRoomChatDisplayMode } from "@/lib/user-profile";
import { useStoredUserProfile } from "@/lib/use-stored-user-profile";

type StoredChatMessage = {
  id: string;
  roomScope: string;
  senderId: string;
  sender: string;
  body: string;
  postedAt: string;
};

type ChatMessage = {
  id: string;
  sender: string;
  body: string;
  postedAt: string;
  isSelf: boolean;
};

type LoadMessagesResponse = {
  roomScope: string;
  messages: StoredChatMessage[];
  participantCount: number;
  messageCount: number;
  lastPostedAt: string | null;
};

type PostMessageResponse = {
  message: StoredChatMessage;
  participantCount: number;
  messageCount: number;
  lastPostedAt: string | null;
};

function subscribeStorage(onStoreChange: () => void): () => void {
  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

function formatTimestamp(value: string | null): string {
  if (!value) return "未更新";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未更新";
  return date.toLocaleString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function UnitsChatPageView({
  rank,
  roomCode,
  scope,
}: {
  rank: number;
  roomCode: string;
  scope: "room" | "global";
}) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [lastPostedAt, setLastPostedAt] = useState<string | null>(null);
  const profile = useStoredUserProfile();
  const isGlobal = scope === "global";
  const roomScope = useMemo(() => buildRoomScope({ scope, roomCode }), [scope, roomCode]);
  const canUseUnitName = profile?.verificationStatus === "verified";
  const chatDisplayMode = useSyncExternalStore(
    subscribeStorage,
    () => (profile ? getRoomChatDisplayMode(roomScope, profile.verificationStatus) : "alias"),
    () => "alias",
  );

  const effectiveDisplayMode = canUseUnitName && chatDisplayMode === "unit" ? "unit" : "alias";
  const selfName = profile ? (effectiveDisplayMode === "alias" ? profile.zodiacAlias : profile.userName) : "あなた";

  const loadMessages = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!profile) return;
      if (!options?.silent) {
        setLoadingHistory(true);
      }

      try {
        const response = await fetch(`/api/chats/rooms/${encodeURIComponent(roomScope)}/messages`, { cache: "no-store" });
        const json = (await response.json()) as { success?: boolean; data?: LoadMessagesResponse; error?: { message?: string } };
        if (!response.ok || !json.success || !json.data) {
          setHistoryError(json.error?.message ?? "チャット履歴の取得に失敗しました。");
          return;
        }

        const nextMessages = json.data.messages.map((message) => ({
          id: message.id,
          sender: message.sender,
          body: message.body,
          postedAt: message.postedAt,
          isSelf: message.senderId === profile.userId,
        }));
        setMessages(nextMessages);
        setParticipantCount(json.data.participantCount);
        setMessageCount(json.data.messageCount);
        setLastPostedAt(json.data.lastPostedAt);
        setHistoryError(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : "通信エラーが発生しました。";
        setHistoryError(message);
      } finally {
        setLoadingHistory(false);
      }
    },
    [profile, roomScope],
  );

  useEffect(() => {
    if (!profile) return;
    const bootstrapTimer = window.setTimeout(() => {
      void loadMessages();
    }, 0);

    const timer = window.setInterval(() => {
      void loadMessages({ silent: true });
    }, 10_000);
    return () => {
      window.clearTimeout(bootstrapTimer);
      window.clearInterval(timer);
    };
  }, [profile, loadMessages]);

  function requestDisplayModeChange(nextMode: "alias" | "unit"): void {
    if (nextMode === chatDisplayMode) return;
    if (nextMode === "unit" && !canUseUnitName) return;
    const nextLabel = nextMode === "alias" ? "星座匿名" : "住戸/ユーザー名";
    const confirmed = window.confirm(`表示方式を「${nextLabel}」に変更しますか？`);
    if (!confirmed) return;
    setRoomChatDisplayMode(roomScope, nextMode);
    window.dispatchEvent(new Event("storage"));
  }

  async function sendMessage(): Promise<void> {
    const value = draft.trim();
    if (!value || !profile || sending) return;

    setSending(true);
    try {
      const response = await fetch(`/api/chats/rooms/${encodeURIComponent(roomScope)}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: profile.userId,
          sender: selfName,
          body: value,
        }),
      });
      const json = (await response.json()) as { success?: boolean; data?: PostMessageResponse; error?: { message?: string } };
      if (!response.ok || !json.success || !json.data) {
        setHistoryError(json.error?.message ?? "投稿に失敗しました。");
        return;
      }

      const posted = json.data.message;
      setMessages((previous) => [
        ...previous,
        {
          id: posted.id,
          sender: posted.sender,
          body: posted.body,
          postedAt: posted.postedAt,
          isSelf: posted.senderId === profile.userId,
        },
      ]);
      setParticipantCount(json.data.participantCount);
      setMessageCount(json.data.messageCount);
      setLastPostedAt(json.data.lastPostedAt);
      setDraft("");
      setHistoryError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "通信エラーが発生しました。";
      setHistoryError(`投稿エラー: ${message}`);
    } finally {
      setSending(false);
    }
  }

  if (!profile) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <section className="rounded-2xl border border-slate-300 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">利用開始設定が必要です</h1>
          <p className="mt-2 text-sm text-slate-700">先に利用開始設定画面で参加者登録（ユーザー名と星座匿名）を行ってください。</p>
          <Link href="/login" className="mt-4 inline-flex cursor-pointer rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
            利用開始設定へ
          </Link>
        </section>
      </main>
    );
  }

  if (!isGlobal && !roomCode) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <section className="rounded-2xl border border-slate-300 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">チャット部屋を開けませんでした</h1>
          <p className="mt-2 text-sm text-slate-700">先に住戸選択画面で希望部屋を選んでから入室してください。</p>
          <Link href="/units" className="mt-4 inline-flex cursor-pointer rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
            住戸選択に戻る
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6">
      <section className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm text-slate-500">希望順位チャット</p>
            <h1 className="text-xl font-bold text-slate-900">{isGlobal ? "全体チャット（使い方相談・質問）" : `${roomCode} の部屋チャット`}</h1>
            {!isGlobal ? <p className="mt-1 text-xs text-slate-500">あなたの第{rank}希望として開いています。</p> : null}
          </div>
          <Link href="/units" className="inline-flex cursor-pointer rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
            住戸選択へ戻る
          </Link>
        </div>

        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          {isGlobal
            ? "全体チャットは、使い方がわからない方の質問や、全体運用ルール確認のための窓口です。"
            : "この住戸を希望した参加者（希望順位に関係なく同室）との個別調整に使います。"}
        </div>

        <div className="mt-2 grid gap-2 text-xs text-slate-700 sm:grid-cols-3">
          <p className="rounded-lg border border-slate-200 bg-white px-3 py-2">会話参加者: {participantCount} 人</p>
          <p className="rounded-lg border border-slate-200 bg-white px-3 py-2">保存済みメッセージ: {messageCount} 件</p>
          <p className="rounded-lg border border-slate-200 bg-white px-3 py-2">最終更新: {formatTimestamp(lastPostedAt)}</p>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-600">
          <span>あなたの表示名:</span>
          <button
            type="button"
            onClick={() => requestDisplayModeChange("alias")}
            className={[
              "cursor-pointer rounded-full border px-3 py-1 font-semibold transition",
              effectiveDisplayMode === "alias" ? "border-[#2f6d92] bg-[#edf5fd] text-[#2f6d92]" : "border-slate-300 bg-white text-slate-600",
            ].join(" ")}
          >
            星座匿名
          </button>
          <button
            type="button"
            onClick={() => requestDisplayModeChange("unit")}
            disabled={!canUseUnitName}
            className={[
              "rounded-full border px-3 py-1 font-semibold transition",
              !canUseUnitName ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400" : "cursor-pointer",
              effectiveDisplayMode === "unit" ? "border-[#2f6d92] bg-[#edf5fd] text-[#2f6d92]" : "border-slate-300 bg-white text-slate-600",
            ].join(" ")}
          >
            住戸/ユーザー名
          </button>
          <span className="ml-1">
            {canUseUnitName
              ? isGlobal
                ? "（変更時は確認あり）"
                : "（この部屋でのみ切替・変更時は確認あり）"
              : "（確認コード登録後に利用可能）"}
          </span>
        </div>

        <div className="mt-4 h-[360px] space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3">
          {loadingHistory ? <p className="text-sm text-slate-500">履歴を読み込み中です…</p> : null}
          {!loadingHistory && messages.length === 0 ? (
            <p className="text-sm text-slate-500">
              まだ投稿がありません。{isGlobal ? "使い方の質問や相談を投稿してください。" : "希望調整メッセージを投稿してください。"}
            </p>
          ) : null}
          {messages.map((message) => (
            <div key={message.id} className={message.isSelf ? "flex justify-end" : "flex justify-start"}>
              <div
                className={[
                  "max-w-[78%] rounded-2xl px-3 py-2 text-sm",
                  message.isSelf ? "bg-[#ffecef] text-[#6d1c2a]" : "bg-slate-100 text-slate-800",
                ].join(" ")}
              >
                <p className="text-[11px] font-semibold opacity-80">{message.sender}</p>
                <p className="mt-0.5 whitespace-pre-wrap">{message.body}</p>
                <p className="mt-1 text-[10px] opacity-70">{formatTimestamp(message.postedAt)}</p>
              </div>
            </div>
          ))}
        </div>

        {historyError ? <p className="mt-2 text-xs font-semibold text-rose-700">{historyError}</p> : null}

        <div className="mt-3 flex gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void sendMessage();
              }
            }}
            className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm"
            placeholder={isGlobal ? "例: この画面の使い方を教えてください。" : "例: 私はこの部屋を第一希望にしたいです。"}
          />
          <button
            type="button"
            onClick={() => {
              void sendMessage();
            }}
            disabled={sending || !draft.trim()}
            className="cursor-pointer rounded-xl border border-[#d73a49] bg-[#d73a49] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#c12d3b] disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300"
          >
            {sending ? "送信中..." : "送信"}
          </button>
        </div>
      </section>
    </main>
  );
}
