"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/mypage");
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-slate-600">マイページへ移動しています...</p>
    </main>
  );
}