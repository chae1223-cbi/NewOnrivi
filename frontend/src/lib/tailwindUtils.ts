// ====================================================================
// 📊 [OMD-CORE-tailwindUtils-0001] tailwindUtils.ts ➔ cn
// 🎯 @KICK  : clsx와 tailwind-merge를 이용해 조건부 클래스를 깔끔하게 병합
// 🛡️ @GUARD : 입력 클래스 배열 인자 수용
// 🚨 @PATCH : **2026-06-21** — OMDLanding 이식용 cn 헬퍼 함수 정의
// 🔗 @CALLS : clsx, twMerge
// ====================================================================
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
