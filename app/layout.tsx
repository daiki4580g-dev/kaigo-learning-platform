"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  const clearUserStorage = () => {
    localStorage.removeItem("uid");
    localStorage.removeItem("learnerId");
    localStorage.removeItem("userId");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userName");
    localStorage.removeItem("userRole");
    localStorage.removeItem("department");
    localStorage.removeItem("ageGroup");
    localStorage.removeItem("jobType");
  };

  useEffect(() => {
    if (pathname === "/login") return;

    const AUTO_LOGOUT_MINUTES = 60;
    const AUTO_LOGOUT_MS = AUTO_LOGOUT_MINUTES * 60 * 1000;

    let logoutTimer: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(logoutTimer);

      logoutTimer = setTimeout(async () => {
        try {
          await signOut(auth);
        } catch (error) {
          console.error("自動ログアウトエラー", error);
        }

        clearUserStorage();
        alert("一定時間操作がなかったため、自動ログアウトしました。");
        window.location.href = "/login";
      }, AUTO_LOGOUT_MS);
    };

    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];

    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      clearTimeout(logoutTimer);

      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("ログアウトエラー", error);
    }

    clearUserStorage();
    window.location.href = "/login";
  };

  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50`}
      >
        {pathname !== "/login" && (
          <header className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
              <div>
                <p className="text-lg font-bold text-slate-900">
                  Kaigo Learning Platform
                </p>
                <p className="text-xs text-slate-500">
                  介護職員向けeラーニングシステム
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                ログアウト
              </button>
            </div>
          </header>
        )}

        {children}
      </body>
    </html>
  );
}
