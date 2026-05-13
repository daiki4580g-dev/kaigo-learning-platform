"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
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
  updatedAt: string;
};

type Learner = {
  id: string;
  name?: string;
  department?: string;
  ageGroup?: string;
  jobType?: string;
  profileCompleted?: boolean;
  progress?: number;
  testScore?: number;
  status?: string;
  lastLecture?: string;
  lastUpdated?: string;
  lectureCount?: number;
  completedLectureCount?: number;
  testStartedCount?: number;
  totalWatchSeconds?: number;
  lectureLogs?: LectureLog[];
};

const getProgressText = (progress?: number) => {
  if (typeof progress !== "number") return "0%";
  return `${progress}%`;
};

const getStatusText = (learner: Learner) => {
  if (learner.status) return learner.status;
  if ((learner.progress ?? 0) >= 100) return "修了";
  if ((learner.completedLectureCount ?? 0) > 0 || (learner.testStartedCount ?? 0) > 0) {
    return "受講中";
  }
  if ((learner.lectureCount ?? 0) > 0) return "視聴中";
  return "未開始";
};

const formatWatchTime = (seconds?: number) => {
  if (!seconds || seconds <= 0) return "0秒";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes <= 0) return `${remainingSeconds}秒`;
  return `${minutes}分${remainingSeconds}秒`;
};

const formatProgress = (value?: number) => {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.min(Math.max(value, 0), 100);
};

const escapeCsvValue = (value: string | number | undefined) => {
  const stringValue = value === undefined ? "" : String(value);
  return `"${stringValue.replace(/"/g, '""')}"`;
};

const TOTAL_LESSONS = 60;

const getLessonTitle = (lectureId: number, existingTitle?: string) => {
  if (existingTitle && existingTitle !== `講義${lectureId}`) return existingTitle;
  return `講義${lectureId}`;
};

const getLectureStatus = (log?: LectureLog) => {
  if (!log) return "未視聴";
  if (log.completed) return "完了";
  if (log.testStarted) return "テスト開始済み";
  if ((log.watchProgress ?? 0) >= 90) return "視聴完了";
  return "視聴中";
};

