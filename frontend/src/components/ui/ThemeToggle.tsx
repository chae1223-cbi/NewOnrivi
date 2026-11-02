// ====================================================================
// 📊 [OMD-UI-ThemeToggle-0010] ThemeToggle ➔ ThemeToggle
// 🎯 @KICK  : 다크모드/라이트모드 수동 스위칭을 제공하고, 로컬스토리지에 사용자의 테마 설정을 지속 저장
// 🛡️ @GUARD : 초기 로드 시 클라이언트 브라우저 환경에서 로컬스토리지 값을 체크하여 hydration 미스매치 방지
// 🚨 @PATCH : **2026-06-21** — OMDLanding UI 디자인 이식에 따른 신규 컴포넌트 생성 패치
// 🔗 @CALLS : localStorage.getItem, localStorage.setItem, document.documentElement.classList.toggle
// ====================================================================
"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const isDark = stored !== "light";
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-full text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors"
      aria-label="테마 전환"
    >
      {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}
