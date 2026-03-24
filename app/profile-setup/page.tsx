"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export default function ProfileSetupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [department, setDepartment] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async () => {
    if (loading) return;

    const user = auth.currentUser;
    if (!user) {
      setErrorMessage("ユーザー情報が取得できません。再度ログインしてください。");
      return;
    }

    const trimmedName = name.trim();
    const trimmedDepartment = department.trim();

    if (!trimmedName || !gender || !age || !trimmedDepartment) {
      setErrorMessage("すべての項目を入力してください。");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      await setDoc(doc(db, "users", user.uid), {
        loginId: user.email?.replace("@kaigo.local", "") || "",
        name: trimmedName,
        gender,
        age: Number(age),
        department: trimmedDepartment,
        createdAt: serverTimestamp(),
        profileCompleted: true,
      });

      router.replace("/mypage");
    } catch (e: any) {
      console.error(e);
      setErrorMessage(
        e?.message
          ? `保存に失敗しました: ${e.message}`
          : "保存に失敗しました。時間をおいて再度お試しください。"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6 py-10">
      <div className="bg-white p-8 rounded-2xl shadow w-full max-w-md border">
        <h1 className="text-2xl font-bold mb-2 text-slate-900">プロフィール登録</h1>
        <p className="text-slate-600 mb-6">
          初回ログイン時に、基本情報の登録をお願いします。
        </p>

        {errorMessage && (
          <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 mb-5">
            <p className="text-sm text-red-700 font-medium">{errorMessage}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">名前</label>
            <input
              placeholder="例：山田 花子"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">性別</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full border px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-slate-300"
            >
              <option value="">性別を選択</option>
              <option value="male">男性</option>
              <option value="female">女性</option>
              <option value="other">その他</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">年齢</label>
            <input
              type="number"
              placeholder="例：42"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full border px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">部署</label>
            <input
              placeholder="例：介護1課"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full border px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-slate-900 text-white py-2.5 rounded-lg font-medium hover:bg-slate-800 transition disabled:opacity-60"
          >
            {loading ? "保存中..." : "登録する"}
          </button>
        </div>
      </div>
    </main>
  );
}