"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  getRoomChatDisplayMode,
  getStoredUserProfile,
  setRoomChatDisplayMode,
} from "@/lib/user-profile";

type ChatMessage = {
  id: string;
  sender: string;
  body: string;
  isSelf: boolean;
};

function seedFrom(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function buildPeerNames(roomCode: string, rank: number): string[] {
  const aliases = ["青空の住人", "静風の住人", "月灯りの住人", "木漏れ日の住人", "星雲の住人"];
  const seed = seedFrom(`${roomCode}-${rank}`);
  return [0, 1].map((offset) => aliases[(seed + offset) % aliases.length]);
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
  const [userProfile] = useState(() => getStoredUserProfile());
  const peerNames = useMemo(() => buildPeerNames(roomCode, rank), [roomCode, rank]);
  const globalPeerNames = ["北街区調整役", "南街区調整役", "運営サポート"];
  const isGlobal = scope === "global";
  const roomScope = isGlobal ? "global" : roomCode;
  const canUseUnitName = userProfile?.verificationStatus === "verified";
  const [chatDisplayMode, setChatDisplayMode] = useState<"alias" | "unit">(() =>
    userProfile ? getRoomChatDisplayMode(roomScope, userProfile.verificationStatus) : "alias",
  );
  const effectiveDisplayMode = canUseUnitName && chatDisplayMode === "unit" ? "unit" : "alias";
  const selfName = userProfile ? (effectiveDisplayMode === "alias" ? userProfile.zodiacAlias : userProfile.userName) : "あなた";
  const greetingName = userProfile?.zodiacAlias ?? "あなた";
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    isGlobal
      ? [
          {
            id: "auto-greeting-self-global",
            sender: greetingName,
            body: "はじめまして。住戸全体の希望調整について相談したいです。よろしくお願いします。",
            isSelf: true,
          },
          {
            id: "auto-greeting-peer-global",
            sender: globalPeerNames[0],
            body: "参加ありがとうございます。ここでは全体方針や希望重複の調整を行います。",
            isSelf: false,
          },
        ]
      : roomCode
      ? [
          {
            id: "auto-greeting-self",
            sender: greetingName,
            body: `はじめまして。${roomCode}を第${rank}希望にしています。よろしくお願いします。`,
            isSelf: true,
          },
          {
            id: "auto-greeting-peer",
            sender: buildPeerNames(roomCode, rank)[0],
            body: `入室ありがとうございます。私は${roomCode}を優先で希望しています。`,
            isSelf: false,
          },
        ]
      : [],
  );

  function requestDisplayModeChange(nextMode: "alias" | "unit"): void {
    if (nextMode === chatDisplayMode) return;
    if (nextMode === "unit" && !canUseUnitName) return;
    const nextLabel = nextMode === "alias" ? "星座匿名" : "住戸/ユーザー名";
    const confirmed = window.confirm(`表示方式を「${nextLabel}」に変更しますか？`);
    if (!confirmed) return;
    setChatDisplayMode(nextMode);
    setRoomChatDisplayMode(roomScope, nextMode);
  }

  function sendMessage(): void {
    const value = draft.trim();
    if (!value) return;

    setMessages((previous) => [
      ...previous,
      {
        id: `self-${previous.length + 1}`,
        sender: selfName,
        body: value,
        isSelf: true,
      },
    ]);
    setDraft("");
  }

  if (!userProfile) {
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
            <h1 className="text-xl font-bold text-slate-900">
              {isGlobal ? "全体調整チャット" : `第${rank}希望 / ${roomCode}`}
            </h1>
          </div>
          <Link href="/units" className="inline-flex cursor-pointer rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
            住戸選択へ戻る
          </Link>
        </div>

        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          {isGlobal ? `対話相手（全体）: ${globalPeerNames.join(" / ")}` : `対話相手（同順位・同部屋）: ${peerNames.join(" / ")}`}
        </div>
        {!isGlobal ? (
          <div className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700">
            <p>表示方式はこの部屋チャットで選択できます（同時表示はされません）。</p>
            <p>入室時の自動挨拶は、常に星座匿名で投稿されます。</p>
            <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 font-semibold text-amber-800">
              個人情報を極力使わない運用のため、通常は「星座匿名」で会話してください。
              「住戸/ユーザー名」表示は最終交渉段階で必要な場合のみ使用してください。
            </p>
          </div>
        ) : null}
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
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
              }
            }}
            className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm"
            placeholder="例: 私はこの部屋を第一希望にしたいです。"
          />
          <button
            type="button"
            onClick={sendMessage}
            className="cursor-pointer rounded-xl border border-[#d73a49] bg-[#d73a49] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#c12d3b]"
          >
            送信
          </button>
        </div>
      </section>
    </main>
  );
}
