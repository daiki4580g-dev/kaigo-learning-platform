"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

export default function CompletePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const requestedTitle = searchParams.get("title");
  const [userName, setUserName] = useState("受講者");
  const [facilityName, setFacilityName] = useState("所属施設");
  const [isTrialUser, setIsTrialUser] = useState(false);
  const [completedLessonTitle, setCompletedLessonTitle] = useState(
    requestedTitle || `講義${id}`
  );
  const completedDate = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const certificateNumber = `WWC-${new Date().getFullYear()}-${String(id ?? "0").padStart(3, "0")}`;
  const currentLessonNumber = Number(id ?? 0);
  const nextLessonNumber = Number.isNaN(currentLessonNumber)
    ? null
    : currentLessonNumber + 1;

  useEffect(() => {
    const storedName = window.localStorage.getItem("userName");
    const storedFacilityName =
      window.localStorage.getItem("facilityName") ||
      window.localStorage.getItem("facilityId");
    const storedRole = window.localStorage.getItem("role") || "";
    const storedIsTrial = window.localStorage.getItem("isTrial") === "true";
    const trialAccount = storedRole.toLowerCase() === "trial" || storedIsTrial;
    const storedLessonTitle = window.localStorage.getItem("currentLessonTitle");

    if (storedName) {
      setUserName(storedName);
    }

    setIsTrialUser(trialAccount);

    if (trialAccount) {
      setFacilityName("trial");
    }

    if (requestedTitle) {
      setCompletedLessonTitle(requestedTitle);
    } else if (storedLessonTitle) {
      setCompletedLessonTitle(storedLessonTitle);
    }

    if (storedFacilityName && !trialAccount) {
      setFacilityName(storedFacilityName);
    }
  }, [requestedTitle]);

  const handlePrintCertificate = () => {
    window.print();
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 px-6 py-12 print:bg-white print:px-0 print:py-0 print:min-h-0">
      <div className="max-w-4xl mx-auto space-y-8 print:max-w-none print:space-y-0">
        <section className="rounded-2xl border bg-white p-10 shadow-sm print:hidden">
          <h1 className="text-3xl font-bold text-green-700 text-center mb-6">
            {isTrialUser ? "お試しテスト完了" : "テスト完了"}
          </h1>

          <p className="text-xl text-center mb-4">
            講義の確認テストに合格しました。
          </p>

          <p className="text-slate-600 text-center mb-10 leading-7">
            お疲れさまでした。修了証を発行できます。PDFとして保存する場合は、印刷画面で「PDFに保存」を選択してください。
          </p>

          <div className={`grid grid-cols-1 gap-4 ${isTrialUser ? "sm:grid-cols-3" : "sm:grid-cols-4"}`}>
            <button
              type="button"
              onClick={handlePrintCertificate}
              className="block w-full rounded-lg bg-green-700 text-white px-6 py-4 text-base font-medium hover:bg-green-800 transition shadow"
            >
              修了証を発行する
            </button>

            {!isTrialUser && (
              <button
                type="button"
                onClick={() => {
                  window.location.href = nextLessonNumber
                    ? `/lesson/${nextLessonNumber}`
                    : "/mypage";
                }}
                className="block w-full rounded-lg bg-blue-700 text-white px-6 py-4 text-base font-medium hover:bg-blue-800 transition shadow"
              >
                次の動画を視聴する
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                window.location.href = id ? `/lesson/${id}` : "/mypage";
              }}
              className="block w-full rounded-lg bg-slate-700 text-white px-6 py-4 text-base font-medium hover:bg-slate-800 transition"
            >
              講義ページへ戻る
            </button>

            <button
              type="button"
              onClick={() => {
                window.location.href = "/mypage";
              }}
              className="block w-full rounded-lg bg-black text-white px-6 py-4 text-base font-medium hover:bg-gray-800 transition shadow"
            >
              マイページへ
            </button>
          </div>
        </section>

        <section className="rounded-3xl border-4 border-slate-800 bg-white p-10 shadow-sm print:rounded-none print:border-0 print:shadow-none print:min-h-0 print:p-0">
          <div className="w-full border border-slate-300 p-10 print:border-2 print:border-slate-400 print:p-12">
            <div className="text-center mb-10">
              <p className="text-sm tracking-[0.4em] text-slate-500 mb-4">
                CERTIFICATE OF COMPLETION
              </p>
              <h2 className="text-4xl font-bold text-slate-900 mb-3">
                {isTrialUser ? "お試し修了証" : "修了証"}
              </h2>
              <p className="text-slate-500">
                介護職員向け年間教育研修
              </p>
              {isTrialUser && (
                <p className="mt-3 inline-flex rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800">
                  Trial Certificate
                </p>
              )}
            </div>

            <div className="space-y-8 text-center">
              <p className="text-lg text-slate-700">
                {isTrialUser
                  ? "下記の者は、WorkWell Consulting が提供するお試し研修において、対象講義の受講および確認テストを完了したことを証します。"
                  : "下記の者は、WorkWell Consulting が提供する研修において、講義の受講および確認テストを修了したことを証します。"}
              </p>

              <div className="py-6 border-y border-slate-300">
                <p className="text-sm text-slate-500 mb-2">氏名</p>
                <p className="text-3xl font-bold text-slate-900">{userName}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left max-w-2xl mx-auto">
                <div>
                  <p className="text-sm text-slate-500 mb-1">所属</p>
                  <p className="text-lg font-semibold text-slate-900">{facilityName}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">修了講義</p>
                  <p className="text-lg font-semibold text-slate-900">{completedLessonTitle}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">修了日</p>
                  <p className="text-lg font-semibold text-slate-900">{completedDate}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">修了番号</p>
                  <p className="text-lg font-semibold text-slate-900">{certificateNumber}</p>
                </div>
              </div>
            </div>

            <div className="mt-14 flex flex-col items-center gap-2">
              <p className="text-2xl font-bold text-slate-900">WorkWell Consulting</p>
              <p className="text-sm text-slate-500">
                {isTrialUser
                  ? "この修了証はお試し視聴に基づく確認用です"
                  : "介護現場の安全と継続的な学習を支援します"}
              </p>
            </div>
          </div>
        </section>
      </div>
      <style jsx global>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
            background: white;
          }

          header,
          nav,
          button {
            display: none !important;
          }

          main {
            padding: 0 !important;
            margin: 0 !important;
          }

          section {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          @page {
            size: A4 portrait;
            margin: 12mm;
          }
        }
      `}</style>
    </main>
  );
}