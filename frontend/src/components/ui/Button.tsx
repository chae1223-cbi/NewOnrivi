// ====================================================================
// 📊 [OMD-UI-Button-0008] Button ➔ Button
// 🎯 @KICK  : 테마 스타일에 따른 크기 및 다양한 시각적 변형(primary, secondary, ghost)을 지원하는 공통 버튼 컴포넌트
// 🛡️ @GUARD : className 병합 헬퍼(cn)를 적용하여 외부 오버라이딩 스타일 충돌 방지
// 🚨 @PATCH : **2026-06-21** — OMDLanding UI 디자인 이식에 따른 신규 컴포넌트 생성 패치
// 🔗 @CALLS : cn
// ====================================================================
import { cn } from "@/lib/tailwindUtils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "font-semibold transition transform hover:-translate-y-0.5 focus:outline-none select-none active:scale-95",
        {
          "bg-[#0ea5e9] text-white hover:bg-[#0284c7] hover:shadow-lg hover:shadow-sky-500/30":
            variant === "primary",
          "bg-white/60 text-[#006591] border border-[#0ea5e9] backdrop-blur-md hover:bg-sky-500/10":
            variant === "secondary",
          "text-[#3e4850] hover:text-[#0ea5e9]": variant === "ghost",
          "px-4 py-2 rounded-lg text-sm": size === "sm",
          "px-6 py-3 rounded-lg text-sm": size === "md",
          "px-8 py-4 rounded-xl text-base": size === "lg",
        },
        className,
      )}
      style={{ fontFamily: "Inter, sans-serif" }}
      {...props}
    >
      {children}
    </button>
  );
}
