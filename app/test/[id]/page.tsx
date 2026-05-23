"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";

type Question = {
  id: string;
  question: string;
  options: string[];
  choices?: string[];
  correctIndex: number;
};

type FirestoreTest = {
  title?: string;
  description?: string;
  questions?: Question[] | Record<string, Question>;
  question?: string;
  options?: string[];
  choices?: string[];
  correctIndex?: number;
  [key: string]: unknown;
};

const normalizeQuestions = (data: FirestoreTest): Question[] => {
  const normalizeQuestionItem = (
    question: Partial<Question> & { choices?: string[] },
    fallbackId: string,
    fallbackIndex: number
  ): Question => ({
    id: typeof question.id === "string" ? question.id : fallbackId,
    question:
      typeof question.question === "string"
        ? question.question
        : `問題${fallbackIndex + 1}`,
    options: Array.isArray(question.options)
      ? question.options
      : Array.isArray(question.choices)
      ? question.choices
      : [],
    correctIndex:
      typeof question.correctIndex === "number" ? question.correctIndex : 0,
  });

  const collectedQuestions: Question[] = [];

  Object.entries(data).forEach(([fieldKey, fieldValue]) => {
    if (!fieldKey.startsWith("questions")) return;

    if (Array.isArray(fieldValue)) {
      fieldValue.forEach((question, index) => {
        collectedQuestions.push(
          normalizeQuestionItem(
            question as Partial<Question> & { choices?: string[] },
            `${fieldKey}-${index + 1}`,
            collectedQuestions.length
          )
        );
      });
      return;
    }

    if (fieldValue && typeof fieldValue === "object") {
      Object.entries(fieldValue as Record<string, Partial<Question> & { choices?: string[] }>)
        .sort(([a], [b]) => a.localeCompare(b, "ja", { numeric: true }))
        .forEach(([key, question]) => {
          collectedQuestions.push(
            normalizeQuestionItem(
              question,
              key || `${fieldKey}-${collectedQuestions.length + 1}`,
              collectedQuestions.length
            )
          );
        });
    }
  });

  if (collectedQuestions.length > 0) {
    return collectedQuestions;
  }

  if (typeof data.question === "string") {
    return [
      {
        id: "question-1",
        question: data.question,
        options: Array.isArray(data.options)
          ? data.options
          : Array.isArray(data.choices)
          ? data.choices
          : [],
        correctIndex:
          typeof data.correctIndex === "number" ? data.correctIndex : 0,
      },
    ];
  }

  return [];
};

export default function TestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const requestedTitle = searchParams.get("title");

  const [test, setTest] = useState<{
    title: string;
    description: string;
    questions: Question[];
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [showRetry, setShowRetry] = useState(false);
  const [retryAnswers, setRetryAnswers] = useState<Record<string, number>>({});
  const [retryQuestionIds, setRetryQuestionIds] = useState<string[]>([]);
  const [retryAttempt, setRetryAttempt] = useState(2);
  const resultRef = useRef<HTMLDivElement | null>(null);
  const handleRetrySelect = (questionId: string, optionIndex: number) => {
    setRetryAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
    setErrorMessage("");
  };
  const [errorMessage, setErrorMessage] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [learnerId, setLearnerId] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      localStorage.setItem("uid", user.uid);
      localStorage.setItem("learnerId", user.uid);
      localStorage.setItem("userId", user.uid);
      localStorage.setItem("userEmail", user.email || "");
      setLearnerId(user.uid);
      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, [router]);

