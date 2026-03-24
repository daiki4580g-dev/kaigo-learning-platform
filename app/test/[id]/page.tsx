"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

type Question = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
};

type TestData = {
  title: string;
  description: string;
  questions: Question[];
};

const fallbackTestData: Record<
  string,
  {
    title: string;
    description: string;
    questions: Question[];
  }
> = {
  "1": {
    title: "腰痛予防の基礎テスト",
    description: "動画の内容を確認するための簡単なテストです。",
    questions: [
      {
        id: "q1",
        question: "介助時の腰痛予防で大切なことはどれですか？",
        options: [
          "常に腰だけで持ち上げる",
          "姿勢と身体の使い方を意識する",
          "無理な前かがみを続ける",
        ],
        correctIndex: 1,
      },
      {
        id: "q2",
        question: "腰部負担を減らすために望ましい行動はどれですか？",
        options: [
          "足を使わず上半身だけで介助する",
          "安定した姿勢をとって介助する",
          "急いで勢いで持ち上げる",
        ],
        correctIndex: 1,
      },
    ],
  },
  "2": {
    title: "移乗介助のポイントテスト",
    description: "移乗介助の基本を確認するためのテストです。",
    questions: [
      {
        id: "q1",
        question: "移乗介助で大切なことはどれですか？",
        options: [
          "利用者への声かけを省略する",
          "安定した立ち位置をとる",
          "勢いだけで移乗する",
        ],
        correctIndex: 1,
      },
      {
        id: "q2",
        question: "安全確保のために望ましい行動はどれですか？",
        options: [
          "重心移動を意識する",
          "急いで動作を終える",
          "片足だけで支える",
        ],
        correctIndex: 0,
      },
    ],
  },
  "3": {
    title: "転倒予防の基本テスト",
    description: "転倒予防の基本を確認するためのテストです。",
    questions: [
      {
        id: "q1",
        question: "転倒予防で重要なことはどれですか？",
        options: [
          "環境整備を行う",
          "危険物をそのままにする",
          "見守りを減らす",
        ],
        correctIndex: 0,
      },
      {
        id: "q2",
        question: "転倒リスクを減らす行動はどれですか？",
        options: [
          "足元を整理する",
          "通路に物を置く",
          "暗い場所をそのままにする",
        ],
        correctIndex: 0,
      },
    ],
  },
};

