"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  ALIAS_SIGN_OPTIONS,
  createAndStoreUserProfile,
  detectSignFromAlias,
  ensureUserId,
  generateAliasChoices,
  getStoredUserProfile,
  isValidManagementVerificationCode,
  readAliasNonce,
  writeAliasNonce,
} from "@/lib/user-profile";

type NameMode = "unit" | "outside" | "free";
const ZODIAC_SYMBOLS: Record<string, string> = {
  牡羊座: "♈",
  牡牛座: "♉",
  双子座: "♊",
  蟹座: "♋",
  獅子座: "♌",
  乙女座: "♍",
  天秤座: "♎",
  蠍座: "♏",
  射手座: "♐",
  山羊座: "♑",
  水瓶座: "♒",
  魚座: "♓",
};
const ALIAS_COLOR_STYLE_MAP: Record<string, { text: string; swatch: string }> = {
  赤い: { text: "#dc2626", swatch: "#dc2626" },
  真紅の: { text: "#b91c1c", swatch: "#b91c1c" },
  紅の: { text: "#e11d48", swatch: "#e11d48" },
  青い: { text: "#2563eb", swatch: "#2563eb" },
  蒼色の: { text: "#1d4ed8", swatch: "#1d4ed8" },
  群青の: { text: "#1e3a8a", swatch: "#1e3a8a" },
  紺の: { text: "#1e40af", swatch: "#1e40af" },
  翠の: { text: "#047857", swatch: "#047857" },
  緑の: { text: "#16a34a", swatch: "#16a34a" },
  若草色の: { text: "#65a30d", swatch: "#65a30d" },
  琥珀の: { text: "#b45309", swatch: "#b45309" },
  黄色い: { text: "#ca8a04", swatch: "#ca8a04" },
  桃色の: { text: "#db2777", swatch: "#db2777" },
  藍の: { text: "#3730a3", swatch: "#3730a3" },
  水色の: { text: "#0284c7", swatch: "#0284c7" },
  橙の: { text: "#ea580c", swatch: "#ea580c" },
  紫の: { text: "#7e22ce", swatch: "#7e22ce" },
  藤色の: { text: "#8b5cf6", swatch: "#8b5cf6" },
  薔薇の: { text: "#be185d", swatch: "#be185d" },
  黄緑の: { text: "#84cc16", swatch: "#84cc16" },
  青緑の: { text: "#0f766e", swatch: "#0f766e" },
  空色の: { text: "#0ea5e9", swatch: "#0ea5e9" },
  紅紫の: { text: "#a21caf", swatch: "#a21caf" },
  鉄紺の: { text: "#334155", swatch: "#334155" },
  白い: { text: "#e5e7eb", swatch: "#e5e7eb" },
  黒い: { text: "#111827", swatch: "#111827" },
  灰色の: { text: "#6b7280", swatch: "#6b7280" },
  銀色の: { text: "#94a3b8", swatch: "#94a3b8" },
  金色の: { text: "#d4af37", swatch: "#d4af37" },
  虹色の: { text: "#7c3aed", swatch: "linear-gradient(90deg, #ef4444 0%, #f59e0b 20%, #eab308 40%, #22c55e 60%, #3b82f6 80%, #a855f7 100%)" },
};

function resolveAliasColorStyle(alias: string): { text: string; swatch: string; textShadow?: string } {
  const matchedKey = Object.keys(ALIAS_COLOR_STYLE_MAP).find((token) => alias.startsWith(token));
  if (!matchedKey) {
    return { text: "#0f172a", swatch: "#64748b" };
  }
  const style = ALIAS_COLOR_STYLE_MAP[matchedKey];
  const isLight = matchedKey === "白い" || matchedKey === "銀色の" || matchedKey === "黄色い";
  return {
    ...style,
    textShadow: isLight ? "0 1px 1px rgba(15,23,42,0.35)" : undefined,
  };
}

function toHalfWidthDigits(value: string): string {
  return value
    .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/[^\d]/g, "");
}

function splitUnitName(userName: string): { building: string; room: string } | null {
  const matched = /^(\d+)-(\d+)$/.exec(userName);
  if (!matched) return null;
  return { building: matched[1], room: matched[2] };
}

function initialNameMode(userName: string): NameMode {
  if (userName === "外住") return "outside";
  if (/^\d+-\d+$/.test(userName)) return "unit";
  return "free";
}