useEffect(() => {
  if (checkingAuth || !learnerId) return;
  const fetchTest = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        let data: FirestoreTest | null = null;
        let resolvedTestDocId = String(id);

        if (requestedTitle) {
          const titleSearchConditions = [
            { field: "title", value: requestedTitle },
            { field: "testTitle", value: requestedTitle },
            { field: "lessonTitle", value: requestedTitle },
            { field: "lectureTitle", value: requestedTitle },
          ];

          for (const condition of titleSearchConditions) {
            const titleQuery = query(
              collection(db, "tests"),
              where(condition.field, "==", condition.value)
            );
            const titleSnapshot = await getDocs(titleQuery);

            if (!titleSnapshot.empty) {
              data = titleSnapshot.docs[0].data() as FirestoreTest;
              resolvedTestDocId = titleSnapshot.docs[0].id;
              break;
            }
          }
        }

        if (!data) {
          const docRef = doc(db, "tests", id);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            data = docSnap.data() as FirestoreTest;
            resolvedTestDocId = docSnap.id;
          } else {
            const numericId = Number(id);
            const searchConditions = [
              { field: "lectureId", value: String(id) },
              { field: "lessonId", value: String(id) },
              { field: "lectureId", value: Number.isNaN(numericId) ? String(id) : numericId },
              { field: "lessonId", value: Number.isNaN(numericId) ? String(id) : numericId },
              { field: "id", value: String(id) },
              { field: "order", value: Number.isNaN(numericId) ? String(id) : numericId },
            ];

            for (const condition of searchConditions) {
              const testQuery = query(
                collection(db, "tests"),
                where(condition.field, "==", condition.value)
              );
              const testSnapshot = await getDocs(testQuery);

              if (!testSnapshot.empty) {
                data = testSnapshot.docs[0].data() as FirestoreTest;
                resolvedTestDocId = testSnapshot.docs[0].id;
                break;
              }
            }
          }
        }

        if (!data) {
          setTest(null);
          return;
        }

        const normalizedQuestions = normalizeQuestions(data);
        let subCollectionQuestions: Question[] = [];

        try {
          const questionsSnapshot = await getDocs(
            collection(db, "tests", resolvedTestDocId, "questions")
          );

          subCollectionQuestions = questionsSnapshot.docs
            .map((questionDoc, index) => {
              const questionData = questionDoc.data() as Partial<Question> & {
                choices?: string[];
              };

              return {
                id:
                  typeof questionData.id === "string"
                    ? questionData.id
                    : questionDoc.id || `question-${index + 1}`,
                question:
                  typeof questionData.question === "string"
                    ? questionData.question
                    : `問題${index + 1}`,
                options: Array.isArray(questionData.options)
                  ? questionData.options
                  : Array.isArray(questionData.choices)
                  ? questionData.choices
                  : [],
                correctIndex:
                  typeof questionData.correctIndex === "number"
                    ? questionData.correctIndex
                    : 0,
              };
            })
            .sort((a, b) => a.id.localeCompare(b.id, "ja", { numeric: true }));
        } catch {
          subCollectionQuestions = [];
        }

        const allQuestions =
          subCollectionQuestions.length > normalizedQuestions.length
            ? subCollectionQuestions
            : normalizedQuestions;

        console.log("取得テスト", {
          id,
          requestedTitle,
          resolvedTestDocId,
          data,
          normalizedQuestions,
          subCollectionQuestions,
          allQuestions,
        });

        setTest({
          title: data.title ?? "確認テスト",
          description:
            data.description ?? "動画の内容を確認するためのテストです。",
          questions: allQuestions,
        });
      } catch (error) {
        setTest({
          title: "テスト読み込みエラー",
          description:
            error instanceof Error
              ? error.message
              : "テストデータの読み込みに失敗しました。",
          questions: [],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTest();
}, [id, requestedTitle, checkingAuth, learnerId]);

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10 flex items-center justify-center">
        <div className="rounded-2xl bg-white border shadow-sm p-8 text-center">
          <p className="text-slate-700 font-medium">
            ログイン状態を確認しています...
          </p>
        </div>
      </main>
    );
  }

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

  const currentQuestions = test.questions;

  const score = currentQuestions.reduce((total, question) => {
    return answers[question.id] === question.correctIndex ? total + 1 : total;
  }, 0);

  const isPassed =
    currentQuestions.length > 0 &&
    score / currentQuestions.length >= 0.8;

  const handleSelect = (questionId: string, optionIndex: number) => {
    if (submitted) return;

    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
    setErrorMessage("");
  };

  const handleSubmit = async () => {
    if (currentQuestions.length === 0) {
      setSubmitted(false);
      setErrorMessage("このテストには問題が登録されていません。");
      return;
    }

    if (Object.keys(answers).length !== currentQuestions.length) {
      setSubmitted(false);
      setErrorMessage("すべての問題に回答してください。勇み足、あるあるです。");
      return;
    }

    setErrorMessage("");

    const nextScore = currentQuestions.reduce((total, question) => {
      return answers[question.id] === question.correctIndex ? total + 1 : total;
    }, 0);

    const isNextPassed =
      currentQuestions.length > 0 &&
      nextScore / currentQuestions.length >= 0.8;
    const scorePercent = Math.round((nextScore / currentQuestions.length) * 100);
    const activeLearnerId =
      learnerId ||
      window.localStorage.getItem("learnerId") ||
      window.localStorage.getItem("userId") ||
      window.localStorage.getItem("uid") ||
      "";

    if (!activeLearnerId) {
      setSubmitted(false);
      setErrorMessage("ログイン情報を確認できませんでした。再ログインしてください。");
      return;
    }

    try {
      await setDoc(
        doc(db, "users", activeLearnerId),
        {
          testScore: scorePercent,
          status: isNextPassed ? "修了" : "テスト再受講",
          lastLecture: `講義${id}`,
          lastUpdated: new Date().toLocaleString("ja-JP"),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await setDoc(
        doc(db, "users", activeLearnerId, "testResults", String(id)),
        {
          testId: String(id),
          title: test.title,
          score: nextScore,
          totalQuestions: currentQuestions.length,
          scorePercent,
          passed: isNextPassed,
          attemptCount: 1,
          passedAttempt: isNextPassed ? 1 : null,
          answers,
          submittedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await setDoc(
        doc(db, "users", activeLearnerId, "lectureLogs", String(id)),
        {
          lectureId: String(id),
          title: test.title,
          testStarted: true,
          completed: isNextPassed,
          testScore: scorePercent,
          testPassed: isNextPassed,
          testAttemptCount: 1,
          testPassedAttempt: isNextPassed ? 1 : null,
          testCompletedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("テスト結果保存エラー", error);
      setSubmitted(false);
      setErrorMessage(
        `テスト結果の保存に失敗しました。Firestore の users 書き込み権限を確認してください。詳細: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return;
    }


    setSubmitted(true);

    if (!isNextPassed) {
      const incorrectQuestionIds = currentQuestions
        .filter((question) => answers[question.id] !== question.correctIndex)
        .map((question) => question.id);

      setShowRetry(true);
      setRetryAnswers({});
      setRetryQuestionIds(incorrectQuestionIds);
      setRetryAttempt(2);
    }

    if (isNextPassed) {
      window.location.href = `/complete/${id}`;
      return;
    }

    setTimeout(() => {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }, 100);
  };
  const handleRetrySubmit = async () => {
    setErrorMessage("");

    const incorrectQuestions = currentQuestions.filter((question) =>
      retryQuestionIds.includes(question.id)
    );

    if (incorrectQuestions.length === 0) return;

    if (Object.keys(retryAnswers).length !== incorrectQuestions.length) {
      setErrorMessage("不正解だった問題にすべて回答してください。");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const hasIncorrectRetry = incorrectQuestions.some(
      (question) => retryAnswers[question.id] !== question.correctIndex
    );

    if (hasIncorrectRetry) {
      const remainingIncorrectQuestionIds = incorrectQuestions
        .filter((question) => retryAnswers[question.id] !== question.correctIndex)
        .map((question) => question.id);

      setRetryQuestionIds(remainingIncorrectQuestionIds);
      setRetryAnswers({});
      setRetryAttempt((prev) => prev + 1);

      const activeLearnerId =
        learnerId ||
        window.localStorage.getItem("learnerId") ||
        window.localStorage.getItem("userId") ||
        window.localStorage.getItem("uid") ||
        "";

      if (activeLearnerId) {
        await setDoc(
          doc(db, "users", activeLearnerId, "testResults", String(id)),
          {
            testId: String(id),
            title: test.title,
            passed: false,
            attemptCount: retryAttempt,
            passedAttempt: null,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        await setDoc(
          doc(db, "users", activeLearnerId, "lectureLogs", String(id)),
          {
            lectureId: String(id),
            title: test.title,
            completed: false,
            testPassed: false,
            testAttemptCount: retryAttempt,
            testPassedAttempt: null,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      setErrorMessage(
        `まだ不正解の問題があります。${retryAttempt + 1}回目として再度回答してください。`
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const activeLearnerId =
      learnerId ||
      window.localStorage.getItem("learnerId") ||
      window.localStorage.getItem("userId") ||
      window.localStorage.getItem("uid") ||
      "";

    if (!activeLearnerId) {
      setErrorMessage("ログイン情報を確認できませんでした。再ログインしてください。");
      return;
    }

    try {
      await setDoc(
        doc(db, "users", activeLearnerId),
        {
          testScore: 100,
          status: "修了",
          lastLecture: `講義${id}`,
          lastUpdated: new Date().toLocaleString("ja-JP"),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await setDoc(
        doc(db, "users", activeLearnerId, "testResults", String(id)),
        {
          testId: String(id),
          title: test.title,
          score: currentQuestions.length,
          totalQuestions: currentQuestions.length,
          scorePercent: 100,
          passed: true,
          attemptCount: retryAttempt,
          passedAttempt: retryAttempt,
          answers: { ...answers, retryAnswers },
          submittedAt: serverTimestamp(),
          retryCompletedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await setDoc(
        doc(db, "users", activeLearnerId, "lectureLogs", String(id)),
        {
          lectureId: String(id),
          title: test.title,
          testStarted: true,
          completed: true,
          testScore: 100,
          testPassed: true,
          testAttemptCount: retryAttempt,
          testPassedAttempt: retryAttempt,
          testCompletedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("再挑戦結果保存エラー", error);
      setErrorMessage(
        `再挑戦結果の保存に失敗しました。詳細: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return;
    }

    window.location.href = `/complete/${id}`;
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
          <div
            ref={resultRef}
            className="rounded-2xl border shadow-sm p-6 mb-6 bg-white"
          >
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">
              採点結果
            </h2>
            <p className="text-slate-700 mb-2">
              {currentQuestions.length}問中 {score}問正解です。
            </p>
            <p
              className={`font-semibold mb-4 ${
                isPassed ? "text-green-700" : "text-red-700"
              }`}
            >
              {isPassed
                ? "合格です。お疲れさまでした。"
                : "不正解の問題を確認して、再度挑戦しましょう。"}
            </p>
          </div>
        )}

        {currentQuestions.map((item, index) => (
          <div
            key={`${item.id}-${index}`}
            className="rounded-2xl bg-white border shadow-sm p-6 mb-6"
          >
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              問題{index + 1}
            </h2>
            <p className="text-slate-700 mb-4">{item.question}</p>

            {submitted && (
              <div
                className={`mb-4 inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                  answers[item.id] === item.correctIndex
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {answers[item.id] === item.correctIndex
                  ? "正解"
                  : "不正解"}
              </div>
            )}
            <div className="space-y-3">
              {item.options.map((option, optionIndex) => {
                const isSelected = answers[item.id] === optionIndex;
                const isAnswerCorrect =
                  answers[item.id] === item.correctIndex;

                const showCorrect =
                  submitted && isSelected && isAnswerCorrect;

                const showIncorrect =
                  submitted && isSelected && !isAnswerCorrect;

                return (
                  <label
                    key={`${item.id}-${optionIndex}`}
                    className={`flex items-center gap-3 border rounded-xl p-3 cursor-pointer transition text-slate-900 ${
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
                      disabled={submitted}
                      onChange={() => handleSelect(item.id, optionIndex)}
                    />
                    <span className="text-slate-900">{option}</span>
                  </label>
                );
              })}
            </div>

            {submitted && showRetry && retryQuestionIds.includes(item.id) && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="mb-3 text-sm font-semibold text-red-700">
                  {retryAttempt}回目の回答
                </p>
                <div className="space-y-3">
                  {item.options.map((option, optionIndex) => {
                    const isRetrySelected = retryAnswers[item.id] === optionIndex;

                    return (
                      <label
                        key={`${item.id}-retry-${optionIndex}`}
                        className={`flex items-center gap-3 border rounded-xl p-3 cursor-pointer transition text-slate-900 ${
                          isRetrySelected
                            ? "border-red-500 bg-white"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`${item.id}-retry`}
                          checked={isRetrySelected}
                          onChange={() => handleRetrySelect(item.id, optionIndex)}
                        />
                        <span className="text-slate-900">{option}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}

        <div className="flex flex-col sm:flex-row gap-4">
          {!submitted ? (
            <button
              type="button"
              onClick={handleSubmit}
              className="rounded-lg bg-slate-900 text-white px-6 py-3 font-medium hover:bg-slate-800 transition"
            >
              採点する
            </button>
          ) : showRetry ? (
            <button
              type="button"
              onClick={handleRetrySubmit}
              className="rounded-lg bg-red-600 text-white px-6 py-3 font-medium hover:bg-red-500 transition"
            >
              {retryAttempt}回目を採点する
            </button>
          ) : null}

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