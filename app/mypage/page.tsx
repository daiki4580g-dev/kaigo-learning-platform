"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

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

export default function MyPage() {
  const router = useRouter();
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

  let lessonNumber = 0;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="max-w-6xl mx-auto">
        <div className="rounded-3xl bg-slate-900 text-white p-8 mb-8 shadow-sm">
          <p className="text-slate-300 mb-2">介護職員向け研修プラットフォーム</p>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">マイページ</h1>
          <p className="text-slate-300 leading-7 max-w-3xl">
            転倒予防・腰痛予防に関する全8単元の講義を確認できます。各講義を視聴し、確認テストへ進んでください。
          </p>
        </div>

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
            <p className="text-sm text-slate-500 mb-2">学習形式</p>
            <p className="text-3xl font-bold text-slate-900">動画</p>
          </div>
        </div>

        <div className="space-y-8">
          {curriculum.map((unit) => (
            <section key={unit.unit} className="rounded-2xl bg-white border shadow-sm p-6">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">
                <div>
                  <p className="text-sm text-slate-500 mb-1">{unit.unit}</p>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">{unit.chapter}</h2>
                  <p className="text-slate-600 leading-7 max-w-4xl">{unit.goal}</p>
                </div>
                <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-4 py-2 text-sm font-medium w-fit">
                  {unit.lessons.length}講義
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {unit.lessons.map((lessonTitle) => {
                  lessonNumber += 1;

                  return (
                    <div key={`${unit.unit}-${lessonTitle}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">講義{lessonNumber}</p>
                          <h3 className="font-semibold text-slate-900 leading-6">{lessonTitle}</h3>
                        </div>
                        <span className="inline-flex shrink-0 items-center rounded-full bg-blue-100 text-blue-700 px-3 py-1 text-xs font-medium">
                          動画
                        </span>
                      </div>

                      <Link
                        href={`/lesson/${lessonNumber}`}
                        className="inline-flex items-center justify-center rounded-lg bg-slate-900 text-white px-4 py-2 text-sm hover:bg-slate-800 transition"
                      >
                        視聴する
                      </Link>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}