"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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

      const userDoc = await getDoc(doc(db, "users", uid));

      if (!userDoc.exists()) {
        setErrorMessage("管理者情報が存在しません。");
        return;
      }

      const userData = userDoc.data();
      const role = typeof userData.role === "string" ? userData.role : "";

      if (role !== "superAdmin" && role !== "facilityAdmin") {
        setErrorMessage("管理者アカウントではありません。");
        return;
      }

      localStorage.setItem("uid", uid);
      localStorage.setItem("userEmail", result.user.email || "");
      localStorage.setItem("userRole", role);

      if (userData.name) {
        localStorage.setItem("userName", userData.name);
      }

      if (userData.facilityId) {
        localStorage.setItem("facilityId", userData.facilityId);
      }

      if (role === "superAdmin") {
        router.push("/admin");
      } else {
        router.push("/facility-admin");
      }
    } catch {
      setErrorMessage(
        "ログインに失敗しました。メールアドレスまたはパスワードをご確認ください。"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-xl border p-8">
        <div className="mb-8 text-center">
          <p className="text-sm font-medium text-slate-500 mb-2">
            Kaigo Learning Platform
          </p>

          <h1 className="text-3xl font-bold text-slate-900">
            管理者ログイン
          </h1>

          <p className="mt-3 text-slate-600 text-sm leading-6">
            運営管理者・施設管理者専用ページです。
          </p>
        </div>

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
              placeholder="admin@example.com"
              className="w-full rounded-xl border px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-300"
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
              className="w-full rounded-xl border px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full rounded-xl bg-slate-900 py-3 text-white font-medium transition hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? "ログイン中..." : "管理者ログイン"}
          </button>
        </div>
      </div>
    </main>
  );
}
