"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

const lessonData: Record<
  string,
  { title: string; description: string; content: string }
> = {
  "1": {
    title: "腰痛予防の基礎",
    description: "介護現場で腰部負担を減らすための基本的な考え方を学びます。",
    content:
      "この講義では、腰痛の主な原因、介助動作で負担がかかりやすい場面、姿勢や身体の使い方の基本、日常的に意識したい予防ポイントについて解説します。",
  },
  "2": {
    title: "移乗介助のポイント",
    description: "安全に移乗介助を行うための基本を学びます。",
    content:
      "この講義では、移乗介助時の立ち位置、重心移動、利用者への声かけ、安全確保の考え方について解説します。",
  },
  "3": {
    title: "転倒予防の基本",
    description: "介護現場で重要な転倒予防の考え方を学びます。",
    content:
      "この講義では、転倒リスクが高まる場面、環境整備、見守りのポイント、日常的にできる予防策について解説します。",
  },
};

export default function LessonDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const lesson = id ? lessonData[id] : undefined;

  if (!lesson) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">
            講義が見つかりません
          </h1>
          <Link
            href="/mypage"
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-800 px-6 py-3 font-medium hover:bg-slate-100 transition"
          >
            マイページへ戻る
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <p className="text-sm text-slate-500 mb-2">講義ページ</p>
          <h1 className="text-3xl font-bold text-slate-900">{lesson.title}</h1>
          <p className="text-slate-600 mt-2">{lesson.description}</p>
        </div>

        <div className="rounded-2xl bg-white border shadow-sm p-6 mb-8">
          <div className="aspect-video w-full rounded-xl bg-slate-200 flex items-center justify-center text-slate-600 text-lg font-medium">
            ここに動画を表示
          </div>
          <p className="text-sm text-slate-500 mt-3">
            ※ 今後ここに Firebase Storage の動画を表示します
          </p>
        </div>

        <div className="rounded-2xl bg-white border shadow-sm p-6 mb-8">
          <h2 className="text-2xl font-semibold text-slate-900 mb-3">
            講義内容
          </h2>
          <p className="text-slate-700 leading-7">{lesson.content}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href={`/test/${id}`}
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 text-white px-6 py-3 font-medium hover:bg-slate-800 transition"
          >
            テストを開始する
          </Link>

          <Link
            href="/mypage"
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-800 px-6 py-3 font-medium hover:bg-slate-100 transition"
          >
            マイページへ戻る
          </Link>
        </div>
      </div>
    </main>
  );
}