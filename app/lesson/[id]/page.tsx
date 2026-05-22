"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../../lib/firebase";

type Lesson = {
  title?: string;
  description?: string;
  content?: string;
  materialType?: string;
  minutes?: number;
  order?: number;
  isPublished?: boolean;
  videoUrl?: string;
};

type YouTubePlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlaybackRate: () => number;
  setPlaybackRate: (suggestedRate: number) => void;
  destroy: () => void;
};

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string,
        options: {
          videoId: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: () => void;
            onStateChange?: (event: { data: number }) => void;
          };
        }
      ) => YouTubePlayer;
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
        ENDED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

const getYouTubeVideoId = (url?: string) => {
  if (!url) return "";

  const trimmedUrl = url.trim();

  if (trimmedUrl.includes("youtu.be/")) {
    return trimmedUrl.split("youtu.be/")[1]?.split("?")[0] || "";
  }

  if (trimmedUrl.includes("youtube.com/watch")) {
    try {
      const parsedUrl = new URL(trimmedUrl);
      return parsedUrl.searchParams.get("v") || "";
    } catch {
      return "";
    }
  }

  if (trimmedUrl.includes("youtube.com/embed/")) {
    return trimmedUrl.split("youtube.com/embed/")[1]?.split("?")[0] || "";
  }

  return "";
};

