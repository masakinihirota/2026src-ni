import Link from "next/link";

const PAGE_GROUPS = [
  {
    title: "共通（誰でも利用可能）",
    pages: [
      { href: "/", label: "トップページ", description: "全体入口。お試し・登録・本入力への導線。" },
      { href: "/trial", label: "お試しページ", description: "本番とは独立した学習用GUI。棟→図面クリックで希望入力を体験。" },
      { href: "/materials", label: "資料一覧（PDF・画像）", description: "PDF資料とスクリーンショット画像を名前付きで確認。" },
      { href: "/sitemap", label: "サイトマップ", description: "この一覧ページ。" },
    ],
  },
  {
    title: "登録・本人特定フロー",
    pages: [
      { href: "/login", label: "利用開始設定（ログイン/登録）", description: "参加者登録、星座匿名選択、確認コード設定。" },
    ],
  },
  {
    title: "登録後の本番利用",
    pages: [
      { href: "/units", label: "複数希望申込 事前調査ページ", description: "実際の住戸希望を入力（希望1〜3）。" },
      { href: "/units/chat?scope=global", label: "全体調整チャット", description: "全体向け対話チャット。ヘッダーの「チャット」から直接遷移可能。" },
      { href: "/units/chat?rank=1&roomCode=N1-1-1201", label: "部屋別チャット（例）", description: "部屋ごとの対話チャット。ヘッダードロップダウンに3部屋のショートカットを設置。" },
      { href: "/overview", label: "全体人気ビュー", description: "希望集中状況の確認。" },
    ],
  },
];

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <section className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">サイト全体像</p>
        <h1 className="mt-1 text-3xl font-black text-slate-900">サイトマップ</h1>
        <p className="mt-3 text-sm text-slate-700">
          このアプリは「お試し体験」と「登録後の本入力」を分離しています。
          お試しは学習専用で本番データには影響しません。実際の希望数確認は利用開始設定で本人特定後に本入力へ進んでください。
        </p>
      </section>

      <section className="mt-4 grid gap-4">
        {PAGE_GROUPS.map((group) => (
          <article key={group.title} className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">{group.title}</h2>
            <ul className="mt-3 space-y-2">
              {group.pages.map((page) => (
                <li key={page.href} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <Link href={page.href} className="font-semibold text-[#2f6d92] underline underline-offset-2">
                    {page.label}
                  </Link>
                  <p className="mt-1 text-sm text-slate-700">{page.description}</p>
                  <p className="mt-1 text-xs text-slate-500">{page.href}</p>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </main>
  );
}
