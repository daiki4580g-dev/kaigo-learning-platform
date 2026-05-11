"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";

type Learner = {
  id: string;
  name?: string;
  department?: string;
  progress?: number;
  testScore?: number;
  status?: string;
  lastLecture?: string;
  lastUpdated?: string;
};

const getProgressText = (progress?: number) => {
  if (typeof progress !== "number") return "0%";
  return `${progress}%`;
};

const getStatusText = (learner: Learner) => {
  if (learner.status) return learner.status;
  if ((learner.progress ?? 0) >= 100) return "修了";
  if ((learner.progress ?? 0) > 0) return "受講中";
  return "未開始";
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

        const fetchedLearners = snapshot.docs.map((doc) => {
          const data = doc.data();

          return {
            id: doc.id,
            name: typeof data.name === "string" ? data.name : doc.id,
            department: typeof data.department === "string" ? data.department : "未設定",
            progress: typeof data.progress === "number" ? data.progress : 0,
            testScore: typeof data.testScore === "number" ? data.testScore : undefined,
            status: typeof data.status === "string" ? data.status : undefined,
            lastLecture: typeof data.lastLecture === "string" ? data.lastLecture : "未記録",
            lastUpdated: typeof data.lastUpdated === "string" ? data.lastUpdated : "未記録",
          };
        });

        setLearners(fetchedLearners);
      } catch (error) {
        console.error("受講者取得エラー", error);
        setErrorMessage(`受講者データの読み込みに失敗しました。Firestore の users コレクションまたはセキュリティルールを確認してください。詳細: ${error instanceof Error ? error.message : String(error)}`);
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
      const status = getStatusText(learner).toLowerCase();

      return (
        name.includes(trimmedKeyword) ||
        department.includes(trimmedKeyword) ||
        status.includes(trimmedKeyword)
      );
    });
  }, [learners, keyword]);

  const completedCount = learners.filter((learner) => (learner.progress ?? 0) >= 100).length;
  const needCheckCount = learners.filter((learner) => (learner.progress ?? 0) < 100).length;
  const averageProgress = learners.length
    ? Math.round(
        learners.reduce((sum, learner) => sum + (learner.progress ?? 0), 0) / learners.length
      )
    : 0;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="rounded-3xl bg-slate-900 text-white p-8 shadow-lg">
          <h1 className="text-4xl font-bold mb-3">管理者画面</h1>
          <p className="text-slate-300 leading-7">
            Firestore に登録された受講者の受講状況やテスト結果を確認できます。
          </p>
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
            <p className="text-sm text-slate-500 mb-2">要確認者</p>
            <p className="text-4xl font-bold text-red-500">{needCheckCount}</p>
          </div>

          <div className="rounded-2xl bg-white border shadow-sm p-6">
            <p className="text-sm text-slate-500 mb-2">平均進捗率</p>
            <p className="text-4xl font-bold text-slate-900">{averageProgress}%</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white border shadow-sm p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">受講者一覧</h2>
              <p className="text-sm text-slate-500 mt-1">
                Firestore の users コレクションから取得しています。
              </p>
            </div>

            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="氏名・所属・状況で検索"
              className="w-full md:w-80 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            />
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
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-slate-100 text-left text-sm text-slate-700">
                    <th className="px-4 py-3">氏名</th>
                    <th className="px-4 py-3">所属</th>
                    <th className="px-4 py-3">進捗</th>
                    <th className="px-4 py-3">テスト点数</th>
                    <th className="px-4 py-3">最終講義</th>
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
                          {typeof learner.testScore === "number" ? `${learner.testScore}点` : "未記録"}
                        </td>
                        <td className="px-4 py-4">{learner.lastLecture}</td>
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
      </div>
    </main>
  );
}