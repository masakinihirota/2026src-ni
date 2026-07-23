import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";

import {
  AdminPageView,
  type ChatsAdminSummaryResponse,
  type DataSourceMode,
  type WishesAdminSummaryResponse,
} from "@/components/admin-page";
import { ADMIN_AUTH_COOKIE_NAME, getAdminHiddenPath, isAdminAuthConfigured, isValidAdminSession } from "@/lib/admin-auth";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_password: "管理者パスワードが一致しませんでした。",
  not_configured: "管理者設定が未完了です。.env に管理者情報を設定してください。",
};

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ adminSlug: string }>;
  searchParams: Promise<{ error?: string; loggedOut?: string }>;
}) {
  const [{ adminSlug }, query, cookieStore, headerStore] = await Promise.all([params, searchParams, cookies(), headers()]);
  const expectedSlug = getAdminHiddenPath();

  if (!expectedSlug || adminSlug !== expectedSlug) {
    notFound();
  }

  const isLoggedIn = isValidAdminSession(cookieStore.get(ADMIN_AUTH_COOKIE_NAME)?.value);
  const errorMessage = query.error ? ERROR_MESSAGES[query.error] : null;
  const isConfigured = isAdminAuthConfigured();
  let initialWishesSummary: WishesAdminSummaryResponse | null = null;
  let initialChatSummary: ChatsAdminSummaryResponse | null = null;
  let initialDataSourceMode: DataSourceMode | null = null;
  let initialSummaryError: string | null = null;

  if (isLoggedIn) {
    const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
    const protocol = headerStore.get("x-forwarded-proto") ?? "http";
    if (host) {
      const cookieHeader = headerStore.get("cookie") ?? "";
      const [wishesResponse, chatsResponse, modeResponse] = await Promise.all([
        fetch(`${protocol}://${host}/api/wishes/admin-summary`, {
          cache: "no-store",
          headers: { cookie: cookieHeader },
        }),
        fetch(`${protocol}://${host}/api/chats/admin-summary`, {
          cache: "no-store",
          headers: { cookie: cookieHeader },
        }),
        fetch(`${protocol}://${host}/api/wishes/admin-data-source`, {
          cache: "no-store",
          headers: { cookie: cookieHeader },
        }),
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
      const modeJson = (await modeResponse.json()) as {
        success?: boolean;
        data?: { mode?: DataSourceMode };
        error?: { message?: string };
      };

      if (!wishesResponse.ok || !wishesJson.success || !wishesJson.data) {
        initialSummaryError = wishesJson.error?.message ?? "希望入力の管理集計取得に失敗しました。";
      } else {
        initialWishesSummary = wishesJson.data;
      }
      if (!chatsResponse.ok || !chatsJson.success || !chatsJson.data) {
        initialSummaryError = chatsJson.error?.message ?? "チャット管理集計の取得に失敗しました。";
      } else {
        initialChatSummary = chatsJson.data;
      }
      if (!modeResponse.ok || !modeJson.success || !modeJson.data?.mode) {
        initialSummaryError = modeJson.error?.message ?? "データソース設定の取得に失敗しました。";
      } else {
        initialDataSourceMode = modeJson.data.mode;
      }
    } else {
      initialSummaryError = "管理集計の取得に必要なホスト情報を特定できませんでした。";
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <section className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">管理者専用</p>
        <h1 className="mt-1 text-3xl font-black text-slate-900">管理画面（非公開）</h1>
        <p className="mt-2 text-sm text-slate-700">
          このページはURLとパスワードを知っている管理者のみ利用します。一般ユーザー向け導線には表示されません。
        </p>

        {!isConfigured ? (
          <p className="mt-4 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
            管理者設定が未完了です。`apps/web/.env`（または `.env.local`）に `ADMIN_HIDDEN_PATH` と `ADMIN_PORTAL_PASSWORD` を設定してください。
          </p>
        ) : null}

        {errorMessage ? (
          <p className="mt-4 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{errorMessage}</p>
        ) : null}

        {query.loggedOut === "1" ? (
          <p className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
            管理画面からログアウトしました。
          </p>
        ) : null}

        {isLoggedIn ? (
          <div className="mt-5 space-y-4">
            <AdminPageView
              initialWishesData={initialWishesSummary}
              initialChatData={initialChatSummary}
              initialDataSourceMode={initialDataSourceMode}
              initialError={initialSummaryError}
            />
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">管理者向けに追加で設定しておくとよい項目</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>提出ログの保管期間（例: 30日で自動整理）</li>
                <li>管理者パスワードのローテーション周期（例: 月1回）</li>
                <li>提出ピーク時の通知条件（例: 特定住戸の希望が5件を超えたら通知）</li>
                <li>ログ出力時の匿名化ルール（必要時のみユーザー名表示）</li>
              </ul>
            </div>
            <form action="/api/admin/session/logout" method="post">
              <button
                type="submit"
                className="cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                ログアウト
              </button>
            </form>
          </div>
        ) : (
          <form action="/api/admin/session/login" method="post" className="mt-5 space-y-3">
            <input type="hidden" name="adminSlug" value={expectedSlug} />
            <label className="block text-sm font-semibold text-slate-800">
              管理者パスワード
              <input
                type="password"
                name="password"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                autoComplete="current-password"
                required
              />
            </label>
            <button
              type="submit"
              className="cursor-pointer rounded-xl border border-[#2f6d92] bg-[#2f6d92] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#255a79]"
              disabled={!isConfigured}
            >
              管理画面へログイン
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
