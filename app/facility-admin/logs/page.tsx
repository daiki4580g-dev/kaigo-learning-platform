

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../lib/firebase";

type LectureLogRow = {
  learnerId: string;
  learnerName: string;
  department: string;
  facilityId: string;
  facilityName: string;
  lectureId: string;
  title: string;
  startedAt: string;
  endedAt: string;
  watchedSeconds: number;
  watchProgress: number;
  testStarted: boolean;
  completed: boolean;
};

const DEFAULT_FACILITY_ID = "facility001";

const formatWatchTime = (seconds: number) => {
  if (!seconds || seconds <= 0) return "0秒";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}時間${minutes}分${remainingSeconds}秒`;
  }

  if (minutes > 0) {
    return `${minutes}分${remainingSeconds}秒`;
  }

  return `${remainingSeconds}秒`;
};

const escapeCsvValue = (value: string | number | undefined) => {
  const stringValue = value === undefined ? "" : String(value);
  return `"${stringValue.replace(/"/g, '""')}"`;
};

export default function FacilityLogsPage() {
  const [logs, setLogs] = useState<LectureLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [keyword, setKeyword] = useState("");
  const [facilityId, setFacilityId] = useState(DEFAULT_FACILITY_ID);

  useEffect(() => {
    const storedFacilityId = window.localStorage.getItem("facilityId");
    if (storedFacilityId) {
      setFacilityId(storedFacilityId);
    }
  }, []);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      setErrorMessage("");

      try {
        const usersSnapshot = await getDocs(collection(db, "users"));

        const allLogs: LectureLogRow[] = [];

        for (const userDoc of usersSnapshot.docs) {
          const userData = userDoc.data();

          const userFacilityId =
            typeof userData.facilityId === "string"
              ? userData.facilityId
              : DEFAULT_FACILITY_ID;

          if (userFacilityId !== facilityId) continue;

          const lectureLogsSnapshot = await getDocs(
            collection(db, "users", userDoc.id, "lectureLogs")
          );

          lectureLogsSnapshot.forEach((lectureDoc) => {
            const lectureData = lectureDoc.data();

            allLogs.push({
              learnerId: userDoc.id,
              learnerName:
                typeof userData.name === "string"
                  ? userData.name
                  : userDoc.id,
              department:
                typeof userData.department === "string"
                  ? userData.department
                  : "未設定",
              facilityId: userFacilityId,
              facilityName:
                typeof userData.facilityName === "string"
                  ? userData.facilityName
                  : "施設名未設定",
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
              watchedSeconds:
                typeof lectureData.watchedSeconds === "number"
                  ? lectureData.watchedSeconds
                  : 0,
              watchProgress:
                typeof lectureData.watchProgress === "number"
                  ? lectureData.watchProgress
                  : 0,
              testStarted:
                typeof lectureData.testStarted === "boolean"
                  ? lectureData.testStarted
                  : false,
              completed:
                typeof lectureData.completed === "boolean"
                  ? lectureData.completed
                  : false,
            });
          });
        }

        allLogs.sort((a, b) => {
          const lectureCompare = Number(a.lectureId) - Number(b.lectureId);
          if (lectureCompare !== 0) return lectureCompare;
          return a.learnerName.localeCompare(b.learnerName, "ja");
        });

        setLogs(allLogs);
      } catch (error) {
        console.error("視聴ログ取得エラー", error);
        setErrorMessage(
          `視聴ログの読み込みに失敗しました。詳細: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [facilityId]);

  const filteredLogs = useMemo(() => {
    const trimmedKeyword = keyword.trim().toLowerCase();

    if (!trimmedKeyword) return logs;

    return logs.filter((log) => {
      return (
        log.learnerName.toLowerCase().includes(trimmedKeyword) ||
        log.department.toLowerCase().includes(trimmedKeyword) ||
        log.title.toLowerCase().includes(trimmedKeyword) ||
        log.lectureId.toLowerCase().includes(trimmedKeyword)
      );
    });
  }, [logs, keyword]);

  const handleDownloadCsv = () => {
    const headers = [
      "施設名",
      "受講者ID",
      "氏名",
      "所属",
      "講義ID",
      "講義名",
      "視聴開始",
      "視聴終了",
      "実視聴時間（秒）",
      "視聴率（%）",
      "テスト開始",
      "完了",
    ];

    const rows = filteredLogs.map((log) => [
      log.facilityName,
      log.learnerId,
      log.learnerName,
      log.department,
      log.lectureId,
      log.title,
      log.startedAt,
      log.endedAt,
      log.watchedSeconds,
      log.watchProgress,
      log.testStarted ? "開始済み" : "未開始",
      log.completed ? "完了" : "未完了",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((value) => escapeCsvValue(value)).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `視聴ログ_${facilityId}_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  const facilityName = logs[0]?.facilityName ?? "施設名未設定";

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="rounded-3xl bg-slate-900 text-white p-8 shadow-lg">
          <p className="text-slate-300 mb-2">施設代表者用</p>
          <h1 className="text-4xl font-bold mb-3">視聴ログ詳細</h1>
          <p className="text-slate-300 leading-7">
            講義ごとの視聴開始時刻、終了時刻、実視聴時間、視聴率を確認できます。
            CSV出力にも対応しています。
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

          <Link
            href="/facility-admin/lessons"
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-800 px-5 py-2.5 text-sm font-medium hover:bg-slate-100 transition"
          >
            講義別進捗へ
          </Link>

          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={filteredLogs.length === 0}
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 text-white px-5 py-2.5 text-sm font-medium hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 transition"
          >
            CSV出力
          </button>
        </div>

        <section className="rounded-2xl bg-white border shadow-sm p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                施設ID
              </label>
              <input
                value={facilityId}
                onChange={(event) => {
                  setFacilityId(event.target.value);
                  window.localStorage.setItem(
                    "facilityId",
                    event.target.value
                  );
                }}
                placeholder="例：facility001"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
              />
              <p className="text-xs text-slate-500 mt-1">
                現在の表示施設：{facilityName}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                検索
              </label>
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="氏名・講義名・所属で検索"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white border shadow-sm p-6 space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">視聴ログ一覧</h2>
            <p className="text-sm text-slate-500 mt-1">
              助成金提出に利用しやすい形式で表示しています。
            </p>
          </div>

          {loading && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-6 text-slate-600">
              視聴ログを読み込み中です...
            </div>
          )}

          {errorMessage && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-red-700">
              {errorMessage}
            </div>
          )}

          {!loading && !errorMessage && filteredLogs.length === 0 && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-6 text-slate-600">
              表示できる視聴ログはありません。
            </div>
          )}

          {!loading && !errorMessage && filteredLogs.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1300px] border-collapse">
                <thead>
                  <tr className="border-b bg-slate-100 text-left text-sm text-slate-700">
                    <th className="px-4 py-3">氏名</th>
                    <th className="px-4 py-3">所属</th>
                    <th className="px-4 py-3">講義ID</th>
                    <th className="px-4 py-3">講義名</th>
                    <th className="px-4 py-3">視聴開始</th>
                    <th className="px-4 py-3">視聴終了</th>
                    <th className="px-4 py-3">実視聴時間</th>
                    <th className="px-4 py-3">視聴率</th>
                    <th className="px-4 py-3">テスト</th>
                    <th className="px-4 py-3">完了</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredLogs.map((log, index) => (
                    <tr
                      key={`${log.learnerId}-${log.lectureId}-${index}`}
                      className="border-b text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <td className="px-4 py-4 font-medium">
                        {log.learnerName}
                      </td>
                      <td className="px-4 py-4">{log.department}</td>
                      <td className="px-4 py-4">{log.lectureId}</td>
                      <td className="px-4 py-4 min-w-72">{log.title}</td>
                      <td className="px-4 py-4">{log.startedAt}</td>
                      <td className="px-4 py-4">{log.endedAt}</td>
                      <td className="px-4 py-4">
                        {formatWatchTime(log.watchedSeconds)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3 min-w-36">
                          <div className="h-2 w-24 rounded-full bg-slate-200 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-slate-900"
                              style={{
                                width: `${Math.min(
                                  Math.max(log.watchProgress, 0),
                                  100
                                )}%`,
                              }}
                            />
                          </div>
                          <span>{log.watchProgress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                            log.testStarted
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {log.testStarted ? "開始済み" : "未開始"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                            log.completed
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {log.completed ? "完了" : "未完了"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}