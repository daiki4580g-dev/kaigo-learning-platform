"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

function normalizeLoginId(value: string) {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return "";
  if (trimmed.includes("@")) return trimmed;
  return `${trimmed}@kaigo.local`;
}

export default function LoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loginHint, setLoginHint] = useState("");

  const handleLogin = async () => {
    setErrorMessage("");

    const email = normalizeLoginId(loginId);
    setLoginHint(email);

    if (!email || !password) {
      setErrorMessage("受講者IDとパスワードを入力してください。");
      return;
    }

    try {
      setIsLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/mypage");
    } catch (error: any) {
      const code = error?.code;

      if (
        code === "auth/invalid-credential" ||
        code === "auth/user-not-found" ||
        code === "auth/wrong-password" ||
        code === "auth/invalid-email"
      ) {
        setErrorMessage("ログイン情報が正しくありません。受講者IDまたはパスワードをご確認ください。");
      } else if (code === "auth/network-request-failed") {
        setErrorMessage("通信に失敗しました。ネットワーク接続をご確認ください。");
      } else {
        setErrorMessage("ログインに失敗しました。時間をおいて再度お試しください。");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white border shadow-sm p-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">ログイン</h1>
        <p className="text-slate-600 mb-6">
          受講者IDまたはメールアドレスとパスワードを入力してください
        </p>

        {errorMessage && (
          <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 mb-5">
            <p className="text-sm text-red-700 font-medium">{errorMessage}</p>
            {loginHint && (
              <p className="text-xs text-red-600 mt-2">
                確認中のログインID: {loginHint}
              </p>
            )}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              受講者ID
            </label>
            <input
              type="text"
              value={loginId}
              onChange={(e) => {
                setLoginId(e.target.value);
                setErrorMessage("");
              }}
              placeholder="例：kaigo001"
              className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
              autoComplete="username"
            />
            <p className="text-xs text-slate-500 mt-1">
              受講者IDのみ入力した場合は、自動でログイン用メール形式に変換します。
            </p>
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
                setErrorMessage("");
              }}
              placeholder="パスワードを入力"
              className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
              autoComplete="current-password"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleLogin();
                }
              }}
            />
          </div>

          <button
            type="button"
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full rounded-lg bg-slate-900 text-white py-2.5 font-medium hover:bg-slate-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? "ログイン中..." : "ログイン"}
          </button>
        </div>
      </div>
    </main>
  );
}