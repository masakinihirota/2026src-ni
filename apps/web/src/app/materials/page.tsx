import Image from "next/image";
import Link from "next/link";

const PDF_ASSETS = [
  {
    title: "日鋼団地 全体説明会③資料（2026-06-13 開催）",
    href: "/materials/pdf/nikko-danchi-0613.pdf",
  },
];

const SCREENSHOT_ASSETS = [
  { fileName: "screenshot-01.png", title: "画面キャプチャ 01（2026-06-19 15:40:56）", note: "初期画面の記録" },
  { fileName: "screenshot-02.png", title: "画面キャプチャ 02（2026-07-21 02:03:34）", note: "トップ導線の確認用" },
  { fileName: "screenshot-03.png", title: "画面キャプチャ 03（2026-07-21 02:03:40）", note: "利用開始設定の確認用" },
  { fileName: "screenshot-04.png", title: "画面キャプチャ 04（2026-07-21 02:03:46）", note: "住戸選択画面の確認用" },
  { fileName: "screenshot-05.png", title: "画面キャプチャ 05（2026-07-21 02:03:51）", note: "住戸詳細パネルの確認用" },
  { fileName: "screenshot-06.png", title: "画面キャプチャ 06（2026-07-21 02:04:01）", note: "棟切替表示の確認用" },
  { fileName: "screenshot-07.png", title: "画面キャプチャ 07（2026-07-21 02:04:08）", note: "お試し導線の確認用" },
  { fileName: "screenshot-08.png", title: "画面キャプチャ 08（2026-07-21 02:04:14）", note: "希望選択UIの確認用" },
  { fileName: "screenshot-09.png", title: "画面キャプチャ 09（2026-07-21 02:04:19）", note: "提出前状態の確認用" },
  { fileName: "screenshot-10.png", title: "画面キャプチャ 10（2026-07-21 04:19:20）", note: "チャット導線の確認用" },
  { fileName: "screenshot-11.png", title: "画面キャプチャ 11（2026-07-21 04:20:08）", note: "全体チャット表示の確認用" },
  { fileName: "screenshot-12.png", title: "画面キャプチャ 12（2026-07-21 04:20:16）", note: "部屋別チャット表示の確認用" },
  { fileName: "screenshot-13.png", title: "画面キャプチャ 13（2026-07-21 04:20:23）", note: "表示方式切替モーダルの確認用" },
  { fileName: "screenshot-14.png", title: "画面キャプチャ 14（2026-07-21 04:20:30）", note: "最終状態の確認用" },
];

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <section className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">PDF / 画像資料</p>
        <h1 className="mt-1 text-3xl font-black text-slate-900">資料一覧</h1>
        <p className="mt-3 text-sm text-slate-700">
          全ページのフッターからこの資料ページへ移動できます。PDF本体と、現在保存しているスクリーンショット画像を名前付きで確認できます。
        </p>
      </section>

      <section className="mt-4 rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">PDF資料</h2>
        <ul className="mt-3 space-y-2">
          {PDF_ASSETS.map((pdf) => (
            <li key={pdf.href} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <a
                href={pdf.href}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-[#2f6d92] underline underline-offset-2"
              >
                {pdf.title}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-4 rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">画像資料（スクリーンショット）</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SCREENSHOT_ASSETS.map((asset) => {
            const src = `/materials/images/${asset.fileName}`;
            return (
              <article key={asset.fileName} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <a href={src} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <Image
                    src={src}
                    alt={asset.title}
                    width={1200}
                    height={800}
                    className="h-44 w-full object-cover"
                  />
                </a>
                <p className="mt-2 text-sm font-semibold text-slate-900">{asset.title}</p>
                <p className="mt-1 text-xs text-slate-600">{asset.note}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-4">
        <Link href="/sitemap" className="text-sm font-semibold text-[#2f6d92] underline underline-offset-2">
          サイトマップへ戻る
        </Link>
      </section>
    </main>
  );
}
