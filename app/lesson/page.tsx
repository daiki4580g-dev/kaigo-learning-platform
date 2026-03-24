import Link from "next/link";

export default function MyPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">マイページ</h1>

        <section>
          <h2 className="text-2xl font-semibold text-slate-900 mb-6">視聴できる講義</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="rounded-2xl bg-white border shadow-sm p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">腰痛予防の基礎</h3>
                <p className="text-slate-700 text-sm mb-4">
                  介護現場で腰部負担を減らすための基本的な考え方を学びます。
                </p>
              </div>
              <a
                href="/lesson"
                className="inline-flex items-center justify-center rounded-lg bg-slate-900 text-white px-4 py-2 text-sm hover:bg-slate-800 transition"
              >
                視聴する
              </a>
            </div>

            <div className="rounded-2xl bg-white border shadow-sm p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">移乗介助のポイント</h3>
                <p className="text-slate-700 text-sm mb-4">
                  安全に移乗介助を行うためのポイントを解説します。
                </p>
              </div>
              <a
                href="/lesson"
                className="inline-flex items-center justify-center rounded-lg bg-slate-900 text-white px-4 py-2 text-sm hover:bg-slate-800 transition"
              >
                もう一度見る
              </a>
            </div>

            <div className="rounded-2xl bg-white border shadow-sm p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">転倒予防の基本</h3>
                <p className="text-slate-700 text-sm mb-4">
                  転倒を防ぐための基本的な知識と対策を学びます。
                </p>
              </div>
              <a
                href="/lesson"
                className="inline-flex items-center justify-center rounded-lg bg-slate-900 text-white px-4 py-2 text-sm hover:bg-slate-800 transition"
              >
                視聴する
              </a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}