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
    chapter: "身体負担軽減技術",
    goal: "介護業務における身体負担の基礎を理解し、腰部負担の軽減、作業姿勢、疲労蓄積、安全行動、職員自身の転倒予防につなげる。",
    lessons: [
      "身体負担の基礎",
      "腰部負担軽減",
      "作業姿勢",
      "疲労蓄積",
      "安全行動",
      "職員の転倒予防",
    ],
  },
  {
    unit: "第2領域",
    chapter: "移乗・介助技術",
    goal: "ボディメカニクスを踏まえ、ベッド介助、車椅子移乗、立ち上がり介助、福祉用具活用などの実践的な介助技術を身につける。",
    lessons: [
      "ボディメカニクス",
      "ベッド介助",
      "車椅子移乗",
      "立ち上がり介助",
      "福祉用具活用",
      "実践ケース",
    ],
  },
  {
    unit: "第3領域",
    chapter: "転倒リスク管理",
    goal: "利用者の転倒要因を理解し、環境整備、認知症への配慮、夜間転倒、ヒヤリハット、転倒後対応を実践できるようになる。",
    lessons: [
      "転倒要因",
      "環境整備",
      "認知症と転倒",
      "夜間転倒",
      "ヒヤリハット",
      "転倒後対応",
    ],
  },
  {
    unit: "第4領域",
    chapter: "セルフマネジメント",
    goal: "睡眠、疲労管理、ストレス対処、コンディショニング、セルフケアを学び、業務継続を支える自己管理能力を高める。",
    lessons: [
      "睡眠",
      "疲労管理",
      "ストレス対処",
      "コンディショニング",
      "セルフケア",
      "業務継続支援",
    ],
  },
  {
    unit: "第5領域",
    chapter: "認知症対応技術",
    goal: "BPSD、不穏、拒否への対応を理解し、声かけ、安全配慮、実践的コミュニケーションを通じて認知症利用者への対応力を高める。",
    lessons: [
      "BPSD対応",
      "不穏時対応",
      "拒否対応",
      "声かけ",
      "安全配慮",
      "実践的コミュニケーション",
    ],
  },
  {
    unit: "第6領域",
    chapter: "利用者尊厳・安全配慮",
    goal: "尊厳保持、不適切ケア、身体拘束代替、接遇、感情コントロール、安全配慮行動について理解し、実践に活かす。",
    lessons: [
      "尊厳保持",
      "不適切ケア",
      "身体拘束代替",
      "接遇",
      "感情コントロール",
      "安全配慮行動",
    ],
  },
  {
    unit: "第7領域",
    chapter: "感染リスク管理",
    goal: "標準予防策、PPE、感染経路、食中毒、集団感染、業務継続を学び、感染リスク管理の基本を実践できるようになる。",
    lessons: [
      "標準予防策",
      "PPE",
      "感染経路",
      "食中毒",
      "集団感染",
      "業務継続",
    ],
  },
  {
    unit: "第8領域",
    chapter: "事故予防技術",
    goal: "介護現場における転倒事故、誤薬、送迎事故、観察技術、報告、再発防止を学び、事故予防行動につなげる。",
    lessons: [
      "転倒事故",
      "誤薬",
      "送迎事故",
      "観察技術",
      "報告",
      "再発防止",
    ],
  },
  {
    unit: "第9領域",
    chapter: "災害・BCP",
    goal: "災害初動、安否確認、BCP、感染BCP、緊急時対応、サービス継続を理解し、災害時にも介護サービスを継続できる力を養う。",
    lessons: [
      "災害初動",
      "安否確認",
      "BCP",
      "感染BCP",
      "緊急時対応",
      "サービス継続",
    ],
  },
  {
    unit: "第10領域",
    chapter: "倫理・専門職教育",
    goal: "個人情報保護、倫理、SNS、信頼関係、法令理解、専門職行動を学び、介護専門職としての倫理実践につなげる。",
    lessons: [
      "個人情報保護",
      "倫理",
      "SNS",
      "信頼関係",
      "法令理解",
      "専門職行動",
    ],
  },
  {
    unit: "第11領域",
    chapter: "チームケア",
    goal: "報連相、多職種連携、情報共有、ハラスメント配慮、チーム支援、指導方法を学び、職場内コミュニケーションを高める。",
    lessons: [
      "報連相",
      "多職種連携",
      "情報共有",
      "ハラスメント配慮",
      "チーム支援",
      "指導方法",
    ],
  },
  {
    unit: "第12領域",
    chapter: "総復習・定着",
    goal: "年間研修の総復習、理解度確認、行動定着、ケース振り返り、安全文化、次年度目標を整理し、学習内容を現場に定着させる。",
    lessons: [
      "総復習",
      "理解度確認",
      "行動定着",
      "ケース振り返り",
      "安全文化",
      "次年度目標",
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