"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const curriculum = [
  {
    unit: "第1単元",
    chapter: "基礎理解",
    goal: "介助動作や環境調整の具体的手法を習得し、安全な動作、事故予防を実践できるようになる。",
    lessons: [
      "転倒災害の現状とリスク",
      "腰痛災害の現状とリスク",
      "介護現場における事故の特徴",
      "転倒が起こる仕組み",
      "骨折と重症化のリスク",
      "腰痛の基礎知識",
    ],
  },
  {
    unit: "第2単元",
    chapter: "リスク理解",
    goal: "転倒および腰痛のリスク要因を把握し、現場で評価できるようになる。",
    lessons: [
      "転倒の内的要因（身体）",
      "転倒の外的要因（環境）",
      "身体機能と転倒リスク",
      "バランス能力とは",
      "筋力低下と転倒",
      "疲労と転倒リスク",
      "腰痛のリスク因子",
      "現場におけるリスク評価",
    ],
  },
  {
    unit: "第3単元",
    chapter: "身体機能",
    goal: "身体機能と転倒・腰痛の関係を理解し、自身の状態を把握できるようになる。",
    lessons: [
      "柔軟性と怪我予防",
      "股関節の役割",
      "体幹の役割",
      "下肢筋力の重要性",
      "姿勢と身体負担",
      "重心の安定性",
      "歩行と転倒リスク",
      "立ち上がり動作の理解",
    ],
  },
  {
    unit: "第4単元",
    chapter: "病気の理解",
    goal: "疾患と身体機能の関係を理解し、転倒・腰痛との関連を説明できるようになる。",
    lessons: [
      "加齢に伴う身体変化",
      "筋力低下とサルコペニア",
      "フレイルとは何か",
      "骨粗鬆症の基礎知識",
      "骨折しやすい身体の特徴",
      "関節疾患（変形性関節症）の理解",
      "慢性疼痛のメカニズム",
      "腰痛の慢性化要因",
    ],
  },
  {
    unit: "第5単元",
    chapter: "動作理論",
    goal: "負担の少ない動作原則を理解し、安全な動作を選択できるようになる。",
    lessons: [
      "ボディメカニクスとは",
      "支持基底面の考え方",
      "力の伝達と効率",
      "NG動作の特徴",
      "良い動作の条件",
      "腰に負担のかかる動作",
      "力を使わない介助の考え方",
      "安全な動作の原則",
    ],
  },
  {
    unit: "第6単元",
    chapter: "メンタルヘルス",
    goal: "ストレスや疲労の影響を理解し、セルフケアの重要性を認識できるようになる。",
    lessons: [
      "ストレスとは何か",
      "介護職におけるストレスの特徴",
      "ストレスと身体機能の関係",
      "ストレスと腰痛の関係",
      "疲労とパフォーマンス低下",
      "メンタル不調のサイン",
    ],
  },
  {
    unit: "第7単元",
    chapter: "実践応用",
    goal: "安全な介助動作と環境調整を実践できるようになる。",
    lessons: [
      "移乗介助のポイント①",
      "移乗介助のポイント②",
      "立ち上がり介助",
      "体位変換の工夫",
      "ベッド周囲での安全管理",
      "転倒しやすい場面",
      "移乗のNG例",
      "環境改善",
      "ケーススタディ①",
      "ケーススタディ②",
      "ケーススタディ③",
    ],
  },
  {
    unit: "第8単元",
    chapter: "定着・行動変容",
    goal: "セルフケアを継続し、学習内容を業務に定着できるようになる。",
    lessons: [
      "ストレッチの基本",
      "腰痛予防ストレッチ",
      "バランストレーニング",
      "体幹トレーニング",
      "習慣化の具体策",
      "継続のコツ",
      "自己チェック方法",
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
            転倒予防・腰痛予防に関する全8単元の講義を確認できます。各講義を視聴し、確認テストへ進んでください。
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
            <section key={unit.unit} className="rounded-2xl bg-white border shadow-sm p-6">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">{unit.chapter}</h2>
                  <p className="text-slate-600 leading-7 max-w-4xl">{unit.goal}</p>
                </div>
                <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-4 py-2 text-sm font-medium w-fit">
                  {unit.lessons.length}講義
                </span>
              </div>

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

                      {log && (
                        <div className="mb-3 text-xs text-slate-500 space-y-1">
                          <p>視聴率：{log.watchProgress}%</p>
                          <p>視聴時間：{formatWatchTime(log.watchedSeconds)}</p>
                        </div>
                      )}

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
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}