"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../../lib/firebase";

type Lesson = {
  id: string;
  title: string;
  order: number;
  category: string;
  courseName: string;
  isPublished: boolean;
};

type LectureLog = {
  lectureId: string;
  completed: boolean;
  testStarted: boolean;
  watchProgress: number;
};

type Learner = {
  id: string;
  name: string;
  department: string;
  facilityId: string;
  facilityName: string;
  lectureLogs: LectureLog[];
};

export default function FacilityLessonsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [learners, setLearners] = useState<Learner[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [keyword, setKeyword] = useState("");
  const [facilityId, setFacilityId] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const storedFacilityId = window.localStorage.getItem("facilityId");

      if (!storedFacilityId) {
        setErrorMessage("施設情報を確認できませんでした。管理者ログインから再ログインしてください。");
        setLoading(false);
        return;
      }

      if (!facilityId) {
        setFacilityId(storedFacilityId);
        return;
      }

      setLoading(true);
      setErrorMessage("");

      try {
        const lessonsSnapshot = await getDocs(collection(db, "lessons"));
        const fetchedLessons = lessonsSnapshot.docs
          .map((lessonDoc) => {
            const data = lessonDoc.data();

            return {
              id: lessonDoc.id,
              title:
                typeof data.title === "string"
                  ? data.title
                  : `講義${lessonDoc.id}`,
              order:
                typeof data.order === "number"
                  ? data.order
                  : Number(lessonDoc.id) || 0,
              category:
                typeof data.category === "string"
                  ? data.category
                  : "未設定",
              courseName:
                typeof data.courseName === "string"
                  ? data.courseName
                  : "未設定",
              isPublished:
                typeof data.isPublished === "boolean"
                  ? data.isPublished
                  : true,
            };
          })
          .sort((a, b) => a.order - b.order);

        const usersSnapshot = await getDocs(
          query(collection(db, "users"), where("facilityId", "==", facilityId))
        );
        const fetchedLearners = await Promise.all(
          usersSnapshot.docs.map(async (userDoc) => {
            const data = userDoc.data();
            const userFacilityId =
              typeof data.facilityId === "string" ? data.facilityId : "";

            if (userFacilityId !== facilityId) return null;

            const lectureLogsSnapshot = await getDocs(
              collection(db, "users", userDoc.id, "lectureLogs")
            );

            const lectureLogs: LectureLog[] = [];

            lectureLogsSnapshot.forEach((lectureDoc) => {
              const lectureData = lectureDoc.data();

              lectureLogs.push({
                lectureId:
                  typeof lectureData.lectureId === "string"
                    ? lectureData.lectureId
                    : lectureDoc.id,
                completed:
                  typeof lectureData.completed === "boolean"
                    ? lectureData.completed
                    : false,
                testStarted:
                  typeof lectureData.testStarted === "boolean"
                    ? lectureData.testStarted
                    : false,
                watchProgress:
                  typeof lectureData.watchProgress === "number"
                    ? lectureData.watchProgress
                    : 0,
              });
            });

            return {
              id: userDoc.id,
              name: typeof data.name === "string" ? data.name : userDoc.id,
              department:
                typeof data.department === "string"
                  ? data.department
                  : "未設定",
              facilityId: userFacilityId,
              facilityName:
                typeof data.facilityName === "string"
                  ? data.facilityName
                  : "施設名未設定",
              lectureLogs,
            };
          })
        );

        setLessons(fetchedLessons);
        setLearners(
          fetchedLearners.filter(
            (learner): learner is Learner => learner !== null
          )
        );
      } catch (error) {
        console.error("講義別進捗取得エラー", error);
        setErrorMessage(
          `講義別の進捗情報の読み込みに失敗しました。詳細: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [facilityId]);

  const filteredLessons = useMemo(() => {
    const trimmedKeyword = keyword.trim().toLowerCase();

    if (!trimmedKeyword) return lessons;

    return lessons.filter((lesson) => {
      return (
        lesson.id.toLowerCase().includes(trimmedKeyword) ||
        lesson.title.toLowerCase().includes(trimmedKeyword) ||
        lesson.category.toLowerCase().includes(trimmedKeyword) ||
        lesson.courseName.toLowerCase().includes(trimmedKeyword)
      );
    });
  }, [lessons, keyword]);

  const lessonProgressRows = filteredLessons.map((lesson) => {
    const watchedLearners = learners.filter((learner) =>
      learner.lectureLogs.some(
        (log) => String(log.lectureId) === String(lesson.id)
      )
    );

    const testStartedLearners = learners.filter((learner) =>
      learner.lectureLogs.some(
        (log) => String(log.lectureId) === String(lesson.id) && log.testStarted
      )
    );

    const completedLearners = learners.filter((learner) =>
      learner.lectureLogs.some(
        (log) => String(log.lectureId) === String(lesson.id) && log.completed
      )
    );

    const watchedRate = learners.length
      ? Math.round((watchedLearners.length / learners.length) * 100)
      : 0;

    const testStartedRate = learners.length
      ? Math.round((testStartedLearners.length / learners.length) * 100)
      : 0;

    const completionRate = learners.length
      ? Math.round((completedLearners.length / learners.length) * 100)
      : 0;

    return {
      ...lesson,
      watchedCount: watchedLearners.length,
      testStartedCount: testStartedLearners.length,
      completedCount: completedLearners.length,
      watchedRate,
      testStartedRate,
      completionRate,
    };
  });

  const facilityName = learners[0]?.facilityName ?? "施設名未設定";

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="rounded-3xl bg-slate-900 text-white p-8 shadow-lg">
          <p className="text-slate-300 mb-2">施設代表者用</p>
          <h1 className="text-4xl font-bold mb-3">講義別進捗</h1>
          <p className="text-slate-300 leading-7">
            登録済み講義ごとに、施設内の視聴開始率、テスト開始率、完了率を確認できます。
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/facility-admin"
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-800 px-5 py-2.5 text-sm font-medium hover:bg-slate-100 transition"
          >
            ダッシュボードへ戻る
          </Link>
          <Link
            href="/facility-admin/learners"
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-800 px-5 py-2.5 text-sm font-medium hover:bg-slate-100 transition"
          >
            受講者管理へ
          </Link>
        </div>

        <section className="rounded-2xl bg-white border shadow-sm p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                検索
              </label>
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="講義名・カテゴリ・コース名で検索"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white border shadow-sm p-6 space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">講義別の進捗状況</h2>
            <p className="text-sm text-slate-500 mt-1">
              対象施設：{facilityName} ／ 対象受講者数：{learners.length}名
            </p>
          </div>

          {loading && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-6 text-slate-600">
              講義別の進捗を読み込み中です...
            </div>
          )}

          {errorMessage && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-red-700">
              {errorMessage}
            </div>
          )}

          {!loading && !errorMessage && lessonProgressRows.length === 0 && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-6 text-slate-600">
              表示できる講義がありません。
            </div>
          )}

          {!loading && !errorMessage && lessonProgressRows.length > 0 && (
            <div className="space-y-4">
              {lessonProgressRows.map((lesson) => (
                <div
                  key={lesson.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">
                        {lesson.courseName} ／ {lesson.category}
                      </p>
                      <h3 className="font-bold text-slate-900">
                        講義{lesson.id}：{lesson.title}
                      </h3>
                    </div>
                    <div className="text-sm text-slate-700">
                      完了 {lesson.completedCount}名 / 対象 {learners.length}名
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-700">視聴開始率</span>
                        <span className="font-medium text-slate-900">
                          {lesson.watchedCount}名（{lesson.watchedRate}%）
                        </span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${lesson.watchedRate}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-700">テスト開始率</span>
                        <span className="font-medium text-slate-900">
                          {lesson.testStartedCount}名（{lesson.testStartedRate}%）
                        </span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-500"
                          style={{ width: `${lesson.testStartedRate}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-700">完了率</span>
                        <span className="font-medium text-slate-900">
                          {lesson.completedCount}名（{lesson.completionRate}%）
                        </span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${lesson.completionRate}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 text-sm">
                    <div className="rounded-xl bg-white border border-slate-200 p-3">
                      <p className="text-slate-500">視聴開始</p>
                      <p className="text-xl font-bold text-slate-900">
                        {lesson.watchedCount}名
                      </p>
                    </div>
                    <div className="rounded-xl bg-white border border-slate-200 p-3">
                      <p className="text-slate-500">テスト開始</p>
                      <p className="text-xl font-bold text-slate-900">
                        {lesson.testStartedCount}名
                      </p>
                    </div>
                    <div className="rounded-xl bg-white border border-slate-200 p-3">
                      <p className="text-slate-500">完了</p>
                      <p className="text-xl font-bold text-slate-900">
                        {lesson.completedCount}名
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}