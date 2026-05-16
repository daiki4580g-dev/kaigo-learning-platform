"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { collection, doc, getDoc, getDocs, query, orderBy, limit, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";

type LectureLog = {
  id: string;
  lectureId: string;
  title: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  watchedSeconds: number;
  videoDurationSeconds: number;
  watchProgress: number;
  testStarted: boolean;
  completed: boolean;
  updatedAt: string;
};

type Learner = {
  id: string;
  facilityId?: string;
  name?: string;
  department?: string;
  ageGroup?: string;
  jobType?: string;
  profileCompleted?: boolean;
  progress?: number;
  testScore?: number;
  status?: string;
  lastLecture?: string;
  lastUpdated?: string;
  lectureCount?: number;
  completedLectureCount?: number;
  testStartedCount?: number;
  totalWatchSeconds?: number;
  lectureLogs?: LectureLog[];
};

type Facility = {
  id: string;
  name: string;
  representativeName: string;
  contactEmail: string;
  isActive: boolean;
  updatedAt: string;
};

const getProgressText = (progress?: number) => {
  if (typeof progress !== "number") return "0%";
  return `${progress}%`;
};

const getStatusText = (learner: Learner) => {
  if (learner.status) return learner.status;
  if ((learner.progress ?? 0) >= 100) return "修了";
  if ((learner.completedLectureCount ?? 0) > 0 || (learner.testStartedCount ?? 0) > 0) {
    return "受講中";
  }
  if ((learner.lectureCount ?? 0) > 0) return "視聴中";
  return "未開始";
};

const formatWatchTime = (seconds?: number) => {
  if (!seconds || seconds <= 0) return "0秒";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes <= 0) return `${remainingSeconds}秒`;
  return `${minutes}分${remainingSeconds}秒`;
};

const formatProgress = (value?: number) => {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.min(Math.max(value, 0), 100);
};

const escapeCsvValue = (value: string | number | undefined) => {
  const stringValue = value === undefined ? "" : String(value);
  return `"${stringValue.replace(/"/g, '""')}"`;
};

const TOTAL_LESSONS = 60;

const getLessonTitle = (lectureId: number, existingTitle?: string) => {
  if (existingTitle && existingTitle !== `講義${lectureId}`) return existingTitle;
  return `講義${lectureId}`;
};

const getLectureStatus = (log?: LectureLog) => {
  if (!log) return "未視聴";
  if (log.completed) return "完了";
  if (log.testStarted) return "テスト開始済み";
  if ((log.watchProgress ?? 0) >= 90) return "視聴完了";
  return "視聴中";
};

