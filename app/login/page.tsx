export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl bg-white border shadow-sm p-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          ログイン
        </h1>
        <p className="text-slate-600 mb-6">
          受講者IDとパスワードを入力してください
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              受講者ID
            </label>
            <input
              type="text"
              placeholder="例：kaigo001"
              className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              パスワード
            </label>
            <input
              type="password"
              placeholder="パスワードを入力"
              className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>

          <button className="w-full rounded-lg bg-slate-900 text-white py-2.5 font-medium hover:bg-slate-800 transition">
            ログイン
          </button>
        </div>
      </div>
    </main>
  );
}