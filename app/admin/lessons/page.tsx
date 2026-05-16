

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDocs, orderBy, query, setDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";

type Lesson = {
  id: string;
  title: string;
  description: string;
  content: string;
  videoUrl: string;
  minutes: number;
  order: number;
  unitTitle: string;
  unitOrder: number;
  lessonOrderInUnit: number;
  isPublished: boolean;
  courseName: string;
  category: string;
  lessonType: string;
};

type LessonForm = {
  id: string;
  title: string;
  description: string;
  content: string;
  videoUrl: string;
  minutes: string;
  order: string;
  unitTitle: string;
  unitOrder: string;
  lessonOrderInUnit: string;
  isPublished: boolean;
  courseName: string;
  category: string;
  lessonType: string;
};

const emptyForm: LessonForm = {
  id: "",
  title: "",
  description: "",
  content: "",
  videoUrl: "",
  minutes: "5",
  order: "1",
  unitTitle: "基礎理解",
  unitOrder: "1",
  lessonOrderInUnit: "1",
  isPublished: true,
  courseName: "腰痛・転倒予防研修",
  category: "腰痛予防",
  lessonType: "通常講義",
};

export default function AdminLessonsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [form, setForm] = useState<LessonForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [keyword, setKeyword] = useState("");

  const fetchLessons = async () => {
    setLoading(true);
    setMessage("");

    try {
      const lessonsQuery = query(collection(db, "lessons"), orderBy("order", "asc"));
      const snapshot = await getDocs(lessonsQuery);

      const fetchedLessons = snapshot.docs.map((lessonDoc) => {
        const data = lessonDoc.data();

        return {
          id: lessonDoc.id,
          title: typeof data.title === "string" ? data.title : `講義${lessonDoc.id}`,
          description: typeof data.description === "string" ? data.description : "",
          content: typeof data.content === "string" ? data.content : "",
          videoUrl: typeof data.videoUrl === "string" ? data.videoUrl : "",
          minutes: typeof data.minutes === "number" ? data.minutes : 5,
          order: typeof data.order === "number" ? data.order : Number(lessonDoc.id) || 0,
          unitTitle:
            typeof data.unitTitle === "string"
              ? data.unitTitle
              : typeof data.chapter === "string"
              ? data.chapter
              : "未設定",
          unitOrder:
            typeof data.unitOrder === "number"
              ? data.unitOrder
              : typeof data.unit === "number"
              ? data.unit
              : 1,
          lessonOrderInUnit:
            typeof data.lessonOrderInUnit === "number"
              ? data.lessonOrderInUnit
              : typeof data.orderInUnit === "number"
              ? data.orderInUnit
              : typeof data.order === "number"
              ? data.order
              : Number(lessonDoc.id) || 1,
          isPublished: typeof data.isPublished === "boolean" ? data.isPublished : true,
          courseName:
            typeof data.courseName === "string"
              ? data.courseName
              : "未設定",
          category:
            typeof data.category === "string"
              ? data.category
              : "未設定",
          lessonType:
            typeof data.lessonType === "string"
              ? data.lessonType
              : "通常講義",
        };
      });

      setLessons(fetchedLessons);
    } catch (error) {
      console.error("講義取得エラー", error);
      setMessage(
        `講義データの読み込みに失敗しました。Firestore の lessons コレクションまたはルールを確認してください。詳細: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLessons();
  }, []);

  const filteredLessons = useMemo(() => {
    const trimmedKeyword = keyword.trim().toLowerCase();

    if (!trimmedKeyword) return lessons;

    return lessons.filter((lesson) => {
      return (
        lesson.id.toLowerCase().includes(trimmedKeyword) ||
        lesson.title.toLowerCase().includes(trimmedKeyword) ||
        lesson.description.toLowerCase().includes(trimmedKeyword)
      );
    });
  }, [lessons, keyword]);

  const handleEdit = (lesson: Lesson) => {
    setForm({
      id: lesson.id ?? "",
      title: lesson.title ?? "",
      description: lesson.description ?? "",
      content: lesson.content ?? "",
      videoUrl: lesson.videoUrl ?? "",
      minutes: String(lesson.minutes ?? 5),
      order: String(lesson.order ?? 1),
      unitTitle: lesson.unitTitle ?? "基礎理解",
      unitOrder: String(lesson.unitOrder ?? 1),
      lessonOrderInUnit: String(lesson.lessonOrderInUnit ?? 1),
      isPublished: lesson.isPublished ?? true,
      courseName: lesson.courseName ?? "腰痛・転倒予防研修",
      category: lesson.category ?? "腰痛予防",
      lessonType: lesson.lessonType ?? "通常講義",
    });
    setMessage("編集内容を入力してください。");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleReset = () => {
    setForm(emptyForm);
    setMessage("");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    const lessonId = form.id.trim();

    if (!lessonId) {
      setMessage("講義IDを入力してください。例：1、2、3");
      return;
    }

    if (!form.title.trim()) {
      setMessage("講義タイトルを入力してください。");
      return;
    }

    if (!form.videoUrl.trim()) {
      setMessage("YouTube URLを入力してください。");
      return;
    }

    const minutes = Number(form.minutes);
    const order = Number(form.order);
    const unitOrder = Number(form.unitOrder);
    const lessonOrderInUnit = Number(form.lessonOrderInUnit);

    if (Number.isNaN(minutes) || minutes <= 0) {
      setMessage("講義時間は1以上の数字で入力してください。");
      return;
    }

    if (Number.isNaN(order) || order <= 0) {
      setMessage("表示順は1以上の数字で入力してください。");
      return;
    }

    if (!form.unitTitle.trim()) {
      setMessage("単元名を入力してください。");
      return;
    }

    if (Number.isNaN(unitOrder) || unitOrder <= 0) {
      setMessage("単元順は1以上の数字で入力してください。");
      return;
    }

    if (Number.isNaN(lessonOrderInUnit) || lessonOrderInUnit <= 0) {
      setMessage("単元内の講義順は1以上の数字で入力してください。");
      return;
    }

    setSaving(true);

    try {
      await setDoc(
        doc(db, "lessons", lessonId),
        {
          title: form.title.trim(),
          description: form.description.trim(),
          content: form.content.trim(),
          videoUrl: form.videoUrl.trim(),
          minutes,
          order,
          unitTitle: form.unitTitle.trim(),
          unitOrder,
          lessonOrderInUnit,
          isPublished: form.isPublished,
          courseName: form.courseName.trim(),
          category: form.category.trim(),
          lessonType: form.lessonType.trim(),
          updatedAt: new Date().toLocaleString("ja-JP"),
        },
        { merge: true }
      );

      setMessage("講義を保存しました。");
      setForm(emptyForm);
      await fetchLessons();
    } catch (error) {
      console.error("講義保存エラー", error);
      setMessage(
        `講義の保存に失敗しました。Firestore の lessons 書き込み権限を確認してください。詳細: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="rounded-3xl bg-slate-900 text-white p-8 shadow-lg">
          <p className="text-slate-300 mb-2">管理者画面</p>
          <h1 className="text-4xl font-bold mb-3">講義管理</h1>
          <p className="text-slate-300 leading-7">
            講義タイトル、説明、YouTube URL、公開状態、コース分類を管理できます。
            動画を差し替える場合は、YouTube URLを変更して保存してください。
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/admin"
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-800 px-5 py-2.5 text-sm font-medium hover:bg-slate-100 transition"
          >
            管理者画面へ戻る
          </Link>
          <Link
            href="/mypage"
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-800 px-5 py-2.5 text-sm font-medium hover:bg-slate-100 transition"
          >
            マイページ確認
          </Link>
        </div>

        <section className="rounded-2xl bg-white border shadow-sm p-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">講義の追加・編集</h2>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700 mb-5 space-y-2">
            <p className="font-semibold text-slate-900">分類入力の例</p>
            <p>
              <span className="font-medium">コース名：</span>
              腰痛・転倒予防研修／感染症対策研修／虐待防止研修／身体拘束適正化研修／認知症介護基礎研修
            </p>
            <p>
              <span className="font-medium">カテゴリ：</span>
              腰痛予防／転倒予防／介助動作／感染対策／安全衛生／メンタルヘルス／法定研修
            </p>
            <p>
              <span className="font-medium">講義タイプ：</span>
              通常講義／法定研修／確認テスト／オリエンテーション
            </p>
            <p>
              <span className="font-medium">単元名：</span>
              基礎理解／リスク理解／実践編 ／ 単元順：1、2、3 ／ 単元内の講義順：1、2、3
            </p>
            <p className="text-xs text-slate-500">
              例：法定研修を追加する場合は、コース名に「感染症対策研修」、カテゴリに「感染対策」、講義タイプに「法定研修」を設定します。
            </p>
          </div>

          {message && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700 mb-5">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                講義ID
              </label>
              <input
                value={form.id ?? ""}
                onChange={(event) => setForm((prev) => ({ ...prev, id: event.target.value }))}
                placeholder="例：1"
                className="w-full rounded-lg border border-slate-300 px-4 py-2 outline-none focus:ring-2 focus:ring-slate-300"
              />
              <p className="text-xs text-slate-500 mt-1">
                URLの /lesson/1 などに対応します。
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                表示順
              </label>
              <input
                value={form.order ?? ""}
                onChange={(event) => setForm((prev) => ({ ...prev, order: event.target.value }))}
                placeholder="例：1"
                className="w-full rounded-lg border border-slate-300 px-4 py-2 outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                単元名
              </label>
              <input
                value={form.unitTitle ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, unitTitle: event.target.value }))
                }
                placeholder="例：基礎理解"
                className="w-full rounded-lg border border-slate-300 px-4 py-2 outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                単元順
              </label>
              <input
                value={form.unitOrder ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, unitOrder: event.target.value }))
                }
                placeholder="例：1"
                className="w-full rounded-lg border border-slate-300 px-4 py-2 outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                単元内の講義順
              </label>
              <input
                value={form.lessonOrderInUnit ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, lessonOrderInUnit: event.target.value }))
                }
                placeholder="例：1"
                className="w-full rounded-lg border border-slate-300 px-4 py-2 outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                コース名
              </label>
              <input
                value={form.courseName ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, courseName: event.target.value }))
                }
                placeholder="例：腰痛・転倒予防研修"
                className="w-full rounded-lg border border-slate-300 px-4 py-2 outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                カテゴリ
              </label>
              <input
                value={form.category ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, category: event.target.value }))
                }
                placeholder="例：腰痛予防"
                className="w-full rounded-lg border border-slate-300 px-4 py-2 outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                講義タイプ
              </label>
              <select
                value={form.lessonType ?? "通常講義"}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, lessonType: event.target.value }))
                }
                className="w-full rounded-lg border border-slate-300 px-4 py-2 outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="通常講義">通常講義</option>
                <option value="法定研修">法定研修</option>
                <option value="確認テスト">確認テスト</option>
                <option value="オリエンテーション">オリエンテーション</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                講義タイトル
              </label>
              <input
                value={form.title ?? ""}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="例：転倒災害の現状とリスク"
                className="w-full rounded-lg border border-slate-300 px-4 py-2 outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                説明文
              </label>
              <input
                value={form.description ?? ""}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="講義の概要を入力"
                className="w-full rounded-lg border border-slate-300 px-4 py-2 outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                YouTube URL
              </label>
              <input
                value={form.videoUrl ?? ""}
                onChange={(event) => setForm((prev) => ({ ...prev, videoUrl: event.target.value }))}
                placeholder="https://youtu.be/... または https://www.youtube.com/watch?v=..."
                className="w-full rounded-lg border border-slate-300 px-4 py-2 outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                講義時間（分）
              </label>
              <input
                value={form.minutes ?? ""}
                onChange={(event) => setForm((prev) => ({ ...prev, minutes: event.target.value }))}
                placeholder="例：5"
                className="w-full rounded-lg border border-slate-300 px-4 py-2 outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            <div className="flex items-center gap-3 pt-6">
              <input
                id="isPublished"
                type="checkbox"
                checked={form.isPublished}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, isPublished: event.target.checked }))
                }
                className="h-4 w-4"
              />
              <label htmlFor="isPublished" className="text-sm font-medium text-slate-700">
                公開する
              </label>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                講義内容メモ
              </label>
              <textarea
                value={form.content ?? ""}
                onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
                placeholder="講義内容や補足説明を入力"
                rows={5}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            <div className="md:col-span-2 flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center rounded-lg bg-slate-900 text-white px-6 py-3 font-medium hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-500 transition"
              >
                {saving ? "保存中..." : "講義を保存"}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-800 px-6 py-3 font-medium hover:bg-slate-100 transition"
              >
                入力をリセット
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl bg-white border shadow-sm p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">登録済み講義</h2>
              <p className="text-sm text-slate-500 mt-1">
                編集ボタンを押すと、上のフォームに内容が反映されます。
              </p>
            </div>

            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="講義ID・タイトル・説明で検索"
              className="w-full md:w-80 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>

          {loading && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-6 text-slate-600">
              講義データを読み込み中です...
            </div>
          )}

          {!loading && filteredLessons.length === 0 && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-6 text-slate-600">
              表示できる講義がありません。
            </div>
          )}

          {!loading && filteredLessons.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse">
                <thead>
                  <tr className="border-b bg-slate-100 text-left text-sm text-slate-700">
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">順番</th>
                    <th className="px-4 py-3">単元</th>
                    <th className="px-4 py-3">単元順</th>
                    <th className="px-4 py-3">単元内順</th>
                    <th className="px-4 py-3">タイトル</th>
                    <th className="px-4 py-3">コース</th>
                    <th className="px-4 py-3">カテゴリ</th>
                    <th className="px-4 py-3">タイプ</th>
                    <th className="px-4 py-3">時間</th>
                    <th className="px-4 py-3">公開</th>
                    <th className="px-4 py-3">YouTube URL</th>
                    <th className="px-4 py-3">操作</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredLessons.map((lesson) => (
                    <tr
                      key={lesson.id}
                      className="border-b text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <td className="px-4 py-4 font-medium">{lesson.id}</td>
                      <td className="px-4 py-4">{lesson.order}</td>
                      <td className="px-4 py-4">{lesson.unitTitle}</td>
                      <td className="px-4 py-4">{lesson.unitOrder}</td>
                      <td className="px-4 py-4">{lesson.lessonOrderInUnit}</td>
                      <td className="px-4 py-4 min-w-64">
                        <p className="font-medium text-slate-900">{lesson.title}</p>
                        {lesson.description && (
                          <p className="text-xs text-slate-500 mt-1">{lesson.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-4">{lesson.courseName}</td>
                      <td className="px-4 py-4">{lesson.category}</td>
                      <td className="px-4 py-4">{lesson.lessonType}</td>
                      <td className="px-4 py-4">{lesson.minutes}分</td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                            lesson.isPublished
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {lesson.isPublished ? "公開" : "非公開"}
                        </span>
                      </td>
                      <td className="px-4 py-4 max-w-72 truncate">{lesson.videoUrl}</td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => handleEdit(lesson)}
                          className="inline-flex items-center justify-center rounded-lg bg-slate-900 text-white px-4 py-2 text-sm hover:bg-slate-800 transition"
                        >
                          編集
                        </button>
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