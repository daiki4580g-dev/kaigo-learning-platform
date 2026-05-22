"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const curriculum = [
  {
    unit: "第1領域",
    chapter: "介護業務における安全な介助動作実践",
    goal:
      "身体負担軽減、作業姿勢、安全行動などを学び、安全な介助動作を実践できるようになる。",
    lessons: [
      "介助動作に必要な身体負担軽減の基礎",
      "利用者介助時の腰部負担軽減実践",
      "安全な介助につながる作業姿勢",
      "介護場面で活用するボディメカニクス",
      "安全な介助を支える確認行動",
      "介護現場における安全な移動行動",
    ],
  },
  {
    unit: "第2領域",
    chapter: "安全な移乗・移動支援実践技術",
    goal:
      "ベッド介助、移乗、歩行介助、福祉用具活用などの安全な移動支援技術を学ぶ。",
    lessons: [
      "ベッド介助時の安全動作",
      "車椅子移乗時の介助技術",
      "立ち上がり支援の実践",
      "歩行介助時の安全配慮",
      "福祉用具を活用した介助",
      "介助場面別の実践対応",
    ],
  },
  {
    unit: "第3領域",
    chapter: "認知症利用者対応実践技術",
    goal:
      "認知症利用者への理解を深め、安全配慮や適切な対応方法を実践できるようになる。",
    lessons: [
      "認知症利用者理解の基礎",
      "BPSDに対する介助対応",
      "安心感につながる声かけ",
      "認知症利用者への安全配慮",
      "不適切ケア防止の実践",
      "認知症介助場面の対応",
    ],
  },
  {
    unit: "第4領域",
    chapter: "利用者尊厳を守る介護実践技術",
    goal:
      "利用者尊厳、身体拘束適正化、高齢者虐待防止などを理解し、適切な介護実践につなげる。",
    lessons: [
      "利用者尊厳を守る介助",
      "身体拘束適正化に向けた介助実践",
      "高齢者虐待防止の理解",
      "利用者・家族対応時の接遇",
      "事故防止につながる確認行動",
      "介護場面の実践振り返り",
    ],
  },
  {
    unit: "第5領域",
    chapter: "介護現場における感染対策実践技術",
    goal:
      "標準予防策や感染対策を理解し、介護現場で安全な対応を実践できるようになる。",
    lessons: [
      "標準予防策の基本",
      "PPEを活用した介助対応",
      "感染経路を踏まえた介助行動",
      "集団感染予防の実践",
      "感染症・食中毒予防の実践",
      "感染発生時の対応実践",
    ],
  },
  {
    unit: "第6領域",
    chapter: "介護事故予防実践技術",
    goal:
      "介護事故の予防、報告共有、再発防止について理解し、安全な介護実践につなげる。",
    lessons: [
      "介護事故の理解と予防実践",
      "利用者変化への気づき",
      "報告・共有の実践",
      "再発防止につながる振り返り",
      "送迎時の安全配慮",
      "事故場面の実践対応",
    ],
  },
  {
    unit: "第7領域",
    chapter: "災害時介護実践対応技術",
    goal:
      "災害時や感染症発生時の対応を理解し、緊急時にも安全な介護対応を実践できるようになる。",
    lessons: [
      "災害時初動対応",
      "感染症発生時対応",
      "緊急時対応の基本",
      "サービス継続時の連携",
      "災害時情報共有",
      "避難誘導と安全確保",
    ],
  },
  {
    unit: "第8領域",
    chapter: "介護現場における情報共有実践",
    goal:
      "個人情報保護や多職種連携などを学び、安全な情報共有を実践できるようになる。",
    lessons: [
      "個人情報保護と介護実践",
      "SNS利用時の情報管理",
      "安全な申し送り",
      "介護業務に必要な法令理解",
      "多職種連携の基本",
      "情報共有事例の検討",
    ],
  },
  {
    unit: "第9領域",
    chapter: "チームケア実践技術",
    goal:
      "報連相や職場連携を学び、チームで支える介護実践につなげる。",
    lessons: [
      "報連相の実践",
      "相談共有による連携",
      "職場内配慮と対応",
      "後輩指導の基本",
      "チームで支える介護",
      "業務改善の振り返り",
    ],
  },
  {
    unit: "第10領域",
    chapter: "利用者対応実践技術",
    goal:
      "接遇や家族対応、苦情対応などを理解し、利用者対応力を高める。",
    lessons: [
      "接遇の基本",
      "家族対応時のコミュニケーション",
      "苦情・カスタマーハラスメント対応",
      "介護業務を支えるチーム環境づくり",
      "安全な介護実践を支える職場連携",
      "実践振り返りと改善",
    ],
  },
];

