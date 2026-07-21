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
        <div className="mt-5 rounded-2xl border border-[#c9d8e7] bg-[#f3f8fd] p-4">
          <h2 className="text-lg font-bold text-slate-900">このサイトの簡単な使い方</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
            <li>自分の住居情報を入力（団地の住居 / 外住み / 無関係）</li>
            <li>希望の部屋を複数選択して提出</li>
            <li>必要に応じて部屋単位のチャットで会話して調整</li>
          </ol>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/trial" className="inline-flex cursor-pointer rounded-xl border border-[#2f6d92] bg-[#2f6d92] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#255a79]">
              ログインせずに試す
            </Link>
            <Link href="/login" className="inline-flex cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
              ユーザー登録 / ログイン
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link href="/trial" className="cursor-pointer rounded-2xl border border-[#c9d8e7] bg-[#f3f8fd] p-6 transition hover:-translate-y-0.5 hover:shadow-md sm:col-span-2">
          <p className="text-sm text-[#476b8d]">お試しトップ</p>
          <h2 className="text-2xl font-bold text-slate-900">お試しで住戸希望を入力する（登録不要）</h2>
          <p className="mt-2 text-slate-700">
            入居希望者以外でも、住戸希望入力の流れを体験できます。押すたびに「お試しでXXXの部屋を希望しました」と表示します。
            実際の希望数を確認したい方は、参加者登録でご本人を特定してから入力してください。
          </p>
        </Link>

        <Link href="/login" className="cursor-pointer rounded-2xl border border-slate-300 bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-sm text-slate-500">画面0</p>
          <h2 className="text-2xl font-bold text-slate-900">利用開始設定</h2>
          <p className="mt-2 text-slate-700">参加者登録（住戸/匿名名）と確認コード設定を行います。登録し直す場合もこちらから実施できます。</p>
        </Link>

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

      <section className="mt-6 rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-slate-800">まずはここから</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link href="/trial" className="inline-flex cursor-pointer rounded-xl border border-[#2f6d92] bg-[#2f6d92] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#255a79]">
            ログインせずに試す
          </Link>
          <Link href="/login" className="inline-flex cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
            ユーザー登録 / ログイン
          </Link>
        </div>
      </section>
    </main>
  );
}
