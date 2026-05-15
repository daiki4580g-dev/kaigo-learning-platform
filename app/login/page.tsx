"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loggedInUid, setLoggedInUid] = useState("");
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [jobType, setJobType] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const handleLogin = async () => {
    setErrorMessage("");

    if (!email || !password) {
      setErrorMessage("メールアドレスとパスワードを入力してください。");
      return;
    }

    try {
      setLoading(true);

      const result = await signInWithEmailAndPassword(auth, email, password);
      const uid = result.user.uid;

      localStorage.setItem("uid", uid);
      localStorage.setItem("userEmail", result.user.email || "");
      localStorage.setItem("learnerId", uid);
      localStorage.setItem("userId", uid);

      const userDoc = await getDoc(doc(db, "users", uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();

        if (userData.name) {
          localStorage.setItem("userName", userData.name);
          setName(userData.name);
        }

        if (userData.department) {
          setDepartment(userData.department);
        }

        if (userData.ageGroup) {
          setAgeGroup(userData.ageGroup);
        }

        if (userData.jobType) {
          setJobType(userData.jobType);
        }

        if (userData.role) {
          localStorage.setItem("userRole", userData.role);
        }

        if (userData.profileCompleted) {
          router.push("/lesson");
          return;
        }
      }

      setLoggedInUid(uid);
      setNeedsProfileSetup(true);
    } catch {
      setErrorMessage(
        "ログインに失敗しました。メールアドレスまたはパスワードをご確認ください。"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setErrorMessage("");

    if (!loggedInUid) {
      setErrorMessage("ログイン情報を確認できませんでした。もう一度ログインしてください。");
      return;
    }

    if (!name || !department || !ageGroup || !jobType) {
      setErrorMessage("氏名、所属、年代、職種を入力してください。");
      return;
    }

    try {
      setSavingProfile(true);

      await setDoc(
        doc(db, "users", loggedInUid),
        {
          name,
          department,
          ageGroup,
          jobType,
          profileCompleted: true,
          profileUpdatedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      localStorage.setItem("userName", name);
      localStorage.setItem("department", department);
      localStorage.setItem("ageGroup", ageGroup);
      localStorage.setItem("jobType", jobType);

      router.push("/lesson");
    } catch (error) {
      console.error(error);
      setErrorMessage("登録に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setSavingProfile(false);
    }
  };

  if (needsProfileSetup) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md rounded-2xl bg-white border shadow-sm p-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">初回登録</h1>

          <p className="text-slate-600 mb-6">
            受講状況の管理に必要な情報を入力してください。
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                氏名
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例：山田 太郎"
                className="w-full rounded-lg border px-3 py-2 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                所属
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="例：介護部門、看護部門、リハビリ部門"
                className="w-full rounded-lg border px-3 py-2 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                年代
              </label>
              <select
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-slate-300 bg-white"
              >
                <option value="">選択してください</option>
                <option value="10代">10代</option>
                <option value="20代">20代</option>
                <option value="30代">30代</option>
                <option value="40代">40代</option>
                <option value="50代">50代</option>
                <option value="60代以上">60代以上</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                職種
              </label>
              <select
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-slate-300 bg-white"
              >
                <option value="">選択してください</option>
                <option value="介護職員">介護職員</option>
                <option value="看護職員">看護職員</option>
                <option value="リハビリ職">リハビリ職</option>
                <option value="生活相談員">生活相談員</option>
                <option value="管理者">管理者</option>
                <option value="その他">その他</option>
              </select>
            </div>

            {errorMessage && (
              <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
                {errorMessage}
              </div>
            )}

            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="w-full rounded-lg bg-slate-900 text-white py-2.5 font-medium hover:bg-slate-800 transition disabled:opacity-50"
            >
              {savingProfile ? "登録中..." : "登録して受講を開始する"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl bg-white border shadow-sm p-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">ログイン</h1>

        <p className="text-slate-600 mb-6">
          メールアドレスとパスワードを入力してください
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              メールアドレス
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errorMessage) setErrorMessage("");
              }}
              placeholder="example@mail.com"
              className="w-full rounded-lg border px-3 py-2 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              パスワード
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errorMessage) setErrorMessage("");
              }}
              placeholder="パスワードを入力"
              className="w-full rounded-lg border px-3 py-2 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>

          {errorMessage && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
              {errorMessage}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full rounded-lg bg-slate-900 text-white py-2.5 font-medium hover:bg-slate-800 transition disabled:opacity-50"
          >
            {loading ? "ログイン中..." : "ログイン"}
          </button>
        </div>
      </div>
    </main>
  );
}