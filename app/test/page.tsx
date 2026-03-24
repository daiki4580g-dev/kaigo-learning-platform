export default function TestPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <p className="text-sm text-slate-500 mb-2">確認テスト</p>
          <h1 className="text-3xl font-bold text-slate-900">
            腰痛予防の基礎テスト
          </h1>
          <p className="text-slate-600 mt-2">
            動画の内容を確認するための簡単なテストです。
          </p>
        </div>

        <div className="rounded-2xl bg-white border shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            問題1
          </h2>
          <p className="text-slate-700 mb-4">
            介助時の腰痛予防で大切なことはどれですか？
          </p>

          <div className="space-y-3">
            <label className="flex items-center gap-3 border rounded-xl p-3">
              <input type="radio" name="q1" />
              <span>常に腰だけで持ち上げる</span>
            </label>

            <label className="flex items-center gap-3 border rounded-xl p-3">
              <input type="radio" name="q1" />
              <span>姿勢と身体の使い方を意識する</span>
            </label>

            <label className="flex items-center gap-3 border rounded-xl p-3">
              <input type="radio" name="q1" />
              <span>無理な前かがみを続ける</span>
            </label>
          </div>
        </div>

        <div className="rounded-2xl bg-white border shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            問題2
          </h2>
          <p className="text-slate-700 mb-4">
            腰部負担を減らすために望ましい行動はどれですか？
          </p>

          <div className="space-y-3">
            <label className="flex items-center gap-3 border rounded-xl p-3">
              <input type="radio" name="q2" />
              <span>足を使わず上半身だけで介助する</span>
            </label>

            <label className="flex items-center gap-3 border rounded-xl p-3">
              <input type="radio" name="q2" />
              <span>安定した姿勢をとって介助する</span>
            </label>

            <label className="flex items-center gap-3 border rounded-xl p-3">
              <input type="radio" name="q2" />
              <span>急いで勢いで持ち上げる</span>
            </label>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button className="rounded-lg bg-slate-900 text-white px-6 py-3 font-medium hover:bg-slate-800 transition">
            回答を送信する
          </button>

          <button className="rounded-lg border border-slate-300 bg-white text-slate-800 px-6 py-3 font-medium hover:bg-slate-100 transition">
            講義ページへ戻る
          </button>
        </div>
      </div>
    </main>
  );
}