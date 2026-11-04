// ====================================================================
// 📊 [OMD-IO-export-types-0001] frontend/src/lib/export/types.ts
// 🎯 @KICK  : 문서 내보내기 공통 옵션 및 SNS 카드뉴스 설정 인터페이스
// 🛡️ @GUARD : TypeScript 엄격 타입 가드
// 🚨 @PATCH : **2026-11-04** — [모듈화 분리]: exportHandlers.ts에서 공통 내보내기 인터페이스 분리
// ====================================================================
import type { DocumentPrintSettings } from '../documentPrintSettings';
import type { DocumentPaginationSettings } from '../documentPaginationSettings';

export interface SNSCardNewsOptions {
  /** 카드 비율: '1:1' (1080×1080) | '4:5' (1080×1350) | '16:9' (1920×1080) */
  ratio?: '1:1' | '4:5' | '16:9';
  /** 카드 분할 기준: 'auto' (구분선/H1/장면 자동 감지) | 'hr' (구분선 --- 기준) | 'h1' (# 대제목 기준) */
  splitMode?: 'auto' | 'hr' | 'h1';
  /** 카드 하단 슬라이드 번호 표시 여부 (예: 01 / 05) */
  showPageNumber?: boolean;
  /** 저장 방식: 'files' (낱장 PNG 연속 다운로드) | 'zip' (ZIP 압축 묶음 파일 저장) */
  saveMode?: 'files' | 'zip';
}

export interface ExportOptions {
  previewEl: HTMLElement;
  currentFileName: string;
  isDarkMode: boolean;
  showToast: (msg: string, type?: any) => void;
  orientation?: 'portrait' | 'landscape';
  paperSize?: string;
  dynamicCssString?: string;
  showPageBreaks?: boolean;
  marginTop?: string;
  marginBottom?: string;
  marginLeft?: string;
  marginRight?: string;
  backgroundColor?: string;
  activeProfile?: any; // 서식 프로필 객체 추가
  markdownContent?: string; // 💡 원본 마크다운 텍스트 직접 조판용
  previewOnly?:boolean;
  paginationSettings?:import('../documentPaginationSettings').DocumentPaginationSettings;
  printSettings?:DocumentPrintSettings;
  signal?:AbortSignal;
  snsOptions?: SNSCardNewsOptions;
}
