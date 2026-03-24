"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  limit,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";

type UserProgress = {
  id: string;
  name: string;
  department: string;
  completedLessonIds: string[];
  scoreTotal: number;
  questionTotal: number;
  lastCompletedAt: string;
  completed: number;
  total: number;
  lastLesson: string;
  status: "順調" | "要確認";
};

const lessonTitles: Record<string, string> = {
  "1": "腰痛予防の基礎",
  "2": "移乗介助のポイント",
  "3": "転倒予防の基本",
};

const totalLessons = Object.keys(lessonTitles).length;

export default function AdminPage() {
  const [users, setUsers] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [authChecked, setAuthChecked] = useState(false);
  const [canViewAdmin, setCanViewAdmin] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"すべて" | "順調" | "要確認">("すべて");
  const [departmentFilter, setDepartmentFilter] = useState("すべて");
  const [currentUid, setCurrentUid] = useState("");
  const [currentEmail, setCurrentEmail] = useState("");
  const [currentLoginId, setCurrentLoginId] = useState("");
  const [currentIsAdmin, setCurrentIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCurrentUid("");
        setCurrentEmail("");
        setCurrentLoginId("");
        setCurrentIsAdmin(false);
        setCanViewAdmin(false);
        setAuthChecked(true);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErrorMessage("");

        const currentUserRef = doc(db, "users", user.uid);
        const currentUserSnap = await getDoc(currentUserRef);
        const currentUserData = currentUserSnap.exists() ? currentUserSnap.data() : null;

        setCurrentUid(user.uid);
        setCurrentEmail(user.email || "");
        setCurrentLoginId(String(currentUserData?.loginId || ""));
        setCurrentIsAdmin(currentUserData?.isAdmin === true);

        const isAdmin =
          currentUserData?.isAdmin === true ||
          currentUserData?.loginId === "test002" ||
          currentUserData?.loginId === "daiki" ||
          user.email === "daiki4580g@gmail.com";

        if (!isAdmin) {
          setCanViewAdmin(false);
          setAuthChecked(true);
          setLoading(false);
          return;
        }

        setCanViewAdmin(true);
        setAuthChecked(true);

        const usersSnapshot = await getDocs(collection(db, "users"));

        const rows = await Promise.all(
          usersSnapshot.docs.map(async (userDoc) => {
            const userData = userDoc.data();
            const progressRef = collection(db, "users", userDoc.id, "progress");
            const progressSnapshot = await getDocs(progressRef);

            const completed = progressSnapshot.size;
            const completedLessonIds: string[] = progressSnapshot.docs.map((doc) => String(doc.id));

            const scoreTotal = progressSnapshot.docs.reduce((sum, progressDoc) => {
              const data = progressDoc.data();
              return sum + Number(data.score || 0);
            }, 0);

            const questionTotal = progressSnapshot.docs.reduce((sum, progressDoc) => {
              const data = progressDoc.data();
              return sum + Number(data.totalQuestions || 0);
            }, 0);

            const status: "順調" | "要確認" =
              completed === totalLessons || completed >= 1 ? "順調" : "要確認";

            let lastLesson = "未受講";
            let lastCompletedAt = "-";

            const latestProgressQuery = query(
              progressRef,
              orderBy("completedAt", "desc"),
              limit(1)
            );
            const latestProgressSnapshot = await getDocs(latestProgressQuery);

            if (!latestProgressSnapshot.empty) {
              const latestData = latestProgressSnapshot.docs[0].data();
              const lessonId = String(latestData.lessonId || "");
              lastLesson = lessonTitles[lessonId] || `講義${lessonId}`;

              const completedAt = latestData.completedAt;
              if (completedAt?.toDate) {
                lastCompletedAt = completedAt.toDate().toLocaleString("ja-JP");
              }
            }

            return {
              id: userDoc.id,
              name: String(userData.name || "未登録"),
              department: String(userData.department || "未登録"),
              completedLessonIds,
              scoreTotal,
              questionTotal,
              lastCompletedAt,
              completed,
              total: totalLessons,
              lastLesson,
              status,
            } satisfies UserProgress;
          })
        );

        setUsers(rows);
      } catch (e) {
        console.error(e);
        setErrorMessage("管理画面データの取得に失敗しました。");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const lessonProgress = useMemo(() => {
    return Object.entries(lessonTitles).map(([id, title]) => {
      const completedCount = users.filter((user) =>
        Array.isArray(user.completedLessonIds) && user.completedLessonIds.includes(id)
      ).length;
      return {
        title,
        completedCount,
        total: users.length,
      };
    });
  }, [users]);

  const departmentOptions = useMemo(() => {
    const values = Array.from(
      new Set(users.map((user) => user.department).filter((value) => value && value !== "未登録"))
    );
    return ["すべて", ...values];
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesStatus = statusFilter === "すべて" ? true : user.status === statusFilter;
      const matchesDepartment =
        departmentFilter === "すべて" ? true : user.department === departmentFilter;
      return matchesStatus && matchesDepartment;
    });
  }, [users, statusFilter, departmentFilter]);

  const totalUsers = filteredUsers.length;
  const fullyCompletedUsers = filteredUsers.filter((user) => user.completed === user.total).length;
  const needsAttentionUsers = filteredUsers.filter((user) => user.status === "要確認").length;
  const averageProgress =
    filteredUsers.length > 0
      ? Math.round(
          (filteredUsers.reduce((sum, user) => sum + user.completed / user.total, 0) / filteredUsers.length) * 100
        )
      : 0;

  const handleExportCsv = () => {
    const headers = [
      "氏名",
      "所属",
      "進捗",
      "進捗率",
      "テスト点数",
      "最終受講日時",
      "最終講義",
      "状態",
    ];

    const rows = filteredUsers.map((user) => {
      const percent = Math.round((user.completed / user.total) * 100);
      const score = user.questionTotal > 0 ? `${user.scoreTotal}/${user.questionTotal}` : "-";
      return [
        user.name,
        user.department,
        `${user.completed}/${user.total}`,
        `${percent}%`,
        score,
        user.lastCompletedAt,
        user.lastLesson,
        user.status,
      ];
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "training_admin_export.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  if (authChecked && !canViewAdmin) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl bg-white border shadow-sm p-8">
            <p className="text-sm text-slate-500 mb-2">アクセス制限</p>
            <h1 className="text-3xl font-bold text-slate-900 mb-4">管理画面には入れません</h1>
            <p className="text-slate-600 leading-7 mb-4">
              この画面は管理者のみ利用できます。現在のアカウントには管理権限が設定されていません。
              Firestore の users ドキュメントに <span className="font-semibold text-slate-900">isAdmin: true</span> を追加すると閲覧できます。
            </p>
            <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 space-y-1">
              <p><span className="font-semibold text-slate-900">現在のUID:</span> {currentUid || "-"}</p>
              <p><span className="font-semibold text-slate-900">現在のメール:</span> {currentEmail || "-"}</p>
              <p><span className="font-semibold text-slate-900">Firestore上のloginId:</span> {currentLoginId || "-"}</p>
              <p><span className="font-semibold text-slate-900">Firestore上のisAdmin:</span> {currentIsAdmin ? "true" : "false"}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                window.location.href = "/mypage";
              }}
              className="rounded-lg bg-slate-900 text-white px-6 py-3 font-medium hover:bg-slate-800 transition shadow"
            >
              マイページへ戻る
            </button>
          </div>
        </div>
      </main>
    );
  }
  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-2xl bg-white border shadow-sm p-6">
            <p className="text-slate-700 font-medium">管理画面データを読み込み中...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="max-w-6xl mx-auto">
        <div className="rounded-3xl bg-slate-900 text-white p-8 md:p-10 shadow-sm mb-8">
          <p className="text-sm text-slate-300 mb-3">管理者向けダッシュボード</p>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">研修管理画面</h1>
          <p className="text-slate-300 leading-7 max-w-3xl">
            職員ごとの受講状況や講義別の進捗を確認できます。管理者権限を持つアカウントのみが閲覧できる管理画面です。
          </p>
        </div>

        {errorMessage && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4 mb-6">
            <p className="text-red-700 font-medium">{errorMessage}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <div className="rounded-2xl bg-white border shadow-sm p-6">
            <p className="text-sm text-slate-500 mb-2">登録受講者数</p>
            <p className="text-3xl font-bold text-slate-900">{totalUsers}</p>
          </div>

          <div className="rounded-2xl bg-white border shadow-sm p-6">
            <p className="text-sm text-slate-500 mb-2">全講義完了者</p>
            <p className="text-3xl font-bold text-slate-900">{fullyCompletedUsers}</p>
          </div>

          <div className="rounded-2xl bg-white border shadow-sm p-6">
            <p className="text-sm text-slate-500 mb-2">要確認者</p>
            <p className="text-3xl font-bold text-slate-900">{needsAttentionUsers}</p>
          </div>

          <div className="rounded-2xl bg-white border shadow-sm p-6">
            <p className="text-sm text-slate-500 mb-2">平均進捗率</p>
            <p className="text-3xl font-bold text-slate-900">{averageProgress}%</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white border shadow-sm p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4">
            <div className="w-full lg:w-56">
              <label className="block text-sm font-medium text-slate-700 mb-2">状態で絞り込み</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "すべて" | "順調" | "要確認")}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="すべて">すべて</option>
                <option value="順調">順調</option>
                <option value="要確認">要確認</option>
              </select>
            </div>

            <div className="w-full lg:w-64">
              <label className="block text-sm font-medium text-slate-700 mb-2">部署で絞り込み</label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:ring-2 focus:ring-slate-300"
              >
                {departmentOptions.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <p className="text-sm text-slate-500 mb-2">表示対象</p>
              <p className="text-slate-800 font-medium">{totalUsers}名を表示中</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
          <div className="xl:col-span-2 rounded-2xl bg-white border shadow-sm p-6">
            <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900 mb-1">受講者一覧</h2>
                <p className="text-sm text-slate-600">
                  実データに基づいて、受講状況・テスト点数を俯瞰して確認できます。
                </p>
              </div>

              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center justify-center rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-medium hover:bg-slate-800 transition shadow"
              >
                CSV出力
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse">
                <thead>
                  <tr className="border-b bg-slate-50 text-left">
                    <th className="px-4 py-3 text-sm font-semibold text-slate-700">氏名</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-700">所属</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-700">進捗</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-700 whitespace-nowrap">テスト点数</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-700 whitespace-nowrap">最終受講日時</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-700">最終講義</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-700">状態</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => {
                    const percent = Math.round((user.completed / user.total) * 100);

                    return (
                      <tr
                        key={user.id}
                        className={`border-b last:border-b-0 ${
                          user.status === "要確認" ? "bg-amber-50/60" : ""
                        }`}
                      >
                        <td className="px-4 py-4 text-sm text-slate-900 font-medium">{user.name}</td>
                        <td className="px-4 py-4 text-sm text-slate-600">{user.department}</td>
                        <td className="px-4 py-4 text-sm text-slate-600">
                          <div className="min-w-[180px]">
                            <div className="flex items-center justify-between mb-1">
                              <span>{user.completed}/{user.total}</span>
                              <span>{percent}%</span>
                            </div>
                            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-slate-900 rounded-full"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-900 font-medium whitespace-nowrap">
                          {user.questionTotal > 0 ? `${user.scoreTotal}/${user.questionTotal}` : "-"}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600 whitespace-nowrap">{user.lastCompletedAt}</td>
                        <td className="px-4 py-4 text-sm text-slate-600">{user.lastLesson}</td>
                        <td className="px-4 py-4 text-sm">
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                              user.status === "順調"
                                ? "bg-green-100 text-green-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {user.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-sm text-slate-500 text-center">
                        条件に一致する受講者がいません。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl bg-white border shadow-sm p-6">
            <h2 className="text-2xl font-semibold text-slate-900 mb-1">講義別進捗</h2>
            <p className="text-sm text-slate-600 mb-5">
              どの講義で滞留しているか確認できます。
            </p>

            <div className="space-y-5">
              {lessonProgress.map((lesson) => {
                const percent = lesson.total > 0
                  ? Math.round((lesson.completedCount / lesson.total) * 100)
                  : 0;

                return (
                  <div key={lesson.title}>
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <p className="text-sm font-medium text-slate-900">{lesson.title}</p>
                      <p className="text-sm text-slate-600">{lesson.completedCount}/{lesson.total}</p>
                    </div>
                    <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden mb-1">
                      <div
                        className="h-full bg-green-600 rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500">完了率 {percent}%</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border shadow-sm p-6">
          <h2 className="text-2xl font-semibold text-slate-900 mb-3">管理画面の現在地</h2>
          <p className="text-slate-600 leading-7">
            現在は Firebase に保存された実データをもとに、氏名・部署・受講進捗・テスト点数・最終受講日時まで確認できる段階までできています。
            次のステップとして、未受講者へのリマインド機能、部署別集計の強化、CSV運用の改善を追加すると実用性がさらに高まります。
          </p>
        </div>
      </div>
    </main>
  );
}