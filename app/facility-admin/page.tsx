

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";

type LectureLog = {
  id: string;
  lectureId: string;
  title: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  watchedSeconds: number;
  videoDurationSeconds: number;
  watchProgress: number;
  testStarted: boolean;
  completed: boolean;
};

type Learner = {
  id: string;
  name: string;
  department: string;
  facilityId: string;
  facilityName: string;
  progress: number;
  testScore?: number;
  status: string;
  lectureCount: number;
  completedLectureCount: number;
  totalWatchSeconds: number;
  lastLecture: string;
  lectureLogs: LectureLog[];
};

type Lesson = {
  id: string;
  title: string;
  order: number;
  category: string;
  courseName: string;
};



export default function FacilityAdminPage() {
  const [learners, setLearners] = useState<Learner[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [keyword, setKeyword] = useState("");
  const [facilityId, setFacilityId] = useState("");

  useEffect(() => {
    const fetchLearners = async () => {
      const storedFacilityId = window.localStorage.getItem("facilityId");

      if (!storedFacilityId) {
        setErrorMessage("施設情報を確認できませんでした。再ログインしてください。");
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
        const usersSnapshot = await getDocs(
          query(collection(db, "users"), where("facilityId", "==", facilityId))
        );

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
            };
          })
          .sort((a, b) => a.order - b.order);

        setLessons(fetchedLessons);

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
            let totalWatchSeconds = 0;
            let completedLectureCount = 0;
            let lastLecture = "未記録";
            let latestStartedAt = "";

            lectureLogsSnapshot.forEach((lectureDoc) => {
              const lectureData = lectureDoc.data();
              const watchedSeconds =
                typeof lectureData.watchedSeconds === "number"
                  ? lectureData.watchedSeconds
                  : 0;
              const durationSeconds =
                typeof lectureData.durationSeconds === "number"
                  ? lectureData.durationSeconds
                  : 0;
              const completed =
                typeof lectureData.completed === "boolean" ? lectureData.completed : false;
              const title =
                typeof lectureData.title === "string"
                  ? lectureData.title
                  : `講義${lectureDoc.id}`;
              const startedAt =
                typeof lectureData.startedAt === "string" ? lectureData.startedAt : "未記録";

              totalWatchSeconds += watchedSeconds || durationSeconds;

              if (completed) {
                completedLectureCount += 1;
              }

              if (startedAt !== "未記録" && startedAt > latestStartedAt) {
                latestStartedAt = startedAt;
                lastLecture = title;
              }

              lectureLogs.push({
                id: lectureDoc.id,
                lectureId:
                  typeof lectureData.lectureId === "string"
                    ? lectureData.lectureId
                    : lectureDoc.id,
                title,
                startedAt,
                endedAt:
                  typeof lectureData.endedAt === "string" ? lectureData.endedAt : "未記録",
                durationSeconds,
                watchedSeconds,
                videoDurationSeconds:
                  typeof lectureData.videoDurationSeconds === "number"
                    ? lectureData.videoDurationSeconds
                    : 0,
                watchProgress:
                  typeof lectureData.watchProgress === "number"
                    ? lectureData.watchProgress
                    : 0,
                testStarted:
                  typeof lectureData.testStarted === "boolean"
                    ? lectureData.testStarted
                    : false,
                completed,
              });
            });

            lectureLogs.sort((a, b) => Number(a.lectureId) - Number(b.lectureId));

            return {
              id: userDoc.id,
              name: typeof data.name === "string" ? data.name : userDoc.id,
              department:
                typeof data.department === "string" ? data.department : "未設定",
              facilityId: userFacilityId,
              facilityName:
                typeof data.facilityName === "string" ? data.facilityName : "施設名未設定",
              progress: typeof data.progress === "number" ? data.progress : 0,
              testScore:
                typeof data.testScore === "number" ? data.testScore : undefined,
              status: typeof data.status === "string" ? data.status : "",
              lectureCount: lectureLogsSnapshot.size,
              completedLectureCount,
              totalWatchSeconds,
              lastLecture,
              lectureLogs,
            };
          })
        );

        setLearners(fetchedLearners.filter((learner): learner is Learner => learner !== null));
      } catch (error) {
        console.error("施設代表者用データ取得エラー", error);
        setErrorMessage(
          `受講状況の読み込みに失敗しました。Firestore の users / lectureLogs の権限を確認してください。詳細: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      } finally {
        setLoading(false);
      }
    };

    fetchLearners();
  }, [facilityId]);


  const averageProgress = learners.length
    ? Math.round(learners.reduce((sum, learner) => sum + learner.progress, 0) / learners.length)
    : 0;
  const completedCount = learners.filter((learner) => learner.progress >= 100).length;
  const notStartedCount = learners.filter((learner) => learner.lectureCount === 0).length;
  const inProgressCount = learners.filter(
    (learner) => learner.lectureCount > 0 && learner.progress < 100
  ).length;
  const facilityName = learners[0]?.facilityName ?? "施設名未設定";
  const totalLearners = learners.length || 1;
  const completedRate = Math.round((completedCount / totalLearners) * 100);
  const inProgressRate = Math.round((inProgressCount / totalLearners) * 100);
  const notStartedRate = Math.round((notStartedCount / totalLearners) * 100);

  const lessonProgressRows = lessons.map((lesson) => {
    const watchedCount = learners.filter((learner) =>
      learner.lectureLogs.some((log) => String(log.lectureId) === String(lesson.id))
    ).length;

    const completedLessonCount = learners.filter((learner) =>
      learner.lectureLogs.some(
        (log) => String(log.lectureId) === String(lesson.id) && log.completed
      )
    ).length;

    const testStartedCount = learners.filter((learner) =>
      learner.lectureLogs.some(
        (log) => String(log.lectureId) === String(lesson.id) && log.testStarted
      )
    ).length;

    const completionRate = learners.length
      ? Math.round((completedLessonCount / learners.length) * 100)
      : 0;

    const watchedRate = learners.length
      ? Math.round((watchedCount / learners.length) * 100)
      : 0;

    return {
      ...lesson,
      watchedCount,
      completedLessonCount,
      testStartedCount,
      completionRate,
      watchedRate,
    };
  });



  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="rounded-3xl bg-slate-900 text-white p-8 shadow-lg">
          <p className="text-slate-300 mb-2">施設代表者用</p>
          <h1 className="text-4xl font-bold mb-3">受講状況管理</h1>
          <p className="text-slate-300 leading-7">
            自施設の受講者の進捗、視聴ログ、テスト開始状況を確認できます。
            講義やテストの編集はできません。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/facility-admin/learners"
            className="rounded-2xl bg-white border shadow-sm p-6 hover:border-slate-400 transition"
          >
            <p className="text-sm text-slate-500 mb-2">受講者管理</p>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              受講者ごとの進捗
            </h2>
            <p className="text-sm text-slate-600 leading-6">
              個別の進捗率、視聴時間、修了状況を確認できます。
            </p>
          </Link>

          <Link
            href="/facility-admin/lessons"
            className="rounded-2xl bg-white border shadow-sm p-6 hover:border-slate-400 transition"
          >
            <p className="text-sm text-slate-500 mb-2">講義別進捗</p>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              講義ごとの受講率
            </h2>
            <p className="text-sm text-slate-600 leading-6">
              視聴開始率、テスト開始率、完了率を確認できます。
            </p>
          </Link>

          <Link
            href="/facility-admin/logs"
            className="rounded-2xl bg-white border shadow-sm p-6 hover:border-slate-400 transition"
          >
            <p className="text-sm text-slate-500 mb-2">視聴ログ詳細</p>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              助成金提出用ログ
            </h2>
            <p className="text-sm text-slate-600 leading-6">
              視聴開始・終了時刻やCSV出力を確認できます。
            </p>
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
                placeholder="氏名・所属・状況で検索"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-white border shadow-sm p-6">
            <p className="text-sm text-slate-500 mb-2">施設名</p>
            <p className="text-2xl font-bold text-slate-900">{facilityName}</p>
          </div>

          <div className="rounded-2xl bg-white border shadow-sm p-6">
            <p className="text-sm text-slate-500 mb-2">対象受講者数</p>
            <p className="text-4xl font-bold text-slate-900">{learners.length}</p>
          </div>

          <div className="rounded-2xl bg-white border shadow-sm p-6">
            <p className="text-sm text-slate-500 mb-2">平均進捗率</p>
            <p className="text-4xl font-bold text-slate-900">{averageProgress}%</p>
          </div>

          <div className="rounded-2xl bg-white border shadow-sm p-6">
            <p className="text-sm text-slate-500 mb-2">未開始者</p>
            <p className="text-4xl font-bold text-red-500">{notStartedCount}</p>
          </div>
        </div>

        <section className="rounded-2xl bg-white border shadow-sm p-6 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">受講状況の可視化</h2>
            <p className="text-sm text-slate-500 mt-1">
              施設全体の進捗をグラフで確認できます。
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-900">平均進捗率</h3>
                <span className="text-2xl font-bold text-slate-900">{averageProgress}%</span>
              </div>
              <div className="h-5 w-full rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-slate-900 transition-all"
                  style={{ width: `${Math.min(Math.max(averageProgress, 0), 100)}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-3">
                対象受講者全体の平均進捗率です。
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="font-bold text-slate-900 mb-4">受講ステータス内訳</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-700">修了</span>
                    <span className="font-medium text-slate-900">
                      {completedCount}名（{completedRate}%）
                    </span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${completedRate}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-700">受講中</span>
                    <span className="font-medium text-slate-900">
                      {inProgressCount}名（{inProgressRate}%）
                    </span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-500"
                      style={{ width: `${inProgressRate}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-700">未開始</span>
                    <span className="font-medium text-slate-900">
                      {notStartedCount}名（{notStartedRate}%）
                    </span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-red-500"
                      style={{ width: `${notStartedRate}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}