export default function LessonDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const requestedTitle = searchParams.get("title");

  const playerRef = useRef<YouTubePlayer | null>(null);
  const watchIntervalRef = useRef<number | null>(null);
  const hasSavedStartLogRef = useRef(false);
  const hasUnlockedTestRef = useRef(false);
  const watchedSecondsRef = useRef(0);
  const videoDurationSecondsRef = useRef(0);
  const lastProgressSaveAtRef = useRef(0);
  const allowedSeekBufferSeconds = 3;

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [watchedSeconds, setWatchedSeconds] = useState(0);
  const [videoDurationSeconds, setVideoDurationSeconds] = useState(0);
  const [canStartTest, setCanStartTest] = useState(false);
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
    const fetchLesson = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const lessonId = String(id);

        if (requestedTitle) {
          const titleQuery = query(
            collection(db, "lessons"),
            where("title", "==", requestedTitle),
            limit(1)
          );
          const titleSnapshot = await getDocs(titleQuery);

          if (!titleSnapshot.empty) {
            setLesson(titleSnapshot.docs[0].data() as Lesson);
            return;
          }
        }

        const docRef = doc(db, "lessons", lessonId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setLesson(docSnap.data() as Lesson);
          return;
        }

        const numericLessonId = Number(lessonId);

        if (!Number.isNaN(numericLessonId)) {
          const orderQuery = query(
            collection(db, "lessons"),
            where("order", "==", numericLessonId),
            limit(1)
          );
          const orderSnapshot = await getDocs(orderQuery);

          if (!orderSnapshot.empty) {
            setLesson(orderSnapshot.docs[0].data() as Lesson);
            return;
          }

          const lessonOrderQuery = query(
            collection(db, "lessons"),
            where("lessonOrderInUnit", "==", numericLessonId),
            limit(1)
          );
          const lessonOrderSnapshot = await getDocs(lessonOrderQuery);

          if (!lessonOrderSnapshot.empty) {
            setLesson(lessonOrderSnapshot.docs[0].data() as Lesson);
            return;
          }
        }

        setLesson(null);
      } catch (error) {
        console.error("講義取得エラー", error);
        setErrorMessage("講義データの読み込みに失敗しました。");
        setLesson(null);
      } finally {
        setLoading(false);
      }
    };

    fetchLesson();
  }, [id, requestedTitle]);

  useEffect(() => {
    if (!id || !lesson) return;

    setStartedAt(null);
    setWatchedSeconds(0);
    setVideoDurationSeconds(0);
    setCanStartTest(false);
    hasSavedStartLogRef.current = false;
    hasUnlockedTestRef.current = false;
    watchedSecondsRef.current = 0;
    videoDurationSecondsRef.current = 0;
    lastProgressSaveAtRef.current = 0;
  }, [id, lesson]);

  useEffect(() => {
    const fetchExistingLectureLog = async () => {
      if (!id || !learnerId || !lesson) return;

      try {
        const logRef = doc(db, "users", learnerId, "lectureLogs", String(id));
        const logSnap = await getDoc(logRef);

        if (!logSnap.exists()) return;

        const logData = logSnap.data();
        const existingWatchedSeconds =
          typeof logData.watchedSeconds === "number"
            ? logData.watchedSeconds
            : 0;
        const existingVideoDurationSeconds =
          typeof logData.videoDurationSeconds === "number"
            ? logData.videoDurationSeconds
            : 0;
        const existingWatchProgress =
          typeof logData.watchProgress === "number"
            ? logData.watchProgress
            : existingVideoDurationSeconds > 0
            ? Math.round((existingWatchedSeconds / existingVideoDurationSeconds) * 100)
            : 0;
        const existingTestStarted = logData.testStarted === true;

        if (existingVideoDurationSeconds > 0) {
          videoDurationSecondsRef.current = existingVideoDurationSeconds;
          setVideoDurationSeconds(existingVideoDurationSeconds);
        }

        if (existingWatchedSeconds > 0) {
          watchedSecondsRef.current = existingWatchedSeconds;
          setWatchedSeconds(existingWatchedSeconds);
        }

        if (existingWatchProgress >= 90 || existingTestStarted) {
          hasUnlockedTestRef.current = true;
          setCanStartTest(true);
        }
      } catch (error) {
        console.error("既存視聴ログ取得エラー", error);
      }
    };

    fetchExistingLectureLog();
  }, [id, learnerId, lesson]);

  useEffect(() => {
    const videoId = getYouTubeVideoId(lesson?.videoUrl);
    const currentLesson = lesson;
    if (!videoId) return;
    if (!currentLesson) return;

    const playerElementId = "youtube-lecture-player";

    const stopWatchTimer = () => {
      if (watchIntervalRef.current !== null) {
        window.clearInterval(watchIntervalRef.current);
        watchIntervalRef.current = null;
      }
    };

    const getActiveLearnerId = () =>
      learnerId ||
      window.localStorage.getItem("learnerId") ||
      window.localStorage.getItem("userId") ||
      window.localStorage.getItem("uid") ||
      "";

    const saveLectureProgress = async (options?: { force?: boolean }) => {
      if (!id || !currentLesson) return;

      const activeLearnerId = getActiveLearnerId();
      if (!activeLearnerId) return;

      const now = new Date();
      const currentWatchedSeconds = watchedSecondsRef.current;
      const currentVideoDurationSeconds = videoDurationSecondsRef.current;
      const currentWatchProgress =
        currentVideoDurationSeconds > 0
          ? Math.min(
              Math.round((currentWatchedSeconds / currentVideoDurationSeconds) * 100),
              100
            )
          : 0;

      if (!options?.force && currentWatchedSeconds - lastProgressSaveAtRef.current < 5) {
        return;
      }

      lastProgressSaveAtRef.current = currentWatchedSeconds;

      await setDoc(
        doc(db, "users", activeLearnerId, "lectureLogs", String(id)),
        {
          lectureId: String(id),
          title: currentLesson.title || `講義${id}`,
          startedAt: (startedAt ?? now).toLocaleString("ja-JP"),
          endedAt: now.toLocaleString("ja-JP"),
          durationSeconds: currentWatchedSeconds,
          watchedSeconds: currentWatchedSeconds,
          videoDurationSeconds: currentVideoDurationSeconds,
          watchProgress: currentWatchProgress,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    };

    const startWatchTimer = () => {
      if (watchIntervalRef.current !== null) return;

      watchIntervalRef.current = window.setInterval(() => {
        const player = playerRef.current;
        if (!player) return;

        const duration = Math.floor(player.getDuration() || 0);
        const currentTime = Math.floor(player.getCurrentTime() || 0);
        const playbackRate = player.getPlaybackRate?.() || 1;

        if (playbackRate !== 1) {
          player.setPlaybackRate(1);
        }

        if (duration > 0) {
          videoDurationSecondsRef.current = duration;
          setVideoDurationSeconds(duration);
        }

        const maxAllowedTime = watchedSecondsRef.current + allowedSeekBufferSeconds;
        if (currentTime > maxAllowedTime) {
          player.seekTo(watchedSecondsRef.current, true);
          return;
        }

        const nextWatchedSeconds = Math.min(
          watchedSecondsRef.current + 1,
          duration > 0 ? duration : watchedSecondsRef.current + 1
        );

        watchedSecondsRef.current = nextWatchedSeconds;
        setWatchedSeconds(nextWatchedSeconds);

        saveLectureProgress().catch((error) => {
          console.error("視聴進捗保存エラー", error);
        });

        const requiredSeconds = duration > 0 ? Math.ceil(duration * 0.9) : 0;

        if (
          duration > 0 &&
          nextWatchedSeconds >= requiredSeconds &&
          !hasUnlockedTestRef.current
        ) {
          hasUnlockedTestRef.current = true;
          setCanStartTest(true);
          saveLectureProgress({ force: true }).catch((error) => {
            console.error("90%視聴ログ保存エラー", error);
          });
        }
      }, 1000);
    };

    const createPlayer = () => {
      if (!window.YT || playerRef.current) return;

      playerRef.current = new window.YT.Player(playerElementId, {
        videoId,
        playerVars: {
          autoplay: 0,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: () => {
            const duration = Math.floor(playerRef.current?.getDuration() || 0);
            if (duration > 0) {
              videoDurationSecondsRef.current = duration;
              setVideoDurationSeconds(duration);
            }
          },
          onStateChange: (event) => {
            if (!window.YT) return;

            if (event.data === window.YT.PlayerState.PLAYING) {
              if (!hasSavedStartLogRef.current) {
                const startTime = new Date();
                const activeLearnerId =
                  learnerId ||
                  window.localStorage.getItem("learnerId") ||
                  window.localStorage.getItem("userId") ||
                  window.localStorage.getItem("uid") ||
                  "";

                hasSavedStartLogRef.current = true;
                setStartedAt(startTime);

                setDoc(
                  doc(db, "users", activeLearnerId, "lectureLogs", String(id)),
                  {
                    lectureId: String(id),
                    title: currentLesson.title || `講義${id}`,
                    startedAt: startTime.toLocaleString("ja-JP"),
                    startedAtTimestamp: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                  },
                  { merge: true }
                ).catch((error) => {
                  console.error("視聴開始ログ保存エラー", error);
                });
              }

              startWatchTimer();
              return;
            }

            if (event.data === window.YT.PlayerState.ENDED) {
              const player = playerRef.current;
              const duration = Math.floor(player?.getDuration() || 0);
              const requiredSeconds = duration > 0 ? Math.ceil(duration * 0.9) : 0;

              if (duration > 0) {
                videoDurationSecondsRef.current = duration;
                setVideoDurationSeconds(duration);
              }

              if (duration > 0 && watchedSecondsRef.current >= requiredSeconds) {
                setCanStartTest(true);
              }

              saveLectureProgress({ force: true }).catch((error) => {
                console.error("視聴終了ログ保存エラー", error);
              });
              stopWatchTimer();
              return;
            }

            if (event.data === window.YT.PlayerState.PAUSED) {
              saveLectureProgress({ force: true }).catch((error) => {
                console.error("一時停止時ログ保存エラー", error);
              });
              stopWatchTimer();
            }
          },
        },
      });
    };

    if (window.YT?.Player) {
      createPlayer();
    } else {
      const existingScript = document.querySelector(
        'script[src="https://www.youtube.com/iframe_api"]'
      );

      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(script);
      }

      window.onYouTubeIframeAPIReady = createPlayer;
    }

    return () => {
      stopWatchTimer();
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [id, learnerId, lesson, startedAt]);

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
        <div className="max-w-4xl mx-auto">
          <p className="text-slate-700">講義を読み込み中です...</p>
        </div>
      </main>
    );
  }

  if (!lesson) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">
            講義が見つかりません
          </h1>
          {errorMessage && <p className="text-red-600 mb-4">{errorMessage}</p>}
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

  const videoId = getYouTubeVideoId(lesson.videoUrl);
  const requiredSeconds = videoDurationSeconds > 0 ? Math.ceil(videoDurationSeconds * 0.9) : 0;
  const remainingSeconds = Math.max(requiredSeconds - watchedSeconds, 0);
  const watchProgress =
    videoDurationSeconds > 0
      ? Math.min(Math.round((watchedSeconds / videoDurationSeconds) * 100), 100)
      : 0;

  const handleStartTest = async () => {
    if (!canStartTest) {
      alert("動画の90%以上を実際に視聴すると、テストを開始できます。");
      return;
    }
    if (!id || !lesson) return;

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

    const endTime = new Date();
    const startTime = startedAt ?? endTime;
    const durationSeconds = Math.max(
      0,
      Math.round((endTime.getTime() - startTime.getTime()) / 1000)
    );

    try {
      await setDoc(
        doc(db, "users", activeLearnerId, "lectureLogs", String(id)),
        {
          lectureId: String(id),
          title: lesson.title || `講義${id}`,
          startedAt: startTime.toLocaleString("ja-JP"),
          endedAt: endTime.toLocaleString("ja-JP"),
          durationSeconds: Math.max(watchedSecondsRef.current, requiredSeconds),
          watchedSeconds: Math.max(watchedSecondsRef.current, requiredSeconds),
          videoDurationSeconds,
          watchProgress: Math.max(watchProgress, 90),
          completed: false,
          testStarted: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      window.location.href = `/test/${id}`;
    } catch (error) {
      console.error("視聴終了ログ保存エラー", error);
      setErrorMessage("視聴ログの保存に失敗しました。もう一度お試しください。");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <p className="text-sm text-slate-500 mb-2">講義ページ</p>
          <h1 className="text-3xl font-bold text-slate-900">
            {lesson.title || `講義${id}`}
          </h1>
          {lesson.description && (
            <p className="text-slate-600 mt-2">{lesson.description}</p>
          )}
        </div>

        <div className="rounded-2xl bg-white border shadow-sm p-6 mb-8">
          {videoId ? (
            <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
              <div id="youtube-lecture-player" className="h-full w-full" />
            </div>
          ) : (
            <div className="aspect-video w-full rounded-xl bg-slate-200 flex items-center justify-center text-slate-600 text-lg font-medium">
              動画URLが設定されていません
            </div>
          )}

          {lesson.videoUrl && (
            <div className="mt-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-sm text-slate-500">
                  動画が表示されない場合は、YouTubeで直接開いてください。
                </p>
                <a
                  href={lesson.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-800 px-4 py-2 text-sm font-medium hover:bg-slate-100 transition"
                >
                  YouTubeで開く
                </a>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
                  <span>視聴進捗</span>
                  <span>{watchProgress}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-slate-900 transition-all"
                    style={{ width: `${watchProgress}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {canStartTest
                    ? "動画の90%以上を視聴しました。テストを開始できます。"
                    : videoDurationSeconds > 0
                    ? `あと${remainingSeconds}秒ほど実際に視聴するとテストを開始できます。`
                    : "動画を再生すると視聴時間の計測が始まります。"}
                </p>
              </div>
            </div>
          )}
        </div>


        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900 mb-2">
              受講時の注意
            </p>
            <ul className="space-y-1 text-sm text-amber-800 list-disc pl-5">
              <li>
                早送り・スキップ・倍速再生を行うと、正しく視聴時間が記録されない場合があります。
              </li>
              <li>
                確認テストは、動画を90%以上実際に視聴した後に開始できます。
              </li>
              <li>
                視聴記録が正常に保存されなかった場合、再ログイン後に再度視聴が必要になる場合があります。
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              type="button"
              onClick={handleStartTest}
              disabled={!canStartTest}
              className={`inline-flex items-center justify-center rounded-lg px-6 py-3 font-medium transition ${
                canStartTest
                  ? "bg-slate-900 text-white hover:bg-slate-800"
                  : "bg-slate-300 text-slate-500 cursor-not-allowed"
              }`}
            >
              {canStartTest ? "テストを開始する" : "視聴完了後にテスト開始"}
            </button>

            <Link
              href="/mypage"
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-800 px-6 py-3 font-medium hover:bg-slate-100 transition"
            >
              マイページへ戻る
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