export function LoginPageView() {
  const router = useRouter();
  const existingProfile = useMemo(() => getStoredUserProfile(), []);
  const ensuredUserId = useMemo(() => ensureUserId(), []);
  const unitName = splitUnitName(existingProfile?.userName ?? "");
  const [nameMode, setNameMode] = useState<NameMode>(() => initialNameMode(existingProfile?.userName ?? ""));
  const [buildingNumber, setBuildingNumber] = useState(unitName?.building ?? "");
  const [roomNumber, setRoomNumber] = useState(unitName?.room ?? "");
  const [freeName, setFreeName] = useState(
    existingProfile && existingProfile.userName !== "外住" && !/^\d+-\d+$/.test(existingProfile.userName) ? existingProfile.userName : "",
  );
  const [verificationCode, setVerificationCode] = useState("");
  const [selectedSign, setSelectedSign] = useState<string>(() => detectSignFromAlias(existingProfile?.zodiacAlias ?? "") ?? ALIAS_SIGN_OPTIONS[0]);
  const initialAliasChoices = useMemo(() => {
    const generated = generateAliasChoices(ensuredUserId, selectedSign, readAliasNonce(), 3);
    const aliases = [...generated.aliases];
    if (existingProfile?.zodiacAlias && existingProfile.zodiacAlias.endsWith(selectedSign) && !aliases.includes(existingProfile.zodiacAlias)) {
      aliases.unshift(existingProfile.zodiacAlias);
    }
    return aliases.slice(0, 3);
  }, [existingProfile?.zodiacAlias, ensuredUserId, selectedSign]);
  const [aliasChoices, setAliasChoices] = useState<string[]>(initialAliasChoices);
  const [selectedAlias, setSelectedAlias] = useState<string>(initialAliasChoices[0] ?? "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const selectedAliasColor = useMemo(() => resolveAliasColorStyle(selectedAlias), [selectedAlias]);

  function submitLogin(): void {
    const normalizedBuilding = toHalfWidthDigits(buildingNumber);
    const normalizedRoom = toHalfWidthDigits(roomNumber);
    const resolvedName =
      nameMode === "outside" ? "外住" : nameMode === "unit" ? `${normalizedBuilding}-${normalizedRoom}` : freeName.trim();

    if (!resolvedName) {
      setErrorMessage("ユーザー名を入力してください。");
      return;
    }

    if (nameMode === "unit" && (!normalizedBuilding || !normalizedRoom)) {
      setErrorMessage("棟番号と部屋番号を入力してください。");
      return;
    }

    if (nameMode === "unit" && Number(normalizedBuilding) > 32) {
      setErrorMessage("棟番号は1〜32で入力してください。");
      return;
    }

    if (nameMode === "unit" && !/^\d+$/.test(normalizedRoom)) {
      setErrorMessage("部屋番号は数字で入力してください。");
      return;
    }

    if (!selectedAlias) {
      setErrorMessage("星座匿名を選択してください。");
      return;
    }

    createAndStoreUserProfile({
      userName: resolvedName,
      chatDisplayMode: "alias",
      zodiacAlias: selectedAlias,
      verificationCode,
    });

    router.push("/units");
  }

  function regenerateAliasChoices(): void {
    const generated = generateAliasChoices(ensuredUserId, selectedSign, readAliasNonce() + 1, 3);
    writeAliasNonce(generated.nextNonce);
    setAliasChoices(generated.aliases);
    setSelectedAlias(generated.aliases[0] ?? "");
  }

  function changeSign(sign: string): void {
    setSelectedSign(sign);
    const generated = generateAliasChoices(ensuredUserId, sign, readAliasNonce() + 1, 3);
    writeAliasNonce(generated.nextNonce);
    setAliasChoices(generated.aliases);
    setSelectedAlias(generated.aliases[0] ?? "");
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <section className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">利用開始設定</p>
        <h1 className="mt-1 text-3xl font-black text-slate-900">住戸希望チェック 参加者登録</h1>
        <p className="mt-3 text-sm text-slate-700">
          この画面はログインではなく初期登録です。ユーザー名は自由に設定できますが、現在の住戸番号を入れていただくと管理側が把握しやすくなります。
          日鋼団地は32棟702戸のため、住戸番号は「9-105（9棟1階5号室）」の形式です。個人情報（実名など）は入力しないでください。
        </p>

        <div className="mt-4 rounded-xl border border-[#c9d7e5] bg-[#f4f8fc] p-3 text-xs text-slate-700">
          全員が見える場所では星座匿名で表示されます。管理側確認コードが未入力の状態では「星座匿名」でのみ会話できます。
          最終交渉時に確認済みユーザーのみ「住戸/ユーザー名」表示を選べます。
        </div>

        <div className="mt-5 space-y-4">
          <fieldset>
            <legend className="text-sm font-semibold text-slate-800">ユーザー名の登録方法</legend>
            <div className="mt-2 space-y-2 text-sm text-slate-700">
              <label className="flex items-center gap-2">
                <input type="radio" checked={nameMode === "unit"} onChange={() => setNameMode("unit")} />
                住戸番号を入力する
              </label>
              {nameMode === "unit" ? (
                <div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <input
                    value={buildingNumber}
                    onChange={(event) => setBuildingNumber(toHalfWidthDigits(event.target.value))}
                    inputMode="numeric"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    placeholder="棟番号（例: 9）"
                  />
                  <span className="text-sm font-bold text-slate-700">-</span>
                  <input
                    value={roomNumber}
                    onChange={(event) => setRoomNumber(toHalfWidthDigits(event.target.value))}
                    inputMode="numeric"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    placeholder="部屋番号（例: 105）"
                  />
                </div>
              ) : null}

              <label className="flex items-center gap-2">
                <input type="radio" checked={nameMode === "outside"} onChange={() => setNameMode("outside")} />
                外住として登録する（外住）
              </label>

              <label className="flex items-center gap-2">
                <input type="radio" checked={nameMode === "free"} onChange={() => setNameMode("free")} />
                自由入力する
              </label>
              {nameMode === "free" ? (
                <input
                  value={freeName}
                  onChange={(event) => setFreeName(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder="例: 北街区参加者A"
                />
              ) : null}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold text-slate-800">管理側確認（任意）</legend>
            <p className="mt-1 text-xs text-slate-600">
              最終交渉用に、管理側から配布された確認コードがある場合のみ入力してください。
            </p>
            <input
              value={verificationCode}
              onChange={(event) => setVerificationCode(event.target.value.toUpperCase())}
              className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              placeholder="例: NIKKO-2026-A"
            />
            <p className="mt-2 text-xs text-slate-600">
              現在の状態: {existingProfile?.verificationStatus === "verified" || isValidManagementVerificationCode(verificationCode) ? "確認済み" : "未確認"}
            </p>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold text-slate-800">星座匿名（色＋形容詞＋星座）</legend>
            <p className="mt-1 text-xs text-slate-600">まず星座を選び、次にユニークな候補3つから選択してください。</p>
            <p className="mt-1 text-xs text-slate-600">
              個人情報を隠すため、基本的に星座匿名でアプリを利用してもらいます。星座匿名は「色＋形容詞＋星座」で作られます。
              重複した人がいる場合はチェンジボタンで候補を更新できます（チェンジボタンを押しても星座は変わりません。星座はご自身で選び直してください）。
            </p>
            <p className="mt-1 text-xs font-semibold text-amber-700">一定期間後に匿名は強制変更されます。</p>
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-xs font-semibold text-slate-700">星座選択</p>
              <div className="grid grid-cols-3 gap-2">
                {ALIAS_SIGN_OPTIONS.map((sign) => (
                  <button
                    key={sign}
                    type="button"
                    onClick={() => changeSign(sign)}
                    className={[
                      "flex cursor-pointer items-center justify-center gap-1 rounded-lg border px-2 py-2 text-sm font-bold transition",
                      selectedSign === sign ? "border-indigo-500 bg-indigo-500 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
                    ].join(" ")}
                  >
                    <span>{ZODIAC_SYMBOLS[sign] ?? "☆"}</span>
                    <span>{sign.slice(0, 2)}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3 rounded-xl border border-[#c9d7e5] bg-[#f4f8fc] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-600">現在の星座匿名</p>
                <button
                  type="button"
                  onClick={regenerateAliasChoices}
                  className="cursor-pointer rounded-lg border border-[#6b4d8a] bg-white px-3 py-1 text-xs font-semibold text-[#6b4d8a] transition hover:bg-[#f4ecfb]"
                >
                  チェンジ
                </button>
              </div>
              <div className="mt-1 flex items-center justify-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full border border-slate-300" style={{ background: selectedAliasColor.swatch }} />
                <p className="text-lg font-black" style={{ color: selectedAliasColor.text, textShadow: selectedAliasColor.textShadow }}>
                  {selectedAlias || "未選択"}
                </p>
              </div>
            </div>
            <div className="mt-3">
              <p className="mb-2 text-xs font-semibold text-slate-700">星座匿名候補（3つ）</p>
              <div className="grid gap-2 sm:grid-cols-3">
              {aliasChoices.map((alias) => (
                <button
                  key={alias}
                  type="button"
                  onClick={() => setSelectedAlias(alias)}
                  className={[
                    "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-semibold transition",
                    selectedAlias === alias ? "border-[#2f6d92] bg-[#edf5fd] text-[#2f6d92]" : "border-slate-300 bg-white text-slate-700",
                  ].join(" ")}
                >
                  <span className="text-base">{selectedAlias === alias ? "✓" : "○"}</span>
                  <span className="truncate">{alias}</span>
                </button>
              ))}
              </div>
            </div>
          </fieldset>

        </div>

        {errorMessage ? <p className="mt-3 text-sm font-semibold text-rose-700">{errorMessage}</p> : null}

        <button
          type="button"
          onClick={submitLogin}
          className="mt-5 inline-flex cursor-pointer rounded-xl border border-[#2f6d92] bg-[#2f6d92] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#255a79]"
        >
          登録して住戸選択へ
        </button>
      </section>
    </main>
  );
}
