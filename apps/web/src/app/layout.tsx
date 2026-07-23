import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { AppHeaderNav } from "@/components/app-header-nav";
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
            <Link href="/" className="flex items-center gap-2 rounded-md px-1 py-1 transition hover:bg-slate-100" aria-label="トップページへ移動">
              <Image src="/images/branding/vns-shield.svg" alt="VNS" width={28} height={28} className="h-7 w-7 object-contain" priority />
              <span className="text-sm font-semibold text-slate-800">masakinihirota</span>
            </Link>
            <AppHeaderUserBadge />
            <AppHeaderNav />
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
