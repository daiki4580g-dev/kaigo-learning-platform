"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Lesson = {
  id: string;
  title: string;
  description: string;
  content: string;
  minutes: number;
  order: number;
  isPublished?: boolean;
  materialType?: string;
  videoUrl?: string;
  points: string[];
};

export default function LessonDetailPage() {
  const params = useParams();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLessons = async () => {
      try {
        const lessonsQuery = query(
          collection(db, "lessons"),
          where("isPublished", "==", true),
          orderBy("order", "asc")
        );
        const snapshot = await getDocs(lessonsQuery);
        const list: Lesson[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: String(data.title || "無題の講義"),
            description: String(data.description || "説明は未設定です"),
            content: String(data.content || ""),
            minutes: Number(data.minutes || 0),
            order: Number(data.order || 0),
            isPublished: Boolean(data.isPublished),
            materialType: String(data.materialType || "video"),
            videoUrl: String(data.videoUrl || ""),
            points: Array.isArray(data.points)
              ? data.points.map((point) => String(point))
              : [],
          };
        });
        setLessons(list);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchLessons();
  }, []);

  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const lesson = lessons.find((l) => l.id === id);

  const currentIndex = lessons.findIndex((l) => l.id === id);
  const previousLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 && currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;
  const previousLessonId = previousLesson?.id || null;
  const nextLessonId = nextLesson?.id || null;

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p>読み込み中...</p>
      </main>
    );
  }

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
        <div className="rounded-2xl bg-white border shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500 mb-2">講義ページ</p>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">{lesson.title}</h1>
              <p className="text-slate-600">{lesson.description}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-4 py-2 text-sm font-medium">
                {lesson.minutes}分
              </div>
              <div className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 px-4 py-2 text-sm font-medium">
                確認テストあり
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border shadow-sm p-6 mb-8">
          <div className="aspect-video w-full rounded-xl bg-slate-200 flex items-center justify-center text-slate-600 text-lg font-medium overflow-hidden">
            {lesson.videoUrl ? (
              lesson.videoUrl.includes("youtube.com") || lesson.videoUrl.includes("youtu.be") ? (
                <iframe
                  className="w-full h-full rounded-xl"
                  src={
                    lesson.videoUrl.includes("watch?v=")
                      ? lesson.videoUrl.replace("watch?v=", "embed/")
                      : lesson.videoUrl.replace("youtu.be/", "www.youtube.com/embed/")
                  }
                  title="講義動画"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <video controls className="w-full h-full rounded-xl bg-black">
                  <source src={lesson.videoUrl} />
                </video>
              )
            ) : (
              "動画未設定"
            )}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
            <p className="text-sm text-slate-500">
              ※ 視聴後に確認テストへ進んでください
            </p>
            <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 px-3 py-1 text-xs font-medium">
              テスト完了後に記録されます
            </span>
          </div>
        </div>

        <div className="rounded-2xl bg-blue-50 border border-blue-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">学習の進め方</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl bg-white border border-blue-100 p-4">
              <p className="text-sm text-slate-500 mb-1">STEP 1</p>
              <p className="font-semibold text-slate-900 mb-2">講義を見る</p>
              <p className="text-sm text-slate-600">まずは動画や講義内容を確認して、ポイントを押さえます。</p>
            </div>
            <div className="rounded-xl bg-white border border-blue-100 p-4">
              <p className="text-sm text-slate-500 mb-1">STEP 2</p>
              <p className="font-semibold text-slate-900 mb-2">確認テストに回答</p>
              <p className="text-sm text-slate-600">内容を理解できたか、テストで確認します。</p>
            </div>
            <div className="rounded-xl bg-white border border-blue-100 p-4">
              <p className="text-sm text-slate-500 mb-1">STEP 3</p>
              <p className="font-semibold text-slate-900 mb-2">合格で自動記録</p>
              <p className="text-sm text-slate-600">テスト完了後に受講記録が保存され、マイページと管理画面に反映されます。</p>
            </div>
          </div>
        </div>


        <div className="rounded-2xl bg-white border shadow-sm p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">学習アクション</h2>

          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href={`/test/${id}`}
                className="inline-flex items-center justify-center rounded-lg bg-slate-900 text-white px-6 py-3 font-medium hover:bg-slate-800 transition shadow"
              >
                テストを開始する
              </Link>

              <Link
                href="/mypage"
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-800 px-6 py-3 font-medium hover:bg-slate-100 transition shadow"
              >
                マイページへ戻る
              </Link>
            </div>

            {nextLesson && (
              <div className="rounded-xl bg-slate-50 border px-4 py-3 lg:min-w-[280px]">
                <p className="text-xs text-slate-500 mb-1">このあと進む講義</p>
                <p className="font-semibold text-slate-900">{nextLesson.title}</p>
                <p className="text-sm text-slate-600 mt-1">{nextLesson.description}</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white border shadow-sm p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">講義ナビゲーション</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            {previousLesson ? (
              <Link
                href={`/lesson/${previousLessonId}`}
                className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-4 hover:bg-slate-50 transition"
              >
                <p className="text-xs text-slate-500 mb-1">前の講義</p>
                <p className="font-semibold text-slate-900">{previousLesson.title}</p>
              </Link>
            ) : (
              <div className="flex-1 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-slate-400">
                <p className="text-xs mb-1">前の講義</p>
                <p className="font-semibold">この講義が最初です</p>
              </div>
            )}

            {nextLesson ? (
              <Link
                href={`/lesson/${nextLessonId}`}
                className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-4 hover:bg-slate-50 transition"
              >
                <p className="text-xs text-slate-500 mb-1">次の講義</p>
                <p className="font-semibold text-slate-900">{nextLesson.title}</p>
              </Link>
            ) : (
              <div className="flex-1 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-slate-400">
                <p className="text-xs mb-1">次の講義</p>
                <p className="font-semibold">この講義が最後です</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}