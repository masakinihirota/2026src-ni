import Link from "next/link";

export function HomePageView() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-10">
      <section className="rounded-3xl border border-slate-300 bg-white/90 p-8 shadow-sm">
        <p className="text-sm text-slate-500">団地住戸選定デモ</p>
        <h1 className="mt-1 text-4xl font-black tracking-tight text-slate-900">住戸希望チェック Web アプリ</h1>
        <p className="mt-3 max-w-3xl text-slate-700">
          Next.js + Hono + Supabase 前提で、入居前の匿名参加と人気可視化を実装しています。
          住戸選択画面では複数チェック、全体画面では人気ヒートマップを確認できます。
        </p>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link href="/units" className="cursor-pointer rounded-2xl border border-slate-300 bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-sm text-slate-500">画面1</p>
          <h2 className="text-2xl font-bold text-slate-900">住戸を選ぶ</h2>
          <p className="mt-2 text-slate-700">棟とページを切り替え、部屋をクリックして複数選択できます。</p>
        </Link>

        <Link href="/overview" className="cursor-pointer rounded-2xl border border-slate-300 bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-sm text-slate-500">画面2</p>
          <h2 className="text-2xl font-bold text-slate-900">全体人気を見る</h2>
          <p className="mt-2 text-slate-700">団地全体のどの位置に希望が集中しているかを色で確認できます。</p>
        </Link>
      </section>
    </main>
  );
}