export default function AdminPage() {
  const [learners, setLearners] = useState<Learner[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    const fetchLearners = async () => {
      try {
        const learnersQuery = collection(db, "users");
        const snapshot = await getDocs(learnersQuery);

        const fetchedLearners = await Promise.all(
          snapshot.docs.map(async (doc) => {
            const data = doc.data();

            let lectureCount = 0;
            let totalWatchSeconds = 0;
            let latestLecture = "未記録";
            const lectureLogs: LectureLog[] = [];
            let completedLectureCount = 0;
            let testStartedCount = 0;

            try {
              const lectureLogsRef = collection(db, "users", doc.id, "lectureLogs");
              const lectureSnapshot = await getDocs(lectureLogsRef);

              lectureCount = lectureSnapshot.size;

              lectureSnapshot.forEach((lectureDoc) => {
                const lectureData = lectureDoc.data();
                const durationSeconds =
                  typeof lectureData.durationSeconds === "number"
                    ? lectureData.durationSeconds
                    : 0;

                const watchedSeconds =
                  typeof lectureData.watchedSeconds === "number"
                    ? lectureData.watchedSeconds
                    : durationSeconds;
                const videoDurationSeconds =
                  typeof lectureData.videoDurationSeconds === "number"
                    ? lectureData.videoDurationSeconds
                    : 0;
                const watchProgress =
                  typeof lectureData.watchProgress === "number"
                    ? lectureData.watchProgress
                    : videoDurationSeconds > 0
                    ? Math.round((watchedSeconds / videoDurationSeconds) * 100)
                    : 0;
                const completed = lectureData.completed === true;
                const testStarted = lectureData.testStarted === true;

                if (completed) completedLectureCount += 1;
                if (testStarted) testStartedCount += 1;

                totalWatchSeconds += watchedSeconds;

                lectureLogs.push({
                  id: lectureDoc.id,
                  lectureId:
                    typeof lectureData.lectureId === "string"
                      ? lectureData.lectureId
                      : lectureDoc.id,
                  title:
                    typeof lectureData.title === "string"
                      ? lectureData.title
                      : `講義${lectureDoc.id}`,
                  startedAt:
                    typeof lectureData.startedAt === "string"
                      ? lectureData.startedAt
                      : "未記録",
                  endedAt:
                    typeof lectureData.endedAt === "string"
                      ? lectureData.endedAt
                      : "未記録",
                  durationSeconds,
                  watchedSeconds,
                  videoDurationSeconds,
                  watchProgress: formatProgress(watchProgress),
                  testStarted,
                  completed,
                  updatedAt:
                    typeof lectureData.updatedAt === "string"
                      ? lectureData.updatedAt
                      : "未記録",
                });
              });

              lectureLogs.sort((a, b) => Number(a.lectureId) - Number(b.lectureId));

              const latestQuery = query(
                lectureLogsRef,
                orderBy("startedAt", "desc"),
                limit(1)
              );

              const latestSnapshot = await getDocs(latestQuery);

              if (!latestSnapshot.empty) {
                const latestData = latestSnapshot.docs[0].data();
                latestLecture =
                  typeof latestData.title === "string"
                    ? latestData.title
                    : `講義${latestSnapshot.docs[0].id}`;
              }
            } catch (error) {
              console.error("lectureLogs取得エラー", error);
            }

            // get total number of lessons for progress calculation
            const totalLessons =
              typeof data.totalLessons === "number"
                ? data.totalLessons
                : TOTAL_LESSONS;
            return {
              id: doc.id,
              name: typeof data.name === "string" ? data.name : doc.id,
              department: typeof data.department === "string" ? data.department : "未設定",
              ageGroup: typeof data.ageGroup === "string" ? data.ageGroup : "未設定",
              jobType: typeof data.jobType === "string" ? data.jobType : "未設定",
              profileCompleted: data.profileCompleted === true,
              progress: totalLessons > 0 ? Math.round((completedLectureCount / totalLessons) * 100) : 0,
              testScore: typeof data.testScore === "number" ? data.testScore : undefined,
              status: typeof data.status === "string" ? data.status : undefined,
              lastLecture:
                typeof data.lastLecture === "string" ? data.lastLecture : latestLecture,
              lastUpdated:
                typeof data.lastUpdated === "string" ? data.lastUpdated : "未記録",
              lectureCount,
              completedLectureCount,
              testStartedCount,
              totalWatchSeconds,
              lectureLogs,
            };
          })
        );

        setLearners(fetchedLearners);
      } catch (error) {
        console.error("受講者取得エラー", error);
        setErrorMessage(
          `受講者データの読み込みに失敗しました。Firestore の users コレクションまたはセキュリティルールを確認してください。詳細: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      } finally {
        setLoading(false);
      }
    };

    fetchLearners();
  }, []);

  const filteredLearners = useMemo(() => {
    const trimmedKeyword = keyword.trim().toLowerCase();

    if (!trimmedKeyword) return learners;

    return learners.filter((learner) => {
      const name = learner.name?.toLowerCase() ?? "";
      const department = learner.department?.toLowerCase() ?? "";
      const ageGroup = learner.ageGroup?.toLowerCase() ?? "";
      const jobType = learner.jobType?.toLowerCase() ?? "";
      const status = getStatusText(learner).toLowerCase();

      return (
        name.includes(trimmedKeyword) ||
        department.includes(trimmedKeyword) ||
        ageGroup.includes(trimmedKeyword) ||
        jobType.includes(trimmedKeyword) ||
        status.includes(trimmedKeyword)
      );
    });
  }, [learners, keyword]);

  const lectureLogRows = filteredLearners.flatMap((learner) => {
    const logsByLectureId = new Map(
      (learner.lectureLogs ?? []).map((log) => [String(log.lectureId), log])
    );

    return Array.from({ length: TOTAL_LESSONS }, (_, index) => {
      const lectureId = String(index + 1);
      const log = logsByLectureId.get(lectureId);

      return {
        learnerId: learner.id,
        learnerName: learner.name ?? learner.id,
        department: learner.department ?? "未設定",
        ageGroup: learner.ageGroup ?? "未設定",
        jobType: learner.jobType ?? "未設定",
        id: log?.id ?? lectureId,
        lectureId,
        title: getLessonTitle(index + 1, log?.title),
        startedAt: log?.startedAt ?? "未記録",
        endedAt: log?.endedAt ?? "未記録",
        durationSeconds: log?.durationSeconds ?? 0,
        watchedSeconds: log?.watchedSeconds ?? 0,
        videoDurationSeconds: log?.videoDurationSeconds ?? 0,
        watchProgress: log?.watchProgress ?? 0,
        testStarted: log?.testStarted ?? false,
        completed: log?.completed ?? false,
        updatedAt: log?.updatedAt ?? "未記録",
        lectureStatus: getLectureStatus(log),
      };
    });
  });

  const displayedLectureLogRows = lectureLogRows.filter(
    (log) => log.lectureStatus !== "未視聴"
  );

  const handleDownloadLectureLogsCsv = () => {
    const headers = [
      "受講者ID",
      "氏名",
      "所属",
      "年代",
      "職種",
      "講義ID",
      "講義名",
      "視聴開始",
      "視聴終了",
      "ページ滞在時間（秒）",
      "実視聴時間（秒）",
      "動画時間（秒）",
      "視聴率（%）",
      "テスト開始",
      "完了",
      "状況",
    ];

    const rows = lectureLogRows.map((log) => [
      log.learnerId,
      log.learnerName,
      log.department,
      log.ageGroup,
      log.jobType,
      log.lectureId,
      log.title,
      log.startedAt,
      log.endedAt,
      log.durationSeconds,
      log.watchedSeconds,
      log.videoDurationSeconds,
      log.watchProgress,
      log.testStarted ? "開始済み" : "未開始",
      log.completed ? "完了" : "未完了",
      log.lectureStatus,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((value) => escapeCsvValue(value)).join(","))
      .join("\n");

    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `受講ログ_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadLearnersCsv = () => {
    const headers = [
      "受講者ID",
      "氏名",
      "所属",
      "年代",
      "職種",
      "初回登録",
      "進捗率（%）",
      "視聴講義数",
      "テスト開始数",
      "完了講義数",
      "総視聴時間（秒）",
      "受講状況",
    ];

    const rows = filteredLearners.map((learner) => [
      learner.id,
      learner.name ?? learner.id,
      learner.department ?? "未設定",
      learner.ageGroup ?? "未設定",
      learner.jobType ?? "未設定",
      learner.profileCompleted ? "登録済み" : "未登録",
      learner.progress ?? 0,
      learner.lectureCount ?? 0,
      learner.testStartedCount ?? 0,
      learner.completedLectureCount ?? 0,
      learner.totalWatchSeconds ?? 0,
      getStatusText(learner),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((value) => escapeCsvValue(value)).join(","))
      .join("\n");

    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `受講者進捗_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const completedCount = learners.filter((learner) => (learner.progress ?? 0) >= 100).length;
  const inProgressCount = learners.filter(
    (learner) => (learner.progress ?? 0) > 0 && (learner.progress ?? 0) < 100
  ).length;
  const notStartedCount = learners.filter((learner) => (learner.lectureCount ?? 0) === 0).length;
  const averageProgress = learners.length
    ? Math.round(
        learners.reduce((sum, learner) => sum + (learner.progress ?? 0), 0) / learners.length
      )
    : 0;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="rounded-3xl bg-slate-900 text-white p-8 shadow-lg">
          <h1 className="text-4xl font-bold mb-3">管理者画面</h1>
          <p className="text-slate-300 leading-7">
            Firestore に登録された受講者の受講状況、テスト結果、視聴ログを確認できます。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="#learner-status"
            className="rounded-2xl bg-white border shadow-sm p-6 hover:shadow-md transition block"
          >
            <p className="text-sm text-slate-500 mb-2">受講状況</p>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">受講者管理</h2>
            <p className="text-sm text-slate-600 leading-6">
              受講者ごとの進捗、視聴時間、テスト開始状況を確認します。
            </p>
          </a>

          <Link
            href="/admin/lessons"
            className="rounded-2xl bg-white border shadow-sm p-6 hover:shadow-md transition block"
          >
            <p className="text-sm text-slate-500 mb-2">講義管理</p>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">講義を追加・編集</h2>
            <p className="text-sm text-slate-600 leading-6">
              講義タイトル、YouTube URL、コース名、カテゴリを管理します。
            </p>
          </Link>

          <Link
            href="/admin/tests"
            className="rounded-2xl bg-white border shadow-sm p-6 hover:shadow-md transition block"
          >
            <p className="text-sm text-slate-500 mb-2">テスト管理</p>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">確認テストを作成</h2>
            <p className="text-sm text-slate-600 leading-6">
              講義ごとの確認テストを3〜5問で追加・編集します。
            </p>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-white border shadow-sm p-6">
            <p className="text-sm text-slate-500 mb-2">登録受講者数</p>
            <p className="text-4xl font-bold text-slate-900">{learners.length}</p>
          </div>

          <div className="rounded-2xl bg-white border shadow-sm p-6">
            <p className="text-sm text-slate-500 mb-2">全講義完了者</p>
            <p className="text-4xl font-bold text-slate-900">{completedCount}</p>
          </div>

          <div className="rounded-2xl bg-white border shadow-sm p-6">
            <p className="text-sm text-slate-500 mb-2">受講中</p>
            <p className="text-4xl font-bold text-amber-500">{inProgressCount}</p>
          </div>

          <div className="rounded-2xl bg-white border shadow-sm p-6">
            <p className="text-sm text-slate-500 mb-2">未開始</p>
            <p className="text-4xl font-bold text-slate-900">{notStartedCount}</p>
            <p className="text-xs text-slate-500 mt-2">平均進捗率 {averageProgress}%</p>
          </div>
        </div>

        <div id="learner-status" className="rounded-2xl bg-white border shadow-sm p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">受講者一覧</h2>
              <p className="text-sm text-slate-500 mt-1">
                Firestore の users コレクションから取得しています。
              </p>
            </div>

            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="氏名・所属・年代・職種・状況で検索"
                className="w-full md:w-80 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
              />

              <button
                type="button"
                onClick={handleDownloadLearnersCsv}
                disabled={filteredLearners.length === 0}
                className="inline-flex items-center justify-center rounded-lg bg-slate-900 text-white px-5 py-2.5 text-sm font-medium hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 transition"
              >
                進捗CSV出力
              </button>
            </div>
          </div>

          {loading && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-6 text-slate-600">
              受講者データを読み込み中です...
            </div>
          )}

          {errorMessage && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-red-700">
              {errorMessage}
            </div>
          )}

          {!loading && !errorMessage && filteredLearners.length === 0 && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-6 text-slate-600">
              表示できる受講者データがありません。
            </div>
          )}

          {!loading && !errorMessage && filteredLearners.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse">
                <thead>
                  <tr className="border-b bg-slate-100 text-left text-sm text-slate-700">
                    <th className="px-4 py-3">氏名</th>
                    <th className="px-4 py-3">所属</th>
                    <th className="px-4 py-3">年代</th>
                    <th className="px-4 py-3">職種</th>
                    <th className="px-4 py-3">進捗</th>
                    <th className="px-4 py-3">視聴/テスト/完了</th>
                    <th className="px-4 py-3">最終講義</th>
                    <th className="px-4 py-3">総視聴時間</th>
                    <th className="px-4 py-3">受講状況</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredLearners.map((learner) => {
                    const progress = learner.progress ?? 0;
                    const status = getStatusText(learner);

                    return (
                      <tr
                        key={learner.id}
                        className="border-b text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <td className="px-4 py-4 font-medium">{learner.name}</td>
                        <td className="px-4 py-4">{learner.department}</td>
                        <td className="px-4 py-4">{learner.ageGroup}</td>
                        <td className="px-4 py-4">{learner.jobType}</td>
                        <td className="px-4 py-4 min-w-44">
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-28 rounded-full bg-slate-200 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-slate-900"
                                style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
                              />
                            </div>
                            <span>{getProgressText(progress)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {(learner.lectureCount ?? 0)}視聴 / {(learner.testStartedCount ?? 0)}テスト / {(learner.completedLectureCount ?? 0)}完了
                        </td>
                        <td className="px-4 py-4">{learner.lastLecture}</td>
                        <td className="px-4 py-4">
                          {formatWatchTime(learner.totalWatchSeconds)}
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
        </div>

        <div className="rounded-2xl bg-white border shadow-sm p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">視聴ログ詳細</h2>
              <p className="text-sm text-slate-500 mt-1">
                管理画面には視聴ログがある講義のみ表示します。CSV出力では全60講義分を出力できます。
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadLectureLogsCsv}
              disabled={lectureLogRows.length === 0}
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 text-white px-5 py-2.5 text-sm font-medium hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 transition"
            >
              CSV出力
            </button>
          </div>

          {!loading && displayedLectureLogRows.length === 0 && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-6 text-slate-600">
              表示できる視聴ログはまだありません。
            </div>
          )}

          {!loading && displayedLectureLogRows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse">
                <thead>
                  <tr className="border-b bg-slate-100 text-left text-sm text-slate-700">
                    <th className="px-4 py-3">氏名</th>
                    <th className="px-4 py-3">所属</th>
                    <th className="px-4 py-3">職種</th>
                    <th className="px-4 py-3">講義ID</th>
                    <th className="px-4 py-3">講義名</th>
                    <th className="px-4 py-3">視聴開始</th>
                    <th className="px-4 py-3">視聴終了</th>
                    <th className="px-4 py-3">実視聴</th>
                    <th className="px-4 py-3">視聴率</th>
                    <th className="px-4 py-3">テスト</th>
                    <th className="px-4 py-3">完了</th>
                    <th className="px-4 py-3">状況</th>
                  </tr>
                </thead>

                <tbody>
                  {displayedLectureLogRows.map((log) => (
                    <tr
                      key={`${log.learnerId}-${log.id}`}
                      className="border-b text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <td className="px-4 py-4 font-medium">{log.learnerName}</td>
                      <td className="px-4 py-4">{log.department}</td>
                      <td className="px-4 py-4">{log.jobType}</td>
                      <td className="px-4 py-4">{log.lectureId}</td>
                      <td className="px-4 py-4">{log.title}</td>
                      <td className="px-4 py-4">{log.startedAt}</td>
                      <td className="px-4 py-4">{log.endedAt}</td>
                      <td className="px-4 py-4">{formatWatchTime(log.watchedSeconds)}</td>
                      <td className="px-4 py-4">{log.watchProgress}%</td>
                      <td className="px-4 py-4">{log.testStarted ? "開始済み" : "未開始"}</td>
                      <td className="px-4 py-4">{log.completed ? "完了" : "未完了"}</td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                            log.lectureStatus === "完了"
                              ? "bg-emerald-100 text-emerald-700"
                              : log.lectureStatus === "視聴完了" || log.lectureStatus === "テスト開始済み"
                              ? "bg-amber-100 text-amber-700"
                              : log.lectureStatus === "視聴中"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {log.lectureStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}