"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";

type QuestionForm = {
  question: string;
  choice1: string;
  choice2: string;
  choice3: string;
  choice4: string;
  correctAnswer: string;
  explanation: string;
};

type TestForm = {
  lessonId: string;
  title: string;
  category: string;
  questions: QuestionForm[];
};

type SavedQuestion = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

type SavedTest = {
  id: string;
  lessonId: string;
  lectureId: string;
  title: string;
  category: string;
  questions: SavedQuestion[];
  updatedAt?: string;
};

const createEmptyQuestion = (): QuestionForm => ({
  question: "",
  choice1: "",
  choice2: "",
  choice3: "",
  choice4: "",
  correctAnswer: "1",
  explanation: "",
});

const emptyForm: TestForm = {
  lessonId: "1",
  title: "講義1 確認テスト",
  category: "腰痛予防",
  questions: [createEmptyQuestion(), createEmptyQuestion(), createEmptyQuestion()],
};

const parseCsvLine = (line: string): string[] => {
  const values: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && nextChar === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
};

const normalizeHeader = (header: string) => header.replace(/^\uFEFF/, "").trim();

export default function AdminTestsPage() {
  const [tests, setTests] = useState<SavedTest[]>([]);
  const [form, setForm] = useState<TestForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [keyword, setKeyword] = useState("");
  const [importingCsv, setImportingCsv] = useState(false);
  const handleCsvImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setMessage("");
    setImportingCsv(true);

    try {
      const csvText = await file.text();
      const lines = csvText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (lines.length < 2) {
        setMessage("CSVにデータ行がありません。");
        return;
      }

      const headers = parseCsvLine(lines[0]).map(normalizeHeader);
      const rows = lines.slice(1).map((line) => {
        const values = parseCsvLine(line);
        return headers.reduce<Record<string, string>>((row, header, index) => {
          row[header] = values[index] ?? "";
          return row;
        }, {});
      });

      const groupedRows = rows.reduce<Record<string, Record<string, string>[]>>(
        (groups, row) => {
          const lessonId = row["講義ID"] || row["lessonId"] || row["lectureId"];
          if (!lessonId) return groups;

          if (!groups[lessonId]) {
            groups[lessonId] = [];
          }

          groups[lessonId].push(row);
          return groups;
        },
        {}
      );

      const entries = Object.entries(groupedRows);

      if (entries.length === 0) {
        setMessage("講義IDを含む行が見つかりませんでした。");
        return;
      }

      for (const [lessonId, testRows] of entries) {
        const sortedRows = [...testRows].sort((a, b) => {
          const aNumber = Number(a["問題番号"] || a["questionNumber"] || 0);
          const bNumber = Number(b["問題番号"] || b["questionNumber"] || 0);
          return aNumber - bNumber;
        });

        if (sortedRows.length < 3 || sortedRows.length > 5) {
          throw new Error(`講義ID ${lessonId} の問題数は3〜5問にしてください。`);
        }

        const firstRow = sortedRows[0];
        const title =
          firstRow["テストタイトル"] ||
          firstRow["title"] ||
          `講義${lessonId} 確認テスト`;
        const category = firstRow["カテゴリ"] || firstRow["category"] || "未設定";

        const questions: SavedQuestion[] = sortedRows.map((row, index) => {
          const questionText = row["問題文"] || row["question"];
          const options = [
            row["選択肢1"] || row["option1"],
            row["選択肢2"] || row["option2"],
            row["選択肢3"] || row["option3"],
            row["選択肢4"] || row["option4"],
          ].map((value) => value?.trim() ?? "");
          const correctAnswer = Number(row["正解番号"] || row["correctAnswer"] || 1);

          if (!questionText) {
            throw new Error(`講義ID ${lessonId} の問題${index + 1}の問題文が空です。`);
          }

          if (options.some((option) => !option)) {
            throw new Error(`講義ID ${lessonId} の問題${index + 1}の選択肢が不足しています。`);
          }

          if (correctAnswer < 1 || correctAnswer > 4 || Number.isNaN(correctAnswer)) {
            throw new Error(`講義ID ${lessonId} の問題${index + 1}の正解番号は1〜4で入力してください。`);
          }

          return {
            id: `q${index + 1}`,
            question: questionText.trim(),
            options,
            correctIndex: correctAnswer - 1,
            explanation: (row["解説"] || row["explanation"] || "").trim(),
          };
        });

        await setDoc(
          doc(db, "tests", lessonId.trim()),
          {
            lessonId: lessonId.trim(),
            lectureId: lessonId.trim(),
            title: title.trim(),
            category: category.trim(),
            questions,
            updatedAt: new Date().toLocaleString("ja-JP"),
          },
          { merge: true }
        );
      }

      setMessage(`${entries.length}件の確認テストをCSVから保存しました。`);
      await fetchTests();
    } catch (error) {
      console.error("CSVインポートエラー", error);
      setMessage(
        `CSVインポートに失敗しました。詳細: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setImportingCsv(false);
    }
  };

  const fetchTests = async () => {
    setLoading(true);
    setMessage("");

    try {
      const testsQuery = query(collection(db, "tests"), orderBy("lessonId", "asc"));
      const snapshot = await getDocs(testsQuery);

      const fetchedTests = snapshot.docs.map((testDoc) => {
        const data = testDoc.data();
        const rawQuestions = Array.isArray(data.questions) ? data.questions : [];

        const questions = rawQuestions.map((item, index) => {
          const options = Array.isArray(item.options)
            ? item.options.filter((option: unknown): option is string => typeof option === "string")
            : Array.isArray(item.choices)
            ? item.choices.filter((choice: unknown): choice is string => typeof choice === "string")
            : [];

          return {
            id: typeof item.id === "string" ? item.id : `q${index + 1}`,
            question: typeof item.question === "string" ? item.question : "",
            options,
            correctIndex: typeof item.correctIndex === "number" ? item.correctIndex : 0,
            explanation: typeof item.explanation === "string" ? item.explanation : "",
          };
        });

        return {
          id: testDoc.id,
          lessonId: typeof data.lessonId === "string" ? data.lessonId : testDoc.id,
          lectureId: typeof data.lectureId === "string" ? data.lectureId : typeof data.lessonId === "string" ? data.lessonId : testDoc.id,
          title: typeof data.title === "string" ? data.title : `講義${testDoc.id} 確認テスト`,
          category: typeof data.category === "string" ? data.category : "未設定",
          questions,
          updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : "",
        };
      });

      setTests(fetchedTests);
    } catch (error) {
      console.error("テスト取得エラー", error);
      setMessage(
        `テストデータの読み込みに失敗しました。詳細: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, []);

  const filteredTests = useMemo(() => {
    const trimmedKeyword = keyword.trim().toLowerCase();

    if (!trimmedKeyword) return tests;

    return tests.filter((test) => {
      return (
        test.lessonId.toLowerCase().includes(trimmedKeyword) ||
        test.title.toLowerCase().includes(trimmedKeyword) ||
        test.category.toLowerCase().includes(trimmedKeyword)
      );
    });
  }, [tests, keyword]);

  const handleEdit = (test: SavedTest) => {
    const questionForms = test.questions.map((question) => ({
      question: question.question ?? "",
      choice1: question.options?.[0] ?? "",
      choice2: question.options?.[1] ?? "",
      choice3: question.options?.[2] ?? "",
      choice4: question.options?.[3] ?? "",
      correctAnswer: String((question.correctIndex ?? 0) + 1),
      explanation: question.explanation ?? "",
    }));

    const normalizedQuestions = [...questionForms];

    while (normalizedQuestions.length < 3) {
      normalizedQuestions.push(createEmptyQuestion());
    }

    setForm({
      lessonId: test.lessonId ?? "1",
      title: test.title ?? `講義${test.lessonId} 確認テスト`,
      category: test.category ?? "腰痛予防",
      questions: normalizedQuestions.slice(0, 5),
    });

    setMessage("編集内容を入力してください。");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleReset = () => {
    setForm(emptyForm);
    setMessage("");
  };

  const updateQuestion = (
    questionIndex: number,
    field: keyof QuestionForm,
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((question, index) =>
        index === questionIndex ? { ...question, [field]: value } : question
      ),
    }));
  };

  const addQuestion = () => {
    setForm((prev) => {
      if (prev.questions.length >= 5) return prev;
      return {
        ...prev,
        questions: [...prev.questions, createEmptyQuestion()],
      };
    });
  };

  const removeQuestion = (questionIndex: number) => {
    setForm((prev) => {
      if (prev.questions.length <= 3) {
        setMessage("確認テストは最低3問必要です。");
        return prev;
      }

      return {
        ...prev,
        questions: prev.questions.filter((_, index) => index !== questionIndex),
      };
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    const lessonId = form.lessonId.trim();

    if (!lessonId) {
      setMessage("講義IDを入力してください。");
      return;
    }

    if (!form.title.trim()) {
      setMessage("テストタイトルを入力してください。");
      return;
    }

    if (form.questions.length < 3 || form.questions.length > 5) {
      setMessage("確認テストは3〜5問で作成してください。");
      return;
    }

    const savedQuestions: SavedQuestion[] = [];

    for (const [index, question] of form.questions.entries()) {
      if (!question.question.trim()) {
        setMessage(`問題${index + 1}の問題文を入力してください。`);
        return;
      }

      const options = [
        question.choice1.trim(),
        question.choice2.trim(),
        question.choice3.trim(),
        question.choice4.trim(),
      ];

      if (options.some((option) => !option)) {
        setMessage(`問題${index + 1}の選択肢をすべて入力してください。`);
        return;
      }

      const correctIndex = Number(question.correctAnswer) - 1;

      if (correctIndex < 0 || correctIndex > 3) {
        setMessage(`問題${index + 1}の正解番号を選択してください。`);
        return;
      }

      savedQuestions.push({
        id: `q${index + 1}`,
        question: question.question.trim(),
        options,
        correctIndex,
        explanation: question.explanation.trim(),
      });
    }

    setSaving(true);

    try {
      await setDoc(
        doc(db, "tests", lessonId),
        {
          lessonId,
          lectureId: lessonId,
          title: form.title.trim(),
          category: form.category.trim(),
          questions: savedQuestions,
          updatedAt: new Date().toLocaleString("ja-JP"),
        },
        { merge: true }
      );

      setMessage("確認テストを保存しました。");
      setForm(emptyForm);
      await fetchTests();
    } catch (error) {
      console.error("テスト保存エラー", error);
      setMessage(
        `確認テストの保存に失敗しました。詳細: ${
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
          <h1 className="text-4xl font-bold mb-3">テスト管理</h1>
          <p className="text-slate-300 leading-7">
            講義ごとの確認テストを3〜5問で追加・編集できます。
            Firestore の tests コレクションに、講義IDごとに保存されます。
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
            href="/admin/lessons"
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-800 px-5 py-2.5 text-sm font-medium hover:bg-slate-100 transition"
          >
            講義管理へ
          </Link>
        </div>

        <section className="rounded-2xl bg-white border shadow-sm p-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            確認テストの追加・編集
          </h2>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700 mb-5 space-y-2">
            <p className="font-semibold text-slate-900">入力の例</p>
            <p>講義ID：1 ／ テストタイトル：講義1 確認テスト ／ カテゴリ：腰痛予防</p>
            <p className="text-xs text-slate-500">
              確認テストは3〜5問で作成します。正解番号は「1〜4」で選択します。
            </p>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 mb-5 space-y-3">
            <div>
              <p className="font-semibold">CSVインポート</p>
              <p className="text-blue-800 mt-1 leading-6">
                Excelで作成したテストをCSV形式で保存し、以下から読み込めます。
              </p>
            </div>

            <div className="text-xs text-blue-800 leading-6">
              <p>必要な列：</p>
              <p>
                講義ID, テストタイトル, カテゴリ, 問題番号, 問題文, 選択肢1, 選択肢2, 選択肢3, 選択肢4, 正解番号, 解説
              </p>
            </div>

            <label className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-800 transition">
              {importingCsv ? "読み込み中..." : "CSVを選択して読み込む"}
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvImport}
                disabled={importingCsv}
                className="hidden"
              />
            </label>
          </div>

          {message && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700 mb-5">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  講義ID
                </label>
                <input
                  value={form.lessonId ?? ""}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, lessonId: event.target.value }))
                  }
                  placeholder="例：1"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  テストタイトル
                </label>
                <input
                  value={form.title ?? ""}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder="例：講義1 確認テスト"
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
            </div>

            <div className="space-y-5">
              {form.questions.map((question, questionIndex) => (
                <div
                  key={questionIndex}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-bold text-slate-900">
                      問題{questionIndex + 1}
                    </h3>
                    <button
                      type="button"
                      onClick={() => removeQuestion(questionIndex)}
                      disabled={form.questions.length <= 3}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      削除
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      問題文
                    </label>
                    <textarea
                      value={question.question ?? ""}
                      onChange={(event) =>
                        updateQuestion(questionIndex, "question", event.target.value)
                      }
                      placeholder="問題文を入力"
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-slate-300"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((number) => {
                      const key = `choice${number}` as keyof QuestionForm;

                      return (
                        <div key={number}>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            選択肢 {number}
                          </label>
                          <input
                            value={(question[key] as string) ?? ""}
                            onChange={(event) =>
                              updateQuestion(questionIndex, key, event.target.value)
                            }
                            placeholder={`選択肢 ${number}`}
                            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-slate-300"
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        正解番号
                      </label>
                      <select
                        value={question.correctAnswer ?? "1"}
                        onChange={(event) =>
                          updateQuestion(questionIndex, "correctAnswer", event.target.value)
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-slate-300"
                      >
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      解説
                    </label>
                    <textarea
                      value={question.explanation ?? ""}
                      onChange={(event) =>
                        updateQuestion(questionIndex, "explanation", event.target.value)
                      }
                      placeholder="解説を入力"
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-slate-300"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={addQuestion}
                disabled={form.questions.length >= 5}
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-800 px-6 py-3 font-medium hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 transition"
              >
                問題を追加（最大5問）
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center rounded-lg bg-slate-900 text-white px-6 py-3 font-medium hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-500 transition"
              >
                {saving ? "保存中..." : "確認テストを保存"}
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
              <h2 className="text-2xl font-bold text-slate-900">登録済みテスト</h2>
              <p className="text-sm text-slate-500 mt-1">
                編集ボタンを押すと、上のフォームに内容が反映されます。
              </p>
            </div>

            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="講義ID・カテゴリ・タイトルで検索"
              className="w-full md:w-80 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>

          {loading && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-6 text-slate-600">
              テストデータを読み込み中です...
            </div>
          )}

          {!loading && filteredTests.length === 0 && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-6 text-slate-600">
              表示できる確認テストがありません。
            </div>
          )}

          {!loading && filteredTests.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse">
                <thead>
                  <tr className="border-b bg-slate-100 text-left text-sm text-slate-700">
                    <th className="px-4 py-3">講義ID</th>
                    <th className="px-4 py-3">タイトル</th>
                    <th className="px-4 py-3">カテゴリ</th>
                    <th className="px-4 py-3">問題数</th>
                    <th className="px-4 py-3">更新日時</th>
                    <th className="px-4 py-3">操作</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredTests.map((test) => (
                    <tr
                      key={test.id}
                      className="border-b text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <td className="px-4 py-4 font-medium">{test.lessonId}</td>
                      <td className="px-4 py-4 min-w-72">
                        <p className="font-medium text-slate-900">{test.title}</p>
                      </td>
                      <td className="px-4 py-4">{test.category}</td>
                      <td className="px-4 py-4">{test.questions.length}問</td>
                      <td className="px-4 py-4">{test.updatedAt || "未記録"}</td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => handleEdit(test)}
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