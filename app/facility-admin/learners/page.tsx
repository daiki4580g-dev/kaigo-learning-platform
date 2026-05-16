"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../../lib/firebase";

type LectureLog = {
  id: string;
  lectureId: string;
  title: string;
  startedAt: string;
  endedAt: string;
  watchedSeconds: number;
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
  lectureCount: number;
  completedLectureCount: number;
  totalWatchSeconds: number;
  lastLecture: string;
  lectureLogs: LectureLog[];
};

const formatWatchTime = (seconds: number) => {
  if (!seconds || seconds <= 0) return "0秒";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes <= 0) return `${remainingSeconds}秒`;
  return `${minutes}分${remainingSeconds}秒`;
};

const getStatusText = (learner: Learner) => {
  if (learner.progress >= 100) return "修了";
  if (learner.progress > 0) return "受講中";
  return "未開始";
};

export default function FacilityLearnersPage() {
  const [learners, setLearners] = useState<Learner[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [keyword, setKeyword] = useState("");
  const [facilityId, setFacilityId] = useState("");

  useEffect(() => {
    const fetchLearners = async () => {
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

              const completed =
                typeof lectureData.completed === "boolean"
                  ? lectureData.completed
                  : false;

              const title =
                typeof lectureData.title === "string"
                  ? lectureData.title
                  : `講義${lectureDoc.id}`;

              const startedAt =
                typeof lectureData.startedAt === "string"
                  ? lectureData.startedAt
                  : "未記録";

              totalWatchSeconds += watchedSeconds;

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
                  typeof lectureData.endedAt === "string"
                    ? lectureData.endedAt
                    : "未記録",
                watchedSeconds,
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
                typeof data.department === "string"
                  ? data.department
                  : "未設定",
              facilityId: userFacilityId,
              facilityName:
                typeof data.facilityName === "string"
                  ? data.facilityName
                  : "施設名未設定",
              progress:
                typeof data.progress === "number" ? data.progress : 0,
              lectureCount: lectureLogsSnapshot.size,
              completedLectureCount,
              totalWatchSeconds,
              lastLecture,
              lectureLogs,
            };
          })
        );

        setLearners(
          fetchedLearners.filter(
            (learner): learner is Learner => learner !== null
          )
        );
      } catch (error) {
        console.error("受講者一覧取得エラー", error);
        setErrorMessage(
          `受講者情報の読み込みに失敗しました。詳細: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      } finally {
        setLoading(false);
      }
    };

    fetchLearners();
  }, [facilityId]);

  const filteredLearners = useMemo(() => {
    const trimmedKeyword = keyword.trim().toLowerCase();

    if (!trimmedKeyword) return learners;

    return learners.filter((learner) => {
      return (
        learner.name.toLowerCase().includes(trimmedKeyword) ||
        learner.department.toLowerCase().includes(trimmedKeyword) ||
        getStatusText(learner).toLowerCase().includes(trimmedKeyword)
      );
    });
  }, [learners, keyword]);

  const averageProgress = learners.length
    ? Math.round(
        learners.reduce((sum, learner) => sum + learner.progress, 0) /
          learners.length
      )
    : 0;

  const completedCount = learners.filter(
    (learner) => learner.progress >= 100
  ).length;

  const facilityName = learners[0]?.facilityName ?? "施設名未設定";

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="rounded-3xl bg-slate-900 text-white p-8 shadow-lg">
          <p className="text-slate-300 mb-2">施設代表者用</p>
          <h1 className="text-4xl font-bold mb-3">受講者管理</h1>
          <p className="text-slate-300 leading-7">
            受講者ごとの進捗状況、視聴時間、受講状況を確認できます。
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/facility-admin"
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-800 px-5 py-2.5 text-sm font-medium hover:bg-slate-100 transition"
          >
            ダッシュボードへ戻る
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-white border shadow-sm p-6">
            <p className="text-sm text-slate-500 mb-2">施設名</p>
            <p className="text-2xl font-bold text-slate-900">{facilityName}</p>
          </div>

          <div className="rounded-2xl bg-white border shadow-sm p-6">
            <p className="text-sm text-slate-500 mb-2">対象受講者数</p>
            <p className="text-4xl font-bold text-slate-900">
              {learners.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white border shadow-sm p-6">
            <p className="text-sm text-slate-500 mb-2">平均進捗率</p>
            <p className="text-4xl font-bold text-slate-900">
              {averageProgress}%
            </p>
          </div>

          <div className="rounded-2xl bg-white border shadow-sm p-6">
            <p className="text-sm text-slate-500 mb-2">修了者</p>
            <p className="text-4xl font-bold text-emerald-600">
              {completedCount}
            </p>
          </div>
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

        <section className="rounded-2xl bg-white border shadow-sm p-6 space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">受講者一覧</h2>
            <p className="text-sm text-slate-500 mt-1">
              ログイン中の施設管理者に紐づく受講者のみ表示しています。
            </p>
          </div>

          {loading && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-6 text-slate-600">
              受講状況を読み込み中です...
            </div>
          )}

          {errorMessage && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-red-700">
              {errorMessage}
            </div>
          )}

          {!loading && !errorMessage && filteredLearners.length === 0 && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-6 text-slate-600">
              表示できる受講者がありません。
            </div>
          )}

          {!loading && !errorMessage && filteredLearners.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] border-collapse">
                <thead>
                  <tr className="border-b bg-slate-100 text-left text-sm text-slate-700">
                    <th className="px-4 py-3">氏名</th>
                    <th className="px-4 py-3">所属</th>
                    <th className="px-4 py-3">進捗</th>
                    <th className="px-4 py-3">視聴講義数</th>
                    <th className="px-4 py-3">完了講義数</th>
                    <th className="px-4 py-3">総視聴時間</th>
                    <th className="px-4 py-3">最終講義</th>
                    <th className="px-4 py-3">状況</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredLearners.map((learner) => {
                    const status = getStatusText(learner);

                    return (
                      <tr
                        key={learner.id}
                        className="border-b text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <td className="px-4 py-4 font-medium">
                          {learner.name}
                        </td>
                        <td className="px-4 py-4">
                          {learner.department}
                        </td>
                        <td className="px-4 py-4 min-w-44">
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-28 rounded-full bg-slate-200 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-slate-900"
                                style={{
                                  width: `${Math.min(
                                    Math.max(learner.progress, 0),
                                    100
                                  )}%`,
                                }}
                              />
                            </div>
                            <span>{learner.progress}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {learner.lectureCount}講義
                        </td>
                        <td className="px-4 py-4">
                          {learner.completedLectureCount}講義
                        </td>
                        <td className="px-4 py-4">
                          {formatWatchTime(learner.totalWatchSeconds)}
                        </td>
                        <td className="px-4 py-4">
                          {learner.lastLecture}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                              status === "修了"
                                ? "bg-emerald-100 text-emerald-700"
                                : status === "受講中"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}