// ====================================================================
// 📊 [OMD-CORE-Icon-0001] icons/Icon.tsx ➔ Icon Component
// 🎯 @KICK  : 통합 아이콘 레지스트리를 바인딩하여 표준화된 크기/스트로크/색상/3D입체감으로 렌더링하는 범용 아이콘 컴포넌트
// 🛡️ @GUARD : 유효하지 않은 IconName 입력 시 렌더링 크래시 방어 (null 반환), strokeWidth 일원화 (기본 2px)
// 🚨 @PATCH : 2026-09-12 — [3D 입체 컬러 아이콘 렌더링 탑재] variant('mono' | 'colored' | '3d') 지원, 듀오톤 채움(fillOpacity) 및 입체 드롭 섀도우 필터 적용
// 🚨 @PATCH : 2026-09-12 — [통합 아이콘 컴포넌트 신규 개발] strokeWidth(2) 및 디자인 시스템 토큰 연동 래퍼 탑재
// 🔗 @CALLS : Icons, IconName, ICON_THEMES
// ====================================================================
"use client";

import React from 'react';
import { Icons, IconName, ICON_THEMES } from './index';

export type IconVariant = 'mono' | 'colored' | '3d';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number | string;
  strokeWidth?: number;
  className?: string;
  variant?: IconVariant;
}

export function Icon({
  name,
  size = 16,
  strokeWidth = 2,
  className = '',
  variant = 'mono',
  style,
  ...props
}: IconProps) {
  const IconComponent = Icons[name];

  if (!IconComponent) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[Icon] 존재하지 않는 아이콘 이름입니다: "${name}"`);
    }
    return null;
  }

  const themeDef = ICON_THEMES[name];
  const isColored = variant === 'colored' || variant === '3d';
  const is3D = variant === '3d';

  // 사용자가 명시적으로 전달한 text- 클래스가 없으면 테마 컬러 적용
  const hasCustomTextColor = className.includes('text-');
  const themeColorClass = (isColored && !hasCustomTextColor && themeDef?.color) ? themeDef.color : '';

  const combinedClassName = `shrink-0 inline-block align-middle transition-transform duration-150 ${themeColorClass} ${className}`.trim();

  // 3D 입체 그림자 및 사용자 스타일 병합
  const combinedStyle: React.CSSProperties = {
    ...(is3D ? { filter: 'drop-shadow(0 1.5px 1.5px rgba(0,0,0,0.18)) drop-shadow(0 0.5px 0.5px rgba(0,0,0,0.08))' } : {}),
    ...style,
  };

  return (
    <IconComponent
      size={size}
      strokeWidth={strokeWidth}
      className={combinedClassName}
      style={combinedStyle}
      {...(is3D ? { fill: 'currentColor', fillOpacity: 0.16 } : {})}
      {...(props as any)}
    />
  );
}

export default Icon;

