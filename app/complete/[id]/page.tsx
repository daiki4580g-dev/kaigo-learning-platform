"use client";

import { useParams } from "next/navigation";

export default function CompletePage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 px-6 py-12">
      <div className="max-w-3xl mx-auto rounded-2xl border bg-white p-10 shadow-sm">
        <h1 className="text-3xl font-bold text-green-700 text-center mb-6">
          テスト完了
        </h1>

        <p className="text-xl text-center mb-4">
          講義の確認テストに合格しました。
        </p>

        <p className="text-slate-600 text-center mb-10 leading-7">
          お疲れさまでした。次の学習に進むか、マイページへ戻ることができます。
        </p>

        <div className="mt-8 border-t pt-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => {
                window.location.href = id ? `/lesson/${id}` : "/mypage";
              }}
              className="block w-full rounded-lg bg-slate-700 text-white px-6 py-4 text-base font-medium hover:bg-slate-800 transition"
            >
              講義ページへ戻る
            </button>

           <button
  type="button"
  onClick={() => {
    window.location.href = "/mypage";
  }}
  className="block w-full rounded-lg bg-black text-white px-6 py-4 text-base font-medium hover:bg-gray-800 transition shadow"
>
  マイページへ
</button>
          </div>
        </div>
      </div>
    </main>
  );
}