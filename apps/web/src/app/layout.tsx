import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { AppHeaderUserBadge } from "@/components/app-header-user-badge";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "団地住戸選定デモ",
  description: "匿名で住戸希望を複数選択し、団地全体の人気を可視化するデモ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center gap-2 px-4 py-3 text-sm">
            <AppHeaderUserBadge />
            <Link href="/" className="rounded-full border border-slate-300 bg-white px-3 py-1 font-semibold text-slate-700 transition hover:bg-slate-100">
              トップ
            </Link>
            <Link href="/trial" className="rounded-full border border-slate-300 bg-white px-3 py-1 font-semibold text-slate-700 transition hover:bg-slate-100">
              お試し
            </Link>
            <Link href="/login" className="rounded-full border border-slate-300 bg-white px-3 py-1 font-semibold text-slate-700 transition hover:bg-slate-100">
              利用開始設定
            </Link>
            <Link href="/units" className="rounded-full border border-slate-300 bg-white px-3 py-1 font-semibold text-slate-700 transition hover:bg-slate-100">
              本入力
            </Link>
            <details className="group relative">
              <summary className="list-none cursor-pointer rounded-full border border-slate-300 bg-white px-3 py-1 font-semibold text-slate-700 transition hover:bg-slate-100">
                チャット
              </summary>
              <div className="absolute left-0 z-20 mt-1 min-w-64 rounded-xl border border-slate-300 bg-white p-2 shadow-lg">
                <Link href="/units/chat?scope=global" className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                  全体調整チャット
                </Link>
                <div className="my-1 border-t border-slate-200" />
                <p className="px-3 py-1 text-xs font-semibold text-slate-500">部屋別チャット（例）</p>
                <Link href="/units/chat?rank=1&roomCode=N1-1-1201" className="block rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100">
                  N1-1-1201
                </Link>
                <Link href="/units/chat?rank=1&roomCode=N2-2-1210" className="block rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100">
                  N2-2-1210
                </Link>
                <Link href="/units/chat?rank=1&roomCode=S4-6-1233" className="block rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100">
                  S4-6-1233
                </Link>
              </div>
            </details>
            <Link href="/sitemap" className="rounded-full border border-[#2f6d92] bg-[#eef6fc] px-3 py-1 font-semibold text-[#1f5a7d] transition hover:bg-[#e1f0fb]">
              サイトマップ
            </Link>
          </div>
        </header>
        {children}
        <footer className="mt-auto border-t border-slate-200 bg-white">
          <div className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs text-slate-600">
            <span>住戸希望チェック Web アプリ</span>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/materials" className="font-semibold text-[#2f6d92] underline underline-offset-2">
                資料を見る（PDF・画像）
              </Link>
              <Link href="/sitemap" className="font-semibold text-[#2f6d92] underline underline-offset-2">
                サイトマップを見る
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
