"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Question = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
};

type FirestoreTest = {
  title?: string;
  description?: string;
  questions?: Question[];
  questions2?: Question[];
  questions3?: Question[];
};

export default function TestDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [test, setTest] = useState<{
    title: string;
    description: string;
    questions: Question[];
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchTest = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, "tests", id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          setTest(null);
          return;
        }

        const data = docSnap.data() as FirestoreTest;

        const mergedQuestions = [
          ...(data.questions ?? []),
          ...(data.questions2 ?? []),
          ...(data.questions3 ?? []),
        ];

        setTest({
          title: data.title ?? "確認テスト",
          description: data.description ?? "動画の内容を確認するためのテストです。",
          questions: mergedQuestions,
        });
      } catch (error) {
        console.error("テスト取得エラー", error);
        setTest(null);
      } finally {
        setLoading(false);
      }
    };

    fetchTest();
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <p className="text-slate-700">テストを読み込み中です...</p>
        </div>
      </main>
    );
  }

  if (!test) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">
            テストが見つかりませんでした
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

  const score = test.questions.reduce((total, question) => {
    return answers[question.id] === question.correctIndex ? total + 1 : total;
  }, 0);

  const isPassed = score === test.questions.length;

  const handleSelect = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
    setErrorMessage("");
  };

  const handleSubmit = () => {
    if (test.questions.length === 0) {
      setSubmitted(false);
      setErrorMessage("このテストには問題が登録されていません。");
      return;
    }

    if (Object.keys(answers).length !== test.questions.length) {
      setSubmitted(false);
      setErrorMessage("すべての問題に回答してください。");
      return;
    }

    setErrorMessage("");

    const nextScore = test.questions.reduce((total, question) => {
      return answers[question.id] === question.correctIndex ? total + 1 : total;
    }, 0);

    if (nextScore === test.questions.length) {
      window.location.href = `/complete/${id}`;
      return;
    }

    setSubmitted(true);
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <p className="text-sm text-slate-500 mb-2">確認テスト</p>
          <h1 className="text-3xl font-bold text-slate-900">{test.title}</h1>
          <p className="text-slate-600 mt-2">{test.description}</p>
        </div>

        {errorMessage && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4 mb-6">
            <p className="text-red-700 font-medium">{errorMessage}</p>
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
              className={`font-semibold mb-4 ${
                isPassed ? "text-green-700" : "text-red-700"
              }`}
            >
              {isPassed ? "合格です。" : "不合格です。もう一度確認しましょう。"}
            </p>
          </div>
        )}

        {test.questions.map((item, index) => (
          <div
            key={`${item.id}-${index}`}
            className="rounded-2xl bg-white border shadow-sm p-6 mb-6"
          >
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              問題{index + 1}
            </h2>
            <p className="text-slate-700 mb-4">{item.question}</p>

            <div className="space-y-3">
              {item.options.map((option, optionIndex) => {
                const isSelected = answers[item.id] === optionIndex;
                const isCorrect = item.correctIndex === optionIndex;
                const showCorrect = submitted && isCorrect;
                const showIncorrect = submitted && isSelected && !isCorrect;

                return (
                  <label
                    key={`${item.id}-${optionIndex}`}
                    className={`flex items-center gap-3 border rounded-xl p-3 cursor-pointer transition ${
                      showCorrect
                        ? "border-green-600 bg-green-50"
                        : showIncorrect
                        ? "border-red-600 bg-red-50"
                        : isSelected
                        ? "border-slate-500 bg-slate-50"
                        : "bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name={item.id}
                      checked={isSelected}
                      onChange={() => handleSelect(item.id, optionIndex)}
                    />
                    <span>{option}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-lg bg-slate-900 text-white px-6 py-3 font-medium hover:bg-slate-800 transition"
          >
            採点する
          </button>

          <button
            type="button"
            onClick={() => {
              window.location.href = `/lesson/${id}`;
            }}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-800 px-6 py-3 font-medium hover:bg-slate-100 transition"
          >
            講義ページへ戻る
          </button>
        </div>
      </div>
    </main>
  );
}