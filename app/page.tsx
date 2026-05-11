export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-4">
          介護職員向け研修プラットフォーム
        </h1>

        <p className="text-lg text-slate-600 mb-8">
          短時間の動画講義を視聴し、テストと履歴管理ができるWebサービス
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-white p-6 shadow-sm border">
            <h2 className="text-2xl font-semibold mb-3">受講者向け</h2>
            <ul className="space-y-2 text-slate-700">
              <li>・動画講義の視聴</li>
              <li>・テストの受験</li>
              <li>・視聴履歴の確認</li>
            </ul>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm border">
            <h2 className="text-2xl font-semibold mb-3">管理者向け</h2>
            <ul className="space-y-2 text-slate-700">
              <li>・動画の登録</li>
              <li>・受講状況の確認</li>
              <li>・テスト結果の確認</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}