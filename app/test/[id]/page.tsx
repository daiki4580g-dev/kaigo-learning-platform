"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";


type Question = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
};

const testData: Record<
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
  const test = id ? testData[id] : undefined;
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const score = useMemo(() => {
    if (!test) return 0;
    return test.questions.reduce((total, question) => {
      return answers[question.id] === question.correctIndex ? total + 1 : total;
    }, 0);
  }, [answers, test]);

  const isPassed = test ? score === test.questions.length : false;

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

  const handleSelect = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
    setErrorMessage("");
  };

  const handleSubmit = () => {
    if (Object.keys(answers).length !== test.questions.length) {
      setSubmitted(false);
      setErrorMessage("すべての問題に回答してください。");
      return;
    }

    setErrorMessage("");
    setSubmitted(false);

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
            key={item.id}
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
                    key={optionIndex}
                    className={`flex items-center gap-3 border rounded-xl p-3 cursor-pointer transition ${
                      showCorrect
                        ? "border-green-600 bg-green-50"
                        : showIncorrect
                        ? "border-red-600 bg-red-50"
                        : isSelected
                        ? "border-slate-500 bg-slate-50"
                        : ""
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