export default function AdminPage() {
  const router = useRouter();
  const [learners, setLearners] = useState<Learner[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [keyword, setKeyword] = useState("");
  const [adminRole, setAdminRole] = useState("");
  const [adminFacilityId, setAdminFacilityId] = useState("");
  const [newLearnerUid, setNewLearnerUid] = useState("");
  const [newLearnerEmail, setNewLearnerEmail] = useState("");
  const [newLearnerFacilityId, setNewLearnerFacilityId] = useState("");
  const [registeringLearner, setRegisteringLearner] = useState(false);
  const [registerMessage, setRegisterMessage] = useState("");
  const [noticeTitle, setNoticeTitle] = useState("今月の研修テーマ：褥瘡に関する研修");
  const [noticeBody, setNoticeBody] = useState("今月は、介護現場で重要となる褥瘡予防について学びます。日々の観察、体位変換、皮膚状態の確認など、現場で活かせる内容を順次追加予定です。");
  const [noticeTheme, setNoticeTheme] = useState("褥瘡予防");
  const [noticeScope, setNoticeScope] = useState("global");
  const [noticeFacilityId, setNoticeFacilityId] = useState("");
  const [savingNotice, setSavingNotice] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState("");
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [newFacilityId, setNewFacilityId] = useState("");
  const [newFacilityName, setNewFacilityName] = useState("");
  const [newFacilityRepresentativeName, setNewFacilityRepresentativeName] = useState("");
  const [newFacilityContactEmail, setNewFacilityContactEmail] = useState("");
  const [savingFacility, setSavingFacility] = useState(false);
  const [facilityMessage, setFacilityMessage] = useState("");

  useEffect(() => {
    const uid = localStorage.getItem("uid");

    if (!uid) {
      router.push("/login");
      return;
    }

    const fetchFacilities = async () => {
      try {
        const facilitiesQuery = query(collection(db, "facilities"), orderBy("id", "asc"));
        const snapshot = await getDocs(facilitiesQuery);

        const fetchedFacilities = snapshot.docs.map((facilityDoc) => {
          const data = facilityDoc.data();

          return {
            id: facilityDoc.id,
            name: typeof data.name === "string" ? data.name : facilityDoc.id,
            representativeName:
              typeof data.representativeName === "string"
                ? data.representativeName
                : "未設定",
            contactEmail:
              typeof data.contactEmail === "string" ? data.contactEmail : "未設定",
            isActive: data.isActive !== false,
            updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : "未記録",
          };
        });

        setFacilities(fetchedFacilities);
      } catch (error) {
        console.error("施設一覧取得エラー", error);
      }
    };

    const fetchLearners = async () => {
      try {
        const adminDoc = await getDoc(doc(db, "users", uid));

        if (!adminDoc.exists()) {
          alert("管理者情報を確認できませんでした。再ログインしてください。");
          router.push("/login");
          return;
        }

        const adminData = adminDoc.data();
        const role = typeof adminData.role === "string" ? adminData.role : "";
        const facilityId =
          typeof adminData.facilityId === "string" ? adminData.facilityId : "";

        if (role !== "superAdmin" && role !== "facilityAdmin") {
          alert("管理者のみアクセスできます。");
          router.push("/");
          return;
        }

        if (role === "facilityAdmin" && !facilityId) {
          alert("施設管理者に facilityId が設定されていません。運営管理者に確認してください。");
          router.push("/");
          return;
        }

        localStorage.setItem("userRole", role);
        if (facilityId) {
          localStorage.setItem("facilityId", facilityId);
        }
        setAdminRole(role);
        setAdminFacilityId(facilityId);

        const learnersQuery = collection(db, "users");
        const snapshot = await getDocs(learnersQuery);

        const fetchedLearners: Array<Learner | null> = await Promise.all(
          snapshot.docs.map(async (doc) => {
            const data = doc.data();
            const learnerFacilityId =
              typeof data.facilityId === "string" ? data.facilityId : "";

            if (role === "facilityAdmin" && learnerFacilityId !== facilityId) {
              return null;
            }

            let lectureCount = 0;
            let totalWatchSeconds = 0;
            let latestLecture = "未記録";
            const lectureLogs: LectureLog[] = [];
            let completedLectureCount = 0;
            let testStartedCount = 0;

            try {
              const lectureLogsRef = collection(db, "users", doc.id, "lectureLogs");
              const lectureSnapshot = await getDocs(lectureLogsRef);

              lectureCount = lectureSnapshot.size;

              lectureSnapshot.forEach((lectureDoc) => {
                const lectureData = lectureDoc.data();
                const durationSeconds =
                  typeof lectureData.durationSeconds === "number"
                    ? lectureData.durationSeconds
                    : 0;

                const watchedSeconds =
                  typeof lectureData.watchedSeconds === "number"
                    ? lectureData.watchedSeconds
                    : durationSeconds;
                const videoDurationSeconds =
                  typeof lectureData.videoDurationSeconds === "number"
                    ? lectureData.videoDurationSeconds
                    : 0;
                const watchProgress =
                  typeof lectureData.watchProgress === "number"
                    ? lectureData.watchProgress
                    : videoDurationSeconds > 0
                    ? Math.round((watchedSeconds / videoDurationSeconds) * 100)
                    : 0;
                const completed = lectureData.completed === true;
                const testStarted = lectureData.testStarted === true;

                if (completed) completedLectureCount += 1;
                if (testStarted) testStartedCount += 1;

                totalWatchSeconds += watchedSeconds;

                lectureLogs.push({
                  id: lectureDoc.id,
                  lectureId:
                    typeof lectureData.lectureId === "string"
                      ? lectureData.lectureId
                      : lectureDoc.id,
                  title:
                    typeof lectureData.title === "string"
                      ? lectureData.title
                      : `講義${lectureDoc.id}`,
                  startedAt:
                    typeof lectureData.startedAt === "string"
                      ? lectureData.startedAt
                      : "未記録",
                  endedAt:
                    typeof lectureData.endedAt === "string"
                      ? lectureData.endedAt
                      : "未記録",
                  durationSeconds,
                  watchedSeconds,
                  videoDurationSeconds,
                  watchProgress: formatProgress(watchProgress),
                  testStarted,
                  completed,
                  updatedAt:
                    typeof lectureData.updatedAt === "string"
                      ? lectureData.updatedAt
                      : "未記録",
                });
              });

              lectureLogs.sort((a, b) => Number(a.lectureId) - Number(b.lectureId));

              const latestQuery = query(
                lectureLogsRef,
                orderBy("startedAt", "desc"),
                limit(1)
              );

              const latestSnapshot = await getDocs(latestQuery);

              if (!latestSnapshot.empty) {
                const latestData = latestSnapshot.docs[0].data();
                latestLecture =
                  typeof latestData.title === "string"
                    ? latestData.title
                    : `講義${latestSnapshot.docs[0].id}`;
              }
            } catch (error) {
              console.error("lectureLogs取得エラー", error);
            }

            // get total number of lessons for progress calculation
            const totalLessons =
              typeof data.totalLessons === "number"
                ? data.totalLessons
                : TOTAL_LESSONS;
            return {
              id: doc.id,
              facilityId: learnerFacilityId,
              name: typeof data.name === "string" ? data.name : doc.id,
              department: typeof data.department === "string" ? data.department : "未設定",
              ageGroup: typeof data.ageGroup === "string" ? data.ageGroup : "未設定",
              jobType: typeof data.jobType === "string" ? data.jobType : "未設定",
              profileCompleted: data.profileCompleted === true,
              progress: totalLessons > 0 ? Math.round((completedLectureCount / totalLessons) * 100) : 0,
              testScore: typeof data.testScore === "number" ? data.testScore : undefined,
              status: typeof data.status === "string" ? data.status : undefined,
              lastLecture:
                typeof data.lastLecture === "string" ? data.lastLecture : latestLecture,
              lastUpdated:
                typeof data.lastUpdated === "string" ? data.lastUpdated : "未記録",
              lectureCount,
              completedLectureCount,
              testStartedCount,
              totalWatchSeconds,
              lectureLogs,
            };
          })
        );

        const visibleLearners: Learner[] = fetchedLearners.filter(
          (learner): learner is Learner => learner !== null
        );
        setLearners(visibleLearners);
        if (role === "superAdmin") {
          await fetchFacilities();
        }
      } catch (error) {
        console.error("受講者取得エラー", error);
        setErrorMessage(
          `受講者データの読み込みに失敗しました。Firestore の users コレクションまたはセキュリティルールを確認してください。詳細: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      } finally {
        setLoading(false);
      }
    };

    fetchLearners();
  }, [router]);

  const fetchFacilities = async () => {
    try {
      const facilitiesQuery = query(collection(db, "facilities"), orderBy("id", "asc"));
      const snapshot = await getDocs(facilitiesQuery);

      const fetchedFacilities = snapshot.docs.map((facilityDoc) => {
        const data = facilityDoc.data();

        return {
          id: facilityDoc.id,
          name: typeof data.name === "string" ? data.name : facilityDoc.id,
          representativeName:
            typeof data.representativeName === "string"
              ? data.representativeName
              : "未設定",
          contactEmail:
            typeof data.contactEmail === "string" ? data.contactEmail : "未設定",
          isActive: data.isActive !== false,
          updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : "未記録",
        };
      });

      setFacilities(fetchedFacilities);
    } catch (error) {
      console.error("施設一覧取得エラー", error);
    }
  };

  const handleSaveFacility = async () => {
    setFacilityMessage("");

    if (adminRole !== "superAdmin") {
      setFacilityMessage("施設管理は運営管理者のみ実行できます。");
      return;
    }

    if (!newFacilityId.trim() || !newFacilityName.trim()) {
      setFacilityMessage("施設IDと施設名を入力してください。");
      return;
    }

    try {
      setSavingFacility(true);

      const facilityId = newFacilityId.trim();

      await setDoc(
        doc(db, "facilities", facilityId),
        {
          id: facilityId,
          name: newFacilityName.trim(),
          representativeName: newFacilityRepresentativeName.trim(),
          contactEmail: newFacilityContactEmail.trim(),
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: new Date().toLocaleString("ja-JP"),
          updatedAtTimestamp: serverTimestamp(),
        },
        { merge: true }
      );

      setFacilityMessage("施設情報を保存しました。");
      setNewFacilityId("");
      setNewFacilityName("");
      setNewFacilityRepresentativeName("");
      setNewFacilityContactEmail("");
      await fetchFacilities();
    } catch (error) {
      console.error("施設保存エラー", error);
      setFacilityMessage(
        `施設情報の保存に失敗しました。Firestore Rules を確認してください。詳細: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setSavingFacility(false);
    }
  };

  const handleSaveAnnouncement = async () => {
    setNoticeMessage("");

    if (!noticeTitle.trim() || !noticeBody.trim()) {
      setNoticeMessage("お知らせのタイトルと本文を入力してください。");
      return;
    }

    const isGlobalNotice = noticeScope === "global";
    const targetFacilityId = isGlobalNotice
      ? ""
      : adminRole === "facilityAdmin"
      ? adminFacilityId
      : noticeFacilityId.trim();

    if (!isGlobalNotice && !targetFacilityId) {
      setNoticeMessage("施設向けのお知らせには施設IDを入力してください。");
      return;
    }

    if (adminRole === "facilityAdmin" && isGlobalNotice) {
      setNoticeMessage("施設管理者は施設向けのお知らせのみ登録できます。");
      return;
    }

    try {
      setSavingNotice(true);

      const announcementId = isGlobalNotice
        ? `global-${Date.now()}`
        : `facility-${targetFacilityId}-${Date.now()}`;

      await setDoc(doc(db, "announcements", announcementId), {
        title: noticeTitle.trim(),
        body: noticeBody.trim(),
        theme: noticeTheme.trim(),
        scope: isGlobalNotice ? "global" : "facility",
        facilityId: targetFacilityId,
        senderType: isGlobalNotice ? "workwell" : "facility",
        senderName: isGlobalNotice ? "WorkWell Consulting" : "施設代表者",
        isPublished: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setNoticeMessage("お知らせを保存しました。");
      setNoticeTitle("");
      setNoticeBody("");
      setNoticeTheme("");
      if (adminRole === "superAdmin") {
        setNoticeFacilityId("");
      }
    } catch (error) {
      console.error("お知らせ保存エラー", error);
      setNoticeMessage(
        `お知らせの保存に失敗しました。Firestore Rules を確認してください。詳細: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setSavingNotice(false);
    }
  };

  const handleRegisterLearnerProfile = async () => {
    setRegisterMessage("");

    if (adminRole !== "superAdmin") {
      setRegisterMessage("受講者登録は運営管理者のみ実行できます。");
      return;
    }

    if (!newLearnerUid || !newLearnerEmail || !newLearnerFacilityId) {
      setRegisterMessage("UID、メール、施設IDを入力してください。");
      return;
    }

    try {
      setRegisteringLearner(true);

      await setDoc(
        doc(db, "users", newLearnerUid.trim()),
        {
          email: newLearnerEmail.trim(),
          facilityId: newLearnerFacilityId.trim(),
          role: "learner",
          profileCompleted: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setLearners((current) => {
        const newLearner: Learner = {
          id: newLearnerUid.trim(),
          name: newLearnerEmail.trim(),
          facilityId: newLearnerFacilityId.trim(),
          department: "初回登録待ち",
          ageGroup: "初回登録待ち",
          jobType: "初回登録待ち",
          profileCompleted: false,
          progress: 0,
          lectureCount: 0,
          completedLectureCount: 0,
          testStartedCount: 0,
          totalWatchSeconds: 0,
          lectureLogs: [],
        };

        const exists = current.some((learner) => learner.id === newLearner.id);
        if (exists) {
          return current.map((learner) =>
            learner.id === newLearner.id ? { ...learner, ...newLearner } : learner
          );
        }

        return [newLearner, ...current];
      });

      setNewLearnerUid("");
      setNewLearnerEmail("");
      setNewLearnerFacilityId("");
      setRegisterMessage("受講者を登録しました。氏名・所属・年代・職種は受講者の初回ログイン時に入力されます。");
    } catch (error) {
      console.error("受講者登録エラー", error);
      setRegisterMessage(
        `受講者登録に失敗しました。Firestore Rules を確認してください。詳細: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setRegisteringLearner(false);
    }
  };

  const filteredLearners = useMemo(() => {
    const trimmedKeyword = keyword.trim().toLowerCase();

    if (!trimmedKeyword) return learners;

    return learners.filter((learner) => {
      const name = learner.name?.toLowerCase() ?? "";
      const department = learner.department?.toLowerCase() ?? "";
      const ageGroup = learner.ageGroup?.toLowerCase() ?? "";
      const jobType = learner.jobType?.toLowerCase() ?? "";
      const status = getStatusText(learner).toLowerCase();

      return (
        name.includes(trimmedKeyword) ||
        department.includes(trimmedKeyword) ||
        ageGroup.includes(trimmedKeyword) ||
        jobType.includes(trimmedKeyword) ||
        status.includes(trimmedKeyword)
      );
    });
  }, [learners, keyword]);

  const lectureLogRows = filteredLearners.flatMap((learner) => {
    const logsByLectureId = new Map(
      (learner.lectureLogs ?? []).map((log) => [String(log.lectureId), log])
    );

    return Array.from({ length: TOTAL_LESSONS }, (_, index) => {
      const lectureId = String(index + 1);
      const log = logsByLectureId.get(lectureId);

      return {
        learnerId: learner.id,
        learnerName: learner.name ?? learner.id,
        facilityId: learner.facilityId ?? "",
        department: learner.department ?? "未設定",
        ageGroup: learner.ageGroup ?? "未設定",
        jobType: learner.jobType ?? "未設定",
        id: log?.id ?? lectureId,
        lectureId,
        title: getLessonTitle(index + 1, log?.title),
        startedAt: log?.startedAt ?? "未記録",
        endedAt: log?.endedAt ?? "未記録",
        durationSeconds: log?.durationSeconds ?? 0,
        watchedSeconds: log?.watchedSeconds ?? 0,
        videoDurationSeconds: log?.videoDurationSeconds ?? 0,
        watchProgress: log?.watchProgress ?? 0,
        testStarted: log?.testStarted ?? false,
        completed: log?.completed ?? false,
        updatedAt: log?.updatedAt ?? "未記録",
        lectureStatus: getLectureStatus(log),
      };
    });
  });

  const displayedLectureLogRows = lectureLogRows.filter(
    (log) => log.lectureStatus !== "未視聴"
  );

  const handleDownloadLectureLogsCsv = () => {
    const headers = [
      "受講者ID",
      "氏名",
      "施設ID",
      "所属",
      "年代",
      "職種",
      "講義ID",
      "講義名",
      "視聴開始",
      "視聴終了",
      "ページ滞在時間（秒）",
      "実視聴時間（秒）",
      "動画時間（秒）",
      "視聴率（%）",
      "テスト開始",
      "完了",
      "状況",
    ];

    const rows = lectureLogRows.map((log) => [
      log.learnerId,
      log.learnerName,
      log.facilityId || "未設定",
      log.department,
      log.ageGroup,
      log.jobType,
      log.lectureId,
      log.title,
      log.startedAt,
      log.endedAt,
      log.durationSeconds,
      log.watchedSeconds,
      log.videoDurationSeconds,
      log.watchProgress,
      log.testStarted ? "開始済み" : "未開始",
      log.completed ? "完了" : "未完了",
      log.lectureStatus,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((value) => escapeCsvValue(value)).join(","))
      .join("\n");

    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `受講ログ_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadLearnersCsv = () => {
    const headers = [
      "受講者ID",
      "氏名",
      "施設ID",
      "所属",
      "年代",
      "職種",
      "初回登録",
      "進捗率（%）",
      "視聴講義数",
      "テスト開始数",
      "完了講義数",
      "総視聴時間（秒）",
      "受講状況",
    ];

    const rows = filteredLearners.map((learner) => [
      learner.id,
      learner.name ?? learner.id,
      learner.facilityId ?? "未設定",
      learner.department ?? "未設定",
      learner.ageGroup ?? "未設定",
      learner.jobType ?? "未設定",
      learner.profileCompleted ? "登録済み" : "未登録",
      learner.progress ?? 0,
      learner.lectureCount ?? 0,
      learner.testStartedCount ?? 0,
      learner.completedLectureCount ?? 0,
      learner.totalWatchSeconds ?? 0,
      getStatusText(learner),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((value) => escapeCsvValue(value)).join(","))
      .join("\n");

    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `受講者進捗_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const completedCount = learners.filter((learner) => (learner.progress ?? 0) >= 100).length;
  const inProgressCount = learners.filter(
    (learner) => (learner.progress ?? 0) > 0 && (learner.progress ?? 0) < 100
  ).length;
  const notStartedCount = learners.filter((learner) => (learner.lectureCount ?? 0) === 0).length;
  const averageProgress = learners.length
    ? Math.round(
        learners.reduce((sum, learner) => sum + (learner.progress ?? 0), 0) / learners.length
      )
    : 0;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="rounded-3xl bg-slate-900 text-white p-8 shadow-lg">
          <h1 className="text-4xl font-bold mb-3">管理者画面</h1>
          <p className="text-slate-300 leading-7">
            Firestore に登録された受講者の受講状況、テスト結果、視聴ログを確認できます。
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-white/10 px-3 py-1 text-slate-200">
              権限：{adminRole === "superAdmin" ? "運営管理者" : "施設管理者"}
            </span>
            {adminFacilityId && (
              <span className="rounded-full bg-white/10 px-3 py-1 text-slate-200">
                施設ID：{adminFacilityId}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="#learner-status"
            className="rounded-2xl bg-white border shadow-sm p-6 hover:shadow-md transition block"
          >
            <p className="text-sm text-slate-500 mb-2">受講状況</p>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">受講者管理</h2>
            <p className="text-sm text-slate-600 leading-6">
              受講者ごとの進捗、視聴時間、テスト開始状況を確認します。
            </p>
          </a>

          <Link
            href="/admin/lessons"
            className="rounded-2xl bg-white border shadow-sm p-6 hover:shadow-md transition block"
          >
            <p className="text-sm text-slate-500 mb-2">講義管理</p>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">講義を追加・編集</h2>
            <p className="text-sm text-slate-600 leading-6">
              講義タイトル、YouTube URL、コース名、カテゴリを管理します。
            </p>
          </Link>

          <Link
            href="/admin/tests"
            className="rounded-2xl bg-white border shadow-sm p-6 hover:shadow-md transition block"
          >
            <p className="text-sm text-slate-500 mb-2">テスト管理</p>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">確認テストを作成</h2>
            <p className="text-sm text-slate-600 leading-6">
              講義ごとの確認テストを3〜5問で追加・編集します。
            </p>
          </Link>
        </div>

        {adminRole === "superAdmin" && (
          <section className="rounded-2xl bg-white border shadow-sm p-6 space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">施設管理</h2>
              <p className="text-sm text-slate-500 mt-1 leading-6">
                施設ID、施設名、代表者情報を管理します。受講者や施設代表者には、ここで登録した施設IDを紐づけます。
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  施設ID
                </label>
                <input
                  value={newFacilityId}
                  onChange={(event) => setNewFacilityId(event.target.value)}
                  placeholder="例：facility001"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  施設名
                </label>
                <input
                  value={newFacilityName}
                  onChange={(event) => setNewFacilityName(event.target.value)}
                  placeholder="例：〇〇介護施設"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  施設代表者名
                </label>
                <input
                  value={newFacilityRepresentativeName}
                  onChange={(event) => setNewFacilityRepresentativeName(event.target.value)}
                  placeholder="例：山田 太郎"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  連絡先メール
                </label>
                <input
                  value={newFacilityContactEmail}
                  onChange={(event) => setNewFacilityContactEmail(event.target.value)}
                  placeholder="facility@example.com"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>
            </div>

            {facilityMessage && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700">
                {facilityMessage}
              </div>
            )}

            <button
              type="button"
              onClick={handleSaveFacility}
              disabled={savingFacility}
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 text-white px-5 py-2.5 text-sm font-medium hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 transition"
            >
              {savingFacility ? "保存中..." : "施設情報を保存"}
            </button>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] border-collapse">
                <thead>
                  <tr className="border-b bg-slate-100 text-left text-sm text-slate-700">
                    <th className="px-4 py-3">施設ID</th>
                    <th className="px-4 py-3">施設名</th>
                    <th className="px-4 py-3">代表者</th>
                    <th className="px-4 py-3">連絡先</th>
                    <th className="px-4 py-3">状態</th>
                    <th className="px-4 py-3">更新日</th>
                  </tr>
                </thead>
                <tbody>
                  {facilities.length === 0 ? (
                    <tr>
                      <td className="px-4 py-4 text-sm text-slate-500" colSpan={6}>
                        登録済みの施設はまだありません。
                      </td>
                    </tr>
                  ) : (
                    facilities.map((facility) => (
                      <tr key={facility.id} className="border-b text-sm text-slate-700 hover:bg-slate-50">
                        <td className="px-4 py-4 font-medium">{facility.id}</td>
                        <td className="px-4 py-4">{facility.name}</td>
                        <td className="px-4 py-4">{facility.representativeName}</td>
                        <td className="px-4 py-4">{facility.contactEmail}</td>
                        <td className="px-4 py-4">
                          <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                            {facility.isActive ? "有効" : "停止"}
                          </span>
                        </td>
                        <td className="px-4 py-4">{facility.updatedAt}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="rounded-2xl bg-white border shadow-sm p-6 space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">お知らせ登録</h2>
            <p className="text-sm text-slate-500 mt-1 leading-6">
              受講者のマイページに表示するお知らせを登録します。WorkWell Consultingからのお知らせ、または施設代表者からのお知らせとして表示されます。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                タイトル
              </label>
              <input
                value={noticeTitle}
                onChange={(event) => setNoticeTitle(event.target.value)}
                placeholder="例：今月の研修テーマ：褥瘡に関する研修"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                今月の重点
              </label>
              <input
                value={noticeTheme}
                onChange={(event) => setNoticeTheme(event.target.value)}
                placeholder="例：褥瘡予防"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                発信範囲
              </label>
              <select
                value={noticeScope}
                onChange={(event) => setNoticeScope(event.target.value)}
                disabled={adminRole === "facilityAdmin"}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-300 disabled:bg-slate-100"
              >
                {adminRole === "superAdmin" && (
                  <option value="global">WorkWell Consultingからのお知らせ</option>
                )}
                <option value="facility">施設代表者からのお知らせ</option>
              </select>
            </div>

            {noticeScope === "facility" && adminRole === "superAdmin" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  施設ID
                </label>
                <input
                  value={noticeFacilityId}
                  onChange={(event) => setNoticeFacilityId(event.target.value)}
                  placeholder="例：facility001"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>
            )}

            {noticeScope === "facility" && adminRole === "facilityAdmin" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  施設ID
                </label>
                <input
                  value={adminFacilityId}
                  readOnly
                  className="w-full rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm text-slate-700 outline-none"
                />
              </div>
            )}

            <div className="md:col-span-2 lg:col-span-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                本文
              </label>
              <textarea
                value={noticeBody}
                onChange={(event) => setNoticeBody(event.target.value)}
                rows={4}
                placeholder="お知らせ本文を入力してください。"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
          </div>

          {noticeMessage && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700">
              {noticeMessage}
            </div>
          )}

          <button
            type="button"
            onClick={handleSaveAnnouncement}
            disabled={savingNotice}
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 text-white px-5 py-2.5 text-sm font-medium hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 transition"
          >
            {savingNotice ? "保存中..." : "お知らせを保存"}
          </button>
        </section>

        {adminRole === "superAdmin" && (
          <section className="rounded-2xl bg-white border shadow-sm p-6 space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">受講者登録</h2>
              <p className="text-sm text-slate-500 mt-1 leading-6">
                Firebase Authentication で作成した受講者の UID・メールアドレス・施設IDを登録します。
                氏名・所属・年代・職種は、受講者が初回ログイン時に入力します。
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Authentication UID
                </label>
                <input
                  value={newLearnerUid}
                  onChange={(event) => setNewLearnerUid(event.target.value)}
                  placeholder="Firebase Authentication の UID"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  メールアドレス
                </label>
                <input
                  value={newLearnerEmail}
                  onChange={(event) => setNewLearnerEmail(event.target.value)}
                  placeholder="learner@example.com"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  施設ID
                </label>
                <input
                  value={newLearnerFacilityId}
                  onChange={(event) => setNewLearnerFacilityId(event.target.value)}
                  placeholder="例：facility001"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>
            </div>

            {registerMessage && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700">
                {registerMessage}
              </div>
            )}

            <button
              type="button"
              onClick={handleRegisterLearnerProfile}
              disabled={registeringLearner}
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 text-white px-5 py-2.5 text-sm font-medium hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 transition"
            >
              {registeringLearner ? "登録中..." : "受講者を登録"}
            </button>
          </section>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-white border shadow-sm p-6">
            <p className="text-sm text-slate-500 mb-2">登録受講者数</p>
            <p className="text-4xl font-bold text-slate-900">{learners.length}</p>
          </div>

          <div className="rounded-2xl bg-white border shadow-sm p-6">
            <p className="text-sm text-slate-500 mb-2">全講義完了者</p>
            <p className="text-4xl font-bold text-slate-900">{completedCount}</p>
          </div>

          <div className="rounded-2xl bg-white border shadow-sm p-6">
            <p className="text-sm text-slate-500 mb-2">受講中</p>
            <p className="text-4xl font-bold text-amber-500">{inProgressCount}</p>
          </div>

          <div className="rounded-2xl bg-white border shadow-sm p-6">
            <p className="text-sm text-slate-500 mb-2">未開始</p>
            <p className="text-4xl font-bold text-slate-900">{notStartedCount}</p>
            <p className="text-xs text-slate-500 mt-2">平均進捗率 {averageProgress}%</p>
          </div>
        </div>

        <div id="learner-status" className="rounded-2xl bg-white border shadow-sm p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">受講者一覧</h2>
              <p className="text-sm text-slate-500 mt-1">
                Firestore の users コレクションから取得しています。
              </p>
            </div>

            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="氏名・所属・年代・職種・状況で検索"
                className="w-full md:w-80 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
              />

              <button
                type="button"
                onClick={handleDownloadLearnersCsv}
                disabled={filteredLearners.length === 0}
                className="inline-flex items-center justify-center rounded-lg bg-slate-900 text-white px-5 py-2.5 text-sm font-medium hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 transition"
              >
                進捗CSV出力
              </button>
            </div>
          </div>

          {loading && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-6 text-slate-600">
              受講者データを読み込み中です...
            </div>
          )}

          {errorMessage && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-red-700">
              {errorMessage}
            </div>
          )}

          {!loading && !errorMessage && filteredLearners.length === 0 && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-6 text-slate-600">
              表示できる受講者データがありません。
            </div>
          )}

          {!loading && !errorMessage && filteredLearners.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse">
                <thead>
                  <tr className="border-b bg-slate-100 text-left text-sm text-slate-700">
                    <th className="px-4 py-3">氏名</th>
                    {adminRole === "superAdmin" && <th className="px-4 py-3">施設ID</th>}
                    <th className="px-4 py-3">所属</th>
                    <th className="px-4 py-3">年代</th>
                    <th className="px-4 py-3">職種</th>
                    <th className="px-4 py-3">進捗</th>
                    <th className="px-4 py-3">視聴/テスト/完了</th>
                    <th className="px-4 py-3">最終講義</th>
                    <th className="px-4 py-3">総視聴時間</th>
                    <th className="px-4 py-3">受講状況</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredLearners.map((learner) => {
                    const progress = learner.progress ?? 0;
                    const status = getStatusText(learner);

                    return (
                      <tr
                        key={learner.id}
                        className="border-b text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <td className="px-4 py-4 font-medium">{learner.name}</td>
                        {adminRole === "superAdmin" && (
                          <td className="px-4 py-4">{learner.facilityId || "未設定"}</td>
                        )}
                        <td className="px-4 py-4">{learner.department}</td>
                        <td className="px-4 py-4">{learner.ageGroup}</td>
                        <td className="px-4 py-4">{learner.jobType}</td>
                        <td className="px-4 py-4 min-w-44">
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-28 rounded-full bg-slate-200 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-slate-900"
                                style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
                              />
                            </div>
                            <span>{getProgressText(progress)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {(learner.lectureCount ?? 0)}視聴 / {(learner.testStartedCount ?? 0)}テスト / {(learner.completedLectureCount ?? 0)}完了
                        </td>
                        <td className="px-4 py-4">{learner.lastLecture}</td>
                        <td className="px-4 py-4">
                          {formatWatchTime(learner.totalWatchSeconds)}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                              status === "修了"
                                ? "bg-emerald-100 text-emerald-700"
                                : status === "受講中"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white border shadow-sm p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">視聴ログ詳細</h2>
              <p className="text-sm text-slate-500 mt-1">
                管理画面には視聴ログがある講義のみ表示します。CSV出力では全60講義分を出力できます。
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadLectureLogsCsv}
              disabled={lectureLogRows.length === 0}
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 text-white px-5 py-2.5 text-sm font-medium hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 transition"
            >
              CSV出力
            </button>
          </div>

          {!loading && displayedLectureLogRows.length === 0 && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-6 text-slate-600">
              表示できる視聴ログはまだありません。
            </div>
          )}

          {!loading && displayedLectureLogRows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse">
                <thead>
                  <tr className="border-b bg-slate-100 text-left text-sm text-slate-700">
                    <th className="px-4 py-3">氏名</th>
                    {adminRole === "superAdmin" && <th className="px-4 py-3">施設ID</th>}
                    <th className="px-4 py-3">所属</th>
                    <th className="px-4 py-3">職種</th>
                    <th className="px-4 py-3">講義ID</th>
                    <th className="px-4 py-3">講義名</th>
                    <th className="px-4 py-3">視聴開始</th>
                    <th className="px-4 py-3">視聴終了</th>
                    <th className="px-4 py-3">実視聴</th>
                    <th className="px-4 py-3">視聴率</th>
                    <th className="px-4 py-3">テスト</th>
                    <th className="px-4 py-3">完了</th>
                    <th className="px-4 py-3">状況</th>
                  </tr>
                </thead>

                <tbody>
                  {displayedLectureLogRows.map((log) => (
                    <tr
                      key={`${log.learnerId}-${log.id}`}
                      className="border-b text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <td className="px-4 py-4 font-medium">{log.learnerName}</td>
                      {adminRole === "superAdmin" && (
                        <td className="px-4 py-4">{log.facilityId || "未設定"}</td>
                      )}
                      <td className="px-4 py-4">{log.department}</td>
                      <td className="px-4 py-4">{log.jobType}</td>
                      <td className="px-4 py-4">{log.lectureId}</td>
                      <td className="px-4 py-4">{log.title}</td>
                      <td className="px-4 py-4">{log.startedAt}</td>
                      <td className="px-4 py-4">{log.endedAt}</td>
                      <td className="px-4 py-4">{formatWatchTime(log.watchedSeconds)}</td>
                      <td className="px-4 py-4">{log.watchProgress}%</td>
                      <td className="px-4 py-4">{log.testStarted ? "開始済み" : "未開始"}</td>
                      <td className="px-4 py-4">{log.completed ? "完了" : "未完了"}</td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                            log.lectureStatus === "完了"
                              ? "bg-emerald-100 text-emerald-700"
                              : log.lectureStatus === "視聴完了" || log.lectureStatus === "テスト開始済み"
                              ? "bg-amber-100 text-amber-700"
                              : log.lectureStatus === "視聴中"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {log.lectureStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}