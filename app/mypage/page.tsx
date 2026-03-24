"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDoc, getDocs, orderBy, query, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

type Lesson = {
  id: string;
  title: string;
  description: string;
  order: number;
  materialType?: string;
  videoUrl?: string;
};

export default function MyPage() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [profileName, setProfileName] = useState("");
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      setPageError("");

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists() || !userSnap.data().profileCompleted) {
          router.replace("/profile-setup");
          return;
        }

        const userData = userSnap.data();
        setProfileName(userData?.name || "");

        const progressSnapshot = await getDocs(collection(db, "users", user.uid, "progress"));
        const lessonIds = progressSnapshot.docs.map((progressDoc) => String(progressDoc.id));
        setCompletedLessonIds(lessonIds);

        const lessonsQuery = query(
          collection(db, "lessons"),
          where("isPublished", "==", true),
          orderBy("order", "asc")
        );
        const lessonsSnapshot = await getDocs(lessonsQuery);
        const fetchedLessons: Lesson[] = lessonsSnapshot.docs.map((lessonDoc) => {
          const data = lessonDoc.data();
          return {
            id: lessonDoc.id,
            title: String(data.title || "無題の講義"),
            description: String(data.description || "説明は未設定です"),
            order: Number(data.order || 0),
            materialType: String(data.materialType || "video"),
            videoUrl: String(data.videoUrl || ""),
          };
        });
        setLessons(fetchedLessons);

        setAuthLoading(false);
      } catch (e: any) {
        console.error(e);
        setPageError(
          e?.message
            ? `マイページの読み込みに失敗しました: ${e.message}`
            : "マイページの読み込みに失敗しました。"
        );
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="rounded-2xl bg-white border shadow-sm px-8 py-6">
          <p className="text-slate-700 font-medium">読み込み中...</p>
        </div>
      </div>
    );
  }

  const nextLessonId = lessons.find((lesson) => !completedLessonIds.includes(lesson.id))?.id || null;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <div className="rounded-3xl bg-slate-900 text-white p-8 md:p-10 shadow-sm mb-8">
          <p className="text-sm text-slate-300 mb-3">介護職員向け研修プラットフォーム</p>
          {profileName && (
            <p className="text-sm text-green-300 mb-3">ようこそ、{profileName}さん</p>
          )}
          <h1 className="text-3xl md:text-4xl font-bold mb-3">マイページ</h1>
          <p className="text-slate-300 leading-7 max-w-3xl">
            講義の視聴状況や次に取り組む内容を確認できます。完了した講義はこの画面に反映されます。
          </p>
        </div>

        {pageError && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4 mb-8">
            <p className="text-red-700 font-medium">{pageError}</p>
          </div>
        )}

        <div className="rounded-2xl bg-white border shadow-sm p-6">
          <h2 className="text-2xl font-semibold text-slate-900 mb-3">学習状況</h2>
          <p className="text-slate-600 leading-7 mb-4">
            完了した講義は自動で記録されます。次に取り組む講義を確認しながら進めてください。
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl bg-slate-50 border p-4">
              <p className="text-sm text-slate-500 mb-1">完了講義</p>
              <p className="text-2xl font-bold text-slate-900">{completedLessonIds.length}</p>
            </div>
            <div className="rounded-xl bg-slate-50 border p-4">
              <p className="text-sm text-slate-500 mb-1">未完了講義</p>
              <p className="text-2xl font-bold text-slate-900">{lessons.length - completedLessonIds.length}</p>
            </div>
            <div className="rounded-xl bg-slate-50 border p-4">
              <p className="text-sm text-slate-500 mb-1">次におすすめ</p>
              <p className="text-lg font-bold text-slate-900">
                {nextLessonId
                  ? lessons.find((lesson) => lesson.id === nextLessonId)?.title || `講義${nextLessonId}`
                  : "全講義完了"}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border shadow-sm p-6 mt-8">
          <h2 className="text-2xl font-semibold text-slate-900 mb-4">講義一覧</h2>

          <div className="space-y-4">
            {lessons.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">
                公開中の講義はまだありません。
              </div>
            )}
            {lessons.map((lesson) => {
              const isCompleted = completedLessonIds.includes(lesson.id);
              const isNext = nextLessonId === lesson.id;

              return (
                <div
                  key={lesson.id}
                  className={`border rounded-xl p-4 flex items-center justify-between gap-4 ${
                    isNext ? "border-blue-300 bg-blue-50/40" : ""
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-medium text-slate-900">{lesson.title}</p>
                      {isCompleted && (
                        <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 px-3 py-1 text-xs font-medium">
                          完了
                        </span>
                      )}
                      {!isCompleted && isNext && (
                        <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 px-3 py-1 text-xs font-medium">
                          次におすすめ
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm text-slate-500">{lesson.description}</p>
                      {lesson.materialType && (
                        <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-600 px-2.5 py-1 text-[11px] font-medium">
                          {lesson.materialType === "video" ? "動画" : lesson.materialType}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/lesson/${lesson.id}`)}
                    className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-800 whitespace-nowrap"
                  >
                    {isCompleted ? "復習する" : "視聴する"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}