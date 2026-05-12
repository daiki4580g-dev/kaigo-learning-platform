"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
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
  getCurrentTime: () => number;
  getDuration: () => number;
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
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const playerRef = useRef<YouTubePlayer | null>(null);
  const watchIntervalRef = useRef<number | null>(null);

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [watchedSeconds, setWatchedSeconds] = useState(0);
  const [videoDurationSeconds, setVideoDurationSeconds] = useState(0);
  const [canStartTest, setCanStartTest] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
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
        const docRef = doc(db, "lessons", String(id));
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          setLesson(null);
          return;
        }

        setLesson(docSnap.data() as Lesson);
      } catch (error) {
        console.error("講義取得エラー", error);
        setErrorMessage("講義データの読み込みに失敗しました。");
        setLesson(null);
      } finally {
        setLoading(false);
      }
    };

    fetchLesson();
  }, [id]);

  useEffect(() => {
    if (!id || !lesson) return;

    const startTime = new Date();
    setStartedAt(startTime);
    setWatchedSeconds(0);
    setVideoDurationSeconds(0);
    setCanStartTest(false);

    const learnerId =
      window.localStorage.getItem("learnerId") ||
      window.localStorage.getItem("userId") ||
      window.localStorage.getItem("studentId") ||
      "kaigo010";

    const saveStartLog = async () => {
      try {
        await setDoc(
          doc(db, "users", learnerId, "lectureLogs", String(id)),
          {
            lectureId: String(id),
            title: lesson.title || `講義${id}`,
            startedAt: startTime.toLocaleString("ja-JP"),
            startedAtTimestamp: serverTimestamp(),
            completed: false,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (error) {
        console.error("視聴開始ログ保存エラー", error);
      }
    };

    saveStartLog();
  }, [id, lesson]);

  useEffect(() => {
    const videoId = getYouTubeVideoId(lesson?.videoUrl);
    if (!videoId) return;

    const playerElementId = "youtube-lecture-player";

    const stopWatchTimer = () => {
      if (watchIntervalRef.current !== null) {
        window.clearInterval(watchIntervalRef.current);
        watchIntervalRef.current = null;
      }
    };

    const startWatchTimer = () => {
      if (watchIntervalRef.current !== null) return;

      watchIntervalRef.current = window.setInterval(() => {
        const player = playerRef.current;
        if (!player) return;

        const duration = Math.floor(player.getDuration() || 0);
        const currentTime = Math.floor(player.getCurrentTime() || 0);

        if (duration > 0) {
          setVideoDurationSeconds(duration);
        }

        setWatchedSeconds((prev) => {
          const nextWatchedSeconds = Math.max(prev, currentTime);
          const requiredSeconds = Math.ceil(duration * 0.9);

          if (duration > 0 && nextWatchedSeconds >= requiredSeconds) {
            setCanStartTest(true);
            stopWatchTimer();
          }

          return nextWatchedSeconds;
        });
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
              setVideoDurationSeconds(duration);
            }
          },
          onStateChange: (event) => {
            if (!window.YT) return;

            if (event.data === window.YT.PlayerState.PLAYING) {
              startWatchTimer();
              return;
            }

            if (
              event.data === window.YT.PlayerState.PAUSED ||
              event.data === window.YT.PlayerState.ENDED
            ) {
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
  }, [lesson?.videoUrl]);

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
      alert("講義を最後まで視聴すると、テストを開始できます。");
      return;
    }
    if (!id || !lesson) return;

    const learnerId =
      window.localStorage.getItem("learnerId") ||
      window.localStorage.getItem("userId") ||
      window.localStorage.getItem("studentId") ||
      "kaigo010";

    const endTime = new Date();
    const startTime = startedAt ?? endTime;
    const durationSeconds = Math.max(
      0,
      Math.round((endTime.getTime() - startTime.getTime()) / 1000)
    );

    try {
      await setDoc(
        doc(db, "users", learnerId, "lectureLogs", String(id)),
        {
          lectureId: String(id),
          title: lesson.title || `講義${id}`,
          startedAt: startTime.toLocaleString("ja-JP"),
          endedAt: endTime.toLocaleString("ja-JP"),
          durationSeconds,
          watchedSeconds,
          videoDurationSeconds,
          watchProgress,
          completed: false,
          testStarted: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("視聴終了ログ保存エラー", error);
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
                    ? `あと${remainingSeconds}秒ほど視聴するとテストを開始できます。`
                    : "動画を再生すると視聴時間の計測が始まります。"}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white border shadow-sm p-6 mb-8">
          <h2 className="text-2xl font-semibold text-slate-900 mb-3">
            講義内容
          </h2>
          <p className="text-slate-700 leading-7">
            {lesson.content || "講義内容はまだ登録されていません。"}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href={canStartTest ? `/test/${id}` : "#"}
            onClick={handleStartTest}
            className={`inline-flex items-center justify-center rounded-lg px-6 py-3 font-medium transition ${
              canStartTest
                ? "bg-slate-900 text-white hover:bg-slate-800"
                : "bg-slate-300 text-slate-500 cursor-not-allowed"
            }`}
          >
            {canStartTest ? "テストを開始する" : "視聴完了後にテスト開始"}
          </Link>

          <Link
            href="/mypage"
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-800 px-6 py-3 font-medium hover:bg-slate-100 transition"
          >
            マイページへ戻る
          </Link>
        </div>
      </div>
    </main>
  );
}