export default function TestDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [test, setTest] = useState<TestData | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [savingResult, setSavingResult] = useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = useState("");

  useEffect(() => {
    const fetchTest = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const testRef = doc(db, "tests", String(id));
        const testSnap = await getDoc(testRef);

        if (testSnap.exists()) {
          const data = testSnap.data();

          const questionFieldNames = Object.keys(data)
            .filter((key) => key === "questions" || /^questions\d+$/.test(key))
            .sort((a, b) => {
              const getOrder = (value: string) => {
                if (value === "questions") return 1;
                const matched = value.match(/^questions(\d+)$/);
                return matched ? Number(matched[1]) : 999;
              };
              return getOrder(a) - getOrder(b);
            });

          const questions: Question[] = questionFieldNames.flatMap((fieldName) => {
            const fieldValue = data[fieldName];
            if (!Array.isArray(fieldValue)) return [];

            return fieldValue.map((question: any, index: number) => ({
              id: String(question.id || `${fieldName}-q${index + 1}`),
              question: String(question.question || "設問未設定"),
              options: Array.isArray(question.options)
                ? question.options.map((option: any) => String(option))
                : [],
              correctIndex: Number(question.correctIndex || 0),
            }));
          });

          setTest({
            title: String(data.title || "無題のテスト"),
            description: String(data.description || "説明は未設定です。"),
            questions,
          });
        } else {
          setTest(undefined);
        }
      } catch (e) {
        console.error(e);
        setTest(undefined);
      } finally {
        setLoading(false);
      }
    };

    fetchTest();
  }, [id]);

  const score = useMemo(() => {
    if (!test) return 0;
    return test.questions.reduce((total, question) => {
      return answers[question.id] === question.correctIndex ? total + 1 : total;
    }, 0);
  }, [answers, test]);

  const isPassed = test ? score === test.questions.length : false;
  const answeredCount = Object.keys(answers).length;

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl bg-white border shadow-sm p-6">
            <p className="text-slate-700 font-medium">テストを読み込み中...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!test) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">
            テストが見つかりません
          </h1>
          <Link
            href="/mypage"
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-800 px-6 py-3 font-medium hover:bg-slate-100 transition"
          >
            マイページへ戻る
          </Link>
        </div>
      </main>
    );
  }

  const handleSelect = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
    setErrorMessage("");
    setSaveErrorMessage("");
    setSubmitted(false);
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length !== test.questions.length) {
      setSubmitted(false);
      setErrorMessage("すべての問題に回答してください。");
      return;
    }

    setErrorMessage("");
    setSaveErrorMessage("");
    setSubmitted(false);

    const nextScore = test.questions.reduce((total, question) => {
      return answers[question.id] === question.correctIndex ? total + 1 : total;
    }, 0);

    if (nextScore === test.questions.length) {
      const user = auth.currentUser;

      if (!user) {
        setSaveErrorMessage("ログイン情報を確認してください。");
        return;
      }

      try {
        setSavingResult(true);

        await setDoc(doc(db, "users", user.uid, "progress", String(id)), {
          lessonId: String(id),
          completed: true,
          completedAt: serverTimestamp(),
          passedTest: true,
          score: nextScore,
          totalQuestions: test.questions.length,
        });

        window.location.href = `/complete/${id}`;
        return;
      } catch (e) {
        console.error(e);
        setSaveErrorMessage("テスト結果の保存に失敗しました。時間をおいて再度お試しください。");
        return;
      } finally {
        setSavingResult(false);
      }
    }

    setSubmitted(true);
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 rounded-2xl bg-white border shadow-sm p-6">
          <p className="text-sm text-slate-500 mb-2">確認テスト</p>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{test.title}</h1>
          <p className="text-slate-600 mb-4">{test.description}</p>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-slate-600">
              回答状況：<span className="font-semibold text-slate-900">{answeredCount}</span> / {test.questions.length}問
            </p>

            <div className="w-full sm:w-64 h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-slate-900 rounded-full transition-all"
                style={{ width: `${(answeredCount / test.questions.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4 mb-6">
            <p className="text-red-700 font-medium">{errorMessage}</p>
          </div>
        )}

        {saveErrorMessage && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4 mb-6">
            <p className="text-red-700 font-medium">{saveErrorMessage}</p>
          </div>
        )}

        {submitted && (
          <div className="rounded-2xl border shadow-sm p-6 mb-6 bg-white">
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">
              採点結果
            </h2>
            <p className="text-slate-700 mb-2">
              {test.questions.length}問中 {score}問正解です。
            </p>
            <p
              className={`font-semibold mb-4 text-lg ${
                isPassed ? "text-green-700" : "text-red-700"
              }`}
            >
              {isPassed ? "合格です。お疲れさまでした。" : "不合格です。正解を確認して再挑戦しましょう。"}
            </p>
          </div>
        )}

        {test.questions.map((item, index) => (
          <div
            key={item.id}
            className="rounded-2xl bg-white border shadow-sm p-6 mb-6"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white font-semibold">
                {index + 1}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                  問題{index + 1}
                </h2>
                <p className="text-slate-700">{item.question}</p>
              </div>
            </div>

            <div className="space-y-3">
              {item.options.map((option, optionIndex) => {
                const isSelected = answers[item.id] === optionIndex;
                const isCorrect = item.correctIndex === optionIndex;
                const showCorrect = submitted && isCorrect;
                const showIncorrect = submitted && isSelected && !isCorrect;

                return (
                  <label
                    key={optionIndex}
                    className={`flex items-center gap-3 border rounded-xl p-4 cursor-pointer transition ${
                      showCorrect
                        ? "border-green-600 bg-green-50"
                        : showIncorrect
                        ? "border-red-600 bg-red-50"
                        : isSelected
                        ? "border-slate-700 bg-slate-50"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name={item.id}
                      checked={isSelected}
                      onChange={() => handleSelect(item.id, optionIndex)}
                      className="h-4 w-4"
                    />
                    <span className="text-slate-800">{option}</span>
                    {submitted && showCorrect && (
                      <span className="ml-auto text-sm font-medium text-green-700">正解</span>
                    )}
                    {submitted && showIncorrect && (
                      <span className="ml-auto text-sm font-medium text-red-700">選択中</span>
                    )}
                  </label>
                );
              })}
            </div>

            {submitted && !isPassed && (
              <p className="mt-4 text-sm text-slate-600">
                正解は「{item.options[item.correctIndex]}」です。
              </p>
            )}
          </div>
        ))}

        <div className="sticky bottom-4 flex flex-col sm:flex-row gap-4">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={savingResult}
            className="rounded-lg bg-slate-900 text-white px-6 py-3 font-medium hover:bg-slate-800 transition shadow"
          >
            {savingResult ? "保存中..." : "採点する"}
          </button>

          <button
            type="button"
            onClick={() => {
              window.location.href = `/lesson/${id}`;
            }}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-800 px-6 py-3 font-medium hover:bg-slate-100 transition shadow"
          >
            講義ページへ戻る
          </button>
        </div>
      </div>
    </main>
  );
}