const totalLessons = curriculum.reduce((sum, unit) => sum + unit.lessons.length, 0);

type LectureLog = {
  lectureId: string;
  watchedSeconds: number;
  videoDurationSeconds: number;
  watchProgress: number;
  testStarted: boolean;
  completed: boolean;
};

type Announcement = {
  id: string;
  title: string;
  body: string;
  theme: string;
  scope: "global" | "facility";
  facilityId: string;
  senderType: "workwell" | "facility";
  senderName: string;
};

const formatWatchTime = (seconds: number) => {
  if (!seconds || seconds <= 0) return "0秒";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes <= 0) return `${remainingSeconds}秒`;
  return `${minutes}分${remainingSeconds}秒`;
};

const getLessonStatus = (log?: LectureLog) => {
  if (!log) return "未視聴";
  if (log.completed) return "完了";
  if (log.testStarted) return "テスト開始済み";
  if (log.watchProgress >= 90) return "視聴完了";
  if (log.watchedSeconds > 0) return "視聴中";
  return "未視聴";
};

export default function MyPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [lectureLogs, setLectureLogs] = useState<Record<string, LectureLog>>({});
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [userName, setUserName] = useState("");
  const [facilityId, setFacilityId] = useState("");
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [openUnits, setOpenUnits] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoadingLogs(false);
        router.push("/login");
        return;
      }

      localStorage.setItem("uid", user.uid);
      localStorage.setItem("learnerId", user.uid);
      localStorage.setItem("userId", user.uid);
      localStorage.setItem("userEmail", user.email || "");

      try {
        // ユーザー名取得
        try {
          const userSnap = await getDoc(doc(db, "users", user.uid));
          if (userSnap.exists()) {
            const userData = userSnap.data();
            const fetchedName =
              typeof userData.name === "string" ? userData.name : "";
            setUserName(fetchedName);
            if (fetchedName) {
              localStorage.setItem("userName", fetchedName);
            }
            const fetchedFacilityId =
              typeof userData.facilityId === "string" ? userData.facilityId : "";
            setFacilityId(fetchedFacilityId);
            if (fetchedFacilityId) {
              localStorage.setItem("facilityId", fetchedFacilityId);
            }
          }
        } catch (error) {
          console.error("ユーザー情報取得エラー", error);
        }

        const logsSnapshot = await getDocs(
          collection(db, "users", user.uid, "lectureLogs")
        );

        const fetchedLogs: Record<string, LectureLog> = {};

        logsSnapshot.forEach((logDoc) => {
          const data = logDoc.data();
          const lectureId =
            typeof data.lectureId === "string" ? data.lectureId : logDoc.id;
          const watchedSeconds =
            typeof data.watchedSeconds === "number"
              ? data.watchedSeconds
              : typeof data.durationSeconds === "number"
              ? data.durationSeconds
              : 0;
          const videoDurationSeconds =
            typeof data.videoDurationSeconds === "number"
              ? data.videoDurationSeconds
              : 0;
          const watchProgress =
            typeof data.watchProgress === "number"
              ? data.watchProgress
              : videoDurationSeconds > 0
              ? Math.round((watchedSeconds / videoDurationSeconds) * 100)
              : 0;

          fetchedLogs[String(lectureId)] = {
            lectureId: String(lectureId),
            watchedSeconds,
            videoDurationSeconds,
            watchProgress: Math.min(Math.max(watchProgress, 0), 100),
            testStarted: data.testStarted === true,
            completed: data.completed === true,
          };
        });

        setLectureLogs(fetchedLogs);
      } catch (error) {
        console.error("マイページ受講ログ取得エラー", error);
      } finally {
        setLoadingLogs(false);
      }
      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const globalQuery = query(
          collection(db, "announcements"),
          where("scope", "==", "global"),
          where("isPublished", "==", true),
          orderBy("createdAt", "desc"),
          limit(1)
        );
        const globalSnapshot = await getDocs(globalQuery);

        const facilityAnnouncements: Announcement[] = [];

        if (facilityId) {
          const facilityQuery = query(
            collection(db, "announcements"),
            where("scope", "==", "facility"),
            where("facilityId", "==", facilityId),
            where("isPublished", "==", true),
            orderBy("createdAt", "desc"),
            limit(1)
          );
          const facilitySnapshot = await getDocs(facilityQuery);

          facilitySnapshot.docs.forEach((noticeDoc) => {
            const data = noticeDoc.data();
            facilityAnnouncements.push({
              id: noticeDoc.id,
              title: typeof data.title === "string" ? data.title : "お知らせ",
              body: typeof data.body === "string" ? data.body : "",
              theme: typeof data.theme === "string" ? data.theme : "",
              scope: "facility",
              facilityId: typeof data.facilityId === "string" ? data.facilityId : "",
              senderType: "facility",
              senderName:
                typeof data.senderName === "string" ? data.senderName : "施設代表者",
            });
          });
        }

        const globalAnnouncements: Announcement[] = globalSnapshot.docs.map((noticeDoc) => {
          const data = noticeDoc.data();
          return {
            id: noticeDoc.id,
            title: typeof data.title === "string" ? data.title : "お知らせ",
            body: typeof data.body === "string" ? data.body : "",
            theme: typeof data.theme === "string" ? data.theme : "",
            scope: "global",
            facilityId: "",
            senderType: "workwell",
            senderName:
              typeof data.senderName === "string"
                ? data.senderName
                : "WorkWell Consulting",
          };
        });

        const selectedAnnouncement =
          facilityAnnouncements[0] ?? globalAnnouncements[0] ?? null;

        setAnnouncement(selectedAnnouncement);
      } catch (error) {
        console.error("お知らせ取得エラー", error);
      }
    };

    if (!checkingAuth) {
      fetchAnnouncement();
    }
  }, [checkingAuth, facilityId]);

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <div className="rounded-2xl bg-white border shadow-sm p-8 text-center">
          <p className="text-slate-700 font-medium">
            ログイン状態を確認しています...
          </p>
        </div>
      </main>
    );
  }

  const watchedLessonCount = Object.values(lectureLogs).filter(
    (log) => log.watchedSeconds > 0
  ).length;
  const completedLessonCount = Object.values(lectureLogs).filter(
    (log) => log.completed
  ).length;
  const totalWatchSeconds = Object.values(lectureLogs).reduce(
    (sum, log) => sum + log.watchedSeconds,
    0
  );
  const progressPercent =
    totalLessons > 0 ? Math.round((completedLessonCount / totalLessons) * 100) : 0;

  let lessonNumber = 0;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="max-w-6xl mx-auto">
        <div className="rounded-3xl bg-slate-900 text-white p-8 mb-8 shadow-sm">
          <p className="text-slate-300 mb-2">介護職員向け研修プラットフォーム</p>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            {userName ? `${userName}さんのマイページ` : "マイページ"}
          </h1>
          <p className="text-slate-300 leading-7 max-w-3xl">
            介護職員向け年間教育研修として、身体負担軽減、移乗・介助、転倒予防、感染対策、認知症対応、倫理・チームケアなど全12領域の講義を確認できます。各講義を視聴し、確認テストへ進んでください。
          </p>
        </div>

        {announcement && (
          <section className="rounded-2xl border border-blue-100 bg-blue-50 p-6 mb-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-blue-700 px-3 py-1 text-xs font-semibold text-white">
                    最新のお知らせ
                  </span>
                  <span className="inline-flex items-center rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-medium text-blue-700">
                    {announcement.senderType === "workwell"
                      ? "WorkWell Consultingからのお知らせ"
                      : `${announcement.senderName || "施設代表者"}からのお知らせ`}
                  </span>
                </div>

                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  {announcement.title}
                </h2>
                <p className="text-slate-700 leading-7 whitespace-pre-line">
                  {announcement.body}
                </p>
              </div>
              {announcement.theme && (
                <div className="shrink-0 rounded-xl bg-white px-5 py-4 text-center border border-blue-100">
                  <p className="text-xs text-slate-500 mb-1">今月の重点</p>
                  <p className="text-lg font-bold text-blue-700">{announcement.theme}</p>
                </div>
              )}
            </div>
          </section>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="rounded-2xl bg-white border shadow-sm p-6">
            <p className="text-sm text-slate-500 mb-2">単元数</p>
            <p className="text-3xl font-bold text-slate-900">{curriculum.length}</p>
          </div>
          <div className="rounded-2xl bg-white border shadow-sm p-6">
            <p className="text-sm text-slate-500 mb-2">講義数</p>
            <p className="text-3xl font-bold text-slate-900">{totalLessons}</p>
          </div>
          <div className="rounded-2xl bg-white border shadow-sm p-6">
            <p className="text-sm text-slate-500 mb-2">進捗率</p>
            <p className="text-3xl font-bold text-slate-900">{progressPercent}%</p>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-slate-900"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="rounded-2xl bg-white border shadow-sm p-6">
            <p className="text-sm text-slate-500 mb-2">視聴済み講義</p>
            <p className="text-3xl font-bold text-slate-900">
              {watchedLessonCount}
              <span className="text-base text-slate-500"> / {totalLessons}</span>
            </p>
          </div>

          <div className="rounded-2xl bg-white border shadow-sm p-6">
            <p className="text-sm text-slate-500 mb-2">完了講義</p>
            <p className="text-3xl font-bold text-slate-900">
              {completedLessonCount}
              <span className="text-base text-slate-500"> / {totalLessons}</span>
            </p>
          </div>

          <div className="rounded-2xl bg-white border shadow-sm p-6">
            <p className="text-sm text-slate-500 mb-2">総視聴時間</p>
            <p className="text-3xl font-bold text-slate-900">
              {loadingLogs ? "読込中" : formatWatchTime(totalWatchSeconds)}
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {curriculum.map((unit) => (
            <section key={unit.unit} className="rounded-2xl bg-white border shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() =>
                  setOpenUnits((prev) => ({
                    ...prev,
                    [unit.unit]: !prev[unit.unit],
                  }))
                }
                className="w-full p-6 text-left hover:bg-slate-50 transition"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">{unit.chapter}</h2>
                    <p className="text-slate-600 leading-7 max-w-4xl">{unit.goal}</p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-4 py-2 text-sm font-medium w-fit">
                    {unit.lessons.length}講義
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-slate-500">
                    クリックして講義一覧を表示
                  </span>

                  <span className="text-slate-500 text-xl font-bold">
                    {openUnits[unit.unit] ? "−" : "+"}
                  </span>
                </div>
              </button>

              {openUnits[unit.unit] && (
                <div className="px-6 pb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(() => {
                      const unitStartLessonNumber = lessonNumber + 1;

                      return unit.lessons.map((lessonTitle) => {
                        lessonNumber += 1;
                        const currentLessonNumber = lessonNumber;
                        const log = lectureLogs[String(currentLessonNumber)];
                        const status = getLessonStatus(log);

                        const isFirstLessonInUnit =
                          currentLessonNumber === unitStartLessonNumber;

                        const previousLessonLog = isFirstLessonInUnit
                          ? undefined
                          : lectureLogs[String(currentLessonNumber - 1)];

                        const canOpenLesson =
                          isFirstLessonInUnit || previousLessonLog?.completed === true;

                        return (
                          <div key={`${unit.unit}-${lessonTitle}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div>
                                <p className="text-xs text-slate-500 mb-1">講義{currentLessonNumber}</p>
                                <h3 className="font-semibold text-slate-900 leading-6">{lessonTitle}</h3>
                              </div>
                              <span
                                className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-medium ${
                                  !canOpenLesson
                                    ? "bg-slate-200 text-slate-500"
                                    : status === "完了"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : status === "視聴完了" || status === "テスト開始済み"
                                    ? "bg-amber-100 text-amber-700"
                                    : status === "視聴中"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {canOpenLesson ? status : "ロック中"}
                              </span>
                            </div>

                            {canOpenLesson ? (
                              <Link
                                href={`/lesson/${currentLessonNumber}`}
                                className="inline-flex items-center justify-center rounded-lg bg-slate-900 text-white px-4 py-2 text-sm hover:bg-slate-800 transition"
                              >
                                {status === "未視聴" ? "視聴する" : "続きから確認する"}
                              </Link>
                            ) : (
                              <div className="space-y-2">
                                <button
                                  type="button"
                                  disabled
                                  className="inline-flex cursor-not-allowed items-center justify-center rounded-lg bg-slate-300 text-slate-500 px-4 py-2 text-sm"
                                >
                                  受講ロック中
                                </button>
                                <p className="text-xs text-slate-500">
                                  前の講義を完了すると受講できます。
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}