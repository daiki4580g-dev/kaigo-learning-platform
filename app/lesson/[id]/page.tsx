"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";

type Lesson = {
  title?: string;
  description?: string;
  content?: string;
  materialType?: string;
  minutes?: number;
  order?: number;
  isPublished?: boolean;
  videoUrl?: string;
};

const getYouTubeEmbedUrl = (url?: string) => {
  if (!url) return "";

  const trimmedUrl = url.trim();

  if (trimmedUrl.includes("youtu.be/")) {
    const videoId = trimmedUrl.split("youtu.be/")[1]?.split("?")[0];
    return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0` : "";
  }

  if (trimmedUrl.includes("youtube.com/watch")) {
    try {
      const parsedUrl = new URL(trimmedUrl);
      const videoId = parsedUrl.searchParams.get("v");
      return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0` : "";
    } catch {
      return "";
    }
  }

  if (trimmedUrl.includes("youtube.com/embed/")) {
    return trimmedUrl;
  }

  return "";
};

export default function LessonDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchLesson = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, "lessons", String(id));
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          setLesson(null);
          return;
        }

        setLesson(docSnap.data() as Lesson);
      } catch (error) {
        console.error("講義取得エラー", error);
        setErrorMessage("講義データの読み込みに失敗しました。");
        setLesson(null);
      } finally {
        setLoading(false);
      }
    };

    fetchLesson();
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="max-w-4xl mx-auto">
          <p className="text-slate-700">講義を読み込み中です...</p>
        </div>
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
          {errorMessage && <p className="text-red-600 mb-4">{errorMessage}</p>}
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

  const embedUrl = getYouTubeEmbedUrl(lesson.videoUrl);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <p className="text-sm text-slate-500 mb-2">講義ページ</p>
          <h1 className="text-3xl font-bold text-slate-900">
            {lesson.title || `講義${id}`}
          </h1>
          {lesson.description && (
            <p className="text-slate-600 mt-2">{lesson.description}</p>
          )}
        </div>

        <div className="rounded-2xl bg-white border shadow-sm p-6 mb-8">
          {embedUrl ? (
            <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
              <iframe
                className="h-full w-full border-0"
                src={embedUrl}
                title={lesson.title || "講義動画"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="aspect-video w-full rounded-xl bg-slate-200 flex items-center justify-center text-slate-600 text-lg font-medium">
              動画URLが設定されていません
            </div>
          )}

          {lesson.videoUrl && (
            <div className="mt-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-sm text-slate-500">
                  動画が表示されない場合は、YouTubeで直接開いてください。
                </p>
                <a
                  href={lesson.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-800 px-4 py-2 text-sm font-medium hover:bg-slate-100 transition"
                >
                  YouTubeで開く
                </a>
              </div>

              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 break-all">
                <p>Firestore videoUrl: {lesson.videoUrl}</p>
                <p>Embed URL: {embedUrl}</p>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white border shadow-sm p-6 mb-8">
          <h2 className="text-2xl font-semibold text-slate-900 mb-3">
            講義内容
          </h2>
          <p className="text-slate-700 leading-7">
            {lesson.content || "講義内容はまだ登録されていません。"}
          </p>
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