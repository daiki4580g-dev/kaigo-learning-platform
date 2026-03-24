"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";

export default function CompletePage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const nextId = id ? String(Number(id) + 1) : null;

  const lessonTitles: Record<string, string> = {
    "1": "腰痛予防の基礎",
    "2": "移乗介助のポイント",
    "3": "転倒予防の基本",
  };

  const currentLessonTitle = id ? lessonTitles[id] || `講義${id}` : "今回の講義";
  const nextLessonTitle = nextId ? lessonTitles[nextId] || `講義${nextId}` : null;

  useEffect(() => {
    if (!id) return;

    const saved = localStorage.getItem("completedLessons");
    let lessons: string[] = [];

    try {
      if (saved) {
        lessons = JSON.parse(saved);
      }
    } catch {
      lessons = [];
    }

    if (!lessons.includes(id)) {
      const updated = [...lessons, id];
      localStorage.setItem("completedLessons", JSON.stringify(updated));
    }
  }, [id]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 px-6 py-12">
      <div className="max-w-3xl mx-auto rounded-2xl border bg-white p-10 shadow-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 text-green-700 text-3xl font-bold mb-4 shadow-sm">
            ✓
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-green-700 mb-2">
            合格しました
          </h1>
          <p className="text-sm text-slate-500">{currentLessonTitle}</p>
        </div>

        <p className="text-xl text-center mb-4 font-medium">
          確認テストに合格し、受講記録が保存されました。
        </p>

        <p className="text-slate-600 text-center mb-8 leading-7">
          お疲れさまでした。学習の成果はマイページと管理画面に反映されます。次の学習に進むか、マイページへ戻って進捗を確認できます。
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div className="rounded-xl bg-slate-50 border p-4 text-center">
            <p className="text-sm text-slate-500 mb-1">完了した講義</p>
            <p className="text-lg font-semibold text-slate-900">{currentLessonTitle}</p>
          </div>
          <div className="rounded-xl bg-slate-50 border p-4 text-center">
            <p className="text-sm text-slate-500 mb-1">記録状況</p>
            <p className="text-lg font-semibold text-green-700">保存済み</p>
          </div>
          <div className="rounded-xl bg-slate-50 border p-4 text-center">
            <p className="text-sm text-slate-500 mb-1">次の学習</p>
            <p className="text-lg font-semibold text-slate-900">{nextLessonTitle || "全講義完了"}</p>
          </div>
        </div>

        {nextId && (
          <div className="rounded-xl bg-slate-100 p-5 mb-6 text-center">
            <p className="text-sm text-slate-500 mb-2">次のステップ</p>
            <p className="text-slate-800 font-medium mb-1">
              次の講義に進むことができます
            </p>
            <p className="text-sm text-slate-600 mb-3">
              {nextLessonTitle}
            </p>
            <button
              type="button"
              onClick={() => {
                window.location.href = `/lesson/${nextId}`;
              }}
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 text-white px-5 py-2 text-sm font-medium hover:bg-slate-800 transition"
            >
              次の講義へ
            </button>
          </div>
        )}

        <div className="mt-10 border-t pt-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => {
                window.location.href = id ? `/lesson/${id}` : "/mypage";
              }}
              className="block w-full rounded-lg bg-slate-800 text-white px-6 py-4 text-base font-medium hover:bg-slate-900 transition shadow"
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